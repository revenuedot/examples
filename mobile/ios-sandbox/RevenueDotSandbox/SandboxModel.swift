// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: loads offerings and customer info, and runs purchase, restore and logIn with the async SDK API.
// Docs: https://revenuedot.app/docs/sdks/ios   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import Foundation
import RevenueCat

@MainActor
final class SandboxModel: ObservableObject {
    @Published var plans: [Plan] = []
    @Published var customerInfo: CustomerInfo?
    @Published var message = ""
    @Published var busy = false
    @Published var loggedInID: String?
    @Published var offeringID: String?
    /// Why offerings or customer info didn't load (shown in Settings > Developer, never on the paywall).
    @Published var loadError: String?

    var isPro: Bool { customerInfo?.entitlements[SandboxConfig.entitlement]?.isActive == true }
    var proEntitlement: EntitlementInfo? { customerInfo?.entitlements[SandboxConfig.entitlement] }
    var appUserID: String { Purchases.shared.appUserID }
    var activeSubscriptions: [String] { customerInfo.map { Array($0.activeSubscriptions).sorted() } ?? [] }

    func load() async {
        do {
            let offerings = try await Purchases.shared.offerings()
            offeringID = offerings.current?.identifier
            plans = Plan.from(offerings.current?.availablePackages ?? [])
            customerInfo = try await Purchases.shared.customerInfo()
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
    }

    /// Customer info also changes outside the app (renewals arrive from the App Store via RevenueDot).
    func listen() async {
        for await info in Purchases.shared.customerInfoStream { customerInfo = info }
    }

    /// Saves the onboarding answers as customer attributes, so audiences and experiments can target them.
    func save(_ answers: Answers) {
        Purchases.shared.attribution.setAttributes(answers.reduce(into: [:]) { $0["onboarding_\($1.key)"] = $1.value })
    }

    /// Returns true when the purchase unlocked the entitlement.
    func purchase(_ package: Package) async -> Bool {
        busy = true
        defer { busy = false }
        do {
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

    /// Returns true when restoring found an active entitlement.
    @discardableResult
    func restore() async -> Bool {
        await run("Restore") { try await Purchases.shared.restorePurchases() }
        if !isPro && message == "Restore: done." { message = "No purchases to restore on this Apple ID." }
        return isPro
    }

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
            message = "\(label): done."
        } catch {
            message = "\(label) failed: \(error.localizedDescription)"
        }
    }
}
