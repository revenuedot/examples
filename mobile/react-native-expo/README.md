# Expo paywall with react-native-purchases and RevenueDot

## What this is
An Expo (React Native) app with one paywall screen: it lists the packages of the current offering, buys one, restores purchases, shows whether the `pro` entitlement is active, and logs the user in. It uses RevenueCat's `react-native-purchases` SDK pointed at a RevenueDot server with `setProxyURL`.

**Status: typecheck and web run verified; native builds unverified.** On Expo SDK 57 with react-native-purchases 10.10: `npm run typecheck` and `npx expo-doctor` (21/21 checks) pass, and the app was run with `expo start --web` against a RevenueDot from [`selfhost/docker-compose`](../../selfhost/docker-compose). In that run Playwright loaded the offering, bought `$rc_monthly` through the Test Store dialog, saw `pro` become active, then ran restore and logIn. The web run uses the SDK's browser mode, which is also what Expo Go uses. No iOS or Android development build was made for this example.

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

In **Expo Go and on the web**, react-native-purchases runs in its browser mode and only accepts `test_` (Test Store) and `rcb_` keys. Tap a package, then **Test valid purchase** in the dialog.

For real App Store or Google Play purchases, make a development build (`npx expo run:ios` / `npx expo run:android`, or EAS Build), connect the stores to RevenueDot ([App Store](https://revenuedot.app/docs/guides/app-store), [Google Play](https://revenuedot.app/docs/guides/google-play)) and set `EXPO_PUBLIC_REVENUEDOT_IOS_KEY` / `EXPO_PUBLIC_REVENUEDOT_ANDROID_KEY`. iOS blocks plain `http://` to anything but `localhost` unless you add an App Transport Security exception, so use an `https://` URL for a phone.

## How it works
- **`revenuedot.ts`** awaits `Purchases.setProxyURL(serverURL)` and then calls `Purchases.configure({ apiKey })`. The proxy URL must be set before `configure`, and the native SDKs ignore any path in it (`https://example.com/api` is used as `https://example.com`), so serve RevenueDot at the root of its host. See [React Native SDK](https://revenuedot.app/docs/sdks/react-native).
- **Response signatures:** react-native-purchases defaults `entitlementVerificationMode` to disabled, which is what RevenueDot needs today: RevenueDot does not sign responses with RevenueCat's key.
- **`App.tsx`** calls `getOfferings()`, `getCustomerInfo()`, `purchasePackage(pkg)`, `restorePurchases()` and `logIn(id)`, and listens with `addCustomerInfoUpdateListener`. Access is `customerInfo.entitlements.active["pro"]`. A cancelled purchase is detected with `PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR`.
- **What the server sees:** `GET /v1/subscribers/{id}/offerings`, `GET /v1/subscribers/{id}`, `GET /rcbilling/v1/subscribers/{id}/products` (Test Store product details) and `POST /v1/receipts`. See [SDK endpoints](https://revenuedot.app/docs/api/sdk-endpoints).
- **Analytics:** in browser mode (web and Expo Go) the SDK also sends analytics events to RevenueCat's events host (`e.revenue.cat`), which the proxy URL does not cover. Native builds send their events through the proxy URL on iOS; on Android, diagnostics and paywall events still go to RevenueCat's hosts.
- **Test Store prices show $0.00** because RevenueDot's catalog does not store Test Store prices yet.

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
