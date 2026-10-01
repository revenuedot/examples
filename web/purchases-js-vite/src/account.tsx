// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the account view. The plan card reads the pro entitlement; "Manage subscription" opens the SDK's managementURL;
// signing in with identifyUser is how a web customer gets their purchases back (purchases-js has no restore call).
// A collapsed Developer section shows what RevenueDot sees. Docs: https://revenuedot.app/docs/concepts/customers-and-app-user-ids
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CustomerInfo } from "@revenuecat/purchases-js";
import { ENTITLEMENT, serverHost } from "./revenuedot";
import { Icon, Mark, PrimaryButton } from "./ui";

const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** The entitlement as one line, e.g. "Active until Oct 30, 2026". */
export function entitlementText(info: CustomerInfo | null): string {
  if (!info) return "Loading…";
  const e = info.entitlements.active[ENTITLEMENT];
  if (!e) return "Not active";
  return e.expirationDate ? `Active until ${formatDate(e.expirationDate)}` : "Active, never expires";
}

interface AccountProps {
  className: string;
  autoFocus: boolean;
  /** "You're in." right after a purchase, "Account" otherwise. */
  title: string;
  customerInfo: CustomerInfo | null;
  appUserId: string;
  offeringId: string | null;
  status: string;
  loadError: string;
  canSignIn: boolean;
  onSeePlans: () => void;
  onSignIn: (id: string) => Promise<void>;
}

export function Account(props: AccountProps) {
  const { customerInfo } = props;
  const pro = customerInfo?.entitlements.active[ENTITLEMENT];
  const [userId, setUserId] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  // Arriving here after checkout moves focus to the heading, so screen readers announce the result.
  useEffect(() => { if (props.autoFocus) ref.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true }); }, [props.autoFocus]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (userId.trim()) void props.onSignIn(userId.trim());
  };
  return (
    <div className={props.className} ref={ref}>
      <div className="screen__body" style={{ paddingTop: 36 }}>
        <h1 className="display display--34" tabIndex={-1}>{props.title}</h1>
        {pro && props.title !== "Account" && <p className="subtitle">Focus Pro is on for this account. Open Focus on any device to start.</p>}

        <section className="plan-card" style={{ marginTop: 24 }} aria-label="Your plan">
          <div className="plan-card__head">
            <span className={`status-dot${pro ? " is-on" : ""}`} aria-hidden="true" />
            <p className="plan-card__title" data-testid="plan-name">{pro ? "Focus Pro" : "Free plan"}</p>
            {pro?.periodType === "trial" && <span className="pill">Free trial</span>}
          </div>
          {pro ? (
            <p className="plan-card__sub">
              {pro.expirationDate ? `${pro.willRenew ? "Renews" : "Ends"} ${formatDate(pro.expirationDate)}` : "Yours for life"}
            </p>
          ) : (
            <>
              <p className="plan-card__sub">Upgrade for Deep and Flow sessions, weekly reports and the distraction shield.</p>
              <div style={{ marginTop: 16 }}><PrimaryButton onClick={props.onSeePlans}>See plans</PrimaryButton></div>
            </>
          )}
        </section>

        {customerInfo?.managementURL && (
          <div className="group" style={{ marginTop: 20 }}>
            <a className="row-link" href={customerInfo.managementURL} target="_blank" rel="noreferrer">
              <Icon name="card" size={20} /><span>Manage subscription</span><Icon name="arrowUpRight" size={16} stroke={2} />
            </a>
          </div>
        )}

        {props.canSignIn && (
          <form className="signin" onSubmit={submit} style={{ marginTop: 28 }}>
            <h2 className="eyebrow">Bought on another device?</h2>
            <p className="benefit__sub" style={{ marginTop: 6 }}>Sign in with the same account id to get your plan back.</p>
            <div className="login" style={{ marginTop: 12 }}>
              <input className="input" placeholder="Your user id" aria-label="User id" value={userId} onChange={(e) => setUserId(e.target.value)} autoComplete="username" />
              <button type="submit" className="btn btn--small">Sign in</button>
            </div>
          </form>
        )}

        <Developer {...props} />
      </div>
    </div>
  );
}

function Developer({ appUserId, customerInfo, offeringId, status, loadError }: AccountProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(appUserId).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const subs = customerInfo ? [...customerInfo.activeSubscriptions].sort().join(", ") || "None" : "…";
  return (
    <details className="dev" style={{ marginTop: 28 }}>
      <summary><span className="eyebrow">Developer</span><Icon name="chevronDown" size={16} stroke={2} /></summary>
      <div className="dev__body">
        <div className="group">
          <div className="field">
            <div className="field__text">
              <span className="field__label">App user id</span>
              <code className="field__value" data-testid="app-user-id">{appUserId || "…"}</code>
            </div>
            <button type="button" className="icon-btn" onClick={copy} aria-label="Copy app user id"><Icon name={copied ? "check" : "copy"} size={18} /></button>
          </div>
          <Field label={`Entitlement ${ENTITLEMENT}`} value={entitlementText(customerInfo)} testId="entitlement" />
          <Field label="Active subscriptions" value={subs} />
          <Field label="Current offering" value={offeringId ?? "None"} />
          <Field label="Server" value={serverHost} />
          {status && <Field label="Last action" value={status} testId="status" />}
          {loadError && <Field label="Load error" value={loadError} />}
        </div>
        <p className="sr-only" aria-live="polite">{copied ? "Copied" : ""}</p>
        <p className="credit caption"><Mark size={22} /> Subscriptions by RevenueDot, the open-source RevenueCat alternative.</p>
      </div>
    </details>
  );
}

function Field({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="field">
      <div className="field__text">
        <span className="field__label">{label}</span>
        <span className="field__value" data-testid={testId}>{value}</span>
      </div>
    </div>
  );
}
