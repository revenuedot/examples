// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: Supabase Edge Function entry point that serves the RevenueDot webhook handler.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { createHandler } from "./handler.ts";

// Set with `supabase secrets set REVENUEDOT_WEBHOOK_SECRET=whsec_...` (and supabase/functions/.env for `supabase functions serve`).
const secret = Deno.env.get("REVENUEDOT_WEBHOOK_SECRET");
if (!secret) throw new Error("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)");
const handler = createHandler({ secret, authorization: Deno.env.get("REVENUEDOT_WEBHOOK_AUTHORIZATION") || undefined });

// The Supabase runtime picks its own port; PORT only matters when you run this file with plain `deno run`.
Deno.serve({ port: Number(Deno.env.get("PORT") ?? 8000) }, handler);
