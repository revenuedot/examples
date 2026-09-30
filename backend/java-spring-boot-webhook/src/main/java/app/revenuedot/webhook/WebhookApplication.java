// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Spring Boot entry point; provides the Clock the signature check reads "now" from.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.webhook;

import java.time.Clock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class WebhookApplication {
  // A bean rather than Instant.now() so tests can freeze time at the fixture's signing time.
  @Bean
  Clock clock() {
    return Clock.systemUTC();
  }

  public static void main(String[] args) {
    SpringApplication.run(WebhookApplication.class, args);
  }
}
