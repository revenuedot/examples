// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: loads offerings and customer info, and runs purchase, restore and logIn with the async SDK API.
// Docs: https://revenuedot.app/docs/sdks/ios   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import Foundation
import RevenueCat

@MainActor
final class PaywallModel: ObservableObject {
    @Published var packages: [Package] = []
    @Published var customerInfo: CustomerInfo?
    @Published var message = ""
    @Published var busy = false

    var isPro: Bool { customerInfo?.entitlements[RevenueDotConfig.entitlement]?.isActive == true }
    var proExpiry: Date? { customerInfo?.entitlements[RevenueDotConfig.entitlement]?.expirationDate }
    var appUserID: String { Purchases.shared.appUserID }

    func load() async {
        await run("Load") {
            // GET /v1/subscribers/{id}/offerings on your RevenueDot server.
            let offerings = try await Purchases.shared.offerings()
            self.packages = offerings.current?.availablePackages ?? []
            if offerings.current == nil { self.message = "No current offering. Create one in the RevenueDot dashboard." }
            return try await Purchases.shared.customerInfo()
        }
    }

    /// Customer info also changes outside this screen (renewals arrive from the App Store via RevenueDot).
    func listen() async {
        for await info in Purchases.shared.customerInfoStream { customerInfo = info }
    }

    func buy(_ package: Package) async {
        do {
            busy = true
            defer { busy = false }
            // The App Store (or the Test Store alert) takes payment; the SDK then posts it to POST /v1/receipts.
            let result = try await Purchases.shared.purchase(package: package)
            customerInfo = result.customerInfo
            message = result.userCancelled ? "Purchase cancelled." : "Purchased \(package.identifier)."
        } catch ErrorCode.purchaseCancelledError {
            message = "Purchase cancelled."
        } catch {
            message = "Purchase failed: \(error.localizedDescription)"
        }
    }

    /// Restore sends this Apple ID's purchases to RevenueDot; who gets them follows the project's transfer setting.
    func restore() async { await run("Restore") { try await Purchases.shared.restorePurchases() } }

    /// logIn switches to your own user id; an anonymous user's purchases move with them.
    func logIn(_ id: String) async {
        await run("Log in") { try await Purchases.shared.logIn(id).customerInfo }
    }

    private func run(_ label: String, _ action: @escaping () async throws -> CustomerInfo) async {
        busy = true
        defer { busy = false }
        do {
            customerInfo = try await action()
            if label != "Load" { message = "\(label): done." }
        } catch {
            message = "\(label) failed: \(error.localizedDescription)"
        }
    }
}
