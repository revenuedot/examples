// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests the Worker with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { expect, test } from "vitest";
import fixture from "./fixtures/initial-purchase.json";
import { verifySignature } from "../src/verify";
import { handleRequest } from "../src/index";

const signedAt = new Date(Number(/t=(\d+)/.exec(fixture.signature_header)![1]) * 1000);
const env = { REVENUEDOT_WEBHOOK_SECRET: fixture.secret, REVENUEDOT_WEBHOOK_AUTHORIZATION: fixture.authorization_header };

test("accepts the real delivery and rejects tampering, wrong secrets and old deliveries", async () => {
  expect(await verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: signedAt })).toBe(true);
  expect(await verifySignature(new TextEncoder().encode(fixture.body), fixture.signature_header, fixture.secret, { now: signedAt })).toBe(true);
  expect(await verifySignature(fixture.body.replace("9.99", "0.99"), fixture.signature_header, fixture.secret, { now: signedAt })).toBe(false);
  expect(await verifySignature(fixture.body, fixture.signature_header, "whsec_wrong", { now: signedAt })).toBe(false);
  expect(await verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: new Date(signedAt.getTime() + 301_000) })).toBe(false);
  expect(await verifySignature(fixture.body, undefined, fixture.secret, { now: signedAt })).toBe(false);
});

test("POST /webhooks/revenuedot answers 200, dedupes retries and refuses bad signatures", async () => {
  const send = (headers: Record<string, string>) =>
    handleRequest(
      new Request("https://worker.example/webhooks/revenuedot", { method: "POST", body: fixture.body, headers: { "content-type": "application/json", ...headers } }),
      env,
      signedAt,
    );
  const good = { "x-revenuecat-webhook-signature": fixture.signature_header, authorization: fixture.authorization_header };

  let res = await send(good);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ received: true });
  res = await send(good);
  expect(await res.json()).toEqual({ received: true, duplicate: true });
  res = await send({ ...good, "x-revenuecat-webhook-signature": "t=1,v1=00" });
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: "invalid signature" });
  res = await send({ ...good, authorization: "Bearer nope" });
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: "invalid authorization" });
});
