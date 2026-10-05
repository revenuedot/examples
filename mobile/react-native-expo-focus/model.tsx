// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: loads offerings and customer info, runs purchase, restore and logIn, saves onboarding answers as
// customer attributes, and shares the result with every screen through React context.
// Docs: https://revenuedot.app/docs/sdks/react-native   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesEntitlementInfo, type PurchasesPackage } from "react-native-purchases";
import { config } from "./config";
import { plansFrom, type Plan } from "./plans";
import { configureRevenueDot } from "./revenuedot";

type Model = {
  plans: Plan[];
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  proEntitlement: PurchasesEntitlementInfo | null;
  activeSubscriptions: string[];
  appUserID: string;
  loggedInID: string | null;
  offeringID: string | null;
  /** Why offerings or customer info didn't load. Shown in Account > Developer, never on the paywall. */
  loadError: string | null;
  message: string;
  busy: boolean;
  setMessage: (m: string) => void;
  saveAnswers: (answers: Record<string, string>) => void;
  /** Resolves true when the purchase unlocked the entitlement. */
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Resolves true when restoring found an active entitlement. */
  restore: () => Promise<boolean>;
  toggleLogin: (id: string) => Promise<void>;
};

const Context = createContext<Model | null>(null);

const errorText = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e));
const proOf = (info: CustomerInfo | null) => info?.entitlements.active[config.entitlement] ?? null;

export function RevenueDotProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [appUserID, setAppUserID] = useState("");
  const [loggedInID, setLoggedInID] = useState<string | null>(null);
  const [offeringID, setOfferingID] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = useRef(false);

  useEffect(() => {
    // Customer info also changes outside the app (renewals and refunds reach RevenueDot from the store).
    const listener = (info: CustomerInfo) => setCustomerInfo(info);
    let listening = false;
    (async () => {
      try {
        await configureRevenueDot();
        ready.current = true;
        Purchases.addCustomerInfoUpdateListener(listener);
        listening = true;
        // Both calls go to your RevenueDot server: GET /v1/subscribers/{id}/offerings and GET /v1/subscribers/{id}.
        const [offerings, info] = await Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()]);
        setOfferingID(offerings.current?.identifier ?? null);
        setPlans(plansFrom(offerings.current?.availablePackages ?? []));
        setCustomerInfo(info);
        const id = await Purchases.getAppUserID();
        setAppUserID(id);
        if (!(await Purchases.isAnonymous())) setLoggedInID(id);
        setLoadError(null);
      } catch (e) {
        setLoadError(errorText(e));
      }
    })();
    return () => { if (listening) Purchases.removeCustomerInfoUpdateListener(listener); };
  }, []);

  const saveAnswers = useCallback((answers: Record<string, string>) => {
    if (!ready.current) return;
    // `onboarding_goal`, `onboarding_best_time`, ...: RevenueDot audiences and experiments can target these.
    const attributes = Object.fromEntries(Object.entries(answers).map(([k, v]) => [`onboarding_${k}`, v]));
    Promise.resolve(Purchases.setAttributes(attributes)).catch(() => {});
  }, []);

  /** Runs one SDK call that returns customer info, with the busy flag and a short result message. */
  const run = useCallback(async (label: string, action: () => Promise<CustomerInfo>): Promise<CustomerInfo | null> => {
    setBusy(true);
    setMessage("");
    try {
      if (!ready.current) await configureRevenueDot();
      const info = await action();
      setCustomerInfo(info);
      setAppUserID(await Purchases.getAppUserID());
      setMessage(`${label}: done.`);
      return info;
    } catch (e) {
      setMessage(`${label} failed: ${errorText(e)}`);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    setBusy(true);
    setMessage("");
    try {
      // The store (or the Test Store dialog) takes payment; the SDK then posts the receipt to POST /v1/receipts.
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      setMessage("Welcome to Pro.");
      return proOf(info) != null;
    } catch (e) {
      // A cancelled purchase is the user's choice, not an error worth showing.
      const cancelled = (e as { code?: string })?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
      if (!cancelled) setMessage(`Purchase failed: ${errorText(e)}`);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const restore = useCallback(async () => {
    // Restore asks the store for this Apple ID's or Google account's purchases and sends them to RevenueDot.
    const info = await run("Restore", () => Purchases.restorePurchases());
    if (info && !proOf(info)) setMessage("No purchases to restore on this account.");
    return proOf(info) != null;
  }, [run]);

  const toggleLogin = useCallback(async (id: string) => {
    if (loggedInID == null) {
      // logIn moves an anonymous user's purchases to your own user id (see the transfer rules in the docs).
      const info = await run("Log in", async () => (await Purchases.logIn(id)).customerInfo);
      if (info) setLoggedInID(id);
    } else {
      const info = await run("Log out", () => Purchases.logOut());
      if (info) setLoggedInID(null);
    }
  }, [loggedInID, run]);

  const value = useMemo<Model>(() => {
    const pro = proOf(customerInfo);
    return {
      plans,
      customerInfo,
      isPro: pro != null,
      proEntitlement: pro,
      activeSubscriptions: [...(customerInfo?.activeSubscriptions ?? [])].sort(),
      appUserID,
      loggedInID,
      offeringID,
      loadError,
      message,
      busy,
      setMessage,
      saveAnswers,
      purchase,
      restore,
      toggleLogin,
    };
  }, [plans, customerInfo, appUserID, loggedInID, offeringID, loadError, message, busy, saveAnswers, purchase, restore, toggleLogin]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useModel(): Model {
  const m = useContext(Context);
  if (!m) throw new Error("useModel needs RevenueDotProvider");
  return m;
}
