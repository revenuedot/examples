# Jetpack Compose paywall with the RevenueCat Android SDK and RevenueDot

## What this is
An Android app written with Jetpack Compose. Its one paywall screen lists the packages of the current offering, buys one, restores purchases, shows whether the `pro` entitlement is active, and logs the user in. It uses RevenueCat's Android SDK (`com.revenuecat.purchases:purchases` 10.24), pointed at a RevenueDot server with `Purchases.proxyURL`.

**Status: unverified build.** The source was written against the APIs in the SDK's source code, but it has not been compiled: the Mac that wrote it has no Android SDK and only Java 8. Expect small fixes when you first open it in Android Studio. RevenueDot `main` of 2026-09-30 also has a Test Store bug that stops the iOS SDK from loading Test Store products (`cycle_count: null`), and it may affect Android too. It is tracked in [docs/DISCREPANCIES.md](https://github.com/revenuedot/docs/blob/main/DISCREPANCIES.md).

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need Android Studio (JDK 17) and a RevenueDot server with a Test Store app. The quickest server is [`selfhost/docker-compose`](../../selfhost/docker-compose) with its `seed.sh`.

1. Put the server URL and key in `gradle.properties`:
   ```properties
   revenuedot.serverUrl=http://10.0.2.2:8787    # the emulator reaches your computer as 10.0.2.2
   revenuedot.apiKey=test_...                   # from seed.sh
   ```
2. Open the folder in Android Studio. It creates the Gradle wrapper. Without Studio, run `gradle wrapper --gradle-version 8.14.3` first.
3. Run on an emulator. Tap a plan, then tap **Test valid purchase**.

Keep in mind:
- **Test Store keys (`test_`) only work in debug builds.** In a release build the SDK shows an error screen and stops the app on purpose. Ship with the `goog_` key of a Google Play app.
- **Real purchases** need a Google Play app in RevenueDot with a service account and real-time notifications. See [Connect Google Play](https://revenuedot.app/docs/guides/google-play).
- **Cleartext HTTP** is allowed in the manifest only so the emulator can reach `http://10.0.2.2`. Use `https://` for anything else.

## How it works
- **`PaywallApplication.kt`** sets `Purchases.proxyURL` before `Purchases.configure`. The Android SDK reads the proxy URL once, during configure. It builds each request as `URL(proxyURL, "/v1/...")`, which drops any path, so serve RevenueDot at the root of its host. See the [Android SDK guide](https://revenuedot.app/docs/sdks/android).
- **`.entitlementVerificationMode(EntitlementVerificationMode.DISABLED)`** turns signature checks off. The default, informational, checks each response for RevenueCat's signature, logs an error when it is missing, and still grants access. RevenueDot does not sign responses with RevenueCat's key.
- **`PaywallViewModel.kt`** uses the coroutine API:
  - `awaitOfferings()` and `awaitCustomerInfo()`.
  - `awaitPurchase(PurchaseParams)`, which posts the purchase to `POST /v1/receipts`.
  - `awaitRestore()` and `awaitLogIn(id)`.
  - `updatedCustomerInfoListener`.
  - Access is `customerInfo.entitlements.active["pro"]`. A cancelled purchase is a `PurchasesTransactionException` with `userCancelled == true`.
- **What still goes to RevenueCat:** with a proxy URL set, the Android SDK still sends diagnostics, paywall events and ad events to RevenueCat's own hosts. Purchases, customer info and offerings all go to RevenueDot.

## Migrate from RevenueCat
```diff
+// Point the SDK at your RevenueDot server; nothing else in the app changes. Must be set before configure.
+Purchases.proxyURL = URL("https://revenuedot.example.com")
 Purchases.configure(
     PurchasesConfiguration.Builder(this, "goog_...")
+        .entitlementVerificationMode(EntitlementVerificationMode.DISABLED)
         .build()
 )
```
The full plan is in [Migrate from RevenueCat](https://revenuedot.app/docs/migrate): catalog copy, notification forwarding, a one-time `syncPurchases()`, and the cut-over.

## Docs
- [Android SDK guide](https://revenuedot.app/docs/sdks/android)
- [Connect Google Play](https://revenuedot.app/docs/guides/google-play)
- [Test Store](https://revenuedot.app/docs/guides/test-store)

## Related examples
- [`mobile/ios-swiftui`](../ios-swiftui), [`mobile/react-native-expo`](../react-native-expo), [`mobile/flutter`](../flutter)
- [`selfhost/docker-compose`](../../selfhost/docker-compose): the server this app talks to.
- [`migrate-from-revenuecat`](../../migrate-from-revenuecat): before/after diffs for every SDK.
