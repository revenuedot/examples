// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: values that connect the sandbox app to the RevenueDot project, plus the paywall's legal links.
// Docs: https://revenuedot.app/docs/guides/google-play
package app.revenuedot.sandbox

object SandboxConfig {
    /** RevenueDot Cloud. The SDK keeps only the scheme and host, so RevenueDot is served at the root of its host. */
    const val SERVER_URL = "https://api.revenuedot.app"

    /** The entitlement the subscription unlocks (its lookup key in RevenueDot). */
    const val ENTITLEMENT = "pro"

    /** Google Play wants Terms and Privacy links next to any subscription offer. Replace both with your app's own pages. */
    const val TERMS_URL = "https://revenuedot.app/legal/terms"
    const val PRIVACY_URL = "https://revenuedot.app/legal/privacy"

    /** One real Google Play review shown on the paywall. Leave null until your app has one; never invent reviews. */
    val review: Pair<String, String>? = null
}
