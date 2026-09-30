// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: hasEntitlement(appUserId, entitlementId) via REST v1 GET /v1/subscribers/{app_user_id} with a secret key.
// Docs: https://revenuedot.app/docs/api/rest-v1   Migrate from RevenueCat: https://revenuedot.app/docs/migrate

/**
 * Fetches the subscriber object, the same JSON as RevenueCat's GET /v1/subscribers/{app_user_id}.
 * Throws on any answer other than 200 or 201, so a bad key or an outage never reads as "no access" by accident.
 */
export async function getSubscriber(appUserId, { baseUrl = process.env.REVENUEDOT_URL, secretKey = process.env.REVENUEDOT_SECRET_KEY } = {}) {
  if (!baseUrl || !secretKey) throw new Error("Set REVENUEDOT_URL and REVENUEDOT_SECRET_KEY (see .env.example)");
  // App user ids can hold ":" or "/" (anonymous ids look like $RCAnonymousID:...), so always encode them.
  const url = `${baseUrl.replace(/\/+$/, "")}/v1/subscribers/${encodeURIComponent(appUserId)}`;
  // Secret key (sk_...): server-side only. A public app key cannot read other users' data this way.
  const res = await fetch(url, { headers: { authorization: `Bearer ${secretKey}`, accept: "application/json" } });
  // 201 means this call created the subscriber (an id RevenueDot had not seen), exactly as RevenueCat does.
  if (res.status !== 200 && res.status !== 201) {
    const text = await res.text().catch(() => "");
    throw new Error(`RevenueDot GET /v1/subscribers answered ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()).subscriber;
}

/**
 * An entitlement grants access while its expires_date is in the future, forever when expires_date is null
 * (a lifetime purchase), and until grace_period_expires_date while a billing issue is being retried.
 */
export function isEntitlementActive(entitlement, now = new Date()) {
  if (!entitlement) return false;
  if (entitlement.expires_date === null) return true;
  const until = Math.max(Date.parse(entitlement.expires_date), entitlement.grace_period_expires_date ? Date.parse(entitlement.grace_period_expires_date) : 0);
  return until > now.getTime();
}

export async function hasEntitlement(appUserId, entitlementId, { now = new Date(), ...options } = {}) {
  const subscriber = await getSubscriber(appUserId, options);
  return isEntitlementActive(subscriber.entitlements?.[entitlementId], now);
}
