// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the onboarding screens before the paywall, in the shape that converts best in 2026: one question per
// screen, an insight between questions, a "building your plan" moment, then the plan in the user's own words.
// Research: company/docs/research/paywall-onboarding-2026.md   Docs: https://revenuedot.app/docs/guides/paywalls
"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { goalOf, minutesOf, obstacleOf, timeOf, type Answers, type Question } from "@/lib/quiz";
import { FocusRing, Icon, Mark, OptionRow, PrimaryButton } from "./ui";

interface StepProps { className: string; autoFocus: boolean }

/** Moves focus into a new screen so keyboard and screen-reader users land on it (not on the button they just pressed). */
function useEntryFocus(autoFocus: boolean) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!autoFocus || !ref.current) return;
    const root = ref.current;
    const target = root.querySelector<HTMLElement>("input:checked") ?? root.querySelector<HTMLElement>("input") ?? root.querySelector<HTMLElement>("h1");
    target?.focus({ preventScroll: true });
  }, [autoFocus]);
  return ref;
}

function Title({ children, size = 30, id }: { children: ReactNode; size?: 28 | 30 | 34 | 40; id?: string }) {
  return <h1 id={id} className={`display display--${size}`} tabIndex={-1}>{children}</h1>;
}

export function Welcome({ className, autoFocus, onNext }: StepProps & { onNext: () => void }) {
  const ref = useEntryFocus(autoFocus);
  return (
    <div className={className} ref={ref as React.RefObject<HTMLDivElement>}>
      <div className="topbar welcome__brand" style={{ margin: 0 }}>
        <span className="brand"><Mark size={28} /> Focus</span>
      </div>
      <div className="screen__body" style={{ paddingBottom: 0 }}>
        <div className="welcome__ring">
          <FocusRing progress={41 / 60}>
            <div className="welcome__count">
              <strong className="tnum">41</strong>
              <span>of 60 min</span>
            </div>
          </FocusRing>
        </div>
        <Title size={40}>Do your best work, every day.</Title>
        <p className="subtitle" style={{ fontSize: 18 }}>Focus sessions built around your goal. Setup takes a minute.</p>
      </div>
      <div className="screen__footer" style={{ paddingTop: 32 }}>
        <PrimaryButton onClick={onNext}>Get started</PrimaryButton>
        <p className="caption" style={{ paddingTop: 4 }}>A RevenueDot sample app</p>
      </div>
    </div>
  );
}

export function QuestionStep({ className, autoFocus, question, answer, onAnswer, onNext }: StepProps & {
  question: Question; answer: string | undefined; onAnswer: (value: string) => void; onNext: () => void;
}) {
  const ref = useEntryFocus(autoFocus);
  const titleId = `q-${question.id}`;
  // A form, so Enter on a chosen option submits it; the disabled button blocks Enter until something is chosen.
  const submit = (e: FormEvent) => { e.preventDefault(); if (answer) onNext(); };
  return (
    <form className={className} onSubmit={submit} ref={ref as React.RefObject<HTMLFormElement>}>
      <div className="screen__body">
        <Title id={titleId}>{question.title}</Title>
        <p className="subtitle">{question.subtitle}</p>
        <div className="options" role="radiogroup" aria-labelledby={titleId} style={{ marginTop: 28 }}>
          {question.options.map((o) => (
            <OptionRow key={o.value} name={question.id} value={o.value} checked={answer === o.value} onChange={() => onAnswer(o.value)}
              title={o.label ?? o.value} subtitle={o.detail} icon={o.icon} testId={`option-${o.value}`} />
          ))}
        </div>
      </div>
      <div className="screen__footer">
        <PrimaryButton type="submit" disabled={!answer}>Continue</PrimaryButton>
      </div>
    </form>
  );
}

const SOLID = [0.18, 0.28, 0.4, 0.52, 0.66, 0.78, 0.92];
const DASHED = [0.18, 0.22, 0.2, 0.17, 0.15, 0.12, 0.1];
const W = 352, H = 200, PAD = 10;

/** Each point gets horizontal tangents, which gives the gentle stepped climb of the native chart. */
function curve(points: number[]): string {
  const xy = points.map((v, i) => [PAD + ((W - 2 * PAD) * i) / (points.length - 1), PAD + (H - 2 * PAD) * (1 - v)]);
  return xy.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = xy[i - 1];
    const mid = (px + x) / 2;
    return `${d} C${mid} ${py} ${mid} ${y} ${x} ${y}`;
  }, "");
}

/** Between questions: why the method works. The curves are an illustration, not data, and say so. */
export function Insight({ className, autoFocus, answers, onNext }: StepProps & { answers: Answers; onNext: () => void }) {
  const ref = useEntryFocus(autoFocus);
  const endY = PAD + (H - 2 * PAD) * (1 - SOLID[SOLID.length - 1]);
  return (
    <div className={className} ref={ref as React.RefObject<HTMLDivElement>}>
      <div className="screen__body">
        <Title>A plan beats willpower.</Title>
        <p className="subtitle">Short daily sessions compound. Willpower fades by week two.</p>
        <figure className="chart" style={{ marginTop: 28 }}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Illustration: progress with a daily plan keeps climbing, progress on willpower slowly falls.">
            <defs>
              <clipPath id="chart-reveal"><rect className="chart__reveal" x="0" y="0" width={W} height={H} /></clipPath>
            </defs>
            <g clipPath="url(#chart-reveal)" fill="none" strokeLinecap="round">
              <path d={curve(DASHED)} stroke="var(--ink3)" strokeWidth={2.5} strokeDasharray="4 7" />
              <path d={curve(SOLID)} stroke="var(--ink)" strokeWidth={3.5} />
            </g>
            <circle className="chart__tip" cx={W - PAD} cy={endY} r={7} fill="var(--accent)" />
          </svg>
          <figcaption className="chart__legend">
            <span><i className="chart__swatch" /> With a daily plan</span>
            <span><i className="chart__swatch chart__swatch--dashed" /> On willpower</span>
          </figcaption>
        </figure>
        <p className="caption" style={{ marginTop: 16 }}>
          Illustration. Your Focus plan for {goalOf(answers)} keeps sessions short enough to start every day.
        </p>
      </div>
      <div className="screen__footer">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

/** A percentage that counts to 100 while three checks tick in, each naming one of the user's answers. */
export function Building({ className, autoFocus, answers, onDone }: StepProps & { answers: Answers; onDone: () => void }) {
  const ref = useEntryFocus(autoFocus);
  const [percent, setPercent] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    let value = 0;
    let finish: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      value += 1;
      setPercent(value);
      if (value >= 100) {
        clearInterval(timer);
        finish = setTimeout(() => done.current(), 500);
      }
    }, 28);
    return () => { clearInterval(timer); clearTimeout(finish); };
  }, []);
  const lines = [
    `Matching sessions to ${goalOf(answers)}`,
    `Guarding against ${obstacleOf(answers)}`,
    `Scheduling ${minutesOf(answers)} minutes each ${timeOf(answers)}`,
  ];
  const finished = lines.filter((_, i) => percent >= (i + 1) * 30);
  return (
    <div className={className} ref={ref as React.RefObject<HTMLDivElement>}>
      <div className="screen__body building">
        <p className="building__percent tnum" aria-hidden="true">{percent}%</p>
        <h1 className="building__title" tabIndex={-1}>Building your plan</h1>
        <div className="building__bar" role="progressbar" aria-label="Building your plan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div style={{ transform: `scaleX(${percent / 100})` }} />
        </div>
        <ul className="building__lines">
          {lines.map((line, i) => {
            const doneAt = (i + 1) * 30;
            return (
              <li key={line} className={percent >= doneAt - 30 ? "is-live" : ""}>
                <span className={`check${percent >= doneAt ? " is-done" : ""}`}><Icon name="check" size={13} stroke={2.6} /></span>
                {line}
              </li>
            );
          })}
        </ul>
        <p className="sr-only" aria-live="polite">{finished.join(". ")}</p>
      </div>
    </div>
  );
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className="tile__value"><strong>{value}</strong>{unit && <span>{unit}</span>}</span>
    </div>
  );
}

export function PlanSummary({ className, autoFocus, answers, onNext }: StepProps & { answers: Answers; onNext: () => void }) {
  const ref = useEntryFocus(autoFocus);
  const minutes = minutesOf(answers);
  const sessions = Math.max(1, Math.floor(minutes / 25));
  return (
    <div className={className} ref={ref as React.RefObject<HTMLDivElement>}>
      <div className="screen__body" style={{ paddingTop: 36 }}>
        <Title size={34}>Your plan is ready.</Title>
        <p className="subtitle">Built for {goalOf(answers)}, around your day.</p>
        <div className="tiles" style={{ marginTop: 28 }}>
          <Tile label="Every day" value={String(minutes)} unit="min" />
          <Tile label="Of 25 minutes" value={String(sessions)} unit={sessions > 1 ? "sessions" : "session"} />
          <Tile label="Start time" value={answers.best_time ?? "Morning"} />
          <Tile label="To a habit" value="14" unit="days" />
        </div>
        <p className="note" style={{ marginTop: 12 }}>
          <span className="gold-dot" aria-hidden="true" />
          Week one keeps sessions short so you start every day. From week two they grow as your focus does.
        </p>
      </div>
      <div className="screen__footer">
        <PrimaryButton onClick={onNext}>Start my plan</PrimaryButton>
      </div>
    </div>
  );
}
