// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: starts the Fastify webhook receiver (`npm start`, reads .env).
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { buildApp } from "./app.js";

const secret = process.env.REVENUEDOT_WEBHOOK_SECRET;
if (!secret) throw new Error("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)");
const port = Number(process.env.PORT ?? 3000);
const app = buildApp({ secret, authorization: process.env.REVENUEDOT_WEBHOOK_AUTHORIZATION || undefined, logger: true });

// 0.0.0.0 so a RevenueDot running in Docker can reach it through host.docker.internal.
await app.listen({ port, host: "0.0.0.0" });
