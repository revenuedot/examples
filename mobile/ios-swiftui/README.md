# SwiftUI paywall with the RevenueCat iOS SDK and RevenueDot

## What this is
A SwiftUI iPhone app with one paywall screen: it lists the packages of the current offering, buys one, restores purchases, shows whether the `pro` entitlement is active, and logs the user in. It uses RevenueCat's iOS SDK (`RevenueCat` 5.91+) pointed at a RevenueDot server with `Purchases.proxyURL`.

**Status: builds; Test Store run blocked by a server bug.** The app builds for the iPhone 17 Pro simulator (iOS 26.2) with Xcode 27.0, XcodeGen 2.44 and RevenueCat 5.92.0 (`xcodegen generate`, then `xcodebuild ... build`, rerun on 2026-09-30). Against RevenueDot `main` of 2026-09-30, the Test Store fails: `getOfferings` reports "No base price found for product pro_monthly". The server sends `cycle_count: null` in its Test Store product details, which the iOS SDK cannot decode. With that one field changed to `1` (a local test proxy), the app ran end to end on an iPhone 17 Pro simulator: it loaded the offering, bought `$rc_monthly` in the Test Store alert, showed `pro` active, and moved the purchase to `ios_user_1` with logIn. Real App Store sandbox purchases were not tested. The server now sends a numeric `cycle_count` (fixed on 2026-09-30 in [revenuedot/revenuedot@00d0ea6](https://github.com/revenuedot/revenuedot/commit/00d0ea6)), and the unmodified RevenueCat iOS SDK 5.92 passes a Test Store purchase against it in the server's own simulator harness; this example has not been re-run against the fixed server yet.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
Needs Xcode 16 or later. You also need a RevenueDot server with a Test Store app; the quickest is [`selfhost/docker-compose`](../../selfhost/docker-compose) and its `seed.sh`.

1. Open `RevenueDotPaywall.xcodeproj`. It was generated from `project.yml`; run `xcodegen generate` to regenerate it after you change the spec.
2. In `RevenueDotPaywall/RevenueDotConfig.swift`, set `serverURL` (the simulator reaches your Mac as `http://localhost:8787`) and `apiKey` (the `test_...` key from `seed.sh`).
3. Run on a simulator. Tap a plan, then **Test valid purchase**.

From the command line:
```bash
cd mobile/ios-swiftui
xcodebuild -project RevenueDotPaywall.xcodeproj -scheme RevenueDotPaywall -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```

Keep these in mind:
- **Test Store keys (`test_`) only work in Debug builds.** In a Release build the SDK shows a "Wrong API Key" alert and stops the app on purpose. Ship with the `appl_` key of an App Store app.
- **Real sandbox purchases** need an App Store app in RevenueDot with its in-app purchase key and a sandbox tester. See [Connect the App Store](https://revenuedot.app/docs/guides/app-store) and [Sandbox testing](https://revenuedot.app/docs/guides/sandbox-testing).
- **On a phone,** use an `https://` server URL. `Info.plist` sets `NSAllowsLocalNetworking`, which covers `localhost` and local network names only.

## How it works
- **`RevenueDotPaywallApp.swift`** sets `Purchases.proxyURL` before `Purchases.configure`. Every SDK request goes to that host, and the SDK drops any path in the URL, so serve RevenueDot at the root of its host. See [iOS SDK](https://revenuedot.app/docs/sdks/ios).
- **`.with(entitlementVerificationMode: .disabled)`** turns off response-signature checks. The iOS SDK's default is informational: it checks every response for RevenueCat's signature, logs a verification error when it is missing, and still grants access. RevenueDot does not sign responses with RevenueCat's key, so turning the check off keeps the logs clean and `customerInfo.entitlements.verification` accurate.
- **`PaywallModel.swift`** uses the async API:
  - `offerings()` (`GET /v1/subscribers/{id}/offerings`) and `customerInfo()` (`GET /v1/subscribers/{id}`).
  - `purchase(package:)`, where the store (or the Test Store alert) takes payment and the SDK posts it to `POST /v1/receipts`.
  - `restorePurchases()`, `logIn(_:)` (`POST /v1/subscribers/identify`) and `customerInfoStream`.
- **Access check:** `customerInfo.entitlements["pro"]?.isActive == true`.

## Migrate from RevenueCat
```diff
+// Point the SDK at your RevenueDot server; nothing else in the app changes.
+Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
-Purchases.configure(withAPIKey: "appl_...")
+Purchases.configure(
+    with: Configuration.Builder(withAPIKey: "appl_...")
+        .with(entitlementVerificationMode: .disabled)
+        .build()
+)
```
Keep your App Store `appl_` key by importing your RevenueCat project, or use the key RevenueDot shows for the app. The full plan, including notification forwarding and the cut-over, is in [Migrate from RevenueCat](https://revenuedot.app/docs/migrate).

## Docs
- [iOS SDK guide](https://revenuedot.app/docs/sdks/ios)
- [Connect the App Store](https://revenuedot.app/docs/guides/app-store)
- [Test Store](https://revenuedot.app/docs/guides/test-store)

## Related examples
- [`mobile/react-native-expo`](../react-native-expo), [`mobile/android-compose`](../android-compose), [`mobile/flutter`](../flutter)
- [`selfhost/docker-compose`](../../selfhost/docker-compose): the server this app talks to.
- [`migrate-from-revenuecat`](../../migrate-from-revenuecat): before/after diffs for every SDK.
