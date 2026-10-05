// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: tests hasEntitlement and GET /api/pro-content against a local fake of GET /v1/subscribers.
// Docs: https://revenuedot.app/docs/api/rest-v1   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { hasEntitlement } from "../src/entitlements.js";
import { createApp } from "../src/server.js";

// A real GET /v1/subscribers response captured from a RevenueDot server (active monthly "pro").
const active = JSON.parse(readFileSync(new URL("./fixtures/subscriber-active.json", import.meta.url), "utf8"));
const now = new Date("2026-10-01T00:00:00Z");
const SECRET_KEY = "sk_test_fake";

const withPro = (pro) => ({ ...active, subscriber: { ...active.subscriber, entitlements: pro ? { pro: { ...active.subscriber.entitlements.pro, ...pro } } : {} } });
const answers = {
  active: [200, active],
  expired: [200, withPro({ expires_date: "2026-09-30T20:43:42Z" })],
  lifetime: [200, withPro({ expires_date: null, product_identifier: "pro_lifetime" })],
  grace: [200, withPro({ expires_date: "2026-09-30T20:43:42Z", grace_period_expires_date: "2026-10-07T20:43:42Z" })],
  "grace-over": [200, withPro({ expires_date: "2026-09-20T00:00:00Z", grace_period_expires_date: "2026-09-27T00:00:00Z" })],
  // RevenueDot, like RevenueCat, creates an unknown subscriber on GET and answers 201 with no entitlements.
  "new-user": [201, withPro(null)],
  "server-error": [500, { code: 7110, message: "Internal server error." }],
};

let fake;
let baseUrl;
const requests = [];
before(async () => {
  fake = createServer((req, res) => {
    requests.push({ url: req.url, authorization: req.headers.authorization });
    const id = decodeURIComponent(req.url.replace(/^\/v1\/subscribers\//, ""));
    const [status, body] = req.headers.authorization !== `Bearer ${SECRET_KEY}` ? [401, { code: 7225, message: "Invalid API Key." }]
      : answers[id] ?? (id.startsWith("$RCAnonymousID:") ? answers.active : [404, {}]);
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
  }).listen(0);
  await new Promise((resolve) => fake.once("listening", resolve));
  baseUrl = `http://localhost:${fake.address().port}/`;
});
after(() => fake.close());

const check = (id, options = {}) => hasEntitlement(id, "pro", { baseUrl, secretKey: SECRET_KEY, now, ...options });

test("reads subscriber.entitlements[id]: active, expired, lifetime, grace period, missing", async () => {
  assert.equal(await check("active"), true);
  assert.equal(await check("expired"), false);
  assert.equal(await check("lifetime"), true);
  assert.equal(await check("grace"), true);
  assert.equal(await check("grace-over"), false);
  assert.equal(await check("new-user"), false);
  assert.equal(await hasEntitlement("active", "gold", { baseUrl, secretKey: SECRET_KEY, now }), false);
});

test("sends the secret key and URL-encodes the app user id", async () => {
  requests.length = 0;
  assert.equal(await check("$RCAnonymousID:a b/c"), true);
  assert.deepEqual(requests, [{ url: "/v1/subscribers/%24RCAnonymousID%3Aa%20b%2Fc", authorization: `Bearer ${SECRET_KEY}` }]);
});

test("throws on 401 and 5xx instead of answering false", async () => {
  await assert.rejects(check("active", { secretKey: "sk_wrong" }), /answered 401/);
  await assert.rejects(check("server-error"), /answered 500/);
  await assert.rejects(hasEntitlement("active", "pro", { baseUrl: "", secretKey: "" }), /REVENUEDOT_URL/);
});

test("GET /api/pro-content gates on the entitlement", async () => {
  const app = createApp({ check: (id, ent) => check(id).then((ok) => ok && ent === "pro") }).listen(0);
  await new Promise((resolve) => app.once("listening", resolve));
  const get = (headers) => fetch(`http://localhost:${app.address().port}/api/pro-content`, { headers });
  try {
    let res = await get({ "x-user-id": "active" });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { content: "Pro content for active" });
    assert.equal((await get({ "x-user-id": "expired" })).status, 403);
    assert.equal((await get({})).status, 401);
    assert.equal((await get({ "x-user-id": "server-error" })).status, 502);
  } finally {
    app.close();
  }
});
