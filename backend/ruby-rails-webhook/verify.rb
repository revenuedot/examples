# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: verifies the HMAC signature on a RevenueDot webhook delivery.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
require "openssl"
require "rack/utils"

module RevenueDotSignature
  # The header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers.
  HEADER = "X-RevenueCat-Webhook-Signature"
  PATTERN = /(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)/

  # Checks `t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.
  # raw_body must be the exact bytes received; re-encoding parsed JSON changes them.
  def self.valid?(raw_body, header, secret, now: Time.now, tolerance: 300)
    match = PATTERN.match(header.to_s)
    return false unless match

    timestamp = match[1]
    # Refuse old deliveries so a captured request cannot be replayed.
    return false if (now.to_i - timestamp.to_i).abs > tolerance

    expected = OpenSSL::HMAC.hexdigest("SHA256", secret, "#{timestamp}.".b + raw_body.to_s.b)
    Rack::Utils.secure_compare(expected, match[2])
  end
end
