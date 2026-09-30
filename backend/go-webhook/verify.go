// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: verifies the HMAC signature on a RevenueDot webhook delivery.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"strconv"
	"time"
)

// SignatureHeader is the header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers.
const SignatureHeader = "X-RevenueCat-Webhook-Signature"

var signaturePattern = regexp.MustCompile(`(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)`)

// VerifySignature checks `t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.
// rawBody must be the exact bytes received; re-encoding parsed JSON changes them.
func VerifySignature(rawBody []byte, header, secret string, now time.Time, tolerance time.Duration) bool {
	m := signaturePattern.FindStringSubmatch(header)
	if m == nil {
		return false
	}
	ts, err := strconv.ParseInt(m[1], 10, 64)
	if err != nil {
		return false
	}
	// Refuse old deliveries so a captured request cannot be replayed.
	if age := now.Sub(time.Unix(ts, 0)); age > tolerance || age < -tolerance {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(m[1] + "."))
	mac.Write(rawBody)
	received, err := hex.DecodeString(m[2])
	return err == nil && hmac.Equal(received, mac.Sum(nil))
}
