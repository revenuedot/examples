// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: loads offerings and customer info, and runs purchase, restore and logIn with the async SDK API.
// Docs: https://revenuedot.app/docs/sdks/ios   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import Foundation
import RevenueCat

@MainActor
final class PaywallModel: ObservableObject {
    @Published var plans: [Plan] = []
    @Published var customerInfo: CustomerInfo?
    @Published var message = ""
    @Published var busy = false
    /// Why offerings or customer info didn't load (shown on the home screen, never on the paywall).
    @Published var loadError: String?

    var isPro: Bool { customerInfo?.entitlements[RevenueDotConfig.entitlement]?.isActive == true }
    var proExpiry: Date? { customerInfo?.entitlements[RevenueDotConfig.entitlement]?.expirationDate }
    var appUserID: String { Purchases.shared.appUserID }

    func load() async {
        do {
            // GET /v1/subscribers/{id}/offerings on your RevenueDot server.
            let offerings = try await Purchases.shared.offerings()
            plans = Plan.from(offerings.current?.availablePackages ?? [])
            customerInfo = try await Purchases.shared.customerInfo()
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
    }

    /// Customer info also changes outside this screen (renewals arrive from the App Store via RevenueDot).
    func listen() async {
        for await info in Purchases.shared.customerInfoStream { customerInfo = info }
    }

    /// Returns true when the purchase unlocked the entitlement.
    func purchase(_ package: Package) async -> Bool {
        busy = true
        defer { busy = false }
        do {
            // The App Store (or the Test Store alert) takes payment; the SDK then posts it to POST /v1/receipts.
            let result = try await Purchases.shared.purchase(package: package)
            customerInfo = result.customerInfo
            message = result.userCancelled ? "" : "Welcome to Pro."
            return !result.userCancelled && isPro
        } catch ErrorCode.purchaseCancelledError {
            return false
        } catch {
            message = "Purchase failed: \(error.localizedDescription)"
            return false
        }
    }

    /// Restore sends this Apple ID's purchases to RevenueDot; who gets them follows the project's transfer setting.
    @discardableResult
    func restore() async -> Bool {
        await run("Restore") { try await Purchases.shared.restorePurchases() }
        return isPro
    }

    /// logIn switches to your own user id; an anonymous user's purchases move with them.
    func logIn(_ id: String) async {
        await run("Log in") { try await Purchases.shared.logIn(id).customerInfo }
    }

    private func run(_ label: String, _ action: @escaping () async throws -> CustomerInfo) async {
        busy = true
        defer { busy = false }
        do {
            customerInfo = try await action()
            message = "\(label): done."
        } catch {
            message = "\(label) failed: \(error.localizedDescription)"
        }
    }
}
