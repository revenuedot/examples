// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: ASP.NET Core minimal API with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Webhook;

var builder = WebApplication.CreateBuilder(args);
// 0.0.0.0 so RevenueDot in Docker can reach it through host.docker.internal.
builder.WebHost.UseUrls($"http://0.0.0.0:{builder.Configuration["PORT"] ?? "3000"}");
builder.Services.AddSingleton(new WebhookOptions(
    builder.Configuration["REVENUEDOT_WEBHOOK_SECRET"] ?? "",
    builder.Configuration["REVENUEDOT_WEBHOOK_AUTHORIZATION"] ?? ""));
builder.Services.AddSingleton(TimeProvider.System); // tests swap in a clock frozen at the fixture's timestamp
builder.Services.AddSingleton<SeenEvents>();

var app = builder.Build();
if (string.IsNullOrEmpty(app.Services.GetRequiredService<WebhookOptions>().Secret))
    throw new InvalidOperationException("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)");

app.MapPost("/webhooks/revenuedot", async (HttpRequest request, WebhookOptions options, TimeProvider clock, SeenEvents seen, ILogger<Program> logger) =>
{
    // Read the raw bytes first: the signature covers them exactly, so never bind the body to a model before verifying.
    using var buffer = new MemoryStream();
    await request.Body.CopyToAsync(buffer);
    var raw = buffer.ToArray();
    if (!WebhookSignature.Verify(raw, request.Headers[WebhookSignature.Header].ToString(), options.Secret, clock.GetUtcNow()))
        return Results.Json(new { error = "invalid signature" }, statusCode: StatusCodes.Status401Unauthorized);
    if (options.Authorization.Length > 0 && !CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(request.Headers.Authorization.ToString()), Encoding.UTF8.GetBytes(options.Authorization)))
        return Results.Json(new { error = "invalid authorization" }, statusCode: StatusCodes.Status401Unauthorized);

    JsonElement ev;
    try
    {
        ev = JsonDocument.Parse(raw).RootElement.GetProperty("event");
    }
    catch (Exception e) when (e is JsonException or KeyNotFoundException)
    {
        return Results.Json(new { error = "bad json" }, statusCode: StatusCodes.Status400BadRequest);
    }
    if (!seen.TryAdd(Text(ev, "id"))) return Results.Json(new { received = true, duplicate = true });

    // Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
    var user = Text(ev, "app_user_id");
    switch (Text(ev, "type"))
    {
        case "INITIAL_PURCHASE" or "RENEWAL" or "UNCANCELLATION" or "NON_RENEWING_PURCHASE" or "PRODUCT_CHANGE":
            var ids = ev.TryGetProperty("entitlement_ids", out var list) && list.ValueKind == JsonValueKind.Array
                ? string.Join(",", list.EnumerateArray().Select(x => x.GetString())) : "-";
            logger.LogInformation("grant {Entitlements} to {User}", ids, user);
            break;
        case "EXPIRATION":
            logger.LogInformation("access ended for {User} ({Reason})", user, Text(ev, "expiration_reason"));
            break;
        case var type:
            logger.LogInformation("{Type} for {User}", type, user);
            break;
    }
    return Results.Json(new { received = true });
});

app.Run();

static string Text(JsonElement ev, string name) =>
    ev.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString()! : "-";

// Lets WebApplicationFactory<Program> in the tests find this app.
public partial class Program { }

namespace Webhook
{
    /// <summary>Authorization is optional: the Authorization header value set on the webhook, or empty to skip the check.</summary>
    public record WebhookOptions(string Secret, string Authorization);

    /// <summary>At-least-once delivery: the same event.id can arrive twice. Use a unique index in production.</summary>
    public class SeenEvents
    {
        private readonly ConcurrentDictionary<string, bool> _ids = new();
        public bool TryAdd(string id) => _ids.TryAdd(id, true);
    }
}
