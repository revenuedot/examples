// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the entitlement the paywall unlocks, plus the paywall's legal links and its one optional review.
// Docs: https://revenuedot.app/docs/guides/paywalls
package com.example.revenuedot.paywall

object PaywallConfig {
    /** The entitlement lookup key in your RevenueDot project. */
    const val ENTITLEMENT = "pro"

    /** Google Play wants Terms and Privacy links next to any subscription offer. Replace both with your app's own pages. */
    const val TERMS_URL = "https://revenuedot.app/legal/terms"
    const val PRIVACY_URL = "https://revenuedot.app/legal/privacy"

    /** One real Google Play review (text to author) shown on the paywall. Leave null until your app has one; never invent reviews. */
    val review: Pair<String, String>? = null
}
