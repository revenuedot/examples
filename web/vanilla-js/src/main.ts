// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: a framework-free paywall that lists the current offering, buys a package with the Test Store and shows entitlements.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { ErrorCode, PurchasesError, type CustomerInfo, type Package } from "@revenuecat/purchases-js";
import { configureRevenueDot, rememberUserId } from "./revenuedot";

const ENTITLEMENT = "pro"; // the entitlement lookup key created in the dashboard or by seed.sh

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const entitlementEl = $("[data-testid=entitlement]");
const statusEl = $("[data-testid=status]");
const appUserIdEl = $("[data-testid=app-user-id]");
const packagesEl = $<HTMLUListElement>("#packages");
const loginForm = $<HTMLFormElement>("#login");
const userIdInput = $<HTMLInputElement>("#user-id");

const setStatus = (text: string) => { statusEl.textContent = text; };

let purchases: ReturnType<typeof configureRevenueDot>;
try {
  purchases = configureRevenueDot();
} catch (e) {
  setStatus(String(e));
  throw e;
}

function showCustomer(info: CustomerInfo) {
  const pro = info.entitlements.active[ENTITLEMENT];
  entitlementEl.textContent = pro ? `Pro is active until ${pro.expirationDate?.toISOString() ?? "forever"}` : "Pro is not active";
  appUserIdEl.textContent = purchases.getAppUserId();
}

function renderPackages(packages: Package[]) {
  packagesEl.replaceChildren(
    ...packages.map((pkg) => {
      const li = document.createElement("li");
      li.style.cssText = "display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #ddd";
      const label = document.createElement("span");
      label.textContent = `${pkg.webBillingProduct.title || pkg.webBillingProduct.identifier} · ${pkg.webBillingProduct.price?.formattedPrice ?? ""}`;
      const button = document.createElement("button");
      button.textContent = "Buy";
      button.dataset.testid = `buy-${pkg.identifier}`;
      button.addEventListener("click", () => void buy(pkg));
      li.append(label, button);
      return li;
    }),
  );
}

async function load() {
  // Offerings and customer info come from your RevenueDot server (GET /v1/subscribers/{id}/offerings and /v1/subscribers/{id}).
  const [offerings, info] = await Promise.all([purchases.getOfferings(), purchases.getCustomerInfo()]);
  renderPackages(offerings.current?.availablePackages ?? []);
  showCustomer(info);
  setStatus(offerings.current ? "" : "No current offering. Create one in the dashboard.");
}

async function buy(pkg: Package) {
  try {
    // With a test_ key purchases-js shows its Test Store dialog, then posts the receipt to POST /v1/receipts.
    const { customerInfo } = await purchases.purchase({ rcPackage: pkg });
    showCustomer(customerInfo);
    setStatus(`Purchased ${pkg.identifier}.`);
  } catch (e) {
    if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) setStatus("Purchase cancelled.");
    else setStatus(`Purchase failed: ${String(e)}`);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = userIdInput.value.trim();
  if (!id) return;
  try {
    // identifyUser is purchases-js's logIn: an anonymous user's purchases move to (or merge with) this id.
    const { customerInfo } = await purchases.identifyUser(id);
    rememberUserId(id);
    showCustomer(customerInfo);
    setStatus(`Signed in as ${id}.`);
  } catch (e) {
    setStatus(`Log in failed: ${String(e)}`);
  }
});

load().catch((e) => setStatus(`Could not load: ${String(e)}`));
