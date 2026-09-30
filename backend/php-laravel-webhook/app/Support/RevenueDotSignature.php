<?php
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: verifies the HMAC signature on a RevenueDot webhook delivery.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

namespace App\Support;

final class RevenueDotSignature
{
    /** The header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers. */
    public const HEADER = 'X-RevenueCat-Webhook-Signature';

    /**
     * Checks `t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.
     * $rawBody must be the exact bytes received ($request->getContent()), never json_encode of parsed data.
     */
    public static function verify(string $rawBody, ?string $header, string $secret, int $now, int $toleranceSeconds = 300): bool
    {
        // An empty key would let anyone compute a valid signature.
        if ($secret === '' || $header === null) {
            return false;
        }
        // D: `$` matches only at the very end, not before a trailing newline.
        if (! preg_match('/(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)/D', $header, $m)) {
            return false;
        }
        // Refuse old deliveries so a captured request cannot be replayed.
        if (abs($now - (int) $m[1]) > $toleranceSeconds) {
            return false;
        }

        // hash_equals compares in constant time.
        return hash_equals(hash_hmac('sha256', $m[1].'.'.$rawBody, $secret), $m[2]);
    }
}
