// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: turns the current offering's packages into paywall plans (billed price, price per week, savings, trial length).
// With no offering yet it returns preview plans so the paywall still renders; those cannot be bought.
// Docs: https://revenuedot.app/docs/guides/paywalls   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { PackageType, PeriodUnit, type Offering, type Package, type Period } from "@revenuecat/purchases-js";

export interface Plan {
  id: string;
  title: string;
  /** The billed amount, "$59.99/year". Always the most prominent price on the card. */
  price: string;
  /** "$1.15 per week", smaller and below the billed amount. */
  perWeek: string | null;
  /** "Save 77%" on the annual plan, measured against the shortest plan. */
  badge: string | null;
  trialDays: number | null;
  isAnnual: boolean;
  /** Null for preview plans. */
  rcPackage: Package | null;
}

/** Shown until the project has an offering, so the layout can be reviewed on a fresh project. */
export const PREVIEW_PLANS: Plan[] = [
  { id: "preview_annual", title: "Yearly", price: "$59.99/year", perWeek: "$1.15 per week", badge: "Save 77%", trialDays: 7, isAnnual: true, rcPackage: null },
  { id: "preview_weekly", title: "Weekly", price: "$4.99/week", perWeek: null, badge: null, trialDays: null, isAnnual: false, rcPackage: null },
];

const RANK: string[] = [PackageType.Annual, PackageType.Weekly, PackageType.Monthly, PackageType.SixMonth, PackageType.ThreeMonth, PackageType.TwoMonth, PackageType.Lifetime];
const TITLES: Record<string, string> = {
  [PackageType.Annual]: "Yearly", [PackageType.SixMonth]: "6 months", [PackageType.ThreeMonth]: "3 months",
  [PackageType.TwoMonth]: "2 months", [PackageType.Monthly]: "Monthly", [PackageType.Weekly]: "Weekly", [PackageType.Lifetime]: "Lifetime",
};
const DAYS: Record<PeriodUnit, number> = { [PeriodUnit.Day]: 1, [PeriodUnit.Week]: 7, [PeriodUnit.Month]: 30, [PeriodUnit.Year]: 365 };

function per(period: Period | null): string {
  if (!period) return "";
  return period.number === 1 ? `/${period.unit}` : `/${period.number} ${period.unit}s`;
}

function weekMicros(pkg: Package): number | null {
  return pkg.product.defaultSubscriptionOption?.base.pricePerWeek?.amountMicros ?? null;
}

/** Annual first (it is pre-selected), then shorter plans, lifetime last. */
export function plansFrom(offering: Offering | null): Plan[] {
  const packages = [...(offering?.availablePackages ?? [])].sort(
    (a, b) => rankOf(a) - rankOf(b),
  );
  const shortest = packages.find((p) => p.packageType === PackageType.Weekly) ?? packages.find((p) => p.packageType === PackageType.Monthly);
  const shortestWeek = shortest ? weekMicros(shortest) : null;
  return packages.map((pkg) => {
    const product = pkg.product;
    const isAnnual = pkg.packageType === PackageType.Annual;
    let badge: string | null = null;
    const week = weekMicros(pkg);
    if (isAnnual && shortestWeek && week !== null) {
      const pct = Math.round((1 - week / shortestWeek) * 100);
      if (pct >= 5) badge = `Save ${pct}%`;
    }
    const weekly = product.defaultSubscriptionOption?.base.pricePerWeek;
    const trial = product.freeTrialPhase?.period;
    return {
      id: pkg.identifier,
      title: TITLES[pkg.packageType] ?? (product.title || pkg.identifier),
      price: `${product.price.formattedPrice}${per(product.period)}`,
      // A weekly plan's per-week price would repeat its billed price; free products have no meaningful one.
      perWeek: pkg.packageType !== PackageType.Weekly && weekly && weekly.amountMicros > 0 ? `${weekly.formattedPrice} per week` : null,
      badge,
      trialDays: trial ? trial.number * DAYS[trial.unit] : null,
      isAnnual,
      rcPackage: pkg,
    };
  });
}

function rankOf(pkg: Package): number {
  const i = RANK.indexOf(pkg.packageType);
  return i === -1 ? RANK.length : i;
}

/** The exit offer suggests the shortest subscription: what someone not ready for a year would pick. */
export function exitPlan(plans: Plan[]): Plan | null {
  const subs = plans.filter((p) => !p.isAnnual && p.rcPackage?.packageType !== PackageType.Lifetime);
  return subs[0] ?? null;
}

export function ctaFor(plan: Plan | undefined): string {
  const days = plan?.trialDays;
  if (!days) return "Continue";
  return days === 7 ? "Start my free week" : `Start my ${days}-day free trial`;
}

/** The one-line disclosure under the button: what is charged, when, and that it renews. */
export function disclosureFor(plan: Plan | undefined): string {
  if (!plan) return "";
  if (plan.rcPackage?.packageType === PackageType.Lifetime) return `One payment of ${plan.price}. Yours to keep.`;
  // A non-breaking hyphen keeps "Auto-renews" on one line in the narrow footer.
  if (plan.trialDays) return `${plan.trialDays} days free, then ${plan.price}. Auto\u2011renews. Cancel anytime in your account.`;
  return `${plan.price}. Auto\u2011renews until you cancel.`;
}
