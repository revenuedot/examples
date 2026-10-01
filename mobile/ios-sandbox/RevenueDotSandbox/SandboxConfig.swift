// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: values that connect the sandbox app to the RevenueDot project.
// Docs: https://revenuedot.app/docs/guides/sandbox-testing
import Foundation

enum SandboxConfig {
    /// The public app key (`appl_...`) of the project's App Store app, read from Info.plist (build setting REVENUEDOT_API_KEY).
    static var apiKey: String { Bundle.main.object(forInfoDictionaryKey: "RevenueDotAPIKey") as? String ?? "" }

    /// The entitlement the subscription unlocks (its lookup key in RevenueDot).
    static let entitlement = "pro"

    /// The App Store product id of the monthly subscription.
    static let monthlyProduct = "pro_monthly"
}
