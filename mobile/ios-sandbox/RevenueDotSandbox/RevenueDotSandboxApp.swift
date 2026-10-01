// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: app entry point; points the RevenueCat SDK at RevenueDot Cloud and configures it once at launch.
// Docs: https://revenuedot.app/docs/sdks/ios   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import RevenueCat
import SwiftUI

@main
struct RevenueDotSandboxApp: App {
    init() {
        Purchases.logLevel = .debug
        // Point the SDK at RevenueDot Cloud; nothing else in the app changes. Set it before configure.
        Purchases.proxyURL = URL(string: "https://api.revenuedot.app")
        Purchases.configure(
            with: Configuration.Builder(withAPIKey: SandboxConfig.apiKey)
                // RevenueDot signs responses with its own key, not RevenueCat's, so the default check would log failures.
                .with(entitlementVerificationMode: .disabled)
                .build()
        )
    }

    var body: some Scene {
        WindowGroup { RootView() }
    }
}
