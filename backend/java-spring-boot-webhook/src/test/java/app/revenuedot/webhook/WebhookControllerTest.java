// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests POST /webhooks/revenuedot through MockMvc with a real signed delivery and a frozen clock.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.webhook;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@WebMvcTest(WebhookController.class)
class WebhookControllerTest {
  private static final Fixture F = Fixture.load();

  @DynamicPropertySource
  static void webhookConfig(DynamicPropertyRegistry registry) {
    registry.add("revenuedot.webhook.secret", F::secret);
    registry.add("revenuedot.webhook.authorization", F::authorizationHeader);
  }

  @TestConfiguration
  static class FrozenClock {
    // Freeze "now" at the fixture's signing time; otherwise the 5-minute window has long passed.
    @Bean
    @Primary
    Clock fixtureClock() {
      return Clock.fixed(F.signedAt(), ZoneOffset.UTC);
    }
  }

  @Autowired MockMvc mvc;

  private ResultActions send(String signature, String authorization) throws Exception {
    return mvc.perform(post("/webhooks/revenuedot")
        .contentType(MediaType.APPLICATION_JSON)
        .content(F.body())
        .header(WebhookSignature.HEADER, signature)
        .header("Authorization", authorization));
  }

  @Test
  void answers200DedupesRetriesAndRefusesBadSignaturesAndAuthorization() throws Exception {
    send(F.signatureHeader(), F.authorizationHeader())
        .andExpect(status().isOk())
        .andExpect(content().string("{\"received\":true}"));
    send(F.signatureHeader(), F.authorizationHeader())
        .andExpect(status().isOk())
        .andExpect(content().string("{\"received\":true,\"duplicate\":true}"));
    send("t=1,v1=00", F.authorizationHeader())
        .andExpect(status().isUnauthorized())
        .andExpect(content().string("{\"error\":\"invalid signature\"}"));
    send(F.signatureHeader(), "Bearer nope")
        .andExpect(status().isUnauthorized())
        .andExpect(content().string("{\"error\":\"invalid authorization\"}"));
  }
}
