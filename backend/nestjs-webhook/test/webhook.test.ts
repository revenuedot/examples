// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: tests the Nest webhook with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { Test } from "@nestjs/testing";
import { verifySignature } from "../src/verify.js";
import { AppModule } from "../src/app.module.js";

// Tests run from dist/test/, so the fixture is two folders up in the source tree.
const fixture = JSON.parse(readFileSync(new URL("../../test/fixtures/initial-purchase.json", import.meta.url), "utf8"));
const signedAt = new Date(Number(/t=(\d+)/.exec(fixture.signature_header)![1]) * 1000);

test("accepts the real delivery and rejects tampering, wrong secrets and old deliveries", () => {
  assert.equal(verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: signedAt }), true);
  assert.equal(verifySignature(Buffer.from(fixture.body), fixture.signature_header, fixture.secret, { now: signedAt }), true);
  assert.equal(verifySignature(fixture.body.replace("9.99", "0.99"), fixture.signature_header, fixture.secret, { now: signedAt }), false);
  assert.equal(verifySignature(fixture.body, fixture.signature_header, "whsec_wrong", { now: signedAt }), false);
  assert.equal(verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: new Date(signedAt.getTime() + 301_000) }), false);
  assert.equal(verifySignature(fixture.body, undefined, fixture.secret, { now: signedAt }), false);
});

test("POST /webhooks/revenuedot answers 200, dedupes retries and refuses bad signatures", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot({ secret: fixture.secret, authorization: fixture.authorization_header, now: () => signedAt })],
  }).compile();
  const app = moduleRef.createNestApplication({ rawBody: true, logger: false });
  await app.listen(0);
  const { port } = app.getHttpServer().address() as AddressInfo;
  const send = (headers: Record<string, string>) =>
    fetch(`http://localhost:${port}/webhooks/revenuedot`, { method: "POST", body: fixture.body, headers: { "content-type": "application/json", ...headers } });
  const good = { "x-revenuecat-webhook-signature": fixture.signature_header, authorization: fixture.authorization_header };
  try {
    let res = await send(good);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true });
    res = await send(good);
    assert.deepEqual(await res.json(), { received: true, duplicate: true });
    res = await send({ ...good, "x-revenuecat-webhook-signature": "t=1,v1=00" });
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "invalid signature" });
    res = await send({ ...good, authorization: "Bearer nope" });
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "invalid authorization" });
  } finally {
    await app.close();
  }
});
