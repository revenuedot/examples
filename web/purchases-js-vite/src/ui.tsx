// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the small building blocks every Focus screen shares: icons, the brand mark, the progress ring and bar,
// option rows (real radio inputs, so arrow keys and screen readers work) and the primary button.
// Docs: https://revenuedot.app/docs/sdks/web
import type { ReactNode } from "react";
import { ICONS, type IconName } from "./icons";

export function Icon({ name, size = 20, stroke = 1.75 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
  );
}

export function Mark({ size = 28 }: { size?: number }) {
  return <span className="mark" style={{ ["--s" as string]: `${size}px` }} aria-hidden="true"><span>R</span></span>;
}

/** Hairline track, ink arc, gold dot at the tip. */
export function FocusRing({ progress, size = 196, line = 14, children }: { progress: number; size?: number; line?: number; children?: ReactNode }) {
  const p = Math.min(Math.max(progress, 0), 1);
  const r = (size - line) / 2;
  const angle = 2 * Math.PI * p - Math.PI / 2;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={line} />
        <circle className="ring__arc" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={line} strokeLinecap="round"
          pathLength={100} strokeDasharray={`${p * 100} 200`} style={{ ["--len" as string]: p * 100 }} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <circle className="ring__tip" cx={size / 2 + r * Math.cos(angle)} cy={size / 2 + r * Math.sin(angle)} r={line * 0.28} />
      </svg>
      {children}
    </div>
  );
}

export function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="stepbar" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step}>
      <div className="stepbar__fill" style={{ transform: `scaleX(${step / total})` }} />
    </div>
  );
}

export function PrimaryButton({ children, busy = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button type="button" className={`btn${busy ? " btn--busy" : ""}`} aria-busy={busy || undefined} {...props}>
      {busy ? <span className="spinner" aria-label="Working" /> : children}
    </button>
  );
}

/** One selectable card. The input stays in the page (visually hidden) so the group is a native radio group. */
export function OptionRow(props: {
  name: string; value: string; checked: boolean; onChange: () => void;
  title: string; subtitle?: string; icon?: IconName; testId?: string;
}) {
  return (
    <label className={`option${props.subtitle || props.icon ? "" : " option--plain"}`} data-testid={props.testId}>
      <input type="radio" name={props.name} value={props.value} checked={props.checked} onChange={props.onChange} />
      {props.icon && <span className="option__icon"><Icon name={props.icon} size={22} /></span>}
      <span className="option__text">
        <span className="option__title">{props.title}</span>
        {props.subtitle && <span className="option__sub">{props.subtitle}</span>}
      </span>
      <span className="dot" aria-hidden="true" />
    </label>
  );
}
