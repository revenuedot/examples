// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the page: a two-page paywall built from the current offering, purchases-js checkout, then the account view.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { useEffect, useRef, useState } from "react";
import { ErrorCode, PurchasesError, type CustomerInfo, type Purchases } from "@revenuecat/purchases-js";
import { configureRevenueDot, ENTITLEMENT, isConfigured, rememberUserId } from "./revenuedot";
import { exitPlan, plansFrom, PREVIEW_PLANS, type Plan } from "./plans";
import { ExitOffer, Paywall } from "./paywall";
import { Account } from "./account";
import { Mark } from "./ui";

type Screen = "value" | "plans" | "account";
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Answers from a quiz on another page arrive in the link, e.g. ?goal=Study&daily_minutes=30&obstacle=Notifications.
const params = new URLSearchParams(location.search);
const answers = Object.fromEntries(["goal", "daily_minutes", "obstacle"].flatMap((k) => (params.get(k) ? [[k, params.get(k)!]] : [])));
// Development preview links for screenshots and tests: ?screen=plans|exit|account and ?preview=1 for preview plans.
const debugScreen = import.meta.env.DEV ? params.get("screen") : null;
const forcePreview = import.meta.env.DEV && params.has("preview");

export function App() {
  const purchasesRef = useRef<Purchases | null>(null);
  const [screen, setScreen] = useState<Screen>(debugScreen === "account" ? "account" : debugScreen === "plans" || debugScreen === "exit" ? "plans" : "value");
  const [direction, setDirection] = useState<1 | -1 | 0>(0);
  const [livePlans, setLivePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(isConfigured && !forcePreview);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [appUserId, setAppUserId] = useState("");
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [justBought, setJustBought] = useState(false);
  const [exitOpen, setExitOpen] = useState(debugScreen === "exit");
  const [exitOffered, setExitOffered] = useState(debugScreen === "exit");

  const isPreview = forcePreview || livePlans.length === 0;
  const plans = isPreview ? PREVIEW_PLANS : livePlans;
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];
  const shortest = exitPlan(plans);

  const show = (next: Screen, dir: 1 | -1) => {
    setDirection(dir);
    setScreen(next);
    setMessage("");
  };

  useEffect(() => {
    // Back from the plans page returns to page 1 of the paywall.
    const onPop = () => show("value", -1);
    addEventListener("popstate", onPop);
    if (!isConfigured) {
      setLoadError("Set VITE_REVENUEDOT_URL and VITE_REVENUEDOT_API_KEY in .env.local. Showing preview plans.");
      return () => removeEventListener("popstate", onPop);
    }
    try {
      const purchases = (purchasesRef.current ??= configureRevenueDot());
      setAppUserId(purchases.getAppUserId());
      // Offerings and customer info come from your RevenueDot server (GET /v1/subscribers/{id}/offerings and /v1/subscribers/{id}).
      Promise.all([purchases.getOfferings(), purchases.getCustomerInfo()])
        .then(([offerings, info]) => {
          setLivePlans(plansFrom(offerings.current));
          setOfferingId(offerings.current?.identifier ?? null);
          setCustomerInfo(info);
          // A customer who already has Pro sees their account, not the paywall.
          if (!debugScreen && info.entitlements.active[ENTITLEMENT]) show("account", 1);
        })
        .catch((e) => setLoadError(`Couldn't load: ${errorText(e)}`))
        .finally(() => setLoading(false));
    } catch (e) {
      setLoadError(errorText(e));
      setLoading(false);
    }
    return () => removeEventListener("popstate", onPop);
  }, []);

  /** Closing with annual selected offers the shortest plan once; then the X goes to the account view. */
  const close = () => {
    if (!exitOffered && selected.isAnnual && shortest) { setExitOffered(true); setExitOpen(true); return; }
    setExitOpen(false);
    show("account", 1);
  };

  async function buy(plan: Plan) {
    const purchases = purchasesRef.current;
    if (!plan.rcPackage || !purchases) {
      setExitOpen(false);
      setMessage("Preview plans can't be bought. Create an offering in your RevenueDot dashboard first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      // With a test_ key purchases-js shows its Test Store dialog, then posts the receipt to POST /v1/receipts.
      const { customerInfo } = await purchases.purchase({ rcPackage: plan.rcPackage });
      setCustomerInfo(customerInfo);
      setStatus(`Purchased ${plan.rcPackage.identifier}.`);
      setJustBought(true);
      setExitOpen(false);
      show("account", 1);
    } catch (e) {
      if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) setMessage("Purchase cancelled.");
      else setMessage(`Purchase failed: ${errorText(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function signIn(id: string) {
    const purchases = purchasesRef.current;
    if (!purchases) return;
    try {
      // identifyUser is purchases-js's logIn: an anonymous user's purchases move to (or merge with) this id.
      const { customerInfo } = await purchases.identifyUser(id);
      rememberUserId(id);
      setCustomerInfo(customerInfo);
      setAppUserId(purchases.getAppUserId());
      setStatus(`Signed in as ${id}.`);
    } catch (e) {
      setStatus(`Sign in failed: ${errorText(e)}`);
    }
  }

  const className = `screen__content${direction === 1 ? " enter-forward" : direction === -1 ? " enter-back" : ""}`;
  return (
    <div className="shell">
      <header className="site-header">
        <span className="brand"><Mark size={28} /> Focus</span>
        <span className="caption">A RevenueDot sample app</span>
      </header>
      <main className="screen">
        {screen === "account" ? (
          <Account key="account" className={className} autoFocus={direction !== 0} title={justBought ? "You're in." : "Account"} customerInfo={customerInfo}
            appUserId={appUserId} offeringId={offeringId} status={status} loadError={loadError} canSignIn={Boolean(purchasesRef.current)}
            onSeePlans={() => { setExitOffered(false); show("value", 1); }} onSignIn={signIn} />
        ) : (
          <Paywall key={screen} className={className} autoFocus={direction !== 0} page={screen} answers={answers} plans={plans}
            selected={selected} isPreview={isPreview} loading={loading} busy={busy} message={message} onSelect={setSelectedId}
            onContinue={() => { history.pushState({ page: "plans" }, ""); show("plans", 1); }} onBuy={buy} onClose={close} />
        )}
      </main>
      <ExitOffer open={exitOpen} plan={shortest} busy={busy}
        onBuy={() => { if (shortest) { setSelectedId(shortest.id); void buy(shortest); } }}
        onLeave={() => { setExitOpen(false); show("account", 1); }}
        onDismiss={() => setExitOpen(false)} />
    </div>
  );
}
