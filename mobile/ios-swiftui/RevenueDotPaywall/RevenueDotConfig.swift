// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the values that connect the app to your RevenueDot server, plus the paywall's legal links.
// Docs: https://revenuedot.app/docs/sdks/ios   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import Foundation

enum RevenueDotConfig {
    /// Your RevenueDot server, at the root of its host: the SDK drops any path (https://example.com/api is used as https://example.com).
    /// The simulator reaches your Mac as localhost; a phone needs your Mac's LAN address or an https URL.
    static let serverURL = URL(string: "http://localhost:8787")!

    /// A public app key from RevenueDot. `test_...` (Test Store) needs no App Store setup but only works in Debug builds;
    /// `appl_...` makes real sandbox purchases once the App Store is connected (https://revenuedot.app/docs/guides/app-store).
    static let apiKey = "test_replace_me"

    /// The entitlement the paywall unlocks (its lookup key in RevenueDot).
    static let entitlement = "pro"

    /// Apple requires Terms and Privacy links on every paywall. Replace both with your app's own pages.
    static let termsURL = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!
    static let privacyURL = URL(string: "https://revenuedot.app/legal/privacy")!

    /// One real App Store review shown on the paywall. Leave nil until your app has one; never invent reviews.
    static let review: (text: String, author: String)? = nil
}
