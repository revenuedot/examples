// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: configures the RevenueCat SDK once, pointed at your RevenueDot server.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package com.example.revenuedot.paywall

import android.app.Application
import com.revenuecat.purchases.EntitlementVerificationMode
import com.revenuecat.purchases.LogLevel
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import java.net.URL

class PaywallApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Purchases.logLevel = LogLevel.DEBUG
        // Point the SDK at your RevenueDot server; nothing else in the app changes.
        // Android reads it once during configure, so it must be set first. Any path in the URL is ignored.
        Purchases.proxyURL = URL(BuildConfig.REVENUEDOT_SERVER_URL)
        Purchases.configure(
            PurchasesConfiguration.Builder(this, BuildConfig.REVENUEDOT_API_KEY)
                // The default (informational) checks RevenueCat's response signature and logs every RevenueDot
                // response as failed verification; RevenueDot does not sign with RevenueCat's key.
                .entitlementVerificationMode(EntitlementVerificationMode.DISABLED)
                .build(),
        )
    }
}
