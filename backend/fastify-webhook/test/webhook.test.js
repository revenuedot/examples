// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests the Fastify webhook with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifySignature } from "../src/verify.js";
import { buildApp } from "../src/app.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/initial-purchase.json", import.meta.url), "utf8"));
const signedAt = new Date(Number(/t=(\d+)/.exec(fixture.signature_header)[1]) * 1000);

test("accepts the real delivery and rejects tampering, wrong secrets and old deliveries", () => {
  assert.equal(verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: signedAt }), true);
  assert.equal(verifySignature(Buffer.from(fixture.body), fixture.signature_header, fixture.secret, { now: signedAt }), true);
  assert.equal(verifySignature(fixture.body.replace("9.99", "0.99"), fixture.signature_header, fixture.secret, { now: signedAt }), false);
  assert.equal(verifySignature(fixture.body, fixture.signature_header, "whsec_wrong", { now: signedAt }), false);
  assert.equal(verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: new Date(signedAt.getTime() + 301_000) }), false);
  assert.equal(verifySignature(fixture.body, undefined, fixture.secret, { now: signedAt }), false);
});

test("POST /webhooks/revenuedot answers 200, dedupes retries and refuses bad signatures", async () => {
  const app = buildApp({ secret: fixture.secret, authorization: fixture.authorization_header, now: () => signedAt });
  const send = (headers) =>
    app.inject({ method: "POST", url: "/webhooks/revenuedot", payload: fixture.body, headers: { "content-type": "application/json", ...headers } });
  const good = { "x-revenuecat-webhook-signature": fixture.signature_header, authorization: fixture.authorization_header };
  try {
    let res = await send(good);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { received: true });
    res = await send(good);
    assert.deepEqual(res.json(), { received: true, duplicate: true });
    res = await send({ ...good, "x-revenuecat-webhook-signature": "t=1,v1=00" });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: "invalid signature" });
    res = await send({ ...good, authorization: "Bearer nope" });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: "invalid authorization" });
  } finally {
    await app.close();
  }
});
