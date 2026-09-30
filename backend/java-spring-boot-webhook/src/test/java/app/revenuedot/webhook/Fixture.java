// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: loads testdata/initial-purchase.json, a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.webhook;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

record Fixture(String secret, String signatureHeader, String authorizationHeader, String body) {
  static Fixture load() {
    try {
      JsonNode f = new ObjectMapper().readTree(Path.of("testdata/initial-purchase.json").toFile());
      return new Fixture(f.get("secret").asText(), f.get("signature_header").asText(),
          f.get("authorization_header").asText(), f.get("body").asText());
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  /** The time the delivery was signed, so tests can freeze "now" there. */
  Instant signedAt() {
    Matcher m = Pattern.compile("t=(\\d+)").matcher(signatureHeader);
    if (!m.find()) throw new IllegalStateException("fixture has no t=");
    return Instant.ofEpochSecond(Long.parseLong(m.group(1)));
  }
}
