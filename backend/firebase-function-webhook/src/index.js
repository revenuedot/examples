// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: Firebase Functions v2 HTTPS function `revenuedotWebhook` that wires secrets into the webhook handler.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { createWebhookHandler } from "./webhook.js";

// Stored in Cloud Secret Manager: `firebase functions:secrets:set REVENUEDOT_WEBHOOK_SECRET`.
const webhookSecret = defineSecret("REVENUEDOT_WEBHOOK_SECRET");
// Optional. A secret cannot be empty, so this is a param with an empty default; set it in .env to turn the check on.
const webhookAuthorization = defineString("REVENUEDOT_WEBHOOK_AUTHORIZATION", { default: "" });

let handle;
export const revenuedotWebhook = onRequest({ secrets: [webhookSecret] }, (req, res) => {
  // Secret values exist only at run time, so build the handler on the first request and reuse it (and its dedupe set).
  handle ??= createWebhookHandler({ secret: webhookSecret.value(), authorization: webhookAuthorization.value() || undefined });
  return handle(req, res);
});
