// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: tests the Deno webhook with a real signed delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import fixture from "./testdata/initial-purchase.json" with { type: "json" };
import { verifySignature } from "./verify.ts";
import { createHandler } from "./app.ts";

// Plain asserts keep the example free of remote imports, so `deno test` needs no network.
function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const signedAt = new Date(Number(/t=(\d+)/.exec(fixture.signature_header)![1]) * 1000);

Deno.test("accepts the real delivery and rejects tampering, wrong secrets and old deliveries", async () => {
  assertEquals(await verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: signedAt }), true);
  assertEquals(await verifySignature(new TextEncoder().encode(fixture.body), fixture.signature_header, fixture.secret, { now: signedAt }), true);
  assertEquals(await verifySignature(fixture.body.replace("9.99", "0.99"), fixture.signature_header, fixture.secret, { now: signedAt }), false);
  assertEquals(await verifySignature(fixture.body, fixture.signature_header, "whsec_wrong", { now: signedAt }), false);
  assertEquals(await verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: new Date(signedAt.getTime() + 301_000) }), false);
  assertEquals(await verifySignature(fixture.body, undefined, fixture.secret, { now: signedAt }), false);
});

Deno.test("POST /webhooks/revenuedot answers 200, dedupes retries and refuses bad signatures", async () => {
  const handler = createHandler({ secret: fixture.secret, authorization: fixture.authorization_header, now: () => signedAt });
  const send = (headers: Record<string, string>) =>
    handler(new Request("http://localhost/webhooks/revenuedot", { method: "POST", body: fixture.body, headers: { "content-type": "application/json", ...headers } }));
  const good = { "x-revenuecat-webhook-signature": fixture.signature_header, authorization: fixture.authorization_header };

  let res = await send(good);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { received: true });
  res = await send(good);
  assertEquals(await res.json(), { received: true, duplicate: true });
  res = await send({ ...good, "x-revenuecat-webhook-signature": "t=1,v1=00" });
  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: "invalid signature" });
  res = await send({ ...good, authorization: "Bearer nope" });
  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: "invalid authorization" });
});
