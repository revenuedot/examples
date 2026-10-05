# Web paywall with purchases-js and a self-hosted RevenueDot (Next.js App Router)

## What this is
A web-to-app funnel in Next.js 16 (App Router) for "Focus", the sample subscription app every RevenueDot mobile sample builds. The visitor takes the same onboarding quiz as the mobile apps, sees their plan, buys on the web through RevenueCat's web SDK, `@revenuecat/purchases-js`, pointed at a RevenueDot server, and is then sent to the app:

1. **Quiz:** a welcome screen, six questions one per screen with a progress bar, an insight chart ("A plan beats willpower."), "Building your plan" counting to 100%, and "Your plan is ready."
2. **Paywall, page 1:** the value in the visitor's own words ("Your plan for deep work is ready. Unlock it.") and four benefits.
3. **Paywall, page 2:** "How your free trial works" (today, the reminder day, the charge day), plan cards from the current offering with annual pre-selected, the billed price largest and the per-week price smaller below it, a "Save 77%" badge measured against the shortest plan, "No commitment, cancel anytime", the disclosure line, and Terms and Privacy.
4. **Checkout:** `purchase()` from purchases-js (the Test Store dialog with a `test_` key).
5. **"You're in":** what happens next, an **Open the app** link carrying the app user id, the entitlement, and a collapsed Developer section (app user id with copy, entitlement, subscriptions, offering, server, errors, log in).

Leaving the paywall (its X or the browser's Back) offers the shortest plan once in a dialog. The design follows [`mobile/DESIGN.md`](../../mobile/DESIGN.md): white and ink, hairlines, one gold accent, the system font, light and dark mode, and a single 440px column on wide screens.

**Status: verified.** `npm run typecheck` and `npm run build` pass. `npm run e2e` (Playwright, Chromium, `next dev`) passes 4 tests against a RevenueDot server seeded with [`selfhost/docker-compose/seed.sh`](../../selfhost/docker-compose), using purchases-js 1.67.1: it walks the quiz, checks the answers are posted as attributes, buys `$rc_monthly` through the Test Store dialog, confirms `pro` on the server itself and on the page, logs in and keeps `pro`; it drives the quiz with arrow keys and Enter; it checks that cancelling leaves `pro` inactive on the server; and it checks the exit offer and the preview plans.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat. It speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
You need a RevenueDot server with a Test Store app. The quickest is [`selfhost/docker-compose`](../../selfhost/docker-compose) and its `seed.sh`, which prints a `test_` key.

```bash
cd web/nextjs-purchases-js
npm install
cp .env.example .env.local     # NEXT_PUBLIC_REVENUEDOT_URL=http://localhost:8787, NEXT_PUBLIC_REVENUEDOT_API_KEY=test_...
npm run dev                    # http://localhost:5200
npx playwright install chromium && npm run e2e     # optional: the end-to-end test
```

Click through the quiz, then **Continue** and the plan button, then **Test valid purchase** in the dialog. You land on "You're in." with Pro active.

With the placeholder key from `.env.example` the funnel still runs end to end with preview plans, and buying is off. In development, `?screen=` opens any screen with sample answers (`welcome`, `goal`, `insight`, `building`, `plan`, `paywall`, `plans`, `exit`, `success`), and `?preview=1` shows the preview plans; the tests and screenshots use these.

## How it works
- **`lib/revenuedot.ts`** calls `Purchases.configure({ apiKey, appUserId, httpConfig: { proxyURL } })`. `proxyURL` is the only RevenueDot-specific line: every SDK request (offerings, products, customer info, attributes, receipts, identify) goes to your server instead of `api.revenuecat.com`. purchases-js refuses a proxy URL that ends with `/`. See [Web SDK](https://revenuedot.app/docs/sdks/web).
- **Client component only.** `app/page.tsx` is a server component that renders `app/funnel.tsx`, a `"use client"` component. purchases-js reads `localStorage` and opens its own purchase dialog, so the funnel configures it in `useEffect`, after the page mounts in the browser, never during server rendering.
- **`app/funnel.tsx`** is the step machine. Every step is a browser history entry, so Back works between questions. "Building your plan" replaces itself in history, and Back on the paywall opens the exit offer once instead of leaving.
- **Quiz answers become customer attributes.** When the quiz ends, `purchases.setAttributes()` sends `onboarding_goal`, `onboarding_attention`, `onboarding_obstacle`, `onboarding_best_time`, `onboarding_daily_minutes` and `onboarding_source` (`POST /v1/subscribers/{id}/attributes`), so RevenueDot audiences and experiments can target them. The questions are in `lib/quiz.ts`. The mobile apps' reminders screen is left out: a browser notification would not reach the app.
- **`lib/plans.ts`** turns `offerings.current` into plan cards: annual first and pre-selected, the billed price from `product.price`, the per-week price from the subscription option's `pricePerWeek`, the savings badge against the weekly (or else monthly) plan, and the trial length from `product.freeTrialPhase`. With no offering, or with the placeholder key, it returns preview plans (Yearly $59.99 with a 7-day trial and "Save 77%", Weekly $4.99) and buying is off.
- **The web-to-app hand-off.** **Open the app** links to `NEXT_PUBLIC_OPEN_APP_URL` (your app's universal link) with `?app_user_id=…`. The app calls `Purchases.logIn(appUserId)` with it, and the purchase made on the web is already on that customer.
- **Design.** `app/focus.css` holds the tokens as custom properties (`--ink`, `--ink2`, `--hairline`, `--fill`, `--accent: #F7B500`) and redefines them under `prefers-color-scheme: dark`. Options and plans are real radio inputs in labels, so arrow keys, Enter and screen readers work; focus shows an ink ring inside a gold one; motion is a short slide that becomes a fade under `prefers-reduced-motion`. Caption text uses ink at 56% instead of DESIGN.md's 42% to keep 4.5:1 contrast. No UI library.
- **Environment variables:** Next.js puts `NEXT_PUBLIC_` variables into the browser bundle at build time, so set them before `npm run build` and write them out in full (`process.env.NEXT_PUBLIC_REVENUEDOT_URL`) for Next.js to replace them.
- **`flags: { collectAnalyticsEvents: false }`**: purchases-js sends its analytics events to RevenueCat's events host, not to the proxy URL. Turning them off keeps all traffic on your server.
- **App user id:** purchases-js needs one at configure time, so the page makes an anonymous id with `Purchases.generateRevenueCatAnonymousAppUserId()` and keeps it in `localStorage`. **Log in** (Developer section) calls `identifyUser(id)`; RevenueDot moves the anonymous customer's purchases to that id. A visitor who already has Pro lands on "You're in." See [Customers and app user IDs](https://revenuedot.app/docs/concepts/customers-and-app-user-ids).
- **Test Store:** with a `test_` key, `purchase({ rcPackage })` shows purchases-js's own "Test Store Purchase" dialog and then posts `POST /v1/receipts` with a `test_<ms>_<uuid>` token, which RevenueDot's Test Store accepts without Stripe or any store account. See [Test Store](https://revenuedot.app/docs/guides/test-store).
- **Prices show $0.00** with the seeded Test Store products, because RevenueDot's catalog does not store Test Store prices yet. The savings badge and per-week line are hidden at $0.
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
- [`web/purchases-js-vite`](../purchases-js-vite): the same paywall in React with Vite, with an account view.
- [`web/vanilla-js`](../vanilla-js): the plans page and checkout with no framework.
- [`mobile/ios-sandbox`](../../mobile/ios-sandbox): the Focus app this funnel hands off to.
- [`backend/nextjs-webhook`](../../backend/nextjs-webhook): the webhook your Next.js backend receives after a purchase.
