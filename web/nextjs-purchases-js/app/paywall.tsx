// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the two-page paywall built from the current offering. Page 1 sells the value in the user's own words;
// page 2 explains the free trial step by step, shows the plans with annual pre-selected, and the disclosure line.
// Leaving it offers the shortest plan once. Research: company/docs/research/paywall-onboarding-2026.md
// Docs: https://revenuedot.app/docs/guides/paywalls   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { PRIVACY_URL, TERMS_URL } from "@/lib/revenuedot";
import { ctaFor, disclosureFor, type Plan } from "@/lib/plans";
import { goalOf, minutesOf, obstacleOf, type Answers } from "@/lib/quiz";
import type { IconName } from "@/lib/icons";
import { Icon, PrimaryButton } from "./ui";

interface PaywallProps {
  className: string;
  autoFocus: boolean;
  page: "value" | "plans";
  answers: Answers;
  plans: Plan[];
  selected: Plan;
  isPreview: boolean;
  loading: boolean;
  busy: boolean;
  message: string;
  onSelect: (id: string) => void;
  onContinue: () => void;
  onBuy: (plan: Plan) => void;
  onClose: () => void;
}

export function Paywall(props: PaywallProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (props.autoFocus) ref.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [props.autoFocus]);
  return (
    <div className={props.className} ref={ref}>
      <div className="topbar">
        <button type="button" className="icon-btn icon-btn--quiet" onClick={props.onClose} aria-label="Close">
          <Icon name="close" size={18} stroke={2.2} />
        </button>
      </div>
      {props.page === "value" ? <ValuePage {...props} /> : <PlansPage {...props} />}
    </div>
  );
}

function ValuePage({ answers, onContinue }: PaywallProps) {
  const benefits: [IconName, string, string][] = [
    ["target", `Your ${minutesOf(answers)}-minute daily plan`, `Built for ${goalOf(answers)}, adjusted every week`],
    ["timer", "Unlimited deep sessions", "25, 50 and 90 minutes, or your own length"],
    ["bellSlash", "Distraction shield", `Silences ${obstacleOf(answers)} while you focus`],
    ["chart", "Progress you can see", "Streaks, weekly reports and focus trends"],
  ];
  return (
    <>
      <div className="screen__body">
        <p className="eyebrow" style={{ marginTop: 4 }}>Focus Pro</p>
        <h1 className="display display--34" tabIndex={-1} style={{ marginTop: 10 }}>
          Your plan for {goalOf(answers)} is ready. Unlock it.
        </h1>
        <ul className="benefits" style={{ marginTop: 32 }}>
          {benefits.map(([icon, title, sub]) => (
            <li className="benefit" key={title}>
              <span className="icon-tile"><Icon name={icon} size={20} /></span>
              <div>
                <p className="benefit__title">{title}</p>
                <p className="benefit__sub">{sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="screen__footer">
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </>
  );
}

function PlansPage({ plans, selected, isPreview, loading, busy, message, onSelect, onBuy }: PaywallProps) {
  return (
    <>
      <div className={`screen__body${loading ? " is-loading" : ""}`} aria-busy={loading || undefined}>
        {selected.trialDays ? (
          <>
            <h1 className="display display--28" tabIndex={-1}>How your free trial works</h1>
            <TrialTimeline days={selected.trialDays} price={selected.price} />
          </>
        ) : (
          <h1 className="display display--28" tabIndex={-1}>Choose your plan</h1>
        )}
        <div className="options" role="radiogroup" aria-label="Plans" style={{ marginTop: 28, gap: 14 }}>
          {plans.map((p) => (
            <label key={p.id} className="option plan" data-testid={`plan-${p.id}`}>
              <input type="radio" name="plan" value={p.id} checked={p.id === selected.id} onChange={() => onSelect(p.id)} />
              <span className="option__text">
                <span className="option__title">{p.title}</span>
                {p.trialDays && <span className="option__sub">{p.trialDays}-day free trial</span>}
              </span>
              <span className="plan__price">
                <span className="plan__billed">{p.price}</span>
                {p.perWeek && <span className="plan__week">{p.perWeek}</span>}
              </span>
              <span className="dot" aria-hidden="true" />
              {p.badge && <span className="badge">{p.badge}</span>}
            </label>
          ))}
        </div>
      </div>
      <div className="screen__footer">
        <PrimaryButton busy={busy || loading} onClick={() => onBuy(selected)} data-testid="buy">{ctaFor(selected)}</PrimaryButton>
        <div className="legal">
          <p className="legal__check"><Icon name="check" size={14} stroke={2.4} /> No commitment, cancel anytime</p>
          <p className="legal__line">{disclosureFor(selected)}</p>
          <p className="legal__links"><a href={TERMS_URL} target="_blank" rel="noreferrer">Terms</a><a href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy</a></p>
          {isPreview && !loading && <p className="legal__line">Preview prices. Create an offering in your RevenueDot dashboard to sell real plans.</p>}
          <p className="message" role="status" data-testid="status">{message}</p>
        </div>
      </div>
    </>
  );
}

/** Today, the reminder, the charge: the three steps that take the fear out of a trial. */
export function TrialTimeline({ days, price }: { days: number; price: string }) {
  const steps: [IconName, string, string][] = [
    ["lockOpen", "Today", "Get full access to your plan and every session."],
    ["bell", `Day ${Math.max(days - 2, 1)}`, "We'll remind you that your trial is ending."],
    ["star", `Day ${days}`, `You're charged ${price}. Cancel anytime before.`],
  ];
  return (
    <ol className="timeline" style={{ marginTop: 24 }}>
      {steps.map(([icon, title, sub], i) => (
        <li className="timeline__step" key={title}>
          <div className="timeline__rail" aria-hidden="true">
            <span className="timeline__icon"><Icon name={icon} size={16} stroke={2} /></span>
            {i < steps.length - 1 && <span className="timeline__line" />}
          </div>
          <div className="timeline__text">
            <p className="timeline__title">{title}</p>
            <p className="timeline__sub">{sub}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Shown once when the user leaves the paywall with the annual plan selected. A real dialog, not beforeunload. */
export function ExitOffer({ open, plan, busy, onBuy, onLeave, onDismiss }: {
  open: boolean; plan: Plan | null; busy: boolean; onBuy: () => void; onLeave: () => void; onDismiss: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  // A click outside the sheet lands on the dialog element itself (its backdrop); treat it like a swipe down.
  const backdrop = (e: MouseEvent<HTMLDialogElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onDismiss();
  };
  return (
    <dialog ref={ref} className="sheet" aria-labelledby="exit-title" onCancel={(e) => { e.preventDefault(); onDismiss(); }} onClick={backdrop}>
      <div className="sheet__grabber" aria-hidden="true" />
      {/* The heading takes focus when the dialog opens, so the buy button is not pre-focused. */}
      <h2 id="exit-title" className="display display--28" tabIndex={-1} autoFocus>Not ready for a year?</h2>
      {plan && <p className="subtitle">Start with {plan.title.toLowerCase()} for {plan.price}. Cancel anytime.</p>}
      <div className="sheet__actions">
        <PrimaryButton busy={busy} onClick={onBuy}>Start {plan?.title.toLowerCase() ?? "now"}</PrimaryButton>
        <button type="button" className="btn-quiet" onClick={onLeave}>No thanks</button>
      </div>
    </dialog>
  );
}
