# Migrate an app from RevenueCat to RevenueDot

## What this is
The tools and diffs for moving an app that uses the RevenueCat SDK onto a RevenueDot server without anyone losing access:

| File | What it does | Status |
|---|---|---|
| [`copy-catalog.mjs`](copy-catalog.mjs) | Copies apps, products, entitlements, offerings and packages from one REST API v2 project to another. It reads RevenueCat's API v2 and writes RevenueDot's, which use the same paths and shapes. It is safe to run twice | Verified between two RevenueDot projects: the copy's SDK offerings response matched the source's, and a second run created nothing. Not yet run against RevenueCat's API |
| [`forward-notifications.sh`](forward-notifications.sh) | Turns on notification forwarding for one app, so App Store and Google Play notifications reach both RevenueDot and RevenueCat during a side-by-side run | Verified: a notification sent to RevenueDot was copied byte for byte to the forwarding URL, which answered 200 |
| [`diffs/`](diffs) | Before and after code for every SDK: iOS, Android, React Native, Flutter, web, Capacitor, Kotlin Multiplatform, Unity and Cordova | Checked against each SDK's source (API names and defaults) |

**The one-command importer (`npx revenuedot import`) is not built yet.** It is planned to bring over customers, attributes and purchase history from a RevenueCat export, and to keep your existing public API keys working. Until it ships, you copy the catalog with `copy-catalog.mjs`. Customers come over from the stores, through `syncPurchases()` and store notifications, as described below.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need a RevenueDot server ([`selfhost/docker-compose`](../selfhost/docker-compose)), a RevenueDot secret key (`sk_...`, from `seed.sh` or the dashboard's API keys page) and a RevenueCat API v2 secret key with read access to your project.

```bash
cd migrate-from-revenuecat

# 1. Copy the catalog. Try --dry-run first; it prints what it would create.
SOURCE_URL=https://api.revenuecat.com SOURCE_KEY=sk_rc... SOURCE_PROJECT=proj_rc... \
DEST_URL=https://revenuedot.example.com DEST_KEY=sk_rd... DEST_PROJECT=proj_rd... \
node copy-catalog.mjs --dry-run

# 2. Add store credentials to each copied app in the RevenueDot dashboard
#    (App Store in-app purchase key, Google Play service account). The API never returns credentials, so they cannot be copied.

# 3. Forward notifications to RevenueCat while both run, one app at a time.
RD_URL=https://revenuedot.example.com RD_KEY=sk_rd... PROJECT=proj_rd... APP=app_rd... \
FORWARD_URL='<the App Store notification URL RevenueCat gave you>' ./forward-notifications.sh
# -> prints notification_url: paste it into App Store Connect (App Information > App Store Server Notifications)
```

## How it works
The safe order has four phases. The [Migrate from RevenueCat](https://revenuedot.app/docs/migrate) guide explains each step, and the [cutover checklist](https://revenuedot.app/docs/migrate/cutover-checklist) lists them.

1. **Set up RevenueDot next to RevenueCat.**
   - Copy the catalog and add store credentials.
   - Turn on **Track new purchases from server-to-server notifications** for each store app. With it on, renewals of subscribers RevenueDot has not seen yet are recorded instead of ignored.
   - Point your backend's second webhook at RevenueDot and compare the events. Keep acting on RevenueCat's webhooks for now.
2. **Route store notifications through RevenueDot.**
   - **App Store:** App Store Connect has one production URL and one sandbox URL per app. Set them to RevenueDot's `notification_url`, and set RevenueDot's forwarding URL to RevenueCat's. RevenueDot stores each notification, applies it, and copies the exact body to RevenueCat without delaying Apple.
   - **Google Play:** Play Console publishes to one Pub/Sub topic, and a topic can have several push subscriptions. If the topic lives in your own Google Cloud project, add a second push subscription to RevenueDot's URL. Otherwise use the forwarding URL the same way as for Apple.
3. **Ship the app update.**
   - Set the proxy URL and turn off signature checks (see `diffs/`).
   - Call `syncPurchases()` once on the first launch after the update. It sends the device's existing store purchases to RevenueDot, so current subscribers keep access even though their history was never imported.
   - Users still on the old version keep talking to RevenueCat, which stays accurate because notifications are forwarded.
4. **Cut over.** When nearly all active users run the new version, move your backend to RevenueDot's webhooks, remove the forwarding URL, and turn RevenueCat off.

## Migrate from RevenueCat
The code change for iOS:

```diff
+// Point the SDK at your RevenueDot server; nothing else in the app changes.
+Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
-Purchases.configure(withAPIKey: "appl_...")
+Purchases.configure(with: Configuration.Builder(withAPIKey: "appl_...").with(entitlementVerificationMode: .disabled).build())
```

Every other SDK is in [`diffs/`](diffs). Differences you should know before you start:
- **Signature checks.** RevenueDot does not sign responses with RevenueCat's key, so turn the checks off. Cordova has no option to do that; it logs a verification error and still grants access.
- **New public keys.** Until the importer exists, your app uses the public key RevenueDot shows for each app, not the old one.
- **Android traffic to RevenueCat.** With a proxy URL, the Android SDK still sends diagnostics, paywall events and ad events to RevenueCat's hosts.

The full list, including missing features by tier, is on [What differs from RevenueCat](https://revenuedot.app/docs/migrate/what-differs).

## Docs
- [Migrate from RevenueCat](https://revenuedot.app/docs/migrate)
- [Cutover checklist](https://revenuedot.app/docs/migrate/cutover-checklist)
- [What differs from RevenueCat](https://revenuedot.app/docs/migrate/what-differs)
- [REST API v2](https://revenuedot.app/docs/api/rest-v2)

## Related examples
- [`selfhost/docker-compose`](../selfhost/docker-compose): the server to migrate to.
- [`backend/nextjs-webhook`](../backend/nextjs-webhook): a webhook handler that works with both RevenueCat's and RevenueDot's payloads.
- [`mobile/ios-swiftui`](../mobile/ios-swiftui), [`mobile/react-native-expo`](../mobile/react-native-expo): apps already configured for RevenueDot.
