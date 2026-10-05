// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: boots the Nest app with rawBody enabled (`npm start`, reads .env).
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const secret = process.env.REVENUEDOT_WEBHOOK_SECRET;
if (!secret) throw new Error("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)");
const port = Number(process.env.PORT ?? 3000);

// rawBody: true keeps the exact request bytes on req.rawBody; the HMAC signature is computed over them.
const app = await NestFactory.create(AppModule.forRoot({ secret, authorization: process.env.REVENUEDOT_WEBHOOK_AUTHORIZATION || undefined }), { rawBody: true });
await app.listen(port);
console.log(`Listening on http://localhost:${port}/webhooks/revenuedot`);
