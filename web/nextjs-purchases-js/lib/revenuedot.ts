// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: configures purchases-js to talk to your RevenueDot server instead of RevenueCat.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { Purchases } from "@revenuecat/purchases-js";

// Next.js inlines NEXT_PUBLIC_ variables into the browser bundle only when they are written out in full like this.
const serverURL = process.env.NEXT_PUBLIC_REVENUEDOT_URL;
const apiKey = process.env.NEXT_PUBLIC_REVENUEDOT_API_KEY;

/** The entitlement lookup key created in the dashboard or by seed.sh. */
export const ENTITLEMENT = "pro";

/** Your app's universal link. The success screen appends ?app_user_id=… so the app can logIn as the same customer. */
export const OPEN_APP_URL = process.env.NEXT_PUBLIC_OPEN_APP_URL || "https://focus.example/open";

/** Apple and Google expect Terms and Privacy next to any subscription offer. Replace both with your own pages. */
export const TERMS_URL = "https://revenuedot.app/legal/terms";
export const PRIVACY_URL = "https://revenuedot.app/legal/privacy";

/** False with the placeholder key from .env.example: the funnel then shows preview plans and never calls the SDK. */
export const isConfigured = Boolean(serverURL && apiKey && !/replace_me|placeholder/i.test(apiKey));

export const serverHost = (() => {
  try { return serverURL ? new URL(serverURL).host : "not set"; } catch { return serverURL ?? "not set"; }
})();

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
  if (!isConfigured || !serverURL || !apiKey) {
    throw new Error("Set NEXT_PUBLIC_REVENUEDOT_URL and NEXT_PUBLIC_REVENUEDOT_API_KEY in .env.local (see .env.example).");
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
