// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: controller for POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { Controller, Headers, HttpCode, Inject, Logger, Post, Req, UnauthorizedException, type RawBodyRequest } from "@nestjs/common";
import type { IncomingMessage } from "node:http";
import { SIGNATURE_HEADER, safeEqual, verifySignature } from "./verify.js";

export const WEBHOOK_CONFIG = Symbol("WEBHOOK_CONFIG");
export interface WebhookConfig {
  secret: string;
  authorization?: string;
  now?: () => Date;
}

type WebhookEvent = {
  id: string;
  type: string;
  app_user_id: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  expiration_reason?: string;
};

@Controller("webhooks")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  // At-least-once delivery: the same event.id can arrive twice. Use a unique index in production.
  private readonly seen = new Set<string>();

  constructor(@Inject(WEBHOOK_CONFIG) private readonly config: WebhookConfig) {}

  @Post("revenuedot")
  @HttpCode(200) // Nest answers POST with 201 by default, and RevenueDot counts only 200 as delivered.
  receive(
    @Req() req: RawBodyRequest<IncomingMessage>,
    @Headers(SIGNATURE_HEADER) signature?: string,
    @Headers("authorization") authorization?: string,
  ) {
    // rawBody (enabled in main.ts) holds the exact bytes the signature covers; req.body is already re-parsed JSON.
    const now = this.config.now?.() ?? new Date();
    if (!req.rawBody || !verifySignature(req.rawBody, signature, this.config.secret, { now })) {
      throw new UnauthorizedException({ error: "invalid signature" });
    }
    if (this.config.authorization && !safeEqual(authorization ?? "", this.config.authorization)) {
      throw new UnauthorizedException({ error: "invalid authorization" });
    }
    const { event } = JSON.parse(req.rawBody.toString("utf8")) as { event: WebhookEvent };
    if (this.seen.has(event.id)) return { received: true, duplicate: true };
    this.seen.add(event.id);

    // Keep the handler fast: only HTTP 200 counts as delivered, and slow answers time out and are retried.
    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
      case "NON_RENEWING_PURCHASE":
      case "PRODUCT_CHANGE":
        this.logger.log(`grant ${event.entitlement_ids?.join(",") ?? "-"} to ${event.app_user_id} until ${event.expiration_at_ms ?? "forever"}`);
        break;
      case "EXPIRATION":
        this.logger.log(`access ended for ${event.app_user_id} (${event.expiration_reason})`);
        break;
      default:
        this.logger.log(`${event.type} for ${event.app_user_id}`);
    }
    return { received: true };
  }
}
