// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: points react-native-purchases at your RevenueDot server and configures it once.
// Docs: https://revenuedot.app/docs/sdks/react-native   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

const serverURL = process.env.EXPO_PUBLIC_REVENUEDOT_URL;
const testKey = process.env.EXPO_PUBLIC_REVENUEDOT_API_KEY;
const storeKey = Platform.select({ ios: process.env.EXPO_PUBLIC_REVENUEDOT_IOS_KEY, android: process.env.EXPO_PUBLIC_REVENUEDOT_ANDROID_KEY });

/** The server host the app talks to, for the Developer section ("localhost:8787", "api.revenuedot.app"). */
export const serverHost = serverURL ? serverURL.replace(/^[a-z]+:\/\//i, "").split("/")[0] : "not set";

let configured: Promise<void> | null = null;

/** Safe to call from several places: the SDK is configured once. */
export function configureRevenueDot(): Promise<void> {
  configured ??= (async () => {
    if (!serverURL) throw new Error("Set EXPO_PUBLIC_REVENUEDOT_URL in .env (see .env.example)");
    const apiKey = storeKey || testKey;
    if (!apiKey) throw new Error("Set EXPO_PUBLIC_REVENUEDOT_API_KEY in .env (see .env.example)");
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    // Point the SDK at your RevenueDot server; nothing else in the app changes. It must run before configure.
    await Purchases.setProxyURL(serverURL.replace(/\/+$/, ""));
    // No appUserID: the SDK starts with an anonymous id ($RCAnonymousID:...) until logIn.
    // Response-signature checks stay at the React Native default (disabled), which RevenueDot needs.
    Purchases.configure({ apiKey });
  })();
  return configured;
}
