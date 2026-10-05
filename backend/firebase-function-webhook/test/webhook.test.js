// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests the webhook handler with a real signed delivery captured from a RevenueDot server and a fake req/res.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifySignature } from "../src/verify.js";
import { createWebhookHandler } from "../src/webhook.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/initial-purchase.json", import.meta.url), "utf8"));
const signedAt = new Date(Number(/t=(\d+)/.exec(fixture.signature_header)[1]) * 1000);

// What Cloud Functions hands the handler: lower-cased headers, the parsed body and the raw bytes in rawBody.
const fakeReq = (headers) => ({
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: JSON.parse(fixture.body),
  rawBody: Buffer.from(fixture.body),
});
const fakeRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

test("accepts the real delivery and rejects tampering, wrong secrets and old deliveries", () => {
  assert.equal(verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: signedAt }), true);
  assert.equal(verifySignature(fixture.body.replace("9.99", "0.99"), fixture.signature_header, fixture.secret, { now: signedAt }), false);
  assert.equal(verifySignature(fixture.body, fixture.signature_header, "whsec_wrong", { now: signedAt }), false);
  assert.equal(verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: new Date(signedAt.getTime() + 301_000) }), false);
  assert.equal(verifySignature(fixture.body, undefined, fixture.secret, { now: signedAt }), false);
});

test("handler answers 200, dedupes retries and refuses bad signatures", () => {
  const handle = createWebhookHandler({ secret: fixture.secret, authorization: fixture.authorization_header, now: () => signedAt });
  const good = { "x-revenuecat-webhook-signature": fixture.signature_header, authorization: fixture.authorization_header };
  const send = (headers) => {
    const res = fakeRes();
    handle(fakeReq(headers), res);
    return res;
  };
  let res = send(good);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { received: true });
  assert.deepEqual(send(good).body, { received: true, duplicate: true });
  res = send({ ...good, "x-revenuecat-webhook-signature": "t=1,v1=00" });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "invalid signature" });
  res = send({ ...good, authorization: "Bearer nope" });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "invalid authorization" });
});
