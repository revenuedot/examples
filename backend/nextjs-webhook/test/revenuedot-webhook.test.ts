// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests signature verification and the route handler with a real delivery captured from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/initial-purchase.json";
import { verifySignature } from "../lib/revenuedot-webhook";
import { POST } from "../app/api/webhooks/revenuedot/route";

// The fixture's signature was made at t=<unix seconds> in its header; tests run "at" that moment.
const signedAt = new Date(Number(/t=(\d+)/.exec(fixture.signature_header)![1]) * 1000);

describe("verifySignature", () => {
  it("accepts the real delivery", () => {
    expect(verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: signedAt })).toBe(true);
  });
  it("rejects a changed body", () => {
    expect(verifySignature(fixture.body.replace("9.99", "0.99"), fixture.signature_header, fixture.secret, { now: signedAt })).toBe(false);
  });
  it("rejects a re-serialised body (key order and spacing matter)", () => {
    expect(verifySignature(JSON.stringify(JSON.parse(fixture.body), null, 2), fixture.signature_header, fixture.secret, { now: signedAt })).toBe(false);
  });
  it("rejects the wrong secret", () => {
    expect(verifySignature(fixture.body, fixture.signature_header, "whsec_wrong", { now: signedAt })).toBe(false);
  });
  it("rejects a delivery older than 5 minutes", () => {
    const late = new Date(signedAt.getTime() + 301_000);
    expect(verifySignature(fixture.body, fixture.signature_header, fixture.secret, { now: late })).toBe(false);
  });
  it("rejects a missing or malformed header", () => {
    expect(verifySignature(fixture.body, null, fixture.secret, { now: signedAt })).toBe(false);
    expect(verifySignature(fixture.body, "v1=abc", fixture.secret, { now: signedAt })).toBe(false);
  });
});

describe("POST /api/webhooks/revenuedot", () => {
  beforeEach(() => {
    process.env.REVENUEDOT_WEBHOOK_SECRET = fixture.secret;
    process.env.REVENUEDOT_WEBHOOK_AUTHORIZATION = fixture.authorization_header;
    // Freezes `new Date()` too, which the route uses; overriding Date.now alone would not.
    vi.useFakeTimers({ now: signedAt, toFake: ["Date"] });
  });
  afterEach(() => { vi.useRealTimers(); });

  const deliver = (headers: Record<string, string>) =>
    POST(new Request("http://localhost/api/webhooks/revenuedot", { method: "POST", body: fixture.body, headers: { "content-type": "application/json", ...headers } }));

  it("answers 200 to a signed delivery, and 200 with duplicate: true to its retry", async () => {
    const headers = { "x-revenuecat-webhook-signature": fixture.signature_header, authorization: fixture.authorization_header };
    const first = await deliver(headers);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true });
    const again = await deliver(headers);
    expect(await again.json()).toEqual({ received: true, duplicate: true });
  });
  it("answers 401 without a valid signature", async () => {
    expect((await deliver({ authorization: fixture.authorization_header })).status).toBe(401);
  });
  it("answers 401 with the wrong Authorization header", async () => {
    expect((await deliver({ "x-revenuecat-webhook-signature": fixture.signature_header, authorization: "Bearer nope" })).status).toBe(401);
  });
});
