// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: home. Today's ring, the week, and sessions; the Pro ones open the paywall until the `pro`
// entitlement is active. The rating request comes after a finished session, never during onboarding.
// Docs: https://revenuedot.app/docs/sdks/ios
import StoreKit
import SwiftUI

/// Minutes focused per day, kept on the device.
@MainActor
final class FocusLog: ObservableObject {
    @Published private(set) var days: [String: Int] = (UserDefaults.standard.dictionary(forKey: "focusLog") as? [String: Int]) ?? [:]
    static func key(_ d: Date) -> String { d.formatted(.iso8601.year().month().day()) }
    func minutes(on d: Date) -> Int { days[Self.key(d)] ?? 0 }
    func add(_ m: Int) {
        days[Self.key(.now), default: 0] += m
        UserDefaults.standard.set(days, forKey: "focusLog")
    }
}

struct Session: Identifiable {
    let id: String
    let title: String
    let minutes: Int
    let detail: String
    let pro: Bool
}

private let sessions = [
    Session(id: "classic", title: "Classic", minutes: 25, detail: "The one that works", pro: false),
    Session(id: "deep", title: "Deep", minutes: 50, detail: "For hard problems", pro: true),
    Session(id: "flow", title: "Flow", minutes: 90, detail: "A full block, no breaks", pro: true),
]

struct HomeView: View {
    @ObservedObject var model: SandboxModel
    let answers: Answers
    let restartOnboarding: () -> Void
    @StateObject private var log = FocusLog()
    @State private var paywall = false
    @State private var settings = DemoScreen.name == "settings"
    @State private var running: Session?

    private var goal: Int { answers.minutes }
    private var today: Int { log.minutes(on: .now) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                ring.padding(.top, 28)
                week.padding(.top, 28)
                Eyebrow(text: "Sessions").padding(.top, 36)
                VStack(spacing: 12) {
                    ForEach(sessions) { s in
                        SessionRow(session: s, locked: s.pro && !model.isPro) {
                            if s.pro && !model.isPro { paywall = true } else { running = s }
                        }
                    }
                }
                .padding(.top, 12)
                if !model.isPro { upgradeCard.padding(.top, 24) }
            }
            .padding(.horizontal, Theme.gutter).padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
        .background(Theme.ground)
        .safeAreaInset(edge: .bottom) {
            PrimaryButton(title: "Start a 25-minute session") { running = sessions[0] }
                .padding(.horizontal, Theme.gutter).padding(.top, 8).padding(.bottom, 4)
                .background(alignment: .top) {
                    VStack(spacing: 0) {
                        LinearGradient(colors: [Theme.ground.opacity(0), Theme.ground], startPoint: .top, endPoint: .bottom).frame(height: 24)
                        Theme.ground
                    }
                    .offset(y: -24).ignoresSafeArea(edges: .bottom)
                }
        }
        .fullScreenCover(isPresented: $paywall) { PaywallView(model: model, answers: answers) { paywall = false } }
        .fullScreenCover(item: $running) { s in FocusSessionView(session: s) { done in if done { log.add(s.minutes) }; running = nil } }
        .sheet(isPresented: $settings) { SettingsView(model: model, upgrade: { settings = false; paywall = true }, restartOnboarding: { settings = false; restartOnboarding() }) }
    }

    private var header: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(Date.now.formatted(.dateTime.weekday(.wide).month().day())).font(.system(size: 14, weight: .medium)).foregroundStyle(Theme.ink2)
                Text("Today").font(Theme.display(34)).tracking(-0.8)
            }
            Spacer()
            if model.isPro {
                HStack(spacing: 6) { Circle().fill(Theme.accent).frame(width: 7, height: 7); Text("Pro").font(.system(size: 13, weight: .semibold)) }
                    .padding(.horizontal, 10).frame(height: 30)
                    .overlay(Capsule().strokeBorder(Theme.hairline))
            }
            Button { Haptic.tap(); settings = true } label: {
                Image(systemName: "person").font(.system(size: 16, weight: .semibold)).frame(width: 40, height: 40)
                    .background(Theme.fill, in: Circle())
            }
            .foregroundStyle(Theme.ink).accessibilityLabel("Account and settings")
        }
        .padding(.top, 8)
    }

    private var ring: some View {
        HStack(spacing: 24) {
            FocusRing(progress: Double(today) / Double(max(goal, 1)), lineWidth: 12).frame(width: 128, height: 128)
                .overlay {
                    VStack(spacing: 0) {
                        Text("\(today)").font(.system(size: 34, weight: .bold)).monospacedDigit().contentTransition(.numericText())
                        Text("of \(goal) min").font(.system(size: 12)).foregroundStyle(Theme.ink2)
                    }
                }
            VStack(alignment: .leading, spacing: 6) {
                Text(today >= goal ? "Goal reached." : "\(goal - today) minutes to go").font(Theme.title(20))
                Text("Your plan: \(answers.goal.lowercased()), each \(answers.bestTime.lowercased()).").font(.system(size: 15)).foregroundStyle(Theme.ink2)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(RoundedRectangle(cornerRadius: Theme.radius + 4, style: .continuous).strokeBorder(Theme.hairline))
    }

    private var week: some View {
        let cal = Calendar.current
        let start = cal.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
        return HStack(spacing: 0) {
            ForEach(0..<7, id: \.self) { i in
                let d = cal.date(byAdding: .day, value: i, to: start) ?? .now
                let met = log.minutes(on: d) >= goal
                let isToday = cal.isDateInToday(d)
                VStack(spacing: 8) {
                    Text(d.formatted(.dateTime.weekday(.narrow))).font(.system(size: 12, weight: .medium)).foregroundStyle(isToday ? Theme.ink : Theme.ink3)
                    ZStack {
                        Circle().strokeBorder(isToday ? Theme.ink : Theme.hairline, lineWidth: isToday ? 1.5 : 1)
                        if met { Circle().fill(Theme.ink); Circle().fill(Theme.accent).frame(width: 8, height: 8) }
                    }
                    .frame(width: 32, height: 32)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private var upgradeCard: some View {
        Button { Haptic.tap(); paywall = true } label: {
            HStack(spacing: 14) {
                BrandMark(size: 40)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Unlock your full plan").font(.system(size: 16, weight: .semibold))
                    Text("Deep and Flow sessions, reports, the shield").font(.system(size: 14)).foregroundStyle(Theme.ink2)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(Theme.ink3)
            }
            .padding(16)
            .background(Theme.fill, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
        .buttonStyle(Pressable()).foregroundStyle(Theme.ink)
    }
}

private struct SessionRow: View {
    let session: Session
    let locked: Bool
    let action: () -> Void
    var body: some View {
        Button { Haptic.tap(); action() } label: {
            HStack(spacing: 14) {
                Text("\(session.minutes)").font(.system(size: 20, weight: .bold)).monospacedDigit().frame(width: 48, height: 48)
                    .background(Theme.fill, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(session.title).font(.system(size: 17, weight: .semibold))
                    Text(session.detail).font(.system(size: 14)).foregroundStyle(Theme.ink2)
                }
                Spacer()
                Image(systemName: locked ? "lock.fill" : "play.fill").font(.system(size: 13, weight: .semibold)).foregroundStyle(locked ? Theme.ink3 : Theme.ink)
            }
            .padding(14)
            .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).strokeBorder(Theme.hairline))
            .contentShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
        .buttonStyle(Pressable()).foregroundStyle(Theme.ink)
        .accessibilityLabel("\(session.title), \(session.minutes) minutes\(locked ? ", Pro" : "")")
    }
}

/// A running session: a big countdown and the ring. "Finish" credits the minutes so the sample is quick to try.
private struct FocusSessionView: View {
    let session: Session
    let end: (Bool) -> Void
    @Environment(\.requestReview) private var requestReview
    @AppStorage("finishedSessions") private var finished = 0
    @State private var left: Int = 0

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(session.title).font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.ink2)
                Spacer()
                Button("End") { Haptic.tap(); end(false) }.font(.system(size: 15, weight: .medium)).foregroundStyle(Theme.ink2).frame(minHeight: 44)
            }
            Spacer()
            FocusRing(progress: 1 - Double(left) / Double(session.minutes * 60), lineWidth: 10).frame(width: 260, height: 260)
                .overlay {
                    Text(String(format: "%02d:%02d", left / 60, left % 60)).font(.system(size: 60, weight: .semibold, design: .monospaced)).contentTransition(.numericText(countsDown: true))
                }
            Text("Phone down. You've got this.").font(.system(size: 17)).foregroundStyle(Theme.ink2).padding(.top, 32)
            Spacer()
            PrimaryButton(title: "Finish session") {
                Haptic.success()
                finished += 1
                if finished == 1 { requestReview() }
                end(true)
            }
        }
        .padding(.horizontal, Theme.gutter).padding(.vertical, 8)
        .background(Theme.ground)
        .task {
            left = session.minutes * 60
            while left > 0 {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                withAnimation { left -= 1 }
            }
        }
    }
}
