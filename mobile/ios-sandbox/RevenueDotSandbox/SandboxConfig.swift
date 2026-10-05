// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: values that connect the sandbox app to the RevenueDot project, plus the paywall's legal links.
// Docs: https://revenuedot.app/docs/guides/sandbox-testing
import Foundation

enum SandboxConfig {
    /// The public app key (`appl_...`) of the project's App Store app, read from Info.plist (build setting REVENUEDOT_API_KEY).
    static var apiKey: String { Bundle.main.object(forInfoDictionaryKey: "RevenueDotAPIKey") as? String ?? "" }

    /// The entitlement the subscription unlocks (its lookup key in RevenueDot).
    static let entitlement = "pro"

    /// Apple requires Terms and Privacy links on every paywall. Replace both with your app's own pages.
    static let termsURL = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!
    static let privacyURL = URL(string: "https://revenuedot.app/legal/privacy")!

    /// One real App Store review shown on the paywall. Leave nil until your app has one; never invent reviews.
    static let review: (text: String, author: String)? = nil
}
