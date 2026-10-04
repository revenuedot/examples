// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: points react-native-purchases at your RevenueDot server and configures it once.
// Docs: https://revenuedot.app/docs/sdks/react-native   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

const serverURL = process.env.EXPO_PUBLIC_REVENUEDOT_URL;
const testKey = process.env.EXPO_PUBLIC_REVENUEDOT_API_KEY;
const storeKey = Platform.select({ ios: process.env.EXPO_PUBLIC_REVENUEDOT_IOS_KEY, android: process.env.EXPO_PUBLIC_REVENUEDOT_ANDROID_KEY });

/** The entitlement the subscription unlocks: its lookup key in your RevenueDot project. */
export const ENTITLEMENT = process.env.EXPO_PUBLIC_REVENUEDOT_ENTITLEMENT || "pro";

/** The server host, shown on the home screen ("api.revenuedot.app", "localhost:8787"). */
export const serverHost = serverURL ? serverURL.replace(/^[a-z]+:\/\//i, "").split("/")[0] : "not set";

let configured: Promise<void> | null = null;

/** Safe to call from several places: the SDK is configured once. */
export function configureRevenueDot(): Promise<void> {
  configured ??= (async () => {
    if (!serverURL) throw new Error("Set EXPO_PUBLIC_REVENUEDOT_URL in .env.local (see .env.example).");
    const apiKey = storeKey || testKey;
    if (!apiKey || apiKey === "test_replace_me") throw new Error("Set EXPO_PUBLIC_REVENUEDOT_API_KEY in .env.local, or run: npm run setup:test-store");
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    // Point the SDK at your RevenueDot server; nothing else in the app changes. It must run before configure.
    await Purchases.setProxyURL(serverURL.replace(/\/+$/, ""));
    // No appUserID: the SDK uses an anonymous id until you call Purchases.logIn(yourUserId).
    // Response-signature checks stay at the React Native default (disabled), which a self-hosted server needs.
    Purchases.configure({ apiKey });
  })();
  return configured;
}

/** The SDK rejects with plain objects ({ message, code, ... }), not Error instances, so read the message from either. */
export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
