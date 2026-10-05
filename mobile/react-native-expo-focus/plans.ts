// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: turns the current offering's packages into paywall plans: billed price, price per week, savings badge
// and free-trial length. With no offering yet (a fresh project) the paywall shows preview plans; buying is off.
// Docs: https://revenuedot.app/docs/guides/paywalls
import { PACKAGE_TYPE, type PurchasesPackage, type PurchasesStoreProduct } from "react-native-purchases";

export type Plan = {
  id: string;
  title: string;
  /** The billed amount, "$59.99/year": always the largest price on the card (App Store rule). */
  price: string;
  /** "$1.15 per week", smaller and under the billed amount. */
  perWeek: string | null;
  /** "Save 77%", on the annual plan only. */
  badge: string | null;
  trialDays: number | null;
  /** Null for preview plans, which can't be bought. */
  pkg: PurchasesPackage | null;
};

/** Shown until the project has an offering, so the paywall can be reviewed on a fresh install. */
export const previewPlans: Plan[] = [
  { id: "preview_annual", title: "Yearly", price: "$59.99/year", perWeek: "$1.15 per week", badge: "Save 77%", trialDays: 7, pkg: null },
  { id: "preview_weekly", title: "Weekly", price: "$4.99/week", perWeek: null, badge: null, trialDays: null, pkg: null },
];

const rank: Partial<Record<PACKAGE_TYPE, number>> = {
  [PACKAGE_TYPE.ANNUAL]: 0,
  [PACKAGE_TYPE.WEEKLY]: 1,
  [PACKAGE_TYPE.MONTHLY]: 2,
  [PACKAGE_TYPE.SIX_MONTH]: 3,
  [PACKAGE_TYPE.THREE_MONTH]: 4,
  [PACKAGE_TYPE.TWO_MONTH]: 5,
  [PACKAGE_TYPE.LIFETIME]: 6,
};

const titles: Partial<Record<PACKAGE_TYPE, string>> = {
  [PACKAGE_TYPE.ANNUAL]: "Yearly",
  [PACKAGE_TYPE.SIX_MONTH]: "6 months",
  [PACKAGE_TYPE.THREE_MONTH]: "3 months",
  [PACKAGE_TYPE.TWO_MONTH]: "2 months",
  [PACKAGE_TYPE.MONTHLY]: "Monthly",
  [PACKAGE_TYPE.WEEKLY]: "Weekly",
  [PACKAGE_TYPE.LIFETIME]: "Lifetime",
};

const per: Partial<Record<PACKAGE_TYPE, string>> = {
  [PACKAGE_TYPE.ANNUAL]: "/year",
  [PACKAGE_TYPE.SIX_MONTH]: "/6 months",
  [PACKAGE_TYPE.THREE_MONTH]: "/3 months",
  [PACKAGE_TYPE.TWO_MONTH]: "/2 months",
  [PACKAGE_TYPE.MONTHLY]: "/month",
  [PACKAGE_TYPE.WEEKLY]: "/week",
};

/**
 * Annual first (pre-selected), then the shorter plans. The annual badge compares price per week with the shortest
 * plan, which is what the user would otherwise pay.
 */
export function plansFrom(packages: PurchasesPackage[]): Plan[] {
  const annual = packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);
  const shortest = packages.find((p) => p.packageType === PACKAGE_TYPE.WEEKLY) ?? packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
  return [...packages]
    .sort((a, b) => (rank[a.packageType] ?? 9) - (rank[b.packageType] ?? 9))
    .map((p) => {
      let badge: string | null = null;
      const s = shortest?.product.pricePerWeek;
      const a = p.product.pricePerWeek;
      if (p === annual && s && s > 0 && a != null) {
        const pct = Math.round((1 - a / s) * 100);
        if (pct >= 5) badge = `Save ${pct}%`;
      }
      const weekly = p.packageType === PACKAGE_TYPE.WEEKLY || p.packageType === PACKAGE_TYPE.LIFETIME;
      return {
        id: p.identifier,
        title: titles[p.packageType] ?? (p.product.title || p.identifier),
        price: `${p.product.priceString}${per[p.packageType] ?? ""}`,
        perWeek: !weekly && p.product.pricePerWeekString ? `${p.product.pricePerWeekString} per week` : null,
        badge,
        trialDays: trialDays(p.product),
        pkg: p,
      };
    });
}

const unitDays: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** A free trial is an introductory price of zero. */
function trialDays(product: PurchasesStoreProduct): number | null {
  const intro = product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const days = unitDays[intro.periodUnit];
  return days ? days * intro.periodNumberOfUnits : null;
}
