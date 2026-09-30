// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: starts the webhook receiver with Deno.serve (`deno task start`).
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { createHandler } from "./app.ts";

const secret = Deno.env.get("REVENUEDOT_WEBHOOK_SECRET");
if (!secret) throw new Error("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)");
const port = Number(Deno.env.get("PORT") ?? 3000);
const handler = createHandler({ secret, authorization: Deno.env.get("REVENUEDOT_WEBHOOK_AUTHORIZATION") || undefined });

Deno.serve({ port, onListen: () => console.log(`Listening on http://localhost:${port}/webhooks/revenuedot`) }, handler);
