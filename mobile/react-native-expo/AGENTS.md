# AGENTS.md: Expo starter with RevenueDot in-app purchases

This is an Expo Router app with subscriptions already wired through RevenueDot, the open-source RevenueCat alternative. Docs for agents: https://revenuedot.app/llms.txt

## Rules
- Keep `import Purchases from "react-native-purchases"`. The package is an npm alias for the RevenueDot fork (`"react-native-purchases": "npm:@revenuedot/react-native-purchases@10.10.2"` in `package.json`), so the RevenueCat API and docs apply unchanged.
- `await Purchases.setProxyURL(...)` must run before `Purchases.configure(...)`. Both live in `lib/revenuedot.ts`; do not move them.
- Never set `entitlementVerificationMode` (the React Native default, disabled, is what a self-hosted RevenueDot needs).
- Check access with `usePurchases().isPro` or wrap content in `<ProGate>`. Do not store "is subscribed" yourself.
- Keys, the server URL and the entitlement name come from `EXPO_PUBLIC_REVENUEDOT_*` in `.env.local`. Never commit `.env.local`; never put a secret key (`sk_...`) in the app.
- Every source file starts with the three-line RevenueDot header comment. Keep it on new files.

## Where things are
- `lib/revenuedot.ts`: SDK setup, the entitlement name, the server host.
- `lib/purchases.tsx`: `PurchasesProvider` and `usePurchases()` (offering, customer info, `purchase`, `restore`, `isPro`).
- `lib/ProGate.tsx`: the entitlement gate.
- `app/index.tsx`: home screen. `app/paywall.tsx`: the paywall (modal route).
- `scripts/setup-test-store.sh`: creates a Test Store app, the `pro` entitlement and a `default` offering, and writes `.env.local`.

## Commands
- `npm run setup:test-store`: first-time setup (see README for the account it needs).
- `npx expo start`, then `i` for the iOS simulator, `a` for Android, `w` for web. Expo Go works with a `test_` key.
- `npm run typecheck`: run after every change.
- Real App Store or Google Play purchases need a development build (`npx expo run:ios`) and the `appl_` or `goog_` key: https://revenuedot.app/docs/guides/app-store
