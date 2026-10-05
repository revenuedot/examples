// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: Spring MVC controller for POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.webhook;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WebhookController {
  private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

  private final String secret;
  private final String authorization; // optional: the Authorization header value set on the webhook
  private final Clock clock;
  private final ObjectMapper json;
  // At-least-once delivery: the same event.id can arrive twice. Use a unique index in production.
  private final Set<String> seen = ConcurrentHashMap.newKeySet();

  public WebhookController(
      @Value("${revenuedot.webhook.secret:}") String secret,
      @Value("${revenuedot.webhook.authorization:}") String authorization,
      Clock clock,
      ObjectMapper json) {
    if (secret.isBlank()) throw new IllegalStateException("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)");
    this.secret = secret;
    this.authorization = authorization;
    this.clock = clock;
    this.json = json;
  }

  // byte[] keeps the body exactly as received: the signature covers those bytes, so parse JSON only after verifying.
  @PostMapping(path = "/webhooks/revenuedot", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> receive(
      @RequestBody byte[] raw,
      @RequestHeader(value = WebhookSignature.HEADER, required = false) String signature,
      @RequestHeader(value = "Authorization", required = false) String authHeader) {
    if (!WebhookSignature.verify(raw, signature, secret, clock.instant(), Duration.ofMinutes(5))) {
      return ResponseEntity.status(401).body("{\"error\":\"invalid signature\"}");
    }
    if (!authorization.isEmpty()
        && !MessageDigest.isEqual(
            (authHeader == null ? "" : authHeader).getBytes(StandardCharsets.UTF_8),
            authorization.getBytes(StandardCharsets.UTF_8))) {
      return ResponseEntity.status(401).body("{\"error\":\"invalid authorization\"}");
    }
    JsonNode event;
    try {
      event = json.readTree(raw).path("event");
    } catch (IOException e) {
      return ResponseEntity.badRequest().body("{\"error\":\"bad json\"}");
    }
    if (!seen.add(event.path("id").asText())) {
      return ResponseEntity.ok("{\"received\":true,\"duplicate\":true}");
    }

    // Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
    String type = event.path("type").asText();
    String user = event.path("app_user_id").asText();
    switch (type) {
      case "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE" -> {
        List<String> entitlements = new ArrayList<>();
        event.path("entitlement_ids").forEach(id -> entitlements.add(id.asText()));
        log.info("grant {} to {}", entitlements, user);
      }
      case "EXPIRATION" -> log.info("access ended for {} ({})", user, event.path("expiration_reason").asText());
      default -> log.info("{} for {}", type, user);
    }
    return ResponseEntity.ok("{\"received\":true}");
  }
}
