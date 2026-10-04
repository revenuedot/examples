// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: loads offerings and customer info, and exposes purchase, restore and the entitlement check to every screen.
// Docs: https://revenuedot.app/docs/sdks/react-native   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Purchases, { type CustomerInfo, type PurchasesOffering, type PurchasesPackage } from "react-native-purchases";
import { ENTITLEMENT, configureRevenueDot } from "./revenuedot";

type State = {
  /** "loading" until the first customer info and offerings arrive, "error" when configuration or the network fails. */
  status: "loading" | "ready" | "error";
  error: string | null;
  customerInfo: CustomerInfo | null;
  /** The offering marked current in your RevenueDot project. Null until loaded or when none is current. */
  offering: PurchasesOffering | null;
  /** True while the customer has the entitlement. This is the one check the whole app uses. */
  isPro: boolean;
  /** Buys a package. Resolves true when the entitlement is now active, false when the user cancelled. */
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restores purchases made with the same store account. Resolves true when the entitlement is active afterwards. */
  restore: () => Promise<boolean>;
  reload: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<State["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  const reload = useCallback(async () => {
    try {
      await configureRevenueDot();
      const [info, offerings] = await Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()]);
      setCustomerInfo(info);
      setOffering(offerings.current);
      setError(null);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let off = false;
    void reload().then(() => {
      if (off) return;
      // Fires after every purchase, restore and renewal, so the gate updates without a manual refresh.
      Purchases.addCustomerInfoUpdateListener(setCustomerInfo);
    });
    return () => {
      off = true;
      Purchases.removeCustomerInfoUpdateListener(setCustomerInfo);
    };
  }, [reload]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      return info.entitlements.active[ENTITLEMENT] !== undefined;
    } catch (e) {
      // Closing the store sheet is not an error.
      if ((e as { userCancelled?: boolean }).userCancelled) return false;
      throw e;
    }
  }, []);

  const restore = useCallback(async () => {
    const info = await Purchases.restorePurchases();
    setCustomerInfo(info);
    return info.entitlements.active[ENTITLEMENT] !== undefined;
  }, []);

  const value = useMemo<State>(
    () => ({ status, error, customerInfo, offering, isPro: customerInfo?.entitlements.active[ENTITLEMENT] !== undefined, purchase, restore, reload }),
    [status, error, customerInfo, offering, purchase, restore, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePurchases(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePurchases must be used inside <PurchasesProvider>");
  return v;
}
