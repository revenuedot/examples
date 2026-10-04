// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the values the Focus sample needs besides the SDK keys: the entitlement, the paywall's legal links
// and the one optional App Store review.
// Docs: https://revenuedot.app/docs/guides/paywalls
export const config = {
  /** The entitlement the subscription unlocks (its lookup key in your RevenueDot project). */
  entitlement: "pro",
  /** Apple requires Terms and Privacy links on every paywall. Replace both with your app's own pages. */
  termsURL: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
  privacyURL: "https://revenuedot.app/legal/privacy",
  /** One real App Store review for the paywall. Leave null until your app has one; never invent reviews. */
  review: null as { text: string; author: string } | null,
};
