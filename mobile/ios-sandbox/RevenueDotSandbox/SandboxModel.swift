// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: loads offerings and customer info, and runs purchase, restore and logIn with the async SDK API.
// Docs: https://revenuedot.app/docs/sdks/ios   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import Foundation
import RevenueCat

@MainActor
final class SandboxModel: ObservableObject {
    @Published var packages: [Package] = []
    @Published var customerInfo: CustomerInfo?
    @Published var message = ""
    @Published var busy = false
    @Published var loggedInID: String?

    var isPro: Bool { customerInfo?.entitlements[SandboxConfig.entitlement]?.isActive == true }
    var proExpiry: Date? { customerInfo?.entitlements[SandboxConfig.entitlement]?.expirationDate }
    var appUserID: String { Purchases.shared.appUserID }
    var activeSubscriptions: [String] { customerInfo.map { Array($0.activeSubscriptions).sorted() } ?? [] }
    /// The monthly package, found by package id or by App Store product id.
    var monthly: Package? {
        packages.first { $0.identifier == "$rc_monthly" || $0.storeProduct.productIdentifier == SandboxConfig.monthlyProduct } ?? packages.first
    }

    func load() async {
        await run("Load") {
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

    func subscribe() async {
        guard let package = monthly else { message = "No package to buy yet."; return }
        do {
            busy = true
            defer { busy = false }
            let result = try await Purchases.shared.purchase(package: package)
            customerInfo = result.customerInfo
            message = result.userCancelled ? "Purchase cancelled." : "Purchased \(package.storeProduct.productIdentifier)."
        } catch ErrorCode.purchaseCancelledError {
            message = "Purchase cancelled."
        } catch {
            message = "Purchase failed: \(error.localizedDescription)"
        }
    }

    func restore() async { await run("Restore") { try await Purchases.shared.restorePurchases() } }

    func toggleLogin(_ id: String) async {
        if loggedInID == nil {
            await run("Log in") { let r = try await Purchases.shared.logIn(id); self.loggedInID = id; return r.customerInfo }
        } else {
            await run("Log out") { self.loggedInID = nil; return try await Purchases.shared.logOut() }
        }
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
