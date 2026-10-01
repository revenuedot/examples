# App Store sandbox app for RevenueDot Cloud

## What this is
An iPhone app, `app.revenuedot.sandbox`, that tests real App Store sandbox subscriptions against [RevenueDot Cloud](https://revenuedot.app) at `https://api.revenuedot.app`, using the stock RevenueCat iOS SDK from Swift Package Manager. It is a small focus-timer app, "Focus", built the way the best-converting subscription apps were built in 2026:
- an onboarding quiz with one question per screen, a "building your plan" moment and a plan summary;
- a two-page paywall: value in the user's own words, then a free-trial timeline and the plans, with annual pre-selected;
- home with Pro-only sessions, and an account sheet with Restore, Manage subscription and a Developer section (app user id, entitlement, subscriptions, log in and out).

The design rules for every mobile sample are in [`../DESIGN.md`](../DESIGN.md).

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need Xcode 16 or later, XcodeGen (`brew install xcodegen`), an iPhone, and an App Store sandbox tester (App Store Connect, Users and Access, Sandbox).

```sh
xcodegen generate     # writes RevenueDotSandbox.xcodeproj from project.yml
# Simulator build (the simulator has no App Store products, so the offering shows a configuration error):
xcodebuild -project RevenueDotSandbox.xcodeproj -scheme RevenueDotSandbox -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGNING_ALLOWED=NO build
# Device build, signed with your team (project.yml sets DEVELOPMENT_TEAM; change it to yours):
xcodebuild -project RevenueDotSandbox.xcodeproj -scheme RevenueDotSandbox -destination 'generic/platform=iOS' -allowProvisioningUpdates REVENUEDOT_API_KEY=appl_... build
```

Or open the project in Xcode, pick your iPhone and press Run. On the phone, sign in under Settings, App Store, Sandbox Account with the sandbox tester, tap **Subscribe**, and the sandbox sheet appears. The purchase reaches RevenueDot through the SDK and, a few minutes later, through Apple's server notifications.

The key is the public app key (`appl_...`) of the RevenueDot project's App Store app, shown under Apps in the dashboard. It is a public client key, safe inside the app. The repo keeps the placeholder `appl_REPLACE_ME` in `project.yml`, and `REVENUEDOT_API_KEY=` on the command line overrides it for one build.

## How it works
- **`RevenueDotSandboxApp.swift`** sets `Purchases.proxyURL` to `https://api.revenuedot.app` and then calls `Purchases.configure`. The SDK reads the proxy URL once, during configure, so the order matters. See the [iOS SDK guide](https://revenuedot.app/docs/sdks/ios). `.with(entitlementVerificationMode: .disabled)` turns off the check for RevenueCat's response signature, which RevenueDot does not use.
- **`SandboxModel.swift`** uses the async API: `offerings()`, `customerInfo()`, `purchase(package:)`, `restorePurchases()`, `logIn(_:)`, `logOut()` and `customerInfoStream`. It saves the onboarding answers as customer attributes (`onboarding_goal`, `onboarding_daily_minutes`, and so on), so [audiences and experiments](https://revenuedot.app/docs/guides/targeting-and-experiments) can target them.
- **`Plans.swift`** turns the current offering into paywall plans: billed price, price per week, the annual savings and the free-trial length. With no offering yet, the paywall shows preview plans so the design still renders.
- **`Onboarding.swift`**, **`Paywall.swift`**, **`Home.swift`** and **`Settings.swift`** are the screens; **`Theme.swift`** holds the tokens and shared controls.
- **`SandboxConfig.swift`** reads the key from Info.plist, which takes it from the `REVENUEDOT_API_KEY` build setting, and holds the Terms and Privacy links the paywall must show.
- **Screenshots:** debug builds open any screen directly with `xcrun simctl launch booted app.revenuedot.sandbox -RDScreen paywall` (also `welcome`, `goal`, `insight`, `reminders`, `building`, `plan`, `plans`, `home`, `settings`).

Connect the App Store first: [Connect the App Store](https://revenuedot.app/docs/guides/app-store) and [Sandbox testing](https://revenuedot.app/docs/guides/sandbox-testing).

RevenueDot is not affiliated with RevenueCat, Inc.
