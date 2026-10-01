// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the web-to-app funnel: quiz, plan, two-page paywall, purchases-js checkout, then "open the app".
// Every step is a browser history entry, so Back works; leaving the paywall shows the exit offer once.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorCode, PurchasesError, type CustomerInfo, type Purchases } from "@revenuecat/purchases-js";
import { configureRevenueDot, ENTITLEMENT, isConfigured, rememberUserId } from "@/lib/revenuedot";
import { exitPlan, plansFrom, PREVIEW_PLANS, type Plan } from "@/lib/plans";
import { QUESTIONS, SAMPLE_ANSWERS, toAttributes, type Answers } from "@/lib/quiz";
import { Building, Insight, PlanSummary, QuestionStep, Welcome } from "./onboarding";
import { ExitOffer, Paywall } from "./paywall";
import { Success } from "./success";
import { Icon, Mark, StepBar } from "./ui";

const STEPS = ["welcome", "goal", "attention", "obstacle", "insight", "best_time", "daily_minutes", "source", "building", "plan", "paywall", "plans", "success"] as const;
type StepName = (typeof STEPS)[number];
const at = (name: StepName) => STEPS.indexOf(name);
/** The bar fills across the questions and the insight; "building your plan" completes it. */
const BAR_TOTAL = at("building");

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function Funnel() {
  const purchasesRef = useRef<Purchases | null>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1 | 0>(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [livePlans, setLivePlans] = useState<Plan[]>([]);
  const [forcePreview, setForcePreview] = useState(false);
  // Until offerings arrive the paywall keeps its layout but hides the plans, so preview prices never flash.
  const [loading, setLoading] = useState(isConfigured);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [appUserId, setAppUserId] = useState("");
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitOffered, setExitOffered] = useState(false);

  const isPreview = forcePreview || livePlans.length === 0;
  const plans = isPreview ? PREVIEW_PLANS : livePlans;
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];
  const step = STEPS[index];

  // The history handler is registered once, so it reads the latest state through this ref.
  const live = useRef({ index, exitOffered, selected, plans });
  live.current = { index, exitOffered, selected, plans };

  const go = useCallback((to: number, mode: "push" | "replace" = "push") => {
    setDirection(to >= live.current.index ? 1 : -1);
    setIndex(to);
    setMessage("");
    if (mode === "push") history.pushState({ step: to }, "");
    else history.replaceState({ step: to }, "");
  }, []);

  /** Leaving the paywall with annual selected offers the shortest plan once; after that, leaving goes back to the plan. */
  const wantsExitOffer = () => {
    const { exitOffered, selected, plans } = live.current;
    return !exitOffered && selected.isAnnual && exitPlan(plans) !== null;
  };

  useEffect(() => {
    // Preview links for screenshots and tests, like the native apps' RDScreen argument: ?screen=plans&preview=1.
    // Development builds only.
    const params = new URLSearchParams(location.search);
    const screen = process.env.NODE_ENV !== "production" ? params.get("screen") : null;
    let start = 0;
    if (process.env.NODE_ENV !== "production" && params.has("preview")) setForcePreview(true);
    if (screen) {
      setAnswers(SAMPLE_ANSWERS);
      start = screen === "exit" ? at("plans") : Math.max(0, STEPS.indexOf(screen as StepName));
      if (screen === "exit") { setExitOpen(true); setExitOffered(true); }
      setIndex(start);
    }
    history.replaceState({ step: start }, "");

    const onPop = (e: PopStateEvent) => {
      const cur = live.current.index;
      const to = typeof e.state?.step === "number" ? e.state.step : 0;
      // A purchase is done; Back stays on the success screen instead of reopening the paywall.
      if (STEPS[cur] === "success") { history.pushState({ step: cur }, ""); return; }
      if (STEPS[cur] === "paywall" && to < cur && wantsExitOffer()) {
        history.pushState({ step: cur }, "");
        setExitOffered(true);
        setExitOpen(true);
        return;
      }
      setDirection(to < cur ? -1 : 1);
      setIndex(to === at("building") ? at("plan") : to);
    };
    addEventListener("popstate", onPop);

    if (!isConfigured) {
      setLoadError("Set NEXT_PUBLIC_REVENUEDOT_URL and NEXT_PUBLIC_REVENUEDOT_API_KEY in .env.local. Showing preview plans.");
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
          // Someone who already bought on the web lands on "You're in" instead of the quiz.
          if (!screen && info.entitlements.active[ENTITLEMENT]) go(at("success"), "replace");
        })
        .catch((e) => setLoadError(`Couldn't load: ${errorText(e)}`))
        .finally(() => setLoading(false));
    } catch (e) {
      setLoadError(errorText(e));
      setLoading(false);
    }
    return () => removeEventListener("popstate", onPop);
  }, [go]);

  // The answers become customer attributes once the quiz is done, so RevenueDot audiences and experiments can use them.
  useEffect(() => {
    if (step !== "building" || !purchasesRef.current || Object.keys(answers).length === 0) return;
    purchasesRef.current.setAttributes(toAttributes(answers)).catch((e) => setLoadError(`Couldn't save answers: ${errorText(e)}`));
  }, [step, answers]);

  const leavePaywall = () => {
    if (wantsExitOffer()) { setExitOffered(true); setExitOpen(true); return; }
    setExitOpen(false);
    go(at("plan"));
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
      setExitOpen(false);
      go(at("success"));
    } catch (e) {
      if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) setMessage("Purchase cancelled.");
      else setMessage(`Purchase failed: ${errorText(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function logIn(id: string) {
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
      setStatus(`Log in failed: ${errorText(e)}`);
    }
  }

  const className = `screen__content${direction === 1 ? " enter-forward" : direction === -1 ? " enter-back" : ""}`;
  const common = { className, autoFocus: direction !== 0 };
  const next = () => go(index + 1);
  const showsBar = index > 0 && index < BAR_TOTAL;

  let content: React.ReactNode;
  if (step === "welcome") content = <Welcome key={index} {...common} onNext={next} />;
  else if (step in QUESTIONS) {
    const q = QUESTIONS[step];
    content = <QuestionStep key={index} {...common} question={q} answer={answers[q.id]} onAnswer={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} onNext={next} />;
  } else if (step === "insight") content = <Insight key={index} {...common} answers={answers} onNext={next} />;
  else if (step === "building") content = <Building key={index} {...common} answers={answers} onDone={() => go(at("plan"), "replace")} />;
  else if (step === "plan") content = <PlanSummary key={index} {...common} answers={answers} onNext={next} />;
  else if (step === "paywall" || step === "plans") {
    content = (
      <Paywall key={index} {...common} page={step === "paywall" ? "value" : "plans"} answers={answers} plans={plans} selected={selected}
        isPreview={isPreview} loading={loading && !forcePreview} busy={busy} message={message} onSelect={setSelectedId} onContinue={next} onBuy={buy} onClose={leavePaywall} />
    );
  } else {
    content = (
      <Success key={index} {...common} answers={answers} dev={{
        appUserId, customerInfo, offeringId, status, loadError, canLogIn: Boolean(purchasesRef.current), onLogIn: logIn,
      }} />
    );
  }

  const shortest = exitPlan(plans);
  return (
    <div className="shell">
      <header className="site-header">
        <span className="brand"><Mark size={28} /> Focus</span>
        <span className="caption">A RevenueDot sample app</span>
      </header>
      <main className="screen">
        {showsBar && (
          <div className="topbar">
            <button type="button" className="icon-btn" onClick={() => history.back()} aria-label="Back"><Icon name="chevronLeft" size={22} stroke={2.2} /></button>
            <StepBar step={index} total={BAR_TOTAL} />
            <span style={{ width: 44 }} aria-hidden="true" />
          </div>
        )}
        {content}
      </main>
      <ExitOffer open={exitOpen} plan={shortest} busy={busy}
        onBuy={() => { if (shortest) { setSelectedId(shortest.id); void buy(shortest); } }}
        onLeave={() => { setExitOpen(false); go(at("plan")); }}
        onDismiss={() => setExitOpen(false)} />
    </div>
  );
}
