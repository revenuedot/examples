// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: root module; forRoot takes the webhook config so tests can pass a fixed secret and clock.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { Module, type DynamicModule } from "@nestjs/common";
import { WEBHOOK_CONFIG, WebhookController, type WebhookConfig } from "./webhook.controller.js";

@Module({})
export class AppModule {
  static forRoot(config: WebhookConfig): DynamicModule {
    return { module: AppModule, controllers: [WebhookController], providers: [{ provide: WEBHOOK_CONFIG, useValue: config }] };
  }
}
