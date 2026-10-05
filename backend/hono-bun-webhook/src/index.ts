// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: starts the Hono webhook receiver on Bun's built-in server (`bun start`, Bun reads .env itself).
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { createApp } from "./app";

const secret = process.env.REVENUEDOT_WEBHOOK_SECRET;
if (!secret) throw new Error("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)");
const port = Number(process.env.PORT ?? 3000);
const app = createApp({ secret, authorization: process.env.REVENUEDOT_WEBHOOK_AUTHORIZATION || undefined });

console.log(`Listening on http://localhost:${port}/webhooks/revenuedot`);
export default { port, fetch: app.fetch };
