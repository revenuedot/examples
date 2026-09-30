// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: a paywall that lists the current offering, buys a package with the Test Store and shows entitlements.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { useEffect, useMemo, useState } from "react";
import { ErrorCode, PurchasesError, type CustomerInfo, type Offering, type Package } from "@revenuecat/purchases-js";
import { configureRevenueDot, rememberUserId } from "./revenuedot";

const ENTITLEMENT = "pro"; // the entitlement lookup key created in the dashboard or by seed.sh

export function App() {
  const purchases = useMemo(() => configureRevenueDot(), []);
  const [offering, setOffering] = useState<Offering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [status, setStatus] = useState("Loading offerings…");
  const [userId, setUserId] = useState("");

  async function refresh() {
    // Offerings and customer info come from your RevenueDot server (GET /v1/subscribers/{id}/offerings and /v1/subscribers/{id}).
    const [offerings, info] = await Promise.all([purchases.getOfferings(), purchases.getCustomerInfo()]);
    setOffering(offerings.current);
    setCustomerInfo(info);
    setStatus(offerings.current ? "" : "No current offering. Create one in the dashboard.");
  }

  useEffect(() => { refresh().catch((e) => setStatus(`Could not load: ${String(e)}`)); }, []);

  async function buy(pkg: Package) {
    try {
      // With a test_ key purchases-js shows its Test Store dialog, then posts the receipt to POST /v1/receipts.
      const { customerInfo } = await purchases.purchase({ rcPackage: pkg });
      setCustomerInfo(customerInfo);
      setStatus(`Purchased ${pkg.identifier}.`);
    } catch (e) {
      if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) setStatus("Purchase cancelled.");
      else setStatus(`Purchase failed: ${String(e)}`);
    }
  }

  async function logIn() {
    if (!userId.trim()) return;
    // identifyUser is purchases-js's logIn: an anonymous user's purchases move to (or merge with) this id.
    const { customerInfo } = await purchases.identifyUser(userId.trim());
    rememberUserId(userId.trim());
    setCustomerInfo(customerInfo);
    setStatus(`Signed in as ${userId.trim()}.`);
  }

  const pro = customerInfo?.entitlements.active[ENTITLEMENT];
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 520, margin: "40px auto", padding: "0 16px" }}>
      <h1>Go Pro</h1>
      <p data-testid="entitlement">{pro ? `Pro is active until ${pro.expirationDate?.toISOString() ?? "forever"}` : "Pro is not active"}</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {offering?.availablePackages.map((pkg) => (
          <li key={pkg.identifier} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #ddd" }}>
            <span>{pkg.webBillingProduct.title || pkg.webBillingProduct.identifier} · {pkg.webBillingProduct.price?.formattedPrice ?? ""}</span>
            <button onClick={() => buy(pkg)} data-testid={`buy-${pkg.identifier}`}>Buy</button>
          </li>
        ))}
      </ul>
      <p role="status" data-testid="status">{status}</p>
      <form onSubmit={(e) => { e.preventDefault(); void logIn(); }} style={{ display: "flex", gap: 8 }}>
        <input placeholder="Your user id" value={userId} onChange={(e) => setUserId(e.target.value)} aria-label="User id" />
        <button type="submit">Log in</button>
      </form>
      <p style={{ color: "#666", fontSize: 13 }}>App user id: <code data-testid="app-user-id">{customerInfo ? purchases.getAppUserId() : "…"}</code></p>
    </main>
  );
}
