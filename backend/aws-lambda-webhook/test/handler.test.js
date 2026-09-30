// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: tests the Lambda handler with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifySignature } from "../src/verify.js";
import { createHandler } from "../src/handler.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/initial-purchase.json", import.meta.url), "utf8"));
const signedAt = new Date(Number(/t=(\d+)/.exec(fixture.signature_header)[1]) * 1000);

// A Function URL / HTTP API payload v2 event, trimmed to the fields the handler reads.
const lambdaEvent = (headers, { base64 = false } = {}) => ({
  version: "2.0",
  rawPath: "/webhooks/revenuedot",
  requestContext: { http: { method: "POST", path: "/webhooks/revenuedot" } },
  headers: { "content-type": "application/json", "user-agent": "RevenueDot-Webhooks/1.0", ...headers },
  body: base64 ? Buffer.from(fixture.body).toString("base64") : fixture.body,
  isBase64Encoded: base64,
});

test("accepts the real delivery and rejects tampering, wrong secrets and old deliveries", () => {
  assert.equal(verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: signedAt }), true);
  assert.equal(verifySignature(fixture.body.replace("9.99", "0.99"), fixture.signature_header, fixture.secret, { now: signedAt }), false);
  assert.equal(verifySignature(fixture.body, fixture.signature_header, "whsec_wrong", { now: signedAt }), false);
  assert.equal(verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: new Date(signedAt.getTime() + 301_000) }), false);
  assert.equal(verifySignature(fixture.body, undefined, fixture.secret, { now: signedAt }), false);
});

test("handler answers 200, dedupes retries and refuses bad signatures", async () => {
  const handler = createHandler({ secret: fixture.secret, authorization: fixture.authorization_header, now: () => signedAt });
  const good = { "x-revenuecat-webhook-signature": fixture.signature_header, authorization: fixture.authorization_header };
  let res = await handler(lambdaEvent(good));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { received: true });
  res = await handler(lambdaEvent(good));
  assert.deepEqual(JSON.parse(res.body), { received: true, duplicate: true });
  res = await handler(lambdaEvent({ ...good, "x-revenuecat-webhook-signature": "t=1,v1=00" }));
  assert.equal(res.statusCode, 401);
  assert.deepEqual(JSON.parse(res.body), { error: "invalid signature" });
  res = await handler(lambdaEvent({ ...good, authorization: "Bearer nope" }));
  assert.equal(res.statusCode, 401);
  assert.deepEqual(JSON.parse(res.body), { error: "invalid authorization" });
});

test("handler verifies a base64-encoded body", async () => {
  const handler = createHandler({ secret: fixture.secret, now: () => signedAt });
  const res = await handler(lambdaEvent({ "x-revenuecat-webhook-signature": fixture.signature_header }, { base64: true }));
  assert.equal(res.statusCode, 200);
});
