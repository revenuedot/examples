# Google Play sandbox app for RevenueDot Cloud

## What this is
`app.revenuedot.sandbox` ("RevenueDot Sandbox" on Google Play) is "Focus", the shared sample subscription app from [`mobile/DESIGN.md`](../DESIGN.md), in Jetpack Compose. It tests real Google Play subscriptions against [RevenueDot Cloud](https://revenuedot.app) at `https://api.revenuedot.app`, using the stock RevenueCat Android SDK from Maven Central (`com.revenuecat.purchases:purchases` 10.24.0), unmodified. It matches the iOS reference ([`ios-sandbox`](../ios-sandbox)) screen for screen:
- **Onboarding quiz:** welcome, one question per screen with a progress bar (goal, focus span, what breaks focus, best time, daily minutes, how you heard about us), an illustrated "A plan beats willpower." screen, and a reminders screen that explains why before Android asks for notification permission.
- **Building your plan**, then **Your plan is ready** with four stat tiles.
- **A two-page paywall:** page 1 sells the plan in the user's own words; page 2 shows the trial timeline (Today, Day 5 reminder, Day 7 charge) and the plan cards with annual first and pre-selected. Closing it with annual selected offers the weekly plan once.
- **Home:** today's ring, the week, sessions (Deep and Flow open the paywall until Pro), an upgrade card, and a 25-minute session with a countdown. The first finished session asks for a Google Play rating.
- **Account sheet:** the plan card, Restore purchases, Manage subscription, Redo onboarding, and a collapsed **Developer** section with the app user id, the `pro` entitlement, active subscriptions, the current offering, the server, any load error, and **Log in** / **Log out**.

It ships through the Google Play internal testing track, because Play Billing only sells to apps installed from Play. Light and dark mode both follow the system.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat. It speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need JDK 17 and the Android SDK (platform 36, build-tools 35.0.0). If platform 36 is missing, install it with `sdkmanager "platforms;android-36"`. The Gradle wrapper (8.14.5) is included.

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools

# Unsigned build, to check it compiles. The key defaults to the placeholder goog_REPLACE_ME.
./gradlew bundleRelease

# Signed upload build with the real public key of the RevenueDot project's Google Play app.
export ORG_GRADLE_PROJECT_uploadStoreFile=/path/to/upload.p12   # PKCS12, alias revenuedot-upload
export ORG_GRADLE_PROJECT_uploadStorePassword=...                # read it from your password manager, not a file
./gradlew bundleRelease -PrevenuedotApiKey=goog_...
# Output: app/build/outputs/bundle/release/app-release.aab
```

The key is a public client key (the RevenueDot project's Google Play app key, `goog_...`), so it is safe inside the app. The repo keeps the placeholder `goog_REPLACE_ME` in `gradle.properties`, and `-PrevenuedotApiKey=` overrides it for one build. A bundle built with the placeholder installs, but every SDK call fails with an invalid-key error. To check which key a build carries, look at `app/build/generated/source/buildConfig/release/app/revenuedot/sandbox/BuildConfig.java`.

Signing comes only from Gradle properties (`uploadStoreFile`, `uploadStorePassword`, `uploadKeyAlias`, `uploadKeyPassword`), set here as `ORG_GRADLE_PROJECT_*` environment variables. Nothing secret lives in the repo. Without them, the release bundle is unsigned and Play rejects it.

## How it works
- **`SandboxApplication.kt`** sets `Purchases.proxyURL = URL("https://api.revenuedot.app")` and then calls `Purchases.configure` with `BuildConfig.REVENUEDOT_API_KEY`. The SDK reads the proxy URL once, during configure, so the order matters. See the [Android SDK guide](https://revenuedot.app/docs/sdks/android).
- **`.entitlementVerificationMode(EntitlementVerificationMode.DISABLED)`** turns off the check for RevenueCat's response signature. RevenueDot does not sign with RevenueCat's key, so the default mode would log every response as failed verification.
- **`SandboxModel.kt`** uses the coroutine API: `awaitOfferings()`, `awaitCustomerInfo()`, `awaitPurchase(PurchaseParams)`, `awaitRestore()`, `awaitLogIn(id)` and `awaitLogOut()`. Pro means the `pro` entitlement is active. An `UpdatedCustomerInfoListener` shows renewals that arrive while the app is open. Load errors appear only in the Developer section, never on the paywall.
- **`Plans.kt`** builds the paywall plans from `offerings.current`: annual first, the billed amount as the largest price, the price per week under it, a "Save N%" badge against the weekly (or monthly) plan, and the trial length from the default subscription option's free phase. With no offering yet, it shows preview plans (Yearly $59.99/year with a 7-day trial and "Save 77%", Weekly $4.99/week) and a note; buying them is disabled.
- **Onboarding answers become customer attributes.** `Purchases.sharedInstance.setAttributes` saves each answer as `onboarding_<question id>` (for example `onboarding_goal = Deep work`), so RevenueDot audiences and experiments can target them.
- **Design:** `Theme.kt` holds the shared tokens: ink (black, or white in dark mode), ink at 62%, 42%, 10% (hairlines) and 4% (fills), and the gold `#F7B500` only on the selected dot, the ring tip, the savings badge, the first trial step and the Pro dot. Material 3 is plumbing only (bottom sheets, icons); its colour roles are pinned to ink and ground, so nothing is tinted, elevated or purple.
- **Rating:** `com.google.android.play:review` 2.0.2 asks for a review after the first finished session, never during onboarding. Play decides whether the sheet shows.
- **Screenshots and UI tests:** debug builds read the intent extra `RDScreen` (welcome, goal, insight, reminders, building, plan, paywall, plans, home, settings) and open that screen with sample answers (goal Deep work, obstacle My phone, best time Morning, 60 minutes a day). Demo launches save nothing.
  ```sh
  adb shell am start -S -n app.revenuedot.sandbox/.MainActivity --es RDScreen paywall
  adb exec-out screencap -p > paywall.png
  ```
- **Permissions:** the SDK's manifest adds `INTERNET` and `ACCESS_NETWORK_STATE`, and Play Billing adds `com.android.vending.BILLING`. The app declares only `POST_NOTIFICATIONS`, for the reminders step.
- **`minSdk` 23** is what purchases 10.24.0 declares. **`compileSdk` and `targetSdk` are 36** because Google Play rejects new uploads that target API 35. The build uses Android Gradle Plugin 8.13.2, Gradle 8.14.5 and Kotlin 2.0.21.
- **Version:** `versionCode` 2, `versionName` 1.1. Play keeps every version code it has seen, so raise `versionCode` before each upload.

### How the Play sandbox test works
1. **Store setup.** The Play app `app.revenuedot.sandbox` has a subscription `pro_monthly` with a monthly base plan. The RevenueDot project has a Google Play app with a service account and real-time developer notifications ([Connect Google Play](https://revenuedot.app/docs/guides/google-play)), the product `pro_monthly` attached to the `pro` entitlement, and a current offering with a `pro_monthly` package.
2. **Upload.** Build the signed bundle with the project's `goog_` key and upload it to the internal testing track. Play App Signing re-signs the app for delivery; the keystore here is only the upload key.
3. **Testers.** Add the tester Google accounts to the internal testing list and to **License testing** in Play Console settings. License testers pay with test cards and are never charged.
4. **Install.** Each tester opens the track's opt-in link and installs the app from the Play Store. A sideloaded build cannot buy.
5. **Buy.** Finish onboarding, then tap **Start my free week** (or the plan without a trial) on the paywall. Play shows its test-card sheet, the SDK posts the purchase token to RevenueDot (`POST /v1/receipts`), and RevenueDot checks it with Google before granting `pro`. The account sheet then shows **Focus Pro**, and its Developer section shows `Entitlement pro: active`.
6. **Renewals.** For license testers a monthly subscription renews every 5 minutes and stops after 6 renewals. Each renewal reaches RevenueDot as a real-time notification, so the renewal date in the account sheet moves forward without reopening the app.
7. **Restore and log in.** **Restore purchases** sends the Google account's purchases to RevenueDot again. **Log in** switches to your own app user id, and **Log out** returns to an anonymous id.

## Migrate from RevenueCat
```diff
+// Point the SDK at RevenueDot; nothing else in the app changes. Must be set before configure.
+Purchases.proxyURL = URL("https://api.revenuedot.app")
 Purchases.configure(
     PurchasesConfiguration.Builder(this, "goog_...")
+        .entitlementVerificationMode(EntitlementVerificationMode.DISABLED)
         .build()
 )
```
The full plan is in [Migrate from RevenueCat](https://revenuedot.app/docs/migrate).

## Docs
- [Android SDK guide](https://revenuedot.app/docs/sdks/android)
- [Connect Google Play](https://revenuedot.app/docs/guides/google-play)
- [Migrate from RevenueCat](https://revenuedot.app/docs/migrate)

## Related examples
- [`mobile/android-compose`](../android-compose): the general Compose paywall example, with a Test Store run path against a local server.
- [`mobile/ios-swiftui`](../ios-swiftui), [`mobile/react-native-expo`](../react-native-expo), [`mobile/flutter`](../flutter)
- [`migrate-from-revenuecat`](../../migrate-from-revenuecat): before/after diffs for every SDK.
