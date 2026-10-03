# Jetpack Compose paywall with the RevenueCat Android SDK and RevenueDot

## What this is
The drop-in paywall sample: an Android app in Jetpack Compose with the "Focus" design from [`mobile/DESIGN.md`](../DESIGN.md) and RevenueCat's Android SDK (`com.revenuecat.purchases:purchases` 10.24.0), pointed at a RevenueDot server with `Purchases.proxyURL`. It has two parts:
- **A two-page paywall.** Page 1 sells the value: the eyebrow "Focus Pro", "Unlock your best work, every day." and four benefit lines. Page 2 shows how the free trial works (Today, Day 5 reminder, Day 7 charge), then the plans from the current offering with annual first and pre-selected, a gold "Save N%" badge, **Start my free week**, and the renewal disclosure with Terms and Privacy links. Closing it with annual selected offers the shortest plan once ("Not ready for a year?").
- **A minimal home** that shows the Pro state: a **Free plan** card with **See plans**, or **Focus Pro** with the renewal date and a trial tag; Restore purchases and Manage subscription; and a collapsed **Developer** section with the app user id, the `pro` entitlement, active subscriptions, the current offering, the server, any load error, and **Log in** / **Log out**.

For the full app with the onboarding quiz in front of the paywall, see [`android-sandbox`](../android-sandbox).

**Status: verified end to end on 2026-10-03.** `./gradlew :app:assembleDebug` passes with Gradle 8.14.5, AGP 8.13.2, JDK 17 and Android SDK 36. The debug build ran on a Pixel 7 emulator (API 35, arm64) against a local RevenueDot (PGlite, seeded with `selfhost/docker-compose/seed.sh`) reached as `http://10.0.2.2:8787`: the SDK loaded the offering with its 3 products, **See plans**, **Continue**, **Continue** on the pre-selected yearly plan and **Test valid purchase** in the Test Store dialog posted `POST /v1/receipts` (200), the home screen switched to **Focus Pro** with "Renews Oct 3, 2027", **Restore purchases** answered "Restore: done.", and the server recorded the customer, the `pro_annual` transaction and an active `pro` entitlement. Real Google Play purchases are not covered here; see [`android-sandbox`](../android-sandbox).

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need Android Studio (JDK 17) and a RevenueDot server with a Test Store app. The quickest server is [`selfhost/docker-compose`](../../selfhost/docker-compose) with its `seed.sh`.

1. Put the server URL and key in `gradle.properties`:
   ```properties
   revenuedot.serverUrl=http://10.0.2.2:8787    # the emulator reaches your computer as 10.0.2.2
   revenuedot.apiKey=test_...                   # from seed.sh
   ```
2. Open the folder in Android Studio, or build from the command line with the included wrapper: `./gradlew :app:assembleDebug` (JDK 17).
3. Run on an emulator. Tap **See plans**, **Continue**, then **Start my free week** (or **Continue** for a plan without a trial), and in the Test Store dialog tap **Test valid purchase**.

Keep in mind:
- **Test Store keys (`test_`) only work in debug builds.** In a release build the SDK shows an error screen and stops the app on purpose. Ship with the `goog_` key of a Google Play app.
- **Real purchases** need a Google Play app in RevenueDot with a service account and real-time notifications. See [Connect Google Play](https://revenuedot.app/docs/guides/google-play).
- **Cleartext HTTP** is allowed in the manifest only so the emulator can reach `http://10.0.2.2`. Use `https://` for anything else.

## How it works
- **`PaywallApplication.kt`** sets `Purchases.proxyURL` before `Purchases.configure`. The Android SDK reads the proxy URL once, during configure. It builds each request as `URL(proxyURL, "/v1/...")`, which drops any path, so serve RevenueDot at the root of its host. See the [Android SDK guide](https://revenuedot.app/docs/sdks/android).
- **`.entitlementVerificationMode(EntitlementVerificationMode.DISABLED)`** turns signature checks off. The default, informational, checks each response for RevenueCat's signature, logs an error when it is missing, and still grants access. RevenueDot does not sign responses with RevenueCat's key.
- **`PaywallViewModel.kt`** uses the coroutine API:
  - `awaitOfferings()` and `awaitCustomerInfo()`.
  - `awaitPurchase(PurchaseParams)`, which posts the purchase to `POST /v1/receipts`. A cancelled purchase is a `PurchasesTransactionException` with `userCancelled == true`.
  - `awaitRestore()`, `awaitLogIn(id)` and `awaitLogOut()`.
  - `updatedCustomerInfoListener`, for renewals that arrive while the app is open.
  - Pro is `customerInfo.entitlements["pro"].isActive`. A purchase or restore that unlocks it closes the paywall.
- **`Plans.kt`** turns `offerings.current` into plan cards: the billed amount ("$59.99/year") is the largest price, the price per week sits under it, the annual badge compares price per week with the weekly (or monthly) plan, and the trial length comes from the default subscription option's free phase. With no offering yet, the paywall shows preview plans (Yearly $59.99/year with a 7-day trial, Weekly $4.99/week) and a note; buying them is disabled.
- **Load errors** show only in the Developer section, never on the paywall.
- **`Theme.kt`** holds the design tokens: ink (black, or white in dark mode) at 100%, 62%, 42%, 10% (hairlines) and 4% (fills), and the gold `#F7B500` only on the selected dot, the savings badge, the first trial step and the Pro dot. Material 3 is plumbing only (bottom sheet, icons); its colour roles are pinned to ink and ground, so nothing is tinted, elevated or purple.
- **Screenshots and UI tests:** debug builds read the intent extra `RDScreen`: `paywall`, `plans`, `home`, or `settings` (home with the Developer section open).
  ```sh
  adb shell am start -S -n com.example.revenuedot.paywall/.MainActivity --es RDScreen plans
  ```
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
