// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: configures purchases-js to talk to your RevenueDot server instead of RevenueCat.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { Purchases } from "@revenuecat/purchases-js";

// Next.js inlines NEXT_PUBLIC_ variables into the browser bundle only when they are written out in full like this.
const serverURL = process.env.NEXT_PUBLIC_REVENUEDOT_URL;
const apiKey = process.env.NEXT_PUBLIC_REVENUEDOT_API_KEY;

/** purchases-js needs an app user id up front. Keep an anonymous one per browser until the user signs in. */
function storedUserId(): string {
  const saved = localStorage.getItem("revenuedot_app_user_id");
  if (saved) return saved;
  const id = Purchases.generateRevenueCatAnonymousAppUserId();
  localStorage.setItem("revenuedot_app_user_id", id);
  return id;
}

/** Call only in the browser (for example in useEffect): it reads localStorage. */
export function configureRevenueDot(): Purchases {
  if (!serverURL || !apiKey) {
    throw new Error("Set NEXT_PUBLIC_REVENUEDOT_URL and NEXT_PUBLIC_REVENUEDOT_API_KEY in .env.local (see .env.example)");
  }
  return Purchases.configure({
    apiKey,
    appUserId: storedUserId(),
    // Point the SDK at your RevenueDot server; nothing else in the app changes.
    httpConfig: { proxyURL: serverURL.replace(/\/+$/, "") },
    // Analytics events do not use the proxy URL (they go to RevenueCat's events host), so turn them off.
    flags: { collectAnalyticsEvents: false },
  });
}

export function rememberUserId(id: string) {
  localStorage.setItem("revenuedot_app_user_id", id);
}
