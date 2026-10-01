# Web paywall with purchases-js and a self-hosted RevenueDot (React + Vite)

## What this is
A React + Vite paywall for "Focus", the sample subscription app every RevenueDot mobile sample builds, using RevenueCat's web SDK, `@revenuecat/purchases-js`, against a RevenueDot server. It has three screens:

1. **Paywall, page 1:** "Focus Pro" and four benefits. When a quiz on another page links here with the answers (`?goal=Study&daily_minutes=30&obstacle=Notifications`), the headline and benefits use them ("Your plan for study is ready. Unlock it.").
2. **Paywall, page 2:** "How your free trial works" (today, the reminder day, the charge day), plan cards from the current offering with annual pre-selected, the billed price largest and the per-week price smaller below it, a "Save 77%" badge measured against the shortest plan, "No commitment, cancel anytime", the disclosure line, and Terms and Privacy. Checkout is purchases-js's `purchase()`.
3. **Account:** Focus Pro with its renewal date (or Free plan with "See plans"), **Manage subscription** when the SDK returns a `managementURL`, sign-in to get purchases back, and a collapsed Developer section (app user id with copy, entitlement, subscriptions, offering, server, errors).

Closing the paywall with annual selected offers the shortest plan once in a dialog. The design follows [`mobile/DESIGN.md`](../../mobile/DESIGN.md): white and ink, hairlines, one gold accent, the system font, light and dark mode, and a single 440px column on wide screens.

**Status: verified.** `npm run build` (which runs `tsc --noEmit` first) passes, and `npm run e2e` (Playwright, Chromium) passes 4 tests against a RevenueDot server seeded with [`selfhost/docker-compose/seed.sh`](../../selfhost/docker-compose), using purchases-js 1.67.1: it buys `$rc_monthly` through the Test Store dialog, confirms `pro` on the server itself and in the account view, signs in and keeps `pro`; checks that cancelling leaves `pro` inactive on the server; checks the exit offer and the free account; and checks the preview plans.

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

Click **Continue**, pick a plan, click the plan button, then **Test valid purchase** in the dialog. The account view shows Focus Pro.

With the placeholder key from `.env.example` the paywall still renders preview plans, and buying is off. In development, `?screen=plans`, `?screen=exit` and `?screen=account` open those screens, and `?preview=1` shows the preview plans; the tests and screenshots use these. Run the tests on another port with `PORT=5202 npm run e2e`.

## How it works
- **`src/revenuedot.ts`** calls `Purchases.configure({ apiKey, appUserId, httpConfig: { proxyURL } })`. `proxyURL` is the only RevenueDot-specific line: every SDK request (offerings, products, customer info, receipts, identify) goes to your server instead of `api.revenuecat.com`. purchases-js refuses a proxy URL that ends with `/`. See [Web SDK](https://revenuedot.app/docs/sdks/web).
- **`src/App.tsx`** loads `getOfferings()` and `getCustomerInfo()`, switches between the paywall pages and the account view, and runs `purchase()` and `identifyUser()`. A customer who already has Pro opens on the account view.
- **`src/plans.ts`** turns `offerings.current` into plan cards: annual first and pre-selected, the billed price from `product.price`, the per-week price from the subscription option's `pricePerWeek`, the savings badge against the weekly (or else monthly) plan, and the trial length from `product.freeTrialPhase`. With no offering, or with the placeholder key, it returns preview plans (Yearly $59.99 with a 7-day trial and "Save 77%", Weekly $4.99).
- **Design.** `src/focus.css` holds the tokens as custom properties (`--ink`, `--ink2`, `--hairline`, `--fill`, `--accent: #F7B500`) and redefines them under `prefers-color-scheme: dark`. Plan cards are real radio inputs, so arrow keys and screen readers work; the exit offer is a native `<dialog>` (Escape closes it); focus shows an ink ring inside a gold one; motion becomes a fade under `prefers-reduced-motion`. No UI library.
- **`flags: { collectAnalyticsEvents: false }`**: purchases-js sends its analytics events to RevenueCat's events host, not to the proxy URL. Turning them off keeps all traffic on your server.
- **App user id:** purchases-js needs one at configure time, so the page makes an anonymous id with `Purchases.generateRevenueCatAnonymousAppUserId()` and keeps it in `localStorage`. **Sign in** calls `identifyUser(id)`; RevenueDot moves the anonymous customer's purchases to that id. See [Customers and app user IDs](https://revenuedot.app/docs/concepts/customers-and-app-user-ids).
- **Restore and manage on the web.** purchases-js has no `restorePurchases()`: web purchases belong to the app user id, so signing in is the restore. **Manage subscription** opens `customerInfo.managementURL`, which purchases-js fills for Web Billing, App Store and Play subscriptions; Test Store purchases have none, so the row is hidden.
- **Test Store:** with a `test_` key, `purchase({ rcPackage })` shows purchases-js's own "Test Store Purchase" dialog and then posts `POST /v1/receipts` with a `test_<ms>_<uuid>` token, which RevenueDot's Test Store accepts without Stripe or any store account. See [Test Store](https://revenuedot.app/docs/guides/test-store).
- **Prices show $0.00** with the seeded Test Store products, because RevenueDot's catalog does not store Test Store prices yet. The savings badge and per-week line are hidden at $0.
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
- [`web/nextjs-purchases-js`](../nextjs-purchases-js): the full web-to-app funnel, quiz included, in Next.js.
- [`mobile/react-native-expo`](../../mobile/react-native-expo): the same paywall in an Expo app.
- [`backend/nextjs-webhook`](../../backend/nextjs-webhook): the webhook your backend receives after a purchase.
