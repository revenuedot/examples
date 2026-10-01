// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: a framework-free paywall: the plans page built from the current offering (annual pre-selected, billed price
// largest, trial timeline), checkout with purchases-js, then the success screen with the entitlement.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { ErrorCode, PurchasesError, type CustomerInfo, type Purchases } from "@revenuecat/purchases-js";
import { configureRevenueDot, ENTITLEMENT, isConfigured, rememberUserId } from "./revenuedot";
import { ctaFor, disclosureFor, plansFrom, PREVIEW_PLANS, type Plan } from "./plans";
import { iconSVG, type IconName } from "./icons";
import "./focus.css";

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const params = new URLSearchParams(location.search);
// Development preview links for screenshots and tests: ?preview=1 shows preview plans, ?screen=success the last screen.
const forcePreview = import.meta.env.DEV && params.has("preview");

let purchases: Purchases | null = null;
let plans: Plan[] = PREVIEW_PLANS;
let selectedId = plans[0].id;
let isPreview = true;
let busy = false;

for (const el of document.querySelectorAll<HTMLElement>("[data-icon]")) {
  el.outerHTML = iconSVG(el.dataset.icon as IconName, Number(el.dataset.size ?? 14), el.dataset.size ? 2 : 2.4);
}

/** Builds DOM from markup with text escaped, so prices and titles from the dashboard can never inject HTML. */
function h(tag: string, attrs: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

const selected = () => plans.find((p) => p.id === selectedId) ?? plans[0];

/** Everything that depends on the selected plan: the title, the trial timeline, the button and the disclosure. */
function renderSelection() {
  const plan = selected();
  const title = $("#plans-title");
  const timeline = $("#timeline");
  title.textContent = plan.trialDays ? "How your free trial works" : "Choose your plan";
  timeline.hidden = !plan.trialDays;
  if (plan.trialDays) {
    const steps: [IconName, string, string][] = [
      ["lockOpen", "Today", "Get full access to your plan and every session."],
      ["bell", `Day ${Math.max(plan.trialDays - 2, 1)}`, "We'll remind you that your trial is ending."],
      ["star", `Day ${plan.trialDays}`, `You're charged ${plan.price}. Cancel anytime before.`],
    ];
    timeline.replaceChildren(...steps.map(([name, t, sub], i) => {
      const rail = h("div", { class: "timeline__rail", "aria-hidden": "true" }, h("span", { class: "timeline__icon" }));
      rail.firstElementChild!.innerHTML = iconSVG(name, 16, 2);
      if (i < steps.length - 1) rail.append(h("span", { class: "timeline__line" }));
      return h("li", { class: "timeline__step" }, rail,
        h("div", { class: "timeline__text" }, h("p", { class: "timeline__title" }, t), h("p", { class: "timeline__sub" }, sub)));
    }));
  }
  $("#buy").textContent = ctaFor(plan);
  $("#disclosure").textContent = disclosureFor(plan);
}

/** The plan cards: real radio inputs, so arrow keys move between plans and screen readers announce them. */
function renderPlans() {
  $("#plan-list").replaceChildren(...plans.map((p) => {
    const input = h("input", { type: "radio", name: "plan", value: p.id }) as HTMLInputElement;
    input.checked = p.id === selectedId;
    input.addEventListener("change", () => { selectedId = p.id; setMessage(""); renderSelection(); });
    const text = h("span", { class: "option__text" }, h("span", { class: "option__title" }, p.title));
    if (p.trialDays) text.append(h("span", { class: "option__sub" }, `${p.trialDays}-day free trial`));
    const price = h("span", { class: "plan__price" }, h("span", { class: "plan__billed" }, p.price));
    if (p.perWeek) price.append(h("span", { class: "plan__week" }, p.perWeek));
    const card = h("label", { class: "option plan", "data-testid": `plan-${p.id}` }, input, text, price, h("span", { class: "dot", "aria-hidden": "true" }));
    if (p.badge) card.append(h("span", { class: "badge" }, p.badge));
    return card;
  }));
  $("#preview-note").hidden = !isPreview;
  renderSelection();
}

function setMessage(text: string) { $("#message").textContent = text; }

function setBusy(on: boolean) {
  busy = on;
  const button = $<HTMLButtonElement>("#buy");
  button.classList.toggle("btn--busy", on);
  button.setAttribute("aria-busy", String(on));
  button.replaceChildren(on ? h("span", { class: "spinner", "aria-label": "Working" }) : ctaFor(selected()));
}

function showCustomer(info: CustomerInfo | null) {
  const pro = info?.entitlements.active[ENTITLEMENT];
  const date = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  $("#status-dot").classList.toggle("is-on", Boolean(pro));
  $("#plan-name").textContent = pro ? "Focus Pro" : "Free plan";
  $("#plan-sub").textContent = !pro ? "Pro is not active on this account yet." : pro.expirationDate ? `${pro.willRenew ? "Renews" : "Ends"} ${date(pro.expirationDate)}` : "Yours for life";
  $("[data-testid=entitlement]").textContent = !info ? "…" : !pro ? "Not active" : pro.expirationDate ? `Active until ${date(pro.expirationDate)}` : "Active, never expires";
  if (purchases) $("[data-testid=app-user-id]").textContent = purchases.getAppUserId();
}

function showSuccess() {
  $("#plans").hidden = true;
  const success = $("#success");
  success.hidden = false;
  success.classList.add("enter-forward");
  $("#success h1").focus({ preventScroll: true });
}

async function buy() {
  const plan = selected();
  if (busy) return;
  if (!plan.rcPackage || !purchases) {
    setMessage("Preview plans can't be bought. Create an offering in your RevenueDot dashboard first.");
    return;
  }
  setBusy(true);
  setMessage("");
  try {
    // With a test_ key purchases-js shows its Test Store dialog, then posts the receipt to POST /v1/receipts.
    const { customerInfo } = await purchases.purchase({ rcPackage: plan.rcPackage });
    showCustomer(customerInfo);
    $("[data-testid=last-action]").textContent = `Purchased ${plan.rcPackage.identifier}.`;
    showSuccess();
  } catch (e) {
    if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) setMessage("Purchase cancelled.");
    else setMessage(`Purchase failed: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    setBusy(false);
  }
}

$("#buy").addEventListener("click", () => void buy());

$("#copy").addEventListener("click", () => {
  void navigator.clipboard?.writeText($("[data-testid=app-user-id]").textContent ?? "").catch(() => undefined);
});

$<HTMLFormElement>("#login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $<HTMLInputElement>("#user-id").value.trim();
  if (!id || !purchases) return;
  try {
    // identifyUser is purchases-js's logIn: an anonymous user's purchases move to (or merge with) this id.
    const { customerInfo } = await purchases.identifyUser(id);
    rememberUserId(id);
    showCustomer(customerInfo);
    $("[data-testid=last-action]").textContent = `Signed in as ${id}.`;
  } catch (e) {
    $("[data-testid=last-action]").textContent = `Log in failed: ${e instanceof Error ? e.message : String(e)}`;
  }
});

function ready() {
  $("#plans-body").classList.remove("is-loading");
  $("#plans-body").removeAttribute("aria-busy");
  renderPlans();
}

async function load() {
  if (!isConfigured || forcePreview) return;
  purchases = configureRevenueDot();
  // Offerings and customer info come from your RevenueDot server (GET /v1/subscribers/{id}/offerings and /v1/subscribers/{id}).
  const [offerings, info] = await Promise.all([purchases.getOfferings(), purchases.getCustomerInfo()]);
  const live = plansFrom(offerings.current);
  if (live.length) { plans = live; isPreview = false; selectedId = live[0].id; }
  showCustomer(info);
  // Someone who already has Pro skips the paywall.
  if (info.entitlements.active[ENTITLEMENT]) showSuccess();
}

load()
  .catch((e) => { $("[data-testid=last-action]").textContent = `Couldn't load: ${e instanceof Error ? e.message : String(e)}`; })
  .finally(() => {
    ready();
    if (import.meta.env.DEV && params.get("screen") === "success") { showCustomer(null); showSuccess(); }
  });
