// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the screen after checkout. It confirms Pro, says what happens next, and hands off to the app with the
// app user id in the link, so the app can logIn as the same customer. A collapsed Developer section shows what
// RevenueDot sees. Docs: https://revenuedot.app/docs/concepts/customers-and-app-user-ids
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CustomerInfo } from "@revenuecat/purchases-js";
import { ENTITLEMENT, OPEN_APP_URL, serverHost } from "@/lib/revenuedot";
import { goalOf, minutesOf, timeOf, type Answers } from "@/lib/quiz";
import { Icon, Mark } from "./ui";

const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** The entitlement as one line, e.g. "Active until Oct 30, 2026". */
export function entitlementText(info: CustomerInfo | null): string {
  if (!info) return "Loading…";
  const e = info.entitlements.active[ENTITLEMENT];
  if (!e) return "Not active";
  return e.expirationDate ? `Active until ${formatDate(e.expirationDate)}` : "Active, never expires";
}

export interface DeveloperInfo {
  appUserId: string;
  customerInfo: CustomerInfo | null;
  offeringId: string | null;
  status: string;
  loadError: string;
  canLogIn: boolean;
  onLogIn: (id: string) => Promise<void>;
}

export function Success({ className, autoFocus, answers, dev }: { className: string; autoFocus: boolean; answers: Answers; dev: DeveloperInfo }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [autoFocus]);
  const pro = dev.customerInfo?.entitlements.active[ENTITLEMENT];
  const openURL = `${OPEN_APP_URL}?app_user_id=${encodeURIComponent(dev.appUserId)}`;
  const next: [string, string][] = [
    ["Open Focus on your phone", "The button below signs you in, so Pro is already on."],
    ["Your plan is waiting", `${goalOf(answers)[0].toUpperCase()}${goalOf(answers).slice(1)}, ${minutesOf(answers)} minutes each ${timeOf(answers)}.`],
    ["Change plans anytime", "Manage or cancel your subscription from Account in the app."],
  ];
  return (
    <div className={className} ref={ref}>
      <div className="screen__body" style={{ paddingTop: 48 }}>
        <div className="hero-tile" aria-hidden="true">
          <Icon name="check" size={40} stroke={2.2} />
          <span className="hero-tile__dot" />
        </div>
        <h1 className="display display--40" tabIndex={-1} style={{ marginTop: 28 }}>You&apos;re in.</h1>
        <p className="subtitle">Focus Pro is on. Your plan for {goalOf(answers)} is waiting in the app.</p>

        <div className="plan-card" style={{ marginTop: 28 }}>
          <div className="plan-card__head">
            <span className={`status-dot${pro ? " is-on" : ""}`} aria-hidden="true" />
            <p className="plan-card__title">{pro ? "Focus Pro" : "Free plan"}</p>
            {pro?.periodType === "trial" && <span className="pill">Free trial</span>}
          </div>
          <p className="plan-card__sub">
            {!pro ? "Pro is not active on this account yet." : pro.expirationDate
              ? `${pro.willRenew ? "Renews" : "Ends"} ${formatDate(pro.expirationDate)}` : "Yours for life"}
          </p>
        </div>

        <h2 className="eyebrow" style={{ marginTop: 32 }}>What happens next</h2>
        <ol className="next-steps" style={{ marginTop: 14 }}>
          {next.map(([title, sub], i) => (
            <li key={title}>
              <span className="next-steps__n" aria-hidden="true">{i + 1}</span>
              <div>
                <p className="benefit__title">{title}</p>
                <p className="benefit__sub">{sub}</p>
              </div>
            </li>
          ))}
        </ol>

        <Developer {...dev} />
      </div>
      <div className="screen__footer">
        <a className="btn" href={openURL} data-testid="open-app">Open the app <Icon name="arrowUpRight" size={18} stroke={2.2} /></a>
      </div>
    </div>
  );
}

/** What RevenueDot sees for this browser: ids, entitlement, offering, errors. Also where you log in as a known user. */
export function Developer({ appUserId, customerInfo, offeringId, status, loadError, canLogIn, onLogIn }: DeveloperInfo) {
  const [userId, setUserId] = useState("");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(appUserId).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (userId.trim()) void onLogIn(userId.trim());
  };
  const subs = customerInfo ? [...customerInfo.activeSubscriptions].sort().join(", ") || "None" : "…";
  return (
    <details className="dev" style={{ marginTop: 32 }} data-testid="developer">
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
        {canLogIn && (
          <form className="login" onSubmit={submit}>
            <input className="input" placeholder="Your user id" aria-label="User id" value={userId} onChange={(e) => setUserId(e.target.value)} autoComplete="off" />
            <button type="submit" className="btn btn--small">Log in</button>
          </form>
        )}
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
