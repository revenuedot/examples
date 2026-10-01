# Focus: Expo sample app with react-native-purchases and RevenueDot

## What this is
**Focus**, the RevenueDot mobile sample app, in Expo (React Native), on RevenueCat's stock `react-native-purchases` SDK pointed at a RevenueDot server with `setProxyURL`. It is the same app as the [iOS reference](../ios-sandbox) and follows [`../DESIGN.md`](../DESIGN.md): a one-question-per-screen onboarding quiz (goal, focus span, obstacle, an insight, best time, daily minutes, where you heard of us, a reminders ask), "building your plan" with a counting percentage, a plan summary, then a two-page paywall: the value in the user's own words, then how the free trial works and the plan cards with annual pre-selected. Closing the paywall once offers the shorter plan. Home has today's ring, the week, sessions with Pro locks, an upgrade card and a session countdown; the account sheet has the plan, Restore, Manage subscription and a collapsed Developer section (app user id, entitlement, subscriptions, offering, server, load error, log in or out). Light and dark mode follow the system.

**Status: typecheck verified; screens checked on the iOS simulator (development build) and the web.** On Expo SDK 57 with react-native-purchases 10.10, `npm run typecheck` passes. The earlier single-screen version of this example bought `$rc_monthly` through the Test Store on the web against [`selfhost/docker-compose`](../../selfhost/docker-compose); the redesigned app uses the same SDK calls. No Android build was made.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need a RevenueDot server with a Test Store app. The quickest is [`selfhost/docker-compose`](../../selfhost/docker-compose) and its `seed.sh`, which prints a `test_` key.

```bash
cd mobile/react-native-expo
npm install
cp .env.example .env.local      # EXPO_PUBLIC_REVENUEDOT_URL and EXPO_PUBLIC_REVENUEDOT_API_KEY=test_...
npx expo start                  # press i (iOS simulator), a (Android emulator) or w (web), or scan with Expo Go
```

The server URL must be reachable from the device:

| Where the app runs | `EXPO_PUBLIC_REVENUEDOT_URL` |
|---|---|
| iOS simulator, web | `http://localhost:8787` |
| Android emulator | `http://10.0.2.2:8787` |
| A phone on your Wi-Fi | `http://<your computer's LAN IP>:8787` |

In **Expo Go and on the web**, react-native-purchases runs in its browser mode and only accepts `test_` (Test Store) and `rcb_` keys. Go through onboarding, pick a plan on the paywall, then tap **Test valid purchase** in the dialog.

For real App Store or Google Play purchases, make a development build (`npx expo run:ios` / `npx expo run:android`, or EAS Build), connect the stores to RevenueDot ([App Store](https://revenuedot.app/docs/guides/app-store), [Google Play](https://revenuedot.app/docs/guides/google-play)) and set `EXPO_PUBLIC_REVENUEDOT_IOS_KEY` / `EXPO_PUBLIC_REVENUEDOT_ANDROID_KEY`. iOS blocks plain `http://` to anything but `localhost` unless you add an App Transport Security exception, so use an `https://` URL for a phone.

## How it works
- **`revenuedot.ts`** awaits `Purchases.setProxyURL(serverURL)` and then calls `Purchases.configure({ apiKey })`. The proxy URL must be set before `configure`, and the native SDKs ignore any path in it (`https://example.com/api` is used as `https://example.com`), so serve RevenueDot at the root of its host. See [React Native SDK](https://revenuedot.app/docs/sdks/react-native).
- **Response signatures:** react-native-purchases defaults `entitlementVerificationMode` to disabled, which is what RevenueDot needs today: RevenueDot does not sign responses with RevenueCat's key.
- **`model.tsx`** calls `getOfferings()` and `getCustomerInfo()` once configured, runs `purchasePackage(pkg)`, `restorePurchases()`, `logIn(id)` and `logOut()`, and listens with `addCustomerInfoUpdateListener`. Pro means `customerInfo.entitlements.active["pro"]`. A cancelled purchase (`PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR`) shows nothing. Load errors appear only in Account > Developer, never on the paywall.
- **`plans.ts`** builds the plan cards from `offerings.current`: annual first and pre-selected, the billed price (`$59.99/year`) largest, the per-week price under it, a "Save N%" badge against the shortest plan, and the trial length from a zero-price `introPrice`. With no offering yet, the paywall shows preview plans (Yearly $59.99 with a 7-day trial, Weekly $4.99) and buying is off.
- **Onboarding answers** are saved with `Purchases.setAttributes({ onboarding_goal: ..., ... })`, so RevenueDot audiences and experiments can target them ([targeting and experiments](https://revenuedot.app/docs/guides/targeting-and-experiments)).
- **Reminders:** the reminders step explains the nudge but doesn't show the system prompt. To schedule real reminders, add `expo-notifications` and call `requestPermissionsAsync()` in `onboarding/steps.tsx`; it is left out because its config plugin adds the push entitlement, which a free Apple developer account can't sign.
- **Files:** `theme.ts` (tokens, light and dark), `ui/` (buttons, option rows, ring, sheet), `onboarding/`, `paywall/`, `home/`, `settings/`. Device-only state (onboarding done, answers, minutes per day) lives in AsyncStorage; subscription state always comes from RevenueDot.
- **Screens for screenshots and UI tests:** in development, `EXPO_PUBLIC_RD_SCREEN=<welcome|goal|insight|reminders|building|plan|paywall|plans|home|settings> npx expo start --clear` opens that screen with sample answers (Deep work, My phone, Morning, 1 hour).
- **What the server sees:** `GET /v1/subscribers/{id}/offerings`, `GET /v1/subscribers/{id}`, `POST /v1/subscribers/{id}/attributes`, `GET /rcbilling/v1/subscribers/{id}/products` (Test Store product details) and `POST /v1/receipts`. See [SDK endpoints](https://revenuedot.app/docs/api/sdk-endpoints).
- **Analytics:** in browser mode (web and Expo Go) the SDK also sends analytics events to RevenueCat's events host (`e.revenue.cat`), which the proxy URL does not cover. Native builds send their events through the proxy URL on iOS; on Android, diagnostics and paywall events still go to RevenueCat's hosts.
- **Test Store prices show $0.00** because RevenueDot's catalog does not store Test Store prices yet, so the savings badge is hidden for them.

## Migrate from RevenueCat
```diff
 import Purchases from "react-native-purchases";

+// Point the SDK at your RevenueDot server; nothing else in the app changes.
+await Purchases.setProxyURL("https://revenuedot.example.com");
 Purchases.configure({ apiKey: Platform.OS === "ios" ? "appl_..." : "goog_..." });
```
If you set `entitlementVerificationMode` to `INFORMATIONAL`, set it back to `DISABLED`. Keep your existing keys by importing your RevenueCat project, or use the keys RevenueDot shows for each app. The full plan: [Migrate from RevenueCat](https://revenuedot.app/docs/migrate).

## Docs
- [React Native SDK guide](https://revenuedot.app/docs/sdks/react-native)
- [Quickstart](https://revenuedot.app/docs/getting-started/quickstart)
- [Test Store](https://revenuedot.app/docs/guides/test-store), [Sandbox testing](https://revenuedot.app/docs/guides/sandbox-testing)

## Related examples
- [`selfhost/docker-compose`](../../selfhost/docker-compose): the server this app talks to.
- [`web/purchases-js-vite`](../../web/purchases-js-vite): the same paywall with purchases-js.
- [`mobile/ios-swiftui`](../ios-swiftui), [`mobile/android-compose`](../android-compose), [`mobile/flutter`](../flutter): native versions.
- [`migrate-from-revenuecat`](../../migrate-from-revenuecat): before/after diffs for every SDK.
