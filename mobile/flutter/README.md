# Flutter paywall with purchases_flutter and RevenueDot

## What this is
A Flutter app for iOS and Android with one paywall screen: it lists the packages of the current offering, buys one, restores purchases, shows whether the `pro` entitlement is active, and logs the user in. It uses RevenueCat's Flutter SDK (`purchases_flutter` 10.13+) pointed at a RevenueDot server with `Purchases.setProxyURL`.

**Status: not CI-verified locally.** The Mac that wrote it has no Flutter SDK, so `flutter analyze` and a device run have not been done. The Dart code follows the `purchases_flutter` 10.x API (`Purchases.purchase(PurchaseParams.package(...))`, `setProxyURL`, `addCustomerInfoUpdateListener`). `scripts/verify.sh` runs `flutter pub get && flutter analyze` when Flutter is installed. The iOS SwiftUI example found a Test Store bug in RevenueDot (`cycle_count: null` in Test Store product details); it is fixed in the server ([revenuedot/revenuedot@00d0ea6](https://github.com/revenuedot/revenuedot/commit/00d0ea6)), which Flutter's native SDKs also rely on.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need Flutter 3.24 or later and a RevenueDot server with a Test Store app. The quickest server is [`selfhost/docker-compose`](../../selfhost/docker-compose) with its `seed.sh`.

```bash
cd mobile/flutter
flutter create --platforms=ios,android .     # generates ios/ and android/ (kept out of git)
cp .env.example .env                          # set REVENUEDOT_API_KEY to the test_ key from seed.sh
flutter pub get
flutter run --dart-define-from-file=.env      # pick an iOS simulator or Android emulator
```

Tap a plan, then **Test valid purchase** in the Test Store dialog.

Keep in mind:
- **The Android emulator reaches your computer as `10.0.2.2`.** Set `REVENUEDOT_URL=http://10.0.2.2:8787`, and allow cleartext HTTP for debug builds by adding `android:usesCleartextTraffic="true"` to the `<application>` tag in `android/app/src/debug/AndroidManifest.xml` (create the tag if it is missing). Use `https://` for anything else.
- **Test Store keys (`test_`) only work in debug builds.** In a release build the native SDKs stop the app on purpose. Ship with the `appl_` and `goog_` keys (`REVENUEDOT_IOS_KEY`, `REVENUEDOT_ANDROID_KEY`).
- **Flutter web is not supported** by this example: `purchases_flutter` on web cannot use a proxy URL yet. Use [`web/purchases-js-vite`](../../web/purchases-js-vite) for the web.

## How it works
- **`lib/revenuedot.dart`** awaits `Purchases.setProxyURL(serverUrl)` before `Purchases.configure`. Every SDK request then goes to your RevenueDot server. The native SDKs drop any path in the URL, so serve RevenueDot at the root of its host. See [Flutter SDK](https://revenuedot.app/docs/sdks/flutter).
- **Entitlement verification** stays at the Flutter default, which is disabled. RevenueDot does not sign responses with RevenueCat's key, so do not turn it on.
- **`lib/main.dart`** is the paywall:
  - `getOfferings()` (`GET /v1/subscribers/{id}/offerings`) and `getCustomerInfo()` (`GET /v1/subscribers/{id}`).
  - `purchase(PurchaseParams.package(...))`: the store (or the Test Store dialog) takes payment and the SDK posts it to `POST /v1/receipts`.
  - `restorePurchases()`, `logIn(id)` (`POST /v1/subscribers/identify`) and `addCustomerInfoUpdateListener`.
  - Access is `customerInfo.entitlements.active['pro']`. A cancelled purchase is a `PlatformException` with `purchaseCancelledError`.

## Migrate from RevenueCat
```diff
 Future<void> initPurchases() async {
+  // Point the SDK at your RevenueDot server; nothing else in the app changes. Await it before configure.
+  await Purchases.setProxyURL('https://revenuedot.example.com');
   await Purchases.configure(PurchasesConfiguration(Platform.isIOS ? 'appl_...' : 'goog_...'));
+  // Once, after this update: send purchases made while the app talked to RevenueCat.
+  await Purchases.syncPurchases();
 }
```
The full plan, including notification forwarding and the cut-over, is in [Migrate from RevenueCat](https://revenuedot.app/docs/migrate).

## Docs
- [Flutter SDK guide](https://revenuedot.app/docs/sdks/flutter)
- [Test Store](https://revenuedot.app/docs/guides/test-store)
- [Connect the App Store](https://revenuedot.app/docs/guides/app-store) and [Connect Google Play](https://revenuedot.app/docs/guides/google-play)

## Related examples
- [`mobile/ios-swiftui`](../ios-swiftui), [`mobile/android-compose`](../android-compose), [`mobile/react-native-expo`](../react-native-expo)
- [`selfhost/docker-compose`](../../selfhost/docker-compose): the server this app talks to.
- [`migrate-from-revenuecat`](../../migrate-from-revenuecat): before/after diffs for every SDK.
