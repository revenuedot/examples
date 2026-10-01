// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the paywall, built from the current offering with the 2026 patterns that convert best:
// page 1 sells the value in the user's own words; page 2 shows how the free trial works, the plans with annual
// pre-selected, and the disclosure Apple requires. Closing it offers the shorter plan once before leaving.
// Research: company/docs/research/paywall-onboarding-2026.md   Docs: https://revenuedot.app/docs/guides/paywalls
import RevenueCat
import SwiftUI

struct PaywallView: View {
    @ObservedObject var model: SandboxModel
    var answers: Answers = [:]
    let onClose: () -> Void

    @State private var page = DemoScreen.name == "plans" ? 1 : 0
    @State private var selectedID: String?
    @State private var exitOffer = false
    @State private var offeredExit = false

    private var plans: [Plan] { model.plans.isEmpty ? Plan.preview : model.plans }
    private var selected: Plan? { plans.first { $0.id == selectedID } ?? plans.first }
    private var isPreview: Bool { model.plans.isEmpty }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { Haptic.tap(); close() } label: {
                    Image(systemName: "xmark").font(.system(size: 15, weight: .semibold)).frame(width: 44, height: 44)
                }
                .foregroundStyle(Theme.ink3).accessibilityLabel("Close")
                Spacer()
                Button("Restore") { Task { if await model.restore() { onClose() } } }
                    .font(.system(size: 15, weight: .medium)).foregroundStyle(Theme.ink2).frame(minHeight: 44)
            }
            .padding(.horizontal, 12)

            ZStack {
                if page == 0 {
                    ValuePage(answers: answers, model: model).transition(.move(edge: .leading).combined(with: .opacity))
                } else {
                    PlansPage(plans: plans, selectedID: Binding(get: { selected?.id }, set: { selectedID = $0 }))
                        .transition(.move(edge: .trailing).combined(with: .opacity))
                }
            }
            .frame(maxHeight: .infinity, alignment: .top)

            footer
        }
        .background(Theme.ground)
        .sheet(isPresented: $exitOffer) { ExitOffer(plan: plans.last, buy: { if let p = plans.last { exitOffer = false; buy(p) } }, leave: { exitOffer = false; onClose() }).presentationDetents([.height(340)]) }
    }

    private var footer: some View {
        VStack(spacing: 10) {
            PrimaryButton(title: page == 0 ? "Continue" : cta, busy: model.busy) {
                if page == 0 { withAnimation(.snappy(duration: 0.32)) { page = 1 } } else if let p = selected { buy(p) }
            }
            if page == 1 {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark").font(.system(size: 12, weight: .bold))
                    Text("No commitment, cancel anytime").font(.system(size: 14, weight: .medium))
                }
                .foregroundStyle(Theme.ink2)
                Text(disclosure).font(.system(size: 12)).foregroundStyle(Theme.ink3).multilineTextAlignment(.center)
                HStack(spacing: 16) {
                    Link("Terms", destination: SandboxConfig.termsURL)
                    Link("Privacy", destination: SandboxConfig.privacyURL)
                }
                .font(.system(size: 12, weight: .medium)).foregroundStyle(Theme.ink2)
                if isPreview {
                    Text("Preview prices. Create an offering in your RevenueDot dashboard to sell real plans.")
                        .font(.system(size: 12)).foregroundStyle(Theme.ink3).multilineTextAlignment(.center)
                }
            }
            if !model.message.isEmpty && page == 1 {
                Text(model.message).font(.system(size: 13)).foregroundStyle(Theme.ink2).multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, Theme.gutter).padding(.top, 12).padding(.bottom, 8)
    }

    private var cta: String {
        guard let d = selected?.trialDays else { return "Continue" }
        return d == 7 ? "Start my free week" : "Start my \(d)-day free trial"
    }

    private var disclosure: String {
        guard let p = selected else { return "" }
        if let d = p.trialDays { return "\(d) days free, then \(p.price). Auto-renews. Cancel anytime in Settings." }
        return "\(p.price). Auto-renews until you cancel in Settings."
    }

    private func buy(_ plan: Plan) {
        guard let package = plan.package else { model.message = "Preview plans can't be bought. Create an offering first."; return }
        Task { if await model.purchase(package) { Haptic.success(); onClose() } }
    }

    /// Closing while the annual plan is selected offers the shortest plan once; then the X closes.
    private func close() {
        if !offeredExit, plans.count > 1, selected?.id == plans.first?.id {
            offeredExit = true
            exitOffer = true
        } else {
            onClose()
        }
    }
}

/// Page 1: the value, in the user's words. Short benefit lines, no comparison table.
private struct ValuePage: View {
    let answers: Answers
    @ObservedObject var model: SandboxModel
    private var benefits: [(String, String, String)] {
        [
            ("target", "Your \(answers.minutes)-minute daily plan", "Built for \(answers.goal.lowercased()), adjusted every week"),
            ("timer", "Unlimited deep sessions", "25, 50 and 90 minutes, or your own length"),
            ("bell.slash", "Distraction shield", "Silences \((answers["obstacle"] ?? "notifications").lowercased()) while you focus"),
            ("chart.line.uptrend.xyaxis", "Progress you can see", "Streaks, weekly reports and focus trends"),
        ]
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Eyebrow(text: "Focus Pro")
                Text("Your plan for \(answers.goal.lowercased()) is ready. Unlock it.")
                    .font(Theme.display(34)).tracking(-0.9).fixedSize(horizontal: false, vertical: true).padding(.top, 10)
                VStack(alignment: .leading, spacing: 22) {
                    ForEach(benefits, id: \.1) { b in
                        HStack(alignment: .top, spacing: 16) {
                            Image(systemName: b.0).font(.system(size: 18, weight: .medium)).frame(width: 40, height: 40)
                                .background(Theme.fill, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            VStack(alignment: .leading, spacing: 3) {
                                Text(b.1).font(.system(size: 17, weight: .semibold))
                                Text(b.2).font(.system(size: 15)).foregroundStyle(Theme.ink2)
                            }
                        }
                    }
                }
                .padding(.top, 32)
                if let review = SandboxConfig.review {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 2) { ForEach(0..<5) { _ in Image(systemName: "star.fill").font(.system(size: 12)) } }.foregroundStyle(Theme.accent)
                        Text("“\(review.text)”").font(.system(size: 15))
                        Text(review.author).font(Theme.caption).foregroundStyle(Theme.ink2)
                    }
                    .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                    .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).strokeBorder(Theme.hairline))
                    .padding(.top, 32)
                }
            }
            .padding(.horizontal, Theme.gutter).padding(.top, 8)
        }
        .scrollIndicators(.hidden)
    }
}

/// Page 2: how the trial works, then the plans. The billed amount is the largest price on each card.
private struct PlansPage: View {
    let plans: [Plan]
    @Binding var selectedID: String?
    private var selected: Plan? { plans.first { $0.id == selectedID } }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if let days = selected?.trialDays, let price = selected?.price {
                    Text("How your free trial works").font(Theme.display(28)).tracking(-0.6)
                    TrialTimeline(days: days, price: price).padding(.top, 24)
                } else {
                    Text("Choose your plan").font(Theme.display(28)).tracking(-0.6)
                }
                VStack(spacing: 12) {
                    ForEach(plans) { p in PlanCard(plan: p, selected: p.id == selected?.id) { selectedID = p.id } }
                }
                .padding(.top, 28)
            }
            .padding(.horizontal, Theme.gutter).padding(.top, 8).padding(.bottom, 8)
            .animation(.snappy, value: selectedID)
        }
        .scrollIndicators(.hidden)
    }
}

/// Today, reminder, charge: the three steps that take the fear out of a trial.
struct TrialTimeline: View {
    let days: Int
    let price: String
    private var steps: [(String, String, String)] {
        [
            ("lock.open", "Today", "Get full access to your plan and every session."),
            ("bell", "Day \(max(days - 2, 1))", "We'll remind you that your trial is ending."),
            ("star", "Day \(days)", "You're charged \(price). Cancel anytime before."),
        ]
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.offset) { i, s in
                HStack(alignment: .top, spacing: 16) {
                    VStack(spacing: 0) {
                        Image(systemName: s.0).font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(i == 0 ? Theme.ink : Theme.ink2)
                            .frame(width: 36, height: 36)
                            .background(i == 0 ? Theme.accent : Theme.fill, in: Circle())
                        if i < steps.count - 1 { Rectangle().fill(Theme.hairline).frame(width: 2).frame(minHeight: 22) }
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text(s.1).font(.system(size: 17, weight: .semibold))
                        Text(s.2).font(.system(size: 15)).foregroundStyle(Theme.ink2).fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.top, 6).padding(.bottom, i < steps.count - 1 ? 14 : 0)
                }
            }
        }
    }
}

private struct PlanCard: View {
    let plan: Plan
    let selected: Bool
    let action: () -> Void
    var body: some View {
        Button { Haptic.select(); action() } label: {
            HStack(spacing: 14) {
                SelectionDot(on: selected)
                VStack(alignment: .leading, spacing: 3) {
                    Text(plan.title).font(.system(size: 17, weight: .semibold))
                    if let d = plan.trialDays { Text("\(d)-day free trial").font(.system(size: 14)).foregroundStyle(Theme.ink2) }
                }
                Spacer(minLength: 8)
                VStack(alignment: .trailing, spacing: 3) {
                    Text(plan.price).font(.system(size: 17, weight: .bold)).monospacedDigit()
                    if let w = plan.perWeek { Text(w).font(.system(size: 13)).foregroundStyle(Theme.ink2) }
                }
            }
            .padding(.horizontal, 18).padding(.vertical, 18)
            .background(selected ? Theme.fill : .clear, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).strokeBorder(selected ? Theme.ink : Theme.hairline, lineWidth: selected ? 2 : 1))
            .overlay(alignment: .topTrailing) {
                if let badge = plan.badge {
                    Text(badge.uppercased()).font(.system(size: 11, weight: .bold)).tracking(0.5)
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(Theme.accent, in: Capsule()).foregroundStyle(.black)
                        .offset(x: -16, y: -11)
                }
            }
            .contentShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
        .buttonStyle(Pressable())
        .foregroundStyle(Theme.ink)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

/// Shown once when the user closes the paywall with the annual plan selected.
private struct ExitOffer: View {
    let plan: Plan?
    let buy: () -> Void
    let leave: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Not ready for a year?").font(Theme.display(26)).tracking(-0.5).padding(.top, 28)
            if let plan {
                Text("Start with \(plan.title.lowercased()) for \(plan.price). Cancel anytime.").font(.system(size: 17)).foregroundStyle(Theme.ink2).padding(.top, 8)
            }
            Spacer()
            PrimaryButton(title: "Start \(plan?.title.lowercased() ?? "now")", action: buy)
            QuietButton(title: "No thanks", action: leave).frame(maxWidth: .infinity).padding(.top, 4)
        }
        .padding(.horizontal, Theme.gutter).padding(.bottom, 8)
    }
}
