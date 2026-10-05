// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests the signature check with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.webhook;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class WebhookSignatureTest {
  private static final Duration TOLERANCE = Duration.ofMinutes(5);
  private final Fixture f = Fixture.load();
  private final Instant at = f.signedAt();
  private final byte[] body = f.body().getBytes(StandardCharsets.UTF_8);

  @Test
  void acceptsTheRealDelivery() {
    assertTrue(WebhookSignature.verify(body, f.signatureHeader(), f.secret(), at, TOLERANCE));
  }

  @Test
  void rejectsTamperingWrongSecretsOldDeliveriesAndMissingHeaders() {
    byte[] tampered = f.body().replaceFirst("9\\.99", "0.99").getBytes(StandardCharsets.UTF_8);
    assertFalse(WebhookSignature.verify(tampered, f.signatureHeader(), f.secret(), at, TOLERANCE), "changed body");
    assertFalse(WebhookSignature.verify(body, f.signatureHeader(), "whsec_wrong", at, TOLERANCE), "wrong secret");
    assertFalse(WebhookSignature.verify(body, f.signatureHeader(), f.secret(), at.plusSeconds(301), TOLERANCE), "old delivery");
    assertFalse(WebhookSignature.verify(body, null, f.secret(), at, TOLERANCE), "missing header");
  }
}
