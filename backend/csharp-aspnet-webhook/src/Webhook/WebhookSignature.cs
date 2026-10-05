// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: verifies the HMAC signature on a RevenueDot webhook delivery.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Webhook;

public static partial class WebhookSignature
{
    /// <summary>The header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers.</summary>
    public const string Header = "X-RevenueCat-Webhook-Signature";

    [GeneratedRegex(@"(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)")]
    private static partial Regex Pattern();

    /// <summary>
    /// Checks <c>t=&lt;unix seconds&gt;,v1=&lt;hex HMAC-SHA256(secret, "&lt;t&gt;.&lt;raw body&gt;")&gt;</c>.
    /// <paramref name="rawBody"/> must be the exact bytes received; re-encoding parsed JSON changes them.
    /// </summary>
    public static bool Verify(byte[] rawBody, string? header, string secret, DateTimeOffset now, int toleranceSeconds = 300)
    {
        var match = Pattern().Match(header ?? "");
        if (!match.Success || !long.TryParse(match.Groups[1].Value, out var timestamp)) return false;
        // Refuse old deliveries so a captured request cannot be replayed.
        if (Math.Abs(now.ToUnixTimeSeconds() - timestamp) > toleranceSeconds) return false;

        byte[] signed = [.. Encoding.UTF8.GetBytes(match.Groups[1].Value + "."), .. rawBody];
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), signed);
        var received = Convert.FromHexString(match.Groups[2].Value);
        return CryptographicOperations.FixedTimeEquals(expected, received);
    }
}
