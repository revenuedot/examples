# Web paywall with purchases-js and a self-hosted RevenueDot (no framework)

## What this is
The plans page of the "Focus" paywall in plain TypeScript and CSS, bundled with Vite and using no UI framework, with RevenueCat's web SDK, `@revenuecat/purchases-js`, against a RevenueDot server. It shows "How your free trial works" (today, the reminder day, the charge day), plan cards from the current offering with annual pre-selected, the billed price largest and the per-week price smaller below it, a "Save 77%" badge measured against the shortest plan, "No commitment, cancel anytime", the disclosure line, and Terms and Privacy. The button opens purchases-js's checkout; after it, "You're in." shows the plan and a collapsed Developer section (app user id, entitlement, last action, log in).

It uses the same design as the native Focus apps ([`mobile/DESIGN.md`](../../mobile/DESIGN.md)): white and ink, hairlines, one gold accent, the system font, light and dark mode, and a single 440px column on wide screens.

**Status: verified.** `npm run build` (which runs `tsc --noEmit` first) passes, and `npm run e2e` (Playwright, Chromium) passes 3 tests against a RevenueDot server seeded with [`selfhost/docker-compose/seed.sh`](../../selfhost/docker-compose), using purchases-js 1.67.1: it picks `$rc_monthly` with the arrow keys, buys it through the Test Store dialog, confirms `pro` on the server itself and on the page, logs in and keeps `pro`; checks that cancelling leaves `pro` inactive on the server; and checks the preview plans.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need a RevenueDot server with a Test Store app. The quickest is [`selfhost/docker-compose`](../../selfhost/docker-compose) and its `seed.sh`, which prints a `test_` key.

```bash
cd web/vanilla-js
npm install
cp .env.example .env.local     # VITE_REVENUEDOT_URL=http://localhost:8787, VITE_REVENUEDOT_API_KEY=test_...
npm run dev                    # http://localhost:5201
npx playwright install chromium && npm run e2e     # optional: the end-to-end test
```

Pick a plan, click the button, then **Test valid purchase** in the dialog. The page changes to "You're in." with Focus Pro.

With the placeholder key from `.env.example` the page still renders preview plans, and buying is off. In development, `?preview=1` shows the preview plans and `?screen=success` shows the last screen. Run the tests on another port with `PORT=5203 npm run e2e`.

## How it works
- **`src/revenuedot.ts`** calls `Purchases.configure({ apiKey, appUserId, httpConfig: { proxyURL } })`. `proxyURL` is the only RevenueDot-specific line: every SDK request (offerings, products, customer info, receipts, identify) goes to your server instead of `api.revenuecat.com`. purchases-js refuses a proxy URL that ends with `/`. See [Web SDK](https://revenuedot.app/docs/sdks/web).
- **`index.html`** holds both screens as static markup. **`src/main.ts`** fills them: it builds the timeline and one radio card per package with `document.createElement` (so dashboard text is never parsed as HTML), updates the title, button and disclosure when the plan changes, and shows "You're in." after `purchase()`.
- **`src/plans.ts`** turns `offerings.current` into plan cards: annual first and pre-selected, the billed price from `product.price`, the per-week price from the subscription option's `pricePerWeek`, the savings badge against the weekly (or else monthly) plan, and the trial length from `product.freeTrialPhase`. With no offering, or with the placeholder key, it returns preview plans (Yearly $59.99 with a 7-day trial and "Save 77%", Weekly $4.99).
- **Design.** `src/focus.css` holds the tokens as custom properties (`--ink`, `--ink2`, `--hairline`, `--fill`, `--accent: #F7B500`) and redefines them under `prefers-color-scheme: dark`. Plan cards are real radio inputs in labels, so arrow keys and screen readers work; the selected style comes from `:checked` in CSS, not from script; focus shows an ink ring inside a gold one. Icons are inline SVG from `src/icons.ts`.
- **`flags: { collectAnalyticsEvents: false }`**: purchases-js sends its analytics events to RevenueCat's events host, not to the proxy URL. Turning them off keeps all traffic on your server.
- **App user id:** purchases-js needs one at configure time, so the page makes an anonymous id with `Purchases.generateRevenueCatAnonymousAppUserId()` and keeps it in `localStorage`. **Log in** calls `identifyUser(id)`; RevenueDot moves the anonymous customer's purchases to that id. A visitor who already has Pro skips straight to "You're in." See [Customers and app user IDs](https://revenuedot.app/docs/concepts/customers-and-app-user-ids).
- **Test Store:** with a `test_` key, `purchase({ rcPackage })` shows purchases-js's own "Test Store Purchase" dialog and then posts `POST /v1/receipts` with a `test_<ms>_<uuid>` token, which RevenueDot's Test Store accepts without Stripe or any store account. See [Test Store](https://revenuedot.app/docs/guides/test-store).
- **Prices show $0.00** with the seeded Test Store products, because RevenueDot's catalog does not store Test Store prices yet. The savings badge and per-week line are hidden at $0.
- **No restore on the web.** purchases-js has no `restorePurchases()`: web purchases belong to the app user id, so signing in is how a user gets them back.
- **Real web payments** (`rcb_` RevenueCat Billing keys, Stripe or Paddle) are not supported by RevenueDot yet; see [What differs from RevenueCat](https://revenuedot.app/docs/migrate/what-differs).
- **Vite is only the bundler:** purchases-js is an npm package, so this example uses Vite to bundle it. Any bundler works; only the `import.meta.env` lines are Vite-specific.

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
- [`web/purchases-js-vite`](../purchases-js-vite): both paywall pages and an account view in React with Vite.
- [`web/nextjs-purchases-js`](../nextjs-purchases-js): the full web-to-app funnel, quiz included, in Next.js.
- [`backend/node-express-webhook`](../../backend/node-express-webhook): the webhook your backend receives after a purchase.
