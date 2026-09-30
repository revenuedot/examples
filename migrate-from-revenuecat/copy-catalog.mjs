#!/usr/bin/env node
// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: copies a project's catalog (apps, products, entitlements, offerings, packages) between two REST API v2 servers.
// Docs: https://revenuedot.app/docs/migrate   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
//
// RevenueDot's REST API v2 uses RevenueCat's API v2 paths and shapes, so the same code reads from RevenueCat and writes
// to RevenueDot. It creates what is missing and reuses what exists (matched by store identifier and lookup key),
// so it is safe to run again. It never touches customers or purchases.
//
//   SOURCE_URL=https://api.revenuecat.com SOURCE_KEY=sk_... SOURCE_PROJECT=proj... \
//   DEST_URL=https://revenuedot.example.com DEST_KEY=sk_... DEST_PROJECT=proj... \
//   node copy-catalog.mjs [--dry-run]
//
// Needs Node.js 18+. SOURCE_KEY needs read access to the project configuration; DEST_KEY needs read_write.

const env = (name, fallback) => {
  const v = process.env[name] ?? fallback;
  if (!v) { console.error(`Set ${name}. See the comment at the top of this file.`); process.exit(1); }
  return v.replace(/\/+$/, "");
};
const source = { url: env("SOURCE_URL", "https://api.revenuecat.com"), key: env("SOURCE_KEY"), project: env("SOURCE_PROJECT") };
const dest = { url: env("DEST_URL"), key: env("DEST_KEY"), project: env("DEST_PROJECT") };
const dryRun = process.argv.includes("--dry-run");

async function call(server, method, path, body) {
  const res = await fetch(`${server.url}/v2/projects/${server.project}${path}`, {
    method,
    headers: { authorization: `Bearer ${server.key}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${server.url}${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

/** Follows next_page until the list ends (both APIs use the same list envelope). */
async function list(server, path) {
  const items = [];
  let next = `${path}${path.includes("?") ? "&" : "?"}limit=100`;
  while (next) {
    const page = await call(server, "GET", next);
    items.push(...page.items);
    next = page.next_page ? page.next_page.replace(/^.*\/v2\/projects\/[^/]+/, "") : null;
  }
  return items;
}

const write = async (server, method, path, body, label) => {
  console.log(`${dryRun ? "would " : ""}${label}`);
  return dryRun ? { id: `dry_${Math.random().toString(36).slice(2, 8)}` } : call(server, method, path, body);
};

// The store id of an app: bundle id (App Store) or package name (Google Play). Test Store and web apps match by type.
const storeKey = (app) => `${app.type}:${app.app_store?.bundle_id ?? app.mac_app_store?.bundle_id ?? app.play_store?.package_name ?? app.amazon?.package_name ?? ""}`;

// 1. Apps. Store credentials are never readable through the API, so add them in RevenueDot afterwards.
const appMap = new Map();
const destApps = await list(dest, "/apps");
for (const app of await list(source, "/apps")) {
  let match = destApps.find((a) => storeKey(a) === storeKey(app));
  if (!match) {
    const details = app[app.type] && typeof app[app.type] === "object"
      ? Object.fromEntries(Object.entries(app[app.type]).filter(([k]) => ["bundle_id", "package_name"].includes(k)))
      : undefined;
    match = await write(dest, "POST", "/apps", { name: app.name, type: app.type, ...(details ? { [app.type]: details } : {}) }, `create app ${app.name} (${app.type})`);
  }
  appMap.set(app.id, match.id);
}

// 2. Products, matched by (app, store_identifier).
const productMap = new Map();
const destProducts = await list(dest, "/products");
for (const p of await list(source, "/products")) {
  const appId = appMap.get(p.app_id);
  if (!appId) { console.warn(`skip product ${p.store_identifier}: its app was not copied`); continue; }
  let match = destProducts.find((d) => d.app_id === appId && d.store_identifier === p.store_identifier);
  if (!match) {
    match = await write(dest, "POST", "/products", {
      store_identifier: p.store_identifier, app_id: appId, type: p.type, display_name: p.display_name ?? null,
      ...(p.subscription?.duration ? { subscription: { duration: p.subscription.duration } } : {}),
    }, `create product ${p.store_identifier}`);
  }
  productMap.set(p.id, match.id);
}

// 3. Entitlements, matched by lookup_key, with their products attached.
const destEntitlements = await list(dest, "/entitlements");
for (const e of await list(source, "/entitlements")) {
  const match = destEntitlements.find((d) => d.lookup_key === e.lookup_key)
    ?? await write(dest, "POST", "/entitlements", { lookup_key: e.lookup_key, display_name: e.display_name }, `create entitlement ${e.lookup_key}`);
  const ids = (await list(source, `/entitlements/${e.id}/products`)).map((p) => productMap.get(p.id)).filter(Boolean);
  if (ids.length) await write(dest, "POST", `/entitlements/${match.id}/actions/attach_products`, { product_ids: ids }, `attach ${ids.length} product(s) to ${e.lookup_key}`);
}

// 4. Offerings and packages, matched by lookup_key; the current offering stays current.
const destOfferings = await list(dest, "/offerings");
for (const o of await list(source, "/offerings")) {
  let match = destOfferings.find((d) => d.lookup_key === o.lookup_key);
  if (!match) match = await write(dest, "POST", "/offerings", { lookup_key: o.lookup_key, display_name: o.display_name, metadata: o.metadata ?? null }, `create offering ${o.lookup_key}`);
  if (o.is_current && !match.is_current) await write(dest, "POST", `/offerings/${match.id}`, { is_current: true }, `make ${o.lookup_key} current`);
  const destPackages = dryRun && match.id.startsWith("dry_") ? [] : await list(dest, `/offerings/${match.id}/packages`);
  for (const pkg of await list(source, `/offerings/${o.id}/packages`)) {
    const target = destPackages.find((d) => d.lookup_key === pkg.lookup_key)
      ?? await write(dest, "POST", `/offerings/${match.id}/packages`, { lookup_key: pkg.lookup_key, display_name: pkg.display_name, position: pkg.position ?? undefined }, `create package ${o.lookup_key}/${pkg.lookup_key}`);
    const products = (await list(source, `/packages/${pkg.id}/products`))
      .map((x) => ({ product_id: productMap.get(x.product.id), eligibility_criteria: x.eligibility_criteria ?? "all" }))
      .filter((x) => x.product_id);
    if (products.length) await write(dest, "POST", `/packages/${target.id}/actions/attach_products`, { products }, `attach ${products.length} product(s) to ${o.lookup_key}/${pkg.lookup_key}`);
  }
}

console.log(`\nDone${dryRun ? " (dry run, nothing written)" : ""}. Next: add store credentials to each app in RevenueDot, then compare offerings:`);
console.log(`  curl -H "Authorization: Bearer <public app key>" ${dest.url}/v1/subscribers/any_user/offerings`);
