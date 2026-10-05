// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: turns the current offering's packages into paywall plans: price per week, savings, free trial length.
// With no offering loaded yet (a fresh project), it shows preview plans so the design still renders; buying is off.
// Docs: https://revenuedot.app/docs/guides/paywalls
import Foundation
import RevenueCat

struct Plan: Identifiable, Equatable {
    let id: String
    let title: String
    /// The billed amount, "$59.99/year": always the most prominent price (App Store rule).
    let price: String
    /// "$1.15 per week", shown smaller under the billed amount.
    let perWeek: String?
    /// "Save 77%", on the annual plan only.
    let badge: String?
    let trialDays: Int?
    let package: Package?

    static func == (a: Plan, b: Plan) -> Bool { a.id == b.id }

    /// Annual first (pre-selected), then the shorter plans. The annual badge compares price per week with the
    /// shortest plan, which is what the user would otherwise pay.
    static func from(_ packages: [Package]) -> [Plan] {
        let annual = packages.first { $0.packageType == .annual }
        let shortest = packages.first { $0.packageType == .weekly } ?? packages.first { $0.packageType == .monthly }
        let rank: [PackageType: Int] = [.annual: 0, .weekly: 1, .monthly: 2, .sixMonth: 3, .threeMonth: 4, .twoMonth: 5, .lifetime: 6]
        return packages.sorted { (rank[$0.packageType] ?? 9) < (rank[$1.packageType] ?? 9) }.map { p in
            let product = p.storeProduct
            var badge: String?
            if p === annual, let s = shortest?.storeProduct.pricePerWeek?.doubleValue, s > 0, let a = product.pricePerWeek?.doubleValue {
                let pct = Int(((1 - a / s) * 100).rounded())
                if pct >= 5 { badge = "Save \(pct)%" }
            }
            return Plan(
                id: p.identifier,
                title: title(p),
                price: "\(product.localizedPriceString)\(per(p))",
                perWeek: p.packageType == .weekly || p.packageType == .lifetime ? nil : product.localizedPricePerWeek.map { "\($0) per week" },
                badge: badge,
                trialDays: trialDays(product),
                package: p
            )
        }
    }

    /// Shown until the project has an offering, so the paywall's layout can be reviewed on a fresh install.
    static let preview: [Plan] = [
        Plan(id: "preview_annual", title: "Yearly", price: "$59.99/year", perWeek: "$1.15 per week", badge: "Save 77%", trialDays: 7, package: nil),
        Plan(id: "preview_weekly", title: "Weekly", price: "$4.99/week", perWeek: nil, badge: nil, trialDays: nil, package: nil),
    ]

    private static func title(_ p: Package) -> String {
        switch p.packageType {
        case .annual: "Yearly"
        case .sixMonth: "6 months"
        case .threeMonth: "3 months"
        case .twoMonth: "2 months"
        case .monthly: "Monthly"
        case .weekly: "Weekly"
        case .lifetime: "Lifetime"
        default: p.storeProduct.localizedTitle.isEmpty ? p.identifier : p.storeProduct.localizedTitle
        }
    }

    private static func per(_ p: Package) -> String {
        switch p.packageType {
        case .annual: "/year"
        case .sixMonth: "/6 months"
        case .threeMonth: "/3 months"
        case .twoMonth: "/2 months"
        case .monthly: "/month"
        case .weekly: "/week"
        default: ""
        }
    }

    private static func trialDays(_ product: StoreProduct) -> Int? {
        guard let intro = product.introductoryDiscount, intro.paymentMode == .freeTrial else { return nil }
        let period = intro.subscriptionPeriod
        switch period.unit {
        case .day: return period.value
        case .week: return period.value * 7
        case .month: return period.value * 30
        case .year: return period.value * 365
        @unknown default: return nil
        }
    }
}
