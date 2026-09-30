// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: verifies the HMAC signature on a RevenueDot webhook delivery.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.webhook;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class WebhookSignature {
  /** The header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers. */
  public static final String HEADER = "X-RevenueCat-Webhook-Signature";

  private static final Pattern PATTERN = Pattern.compile("(?:^|,)\\s*t=(\\d+)\\s*,\\s*v1=([0-9a-f]{64})\\s*(?:,|$)");

  private WebhookSignature() {}

  /**
   * Checks {@code t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>}.
   * {@code rawBody} must be the exact bytes received; re-encoding parsed JSON changes them.
   */
  public static boolean verify(byte[] rawBody, String header, String secret, Instant now, Duration tolerance) {
    if (header == null) return false;
    Matcher m = PATTERN.matcher(header);
    if (!m.find()) return false;
    long timestamp;
    try {
      timestamp = Long.parseLong(m.group(1));
    } catch (NumberFormatException e) {
      return false;
    }
    // Refuse old deliveries so a captured request cannot be replayed.
    if (Math.abs(now.getEpochSecond() - timestamp) > tolerance.toSeconds()) return false;
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      mac.update((m.group(1) + ".").getBytes(StandardCharsets.UTF_8));
      byte[] expected = mac.doFinal(rawBody);
      // MessageDigest.isEqual compares in constant time.
      return MessageDigest.isEqual(expected, HexFormat.of().parseHex(m.group(2)));
    } catch (GeneralSecurityException e) {
      throw new IllegalStateException(e);
    }
  }
}
