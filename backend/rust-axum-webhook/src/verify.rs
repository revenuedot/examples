// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: verifies the HMAC signature on a RevenueDot webhook delivery.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
use hmac::{Hmac, Mac};
use regex::Regex;
use sha2::Sha256;
use std::sync::LazyLock;
use subtle::ConstantTimeEq;

/// The header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers.
pub const SIGNATURE_HEADER: &str = "x-revenuecat-webhook-signature";

static PATTERN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)").unwrap());

/// Checks `t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.
/// `raw_body` must be the exact bytes received; re-encoding parsed JSON changes them.
pub fn verify_signature(
    raw_body: &[u8],
    header: Option<&str>,
    secret: &str,
    now_unix: i64,
    tolerance_secs: u64,
) -> bool {
    let Some(caps) = header.and_then(|h| PATTERN.captures(h)) else {
        return false;
    };
    let Ok(timestamp) = caps[1].parse::<i64>() else {
        return false;
    };
    // Refuse old deliveries so a captured request cannot be replayed.
    if now_unix.abs_diff(timestamp) > tolerance_secs {
        return false;
    }
    let mut mac =
        Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC accepts keys of any length");
    mac.update(caps[1].as_bytes());
    mac.update(b".");
    mac.update(raw_body);
    let Ok(received) = hex::decode(&caps[2]) else {
        return false;
    };
    mac.finalize()
        .into_bytes()
        .as_slice()
        .ct_eq(&received)
        .into()
}
