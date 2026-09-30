// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: app entry point; points the RevenueCat SDK at RevenueDot and configures it once at launch.
// Docs: https://revenuedot.app/docs/sdks/ios   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import RevenueCat
import SwiftUI

@main
struct RevenueDotPaywallApp: App {
    init() {
        Purchases.logLevel = .debug
        // Point the SDK at your RevenueDot server; nothing else in the app changes. Set it before configure.
        Purchases.proxyURL = RevenueDotConfig.serverURL
        Purchases.configure(
            with: Configuration.Builder(withAPIKey: RevenueDotConfig.apiKey)
                // The iOS SDK checks response signatures by default (informational) and would log every
                // RevenueDot response as failed verification: RevenueDot does not sign with RevenueCat's key.
                .with(entitlementVerificationMode: .disabled)
                .build()
        )
    }

    var body: some Scene {
        WindowGroup { PaywallView() }
    }
}
