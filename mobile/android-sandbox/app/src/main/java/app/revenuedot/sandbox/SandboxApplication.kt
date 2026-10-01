// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: configures the stock RevenueCat SDK once, pointed at RevenueDot Cloud with Purchases.proxyURL.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.sandbox

import android.app.Application
import com.revenuecat.purchases.EntitlementVerificationMode
import com.revenuecat.purchases.LogLevel
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import java.net.URL

class SandboxApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Purchases.logLevel = LogLevel.DEBUG
        // Android reads the proxy URL once, during configure, so it must be set first. Any path in it is dropped.
        Purchases.proxyURL = URL(SandboxConfig.SERVER_URL)
        Purchases.configure(
            PurchasesConfiguration.Builder(this, BuildConfig.REVENUEDOT_API_KEY)
                // The default mode checks each response for RevenueCat's signature; RevenueDot does not sign with
                // RevenueCat's key, so every response would log as failed verification.
                .entitlementVerificationMode(EntitlementVerificationMode.DISABLED)
                .build(),
        )
    }
}
