// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: tests the Express webhook with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifySignature } from "../src/verify.js";
import { createApp } from "../src/server.js";

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
  const app = createApp({ secret: fixture.secret, authorization: fixture.authorization_header, now: () => signedAt });
  const server = app.listen(0);
  const url = `http://localhost:${server.address().port}/webhooks/revenuedot`;
  const send = (headers) => fetch(url, { method: "POST", body: fixture.body, headers: { "content-type": "application/json", ...headers } });
  try {
    const good = { "x-revenuecat-webhook-signature": fixture.signature_header, authorization: fixture.authorization_header };
    let res = await send(good);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true });
    res = await send(good);
    assert.deepEqual(await res.json(), { received: true, duplicate: true });
    assert.equal((await send({ authorization: fixture.authorization_header })).status, 401);
    assert.equal((await send({ ...good, authorization: "Bearer nope" })).status, 401);
  } finally {
    server.close();
  }
});
