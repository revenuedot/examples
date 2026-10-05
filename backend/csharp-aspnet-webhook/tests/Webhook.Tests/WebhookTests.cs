// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests the ASP.NET Core webhook with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Webhook;
using Xunit;

public class WebhookTests
{
    private static readonly JsonElement Fixture =
        JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "initial-purchase.json"))).RootElement;
    private static readonly string Secret = Fixture.GetProperty("secret").GetString()!;
    private static readonly string SignatureHeader = Fixture.GetProperty("signature_header").GetString()!;
    private static readonly string AuthorizationHeader = Fixture.GetProperty("authorization_header").GetString()!;
    private static readonly string Body = Fixture.GetProperty("body").GetString()!;
    private static readonly DateTimeOffset SignedAt =
        DateTimeOffset.FromUnixTimeSeconds(long.Parse(Regex.Match(SignatureHeader, @"t=(\d+)").Groups[1].Value));

    private sealed class FrozenClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    [Fact]
    public void VerifiesTheRealDeliveryAndRejectsTampering()
    {
        var body = Encoding.UTF8.GetBytes(Body);
        Assert.True(WebhookSignature.Verify(body, SignatureHeader, Secret, SignedAt));
        Assert.False(WebhookSignature.Verify(Encoding.UTF8.GetBytes(Body.Replace("9.99", "0.99")), SignatureHeader, Secret, SignedAt));
        Assert.False(WebhookSignature.Verify(body, SignatureHeader, "whsec_wrong", SignedAt));
        Assert.False(WebhookSignature.Verify(body, SignatureHeader, Secret, SignedAt.AddSeconds(301)));
        Assert.False(WebhookSignature.Verify(body, null, Secret, SignedAt));
    }

    [Fact]
    public async Task HandlerAnswers200DedupesAndRefusesBadRequests()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(host => host.ConfigureTestServices(services =>
        {
            services.AddSingleton(new WebhookOptions(Secret, AuthorizationHeader));
            services.AddSingleton<TimeProvider>(new FrozenClock(SignedAt));
        }));
        using var client = factory.CreateClient();

        async Task<(HttpStatusCode, string)> Send(string signature, string authorization)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/webhooks/revenuedot")
            {
                Content = new StringContent(Body, Encoding.UTF8, "application/json"),
            };
            request.Headers.TryAddWithoutValidation(WebhookSignature.Header, signature);
            request.Headers.TryAddWithoutValidation("Authorization", authorization);
            using var response = await client.SendAsync(request);
            return (response.StatusCode, await response.Content.ReadAsStringAsync());
        }

        Assert.Equal((HttpStatusCode.OK, """{"received":true}"""), await Send(SignatureHeader, AuthorizationHeader));
        Assert.Equal((HttpStatusCode.OK, """{"received":true,"duplicate":true}"""), await Send(SignatureHeader, AuthorizationHeader));
        Assert.Equal((HttpStatusCode.Unauthorized, """{"error":"invalid signature"}"""), await Send("t=1,v1=00", AuthorizationHeader));
        Assert.Equal((HttpStatusCode.Unauthorized, """{"error":"invalid authorization"}"""), await Send(SignatureHeader, "Bearer nope"));
    }
}
