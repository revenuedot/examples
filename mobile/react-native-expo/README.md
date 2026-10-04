# Expo starter with in-app purchases on RevenueDot

## What this is
A clean Expo Router app (Expo SDK 57) with subscriptions already working: a paywall screen that lists your offering, buying, **Restore purchases**, an entitlement gate (`<ProGate>`) around the paid part of the app, and a setup script for the built-in Test Store, so it runs without an App Store or Google Play account. It uses RevenueCat's `react-native-purchases` API through RevenueDot's fork, installed as an npm alias, so every RevenueCat tutorial still applies.

**Status:** `npm run typecheck`, `expo-doctor` (21 of 21 checks) and `expo export` for iOS and web pass, and the project scaffolds with the one-line command below. The purchase flow itself has not been run in this starter; its SDK calls are the same ones the [Focus sample](../react-native-expo-focus) ran against a RevenueDot server (Test Store purchase on the web, entitlement turning active). No simulator run, no Android build.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so an app switches by setting one proxy URL.

## Install
One line, then answer the folder-name prompt:
```bash
npx create-expo-app --example https://github.com/revenuedot/examples/tree/main/mobile/react-native-expo
```
That downloads this folder and runs `npm install`. (`create-expo-app` reads the URL, so the same line works for a fork or a branch.)

## Run it
You need a RevenueDot project with a Test Store app. Create a free account at https://app.revenuedot.app/signup, confirm your email, then in the new project folder:

```bash
RD_EMAIL=you@example.com RD_PASSWORD='your password' npm run setup:test-store   # creates the Test Store app, "pro" entitlement and "default" offering, writes .env.local
npx expo start                                                                   # press i (iOS simulator), a (Android emulator) or w (web), or scan the QR code with Expo Go
```

Tap **Unlock Pro**, pick a plan, **Continue**, then **Test valid purchase** in the SDK's dialog. The Pro card on the home screen unlocks, and the purchase appears under Customers in the dashboard. Close and reopen the app, or tap **Restore purchases**, and Pro stays on.

Running your own server instead: start [`selfhost/docker-compose`](../../selfhost/docker-compose), then `RD_URL=http://localhost:8787 npm run setup:test-store`. Where the app runs decides the URL (`http://localhost:8787` for the iOS simulator and web, `http://10.0.2.2:8787` for an Android emulator, your computer's LAN address for a phone). iOS blocks plain `http://` to anything but `localhost`, so a phone needs an `https://` URL.

In **Expo Go and on the web**, the SDK runs in browser mode and only accepts `test_` keys. For real App Store or Google Play purchases, make a development build (`npx expo run:ios` or `npx expo run:android`), connect the stores to RevenueDot ([App Store](https://revenuedot.app/docs/guides/app-store), [Google Play](https://revenuedot.app/docs/guides/google-play)) and set `EXPO_PUBLIC_REVENUEDOT_IOS_KEY` or `EXPO_PUBLIC_REVENUEDOT_ANDROID_KEY`.

## What to change
1. **Names:** `name`, `slug`, `scheme`, `ios.bundleIdentifier` and `android.package` in `app.json`.
2. **Entitlement:** `EXPO_PUBLIC_REVENUEDOT_ENTITLEMENT` in `.env.local` (default `pro`). It must match the lookup key of an entitlement in your project.
3. **The paid part:** replace the "Pro unlocked" card in `app/index.tsx`. Anything inside `<ProGate>` renders only while the entitlement is active.
4. **Products and prices:** edit them in the dashboard (Product catalog), not in code. The paywall renders whatever the current offering holds.
5. **Paywall look and legal links:** `app/paywall.tsx`. Apple requires Terms of Use and Privacy Policy links on every paywall.
6. **Users:** after sign-in, call `Purchases.logIn(yourUserId)` so purchases follow the account across devices.

## Use with your coding agent
The folder ships an [`AGENTS.md`](AGENTS.md) that Claude Code, Codex, Cursor and similar agents read automatically. Open the new project in your agent and ask, for example:

- "Add a monthly and yearly plan toggle to the paywall."
- "Gate the new Reports screen behind the pro entitlement."
- "Sign users in with Supabase and call Purchases.logIn with their id."

Agents can read RevenueDot's docs at https://revenuedot.app/llms.txt, and the [RevenueDot MCP server](https://mcp.revenuedot.app) manages products and entitlements for them. They should keep `import Purchases from "react-native-purchases"` and the order in `lib/revenuedot.ts` (`setProxyURL`, then `configure`).

## How it works
- **`lib/revenuedot.ts`** awaits `Purchases.setProxyURL(serverURL)` and then calls `Purchases.configure({ apiKey })`. The proxy URL must be set before `configure`, and the native SDKs ignore any path in it, so serve RevenueDot at the root of its host. See [React Native SDK](https://revenuedot.app/docs/sdks/react-native).
- **`lib/purchases.tsx`** calls `getCustomerInfo()` and `getOfferings()` once configured, runs `purchasePackage(pkg)` and `restorePurchases()`, and listens with `addCustomerInfoUpdateListener`, so the gate updates after every purchase, restore and renewal. A cancelled purchase (`userCancelled`) shows nothing.
- **`lib/ProGate.tsx`** is the gate: `customerInfo.entitlements.active["pro"]` decides which side renders.
- **`app/paywall.tsx`** lists `offerings.current.availablePackages` with the store's own price strings, so prices and currencies are always right.
- **`scripts/setup-test-store.sh`** runs the shared [seed script](../../selfhost/docker-compose/seed.sh): a Test Store app, three products, the `pro` entitlement and the `default` offering. It is safe to run twice.
- **Response signatures:** `react-native-purchases` defaults `entitlementVerificationMode` to disabled, which a self-hosted RevenueDot needs. Leave it unset.
- **Analytics:** in browser mode (web and Expo Go) the SDK also sends analytics events to RevenueCat's events host, which the proxy URL does not cover.

## Migrate from RevenueCat
```diff
-"react-native-purchases": "^10.10.2",
+"react-native-purchases": "npm:@revenuedot/react-native-purchases@10.10.2",
```
```diff
 import Purchases from "react-native-purchases";

+// Point the SDK at your RevenueDot server; nothing else in the app changes.
+await Purchases.setProxyURL("https://api.revenuedot.app");
 Purchases.configure({ apiKey: Platform.OS === "ios" ? "appl_..." : "goog_..." });
```
If you set `entitlementVerificationMode` to `INFORMATIONAL`, remove it. The full plan: [Migrate from RevenueCat](https://revenuedot.app/docs/migrate).

## Docs
- [React Native SDK guide](https://revenuedot.app/docs/sdks/react-native)
- [Quickstart](https://revenuedot.app/docs/getting-started/quickstart)
- [Test Store](https://revenuedot.app/docs/guides/test-store), [Sandbox testing](https://revenuedot.app/docs/guides/sandbox-testing)

## Related examples
- [`mobile/react-native-expo-focus`](../react-native-expo-focus): a full sample app with onboarding, a two-page paywall and a developer panel.
- [`selfhost/docker-compose`](../../selfhost/docker-compose): the server this app talks to.
- [`web/purchases-js-vite`](../../web/purchases-js-vite): the same paywall on the web.
- [`mobile/ios-swiftui`](../ios-swiftui), [`mobile/android-compose`](../android-compose), [`mobile/flutter`](../flutter): native versions.
- [`migrate-from-revenuecat`](../../migrate-from-revenuecat): before and after diffs for every SDK.
