# Web paywall with purchases-js and a self-hosted RevenueDot (React + Vite)

## What this is
A React page that uses RevenueCat's web SDK, `@revenuecat/purchases-js`, against a RevenueDot server. It lists the packages of the current offering, buys one through the Test Store dialog, shows whether the `pro` entitlement is active, and logs the user in with their own id.

**Status: verified.** `npm run typecheck` passes, and `npm run e2e` (Playwright, Chromium) passes against a RevenueDot built with [`selfhost/docker-compose`](../../selfhost/docker-compose) and seeded with `seed.sh`, using purchases-js 1.67: it buys `$rc_monthly` through the Test Store dialog, sees `pro` become active, logs in and keeps `pro`, and checks that cancelling leaves `pro` inactive.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need a RevenueDot server with a Test Store app. The quickest is [`selfhost/docker-compose`](../../selfhost/docker-compose) and its `seed.sh`, which prints a `test_` key.

```bash
cd web/purchases-js-vite
npm install
cp .env.example .env.local     # VITE_REVENUEDOT_URL=http://localhost:8787, VITE_REVENUEDOT_API_KEY=test_...
npm run dev                    # http://localhost:5199
npx playwright install chromium && npm run e2e     # optional: the end-to-end test
```

Click **Buy**, then **Test valid purchase** in the dialog. The entitlement line changes to "Pro is active until …".

## How it works
- **`src/revenuedot.ts`** calls `Purchases.configure({ apiKey, appUserId, httpConfig: { proxyURL } })`. `proxyURL` is the only RevenueDot-specific line: every SDK request (offerings, products, customer info, receipts, identify) goes to your server instead of `api.revenuecat.com`. purchases-js refuses a proxy URL that ends with `/`. See [Web SDK](https://revenuedot.app/docs/sdks/web).
- **`flags: { collectAnalyticsEvents: false }`**: purchases-js sends its analytics events to RevenueCat's events host, not to the proxy URL. Turning them off keeps all traffic on your server.
- **App user id:** purchases-js needs one at configure time, so the page makes an anonymous id with `Purchases.generateRevenueCatAnonymousAppUserId()` and keeps it in `localStorage`. **Log in** calls `identifyUser(id)`; RevenueDot moves the anonymous customer's purchases to that id. See [Customers and app user IDs](https://revenuedot.app/docs/concepts/customers-and-app-user-ids).
- **Test Store:** with a `test_` key, `purchase({ rcPackage })` shows purchases-js's own "Test Store Purchase" dialog and then posts `POST /v1/receipts` with a `test_<ms>_<uuid>` token, which RevenueDot's Test Store accepts without Stripe or any store account. See [Test Store](https://revenuedot.app/docs/guides/test-store).
- **Prices show $0.00** because RevenueDot's catalog does not store Test Store prices yet.
- **No restore on the web.** purchases-js has no `restorePurchases()`: web purchases belong to the app user id, so signing in is how a user gets them back.
- **Real web payments** (`rcb_` RevenueCat Billing keys, Stripe or Paddle) are not supported by RevenueDot yet; see [What differs from RevenueCat](https://revenuedot.app/docs/migrate/what-differs).

## Migrate from RevenueCat
```diff
 const purchases = Purchases.configure({
   apiKey: "test_...",
   appUserId,
+  // Point the SDK at your RevenueDot server; nothing else in the app changes.
+  httpConfig: { proxyURL: "https://revenuedot.example.com" },
+  flags: { collectAnalyticsEvents: false },
 });
```

## Docs
- [Web SDK guide](https://revenuedot.app/docs/sdks/web)
- [Quickstart](https://revenuedot.app/docs/getting-started/quickstart)
- [Offerings and packages](https://revenuedot.app/docs/concepts/offerings-and-packages)

## Related examples
- [`selfhost/docker-compose`](../../selfhost/docker-compose): the server this page talks to.
- [`mobile/react-native-expo`](../../mobile/react-native-expo): the same paywall in an Expo app.
- [`backend/nextjs-webhook`](../../backend/nextjs-webhook): the webhook your backend receives after a purchase.
