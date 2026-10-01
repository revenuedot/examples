# Flutter paywall with purchases_flutter and RevenueDot

## What this is
"Focus", a Flutter focus-timer app for iOS and Android, built the way the best-converting subscription apps were built in 2026. It uses RevenueCat's Flutter SDK (`purchases_flutter` 10.13+) pointed at a RevenueDot server with `Purchases.setProxyURL`:
- an onboarding quiz with one question per screen, an insight screen, a reminders permission ask, a "building your plan" moment and a plan summary;
- a two-page paywall: the value in the user's own words, then a free-trial timeline and the plans with annual pre-selected, a "Save" badge, the auto-renew disclosure, Terms and Privacy, and a one-time exit offer;
- home with today's ring, the week, Pro-only sessions and a running-session countdown; an account sheet with Restore, Manage subscription and a Developer section (app user id, entitlement, subscriptions, offering, server, log in and out).

It matches the iOS reference app screen for screen; the design rules for every mobile sample are in [`../DESIGN.md`](../DESIGN.md). Without an API key it still runs, on preview plans, so you can review the design before you have a project.

**Status:** `flutter analyze` is clean, `flutter test` walks the whole flow, and every screen was checked on the iPhone 17 Pro simulator (Flutter 3.47). Purchases against a live server have not been run from this app yet.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need Flutter 3.27 or later and a RevenueDot server with a Test Store app. The quickest server is [`selfhost/docker-compose`](../../selfhost/docker-compose) with its `seed.sh`.

```bash
cd mobile/flutter
flutter create --platforms=ios,android .     # generates ios/ and android/ (kept out of git)
cp .env.example .env                          # set REVENUEDOT_API_KEY to the test_ key from seed.sh
flutter pub get
flutter run --dart-define-from-file=.env      # pick an iOS simulator or Android emulator
```

Go through the quiz, tap **Start my free week** on the paywall, then **Test valid purchase** in the Test Store dialog.

Keep in mind:
- **The Android emulator reaches your computer as `10.0.2.2`.** Set `REVENUEDOT_URL=http://10.0.2.2:8787`, and allow cleartext HTTP for debug builds by adding `android:usesCleartextTraffic="true"` to the `<application>` tag in `android/app/src/debug/AndroidManifest.xml` (create the tag if it is missing). Use `https://` for anything else.
- **Test Store keys (`test_`) only work in debug builds.** In a release build the native SDKs stop the app on purpose. Ship with the `appl_` and `goog_` keys (`REVENUEDOT_IOS_KEY`, `REVENUEDOT_ANDROID_KEY`).
- **Flutter web is not supported** by this example: `purchases_flutter` on web cannot use a proxy URL yet. Use [`web/purchases-js-vite`](../../web/purchases-js-vite) for the web.

## How it works
- **`lib/revenuedot.dart`** awaits `Purchases.setProxyURL(serverUrl)` before `Purchases.configure`. Every SDK request then goes to your RevenueDot server. The native SDKs drop any path in the URL, so serve RevenueDot at the root of its host. See [Flutter SDK](https://revenuedot.app/docs/sdks/flutter).
- **Entitlement verification** stays at the Flutter default, which is disabled. RevenueDot does not sign responses with RevenueCat's key, so do not turn it on.
- **`lib/model.dart`** holds the SDK state the screens listen to:
  - `getOfferings()` (`GET /v1/subscribers/{id}/offerings`) and `getCustomerInfo()` (`GET /v1/subscribers/{id}`), kept current with `addCustomerInfoUpdateListener`.
  - The quiz answers are saved with `setAttributes` as `onboarding_goal`, `onboarding_obstacle` and so on, so RevenueDot audiences and experiments can target them.
  - `purchase(PurchaseParams.package(...))`: the store (or the Test Store dialog) takes payment and the SDK posts it to `POST /v1/receipts`. A cancelled purchase is a `PlatformException` with `purchaseCancelledError` and shows nothing.
  - `restorePurchases()`, `logIn(id)` (`POST /v1/subscribers/identify`) and `logOut()`. Pro is `customerInfo.entitlements.active['pro']`.
- **`lib/plans.dart`** turns `offerings.current` into plan cards: annual first and pre-selected, the billed price largest, the SDK's price per week below it, a "Save N%" badge against the shortest plan, and the free-trial length (App Store introductory price or Google Play free phase). With no offering it shows preview plans (Yearly $59.99 with a 7-day trial, Weekly $4.99) and buying is off.
- **`lib/onboarding.dart`, `lib/paywall.dart`, `lib/home.dart`, `lib/settings.dart`** are the screens; **`lib/theme.dart`** has the tokens (ink, hairlines, one gold accent), the ring painter and the shared buttons. Material 3 is only plumbing: no elevation, tints or seed colours, and the system font (SF on iOS with Apple's tracking, Roboto on Android).
- **Screenshots:** in debug builds `--dart-define=RD_SCREEN=<welcome|goal|insight|reminders|building|plan|paywall|plans|home|settings>` opens that screen with sample answers.
- **Native setup the generated folders need** (they are not in git): for the system notification prompt on iOS, add `'PERMISSION_NOTIFICATIONS=1'` to `GCC_PREPROCESSOR_DEFINITIONS` in `ios/Podfile`'s `post_install` (see [permission_handler](https://pub.dev/packages/permission_handler)); on Android add `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>` to the manifest. Without them "Turn on reminders" moves on without a prompt. Set the app's display name to "Focus" in `ios/Runner/Info.plist` and `android/app/src/main/AndroidManifest.xml`.

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
