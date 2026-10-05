// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: verifies the HMAC signature on a RevenueDot webhook delivery.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.webhook

import java.security.MessageDigest
import java.time.Duration
import java.time.Instant
import java.util.HexFormat
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.math.abs

/** The header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers. */
const val SIGNATURE_HEADER = "X-RevenueCat-Webhook-Signature"

private val signaturePattern = Regex("""(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)""")

/**
 * Checks `t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.
 * [rawBody] must be the exact bytes received; re-encoding parsed JSON changes them.
 */
fun verifySignature(
    rawBody: ByteArray,
    header: String?,
    secret: String,
    now: Instant,
    tolerance: Duration = Duration.ofMinutes(5),
): Boolean {
    val match = signaturePattern.find(header ?: return false) ?: return false
    val (t, v1) = match.destructured
    val timestamp = t.toLongOrNull() ?: return false
    // Refuse old deliveries so a captured request cannot be replayed.
    if (abs(now.epochSecond - timestamp) > tolerance.seconds) return false
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(secret.toByteArray(), "HmacSHA256"))
    mac.update("$t.".toByteArray())
    // MessageDigest.isEqual compares in constant time.
    return MessageDigest.isEqual(mac.doFinal(rawBody), HexFormat.of().parseHex(v1))
}
