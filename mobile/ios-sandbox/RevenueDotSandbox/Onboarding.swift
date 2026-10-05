// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the onboarding quiz before the paywall, in the shape that converts best in 2026: one question per
// screen with a progress bar, a "building your plan" moment, then a plan summary, then the paywall. The answers are
// saved as RevenueDot customer attributes, so audiences, targeting rules and experiments can use them.
// Docs: https://revenuedot.app/docs/guides/targeting-and-experiments
import SwiftUI
import UserNotifications

/// The user's answers, keyed by question id.
typealias Answers = [String: String]

extension Answers {
    var goal: String { self["goal"] ?? "Deep work" }
    var minutes: Int { Int(self["daily_minutes"] ?? "") ?? 30 }
    var bestTime: String { self["best_time"] ?? "Morning" }
}

struct Question {
    struct Option { let value: String; var detail: String? = nil; var icon: String? = nil }
    let id: String
    let title: String
    let subtitle: String
    let options: [Option]
}

private let questions: [Question] = [
    Question(id: "goal", title: "What do you want to focus on?", subtitle: "We'll shape every session around it.", options: [
        .init(value: "Deep work", detail: "Long, uninterrupted blocks", icon: "laptopcomputer"),
        .init(value: "Study", detail: "Exams, courses, languages", icon: "book.closed"),
        .init(value: "Creative projects", detail: "Writing, design, music", icon: "paintbrush.pointed"),
        .init(value: "Reading", detail: "Finish more books", icon: "text.book.closed"),
    ]),
    Question(id: "attention", title: "How long can you focus before you get distracted?", subtitle: "Be honest. There's no wrong answer.", options: [
        .init(value: "Under 10 minutes"), .init(value: "10 to 25 minutes"), .init(value: "25 to 45 minutes"), .init(value: "Over 45 minutes"),
    ]),
    Question(id: "obstacle", title: "What breaks your focus most?", subtitle: "We'll guard against it first.", options: [
        .init(value: "My phone", icon: "iphone"), .init(value: "Notifications", icon: "bell.badge"),
        .init(value: "Putting it off", icon: "hourglass"), .init(value: "Noise around me", icon: "speaker.wave.2"),
    ]),
    Question(id: "best_time", title: "When do you feel sharpest?", subtitle: "Your sessions will start then.", options: [
        .init(value: "Morning", icon: "sunrise"), .init(value: "Afternoon", icon: "sun.max"),
        .init(value: "Evening", icon: "sunset"), .init(value: "Late night", icon: "moon"),
    ]),
    Question(id: "daily_minutes", title: "How much time can you give it a day?", subtitle: "Small and steady beats big and rare.", options: [
        .init(value: "15", detail: "Easy start"), .init(value: "30", detail: "Most popular"), .init(value: "60", detail: "Serious"), .init(value: "90", detail: "All in"),
    ]),
    Question(id: "source", title: "How did you hear about us?", subtitle: "It helps us reach people like you.", options: [
        .init(value: "App Store"), .init(value: "A friend"), .init(value: "TikTok"), .init(value: "Instagram"), .init(value: "YouTube"), .init(value: "Somewhere else"),
    ]),
]

private enum Step: Equatable { case welcome, question(Int), insight, reminders, building, plan }

private let steps: [Step] = [.welcome, .question(0), .question(1), .question(2), .insight, .question(3), .question(4), .question(5), .reminders, .building, .plan]

struct OnboardingView: View {
    let onFinish: (Answers) -> Void
    @State private var index = DemoScreen.name.flatMap { DemoScreen.onboardingSteps[$0] } ?? 0
    @State private var answers = DemoScreen.name == nil ? Answers() : DemoScreen.answers
    @State private var forward = true

    private var step: Step { steps[index] }
    /// The bar covers the quiz itself, not the welcome or the final two screens.
    private var showsBar: Bool { index > 0 && index < steps.count - 2 }

    var body: some View {
        VStack(spacing: 0) {
            if showsBar {
                HStack(spacing: 12) {
                    Button { Haptic.tap(); move(-1) } label: {
                        Image(systemName: "chevron.left").font(.system(size: 17, weight: .semibold)).frame(width: 44, height: 44)
                    }
                    .foregroundStyle(Theme.ink).accessibilityLabel("Back")
                    StepBar(step: index, total: steps.count - 3)
                    Color.clear.frame(width: 44, height: 44)
                }
                .padding(.horizontal, 10)
            }
            ZStack {
                content.id(index).transition(.asymmetric(
                    insertion: .move(edge: forward ? .trailing : .leading).combined(with: .opacity),
                    removal: .move(edge: forward ? .leading : .trailing).combined(with: .opacity)))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Theme.ground)
    }

    @ViewBuilder private var content: some View {
        switch step {
        case .welcome: Welcome { move(1) }
        case .question(let i): QuestionStep(question: questions[i], answer: binding(questions[i].id)) { move(1) }
        case .insight: Insight(goal: answers.goal) { move(1) }
        case .reminders: Reminders(time: answers.bestTime) { move(1) }
        case .building: BuildingPlan(answers: answers) { move(1) }
        case .plan: PlanSummary(answers: answers) { onFinish(answers) }
        }
    }

    private func binding(_ id: String) -> Binding<String?> {
        Binding(get: { answers[id] }, set: { answers[id] = $0 })
    }

    private func move(_ by: Int) {
        forward = by > 0
        withAnimation(.snappy(duration: 0.32)) { index = min(max(index + by, 0), steps.count - 1) }
    }
}

// MARK: - Screens

/// Every quiz screen: big title, short subtitle, content, and a Continue button pinned to the bottom.
private struct Screen<Content: View>: View {
    let title: String
    var subtitle: String?
    var cta = "Continue"
    var canContinue = true
    let next: () -> Void
    @ViewBuilder var content: () -> Content
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title).font(Theme.display(30)).tracking(-0.6).fixedSize(horizontal: false, vertical: true).padding(.top, 20)
            if let subtitle { Text(subtitle).font(.system(size: 17)).foregroundStyle(Theme.ink2).padding(.top, 8) }
            ScrollView { content().padding(.vertical, 24) }.scrollIndicators(.hidden).scrollBounceBehavior(.basedOnSize)
            PrimaryButton(title: cta, action: next).disabled(!canContinue).opacity(canContinue ? 1 : 0.3)
                .animation(.easeOut(duration: 0.15), value: canContinue)
        }
        .padding(.horizontal, Theme.gutter).padding(.bottom, 12)
    }
}

private struct Welcome: View {
    let next: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                BrandMark(size: 28)
                Text("Focus").font(.system(size: 17, weight: .semibold))
            }
            Spacer()
            FocusRing(progress: 0.68, lineWidth: 14).frame(width: 196, height: 196)
                .overlay { VStack(spacing: 2) { Text("41").font(.system(size: 52, weight: .bold)).monospacedDigit(); Text("of 60 min").font(Theme.caption).foregroundStyle(Theme.ink2) } }
                .frame(maxWidth: .infinity)
            Spacer()
            Text("Do your best work, every day.").font(Theme.display(40)).tracking(-1.2).fixedSize(horizontal: false, vertical: true)
            Text("Focus sessions built around your goal. Setup takes a minute.").font(.system(size: 18)).foregroundStyle(Theme.ink2).padding(.top, 12)
            PrimaryButton(title: "Get started", action: next).padding(.top, 32)
            Text("A RevenueDot sample app").font(Theme.caption).foregroundStyle(Theme.ink3).frame(maxWidth: .infinity).padding(.top, 14)
        }
        .padding(.horizontal, Theme.gutter).padding(.vertical, 12)
    }
}

private struct QuestionStep: View {
    let question: Question
    @Binding var answer: String?
    let next: () -> Void
    var body: some View {
        Screen(title: question.title, subtitle: question.subtitle, canContinue: answer != nil, next: next) {
            VStack(spacing: 12) {
                ForEach(question.options, id: \.value) { o in
                    OptionRow(title: label(o.value), subtitle: o.detail, icon: o.icon, selected: answer == o.value) { answer = o.value }
                }
            }
        }
    }
    private func label(_ v: String) -> String {
        guard question.id == "daily_minutes", let m = Int(v) else { return v }
        return m == 60 ? "1 hour" : m == 90 ? "1.5 hours" : "\(m) minutes"
    }
}

/// A screen between questions that shows why the method works. The curves are an illustration, not data.
private struct Insight: View {
    let goal: String
    let next: () -> Void
    @State private var drawn = false
    var body: some View {
        Screen(title: "A plan beats willpower.", subtitle: "Short daily sessions compound. Willpower fades by week two.", next: next) {
            VStack(alignment: .leading, spacing: 16) {
                ZStack {
                    Curve(points: [0.18, 0.22, 0.20, 0.17, 0.15, 0.12, 0.10]).trim(from: 0, to: drawn ? 1 : 0)
                        .stroke(Theme.ink3, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, dash: [4, 6]))
                    Curve(points: [0.18, 0.28, 0.40, 0.52, 0.66, 0.78, 0.92]).trim(from: 0, to: drawn ? 1 : 0)
                        .stroke(Theme.ink, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                    GeometryReader { g in
                        Circle().fill(Theme.accent).frame(width: 14, height: 14)
                            .position(x: g.size.width, y: g.size.height * (1 - 0.92)).opacity(drawn ? 1 : 0)
                    }
                }
                .frame(height: 200)
                .padding(20)
                .background(Theme.fill, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                HStack(spacing: 20) {
                    Legend(color: Theme.ink, text: "With a daily plan")
                    Legend(color: Theme.ink3, text: "On willpower", dashed: true)
                }
                Text("Illustration. Your Focus plan for \(goal.lowercased()) keeps sessions short enough to start every day.")
                    .font(Theme.caption).foregroundStyle(Theme.ink3)
            }
        }
        .onAppear { withAnimation(.easeInOut(duration: 1.1).delay(0.2)) { drawn = true } }
    }
}

private struct Legend: View {
    let color: Color
    let text: String
    var dashed = false
    var body: some View {
        HStack(spacing: 8) {
            Capsule().fill(color).frame(width: 18, height: 3).opacity(dashed ? 0.7 : 1)
            Text(text).font(.system(size: 14, weight: .medium)).foregroundStyle(Theme.ink2)
        }
    }
}

private struct Curve: Shape {
    let points: [CGFloat]
    func path(in r: CGRect) -> Path {
        var p = Path()
        let pts = points.enumerated().map { CGPoint(x: r.minX + r.width * CGFloat($0.offset) / CGFloat(points.count - 1), y: r.maxY - r.height * $0.element) }
        p.move(to: pts[0])
        for i in 1..<pts.count {
            let a = pts[i - 1], b = pts[i], mid = (a.x + b.x) / 2
            p.addCurve(to: b, control1: CGPoint(x: mid, y: a.y), control2: CGPoint(x: mid, y: b.y))
        }
        return p
    }
}

/// Asks for notification permission with context first; the system prompt only appears after "Turn on reminders".
private struct Reminders: View {
    let time: String
    let next: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Spacer()
            ZStack(alignment: .topTrailing) {
                Image(systemName: "bell").font(.system(size: 40, weight: .medium)).frame(width: 88, height: 88)
                    .background(Theme.fill, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                Circle().fill(Theme.accent).frame(width: 16, height: 16).offset(x: 4, y: -4)
            }
            Text("Get a nudge when you're sharpest.").font(Theme.display(30)).tracking(-0.6).padding(.top, 28)
            Text("One quiet reminder each \(time.lowercased()). People who turn reminders on keep their streak far longer.")
                .font(.system(size: 17)).foregroundStyle(Theme.ink2).padding(.top, 10)
            Spacer()
            PrimaryButton(title: "Turn on reminders") {
                Task {
                    _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
                    next()
                }
            }
            QuietButton(title: "Not now", action: next).frame(maxWidth: .infinity).padding(.top, 6)
        }
        .padding(.horizontal, Theme.gutter).padding(.bottom, 12)
    }
}

/// "Building your plan": a percentage that counts up while three checks tick in.
private struct BuildingPlan: View {
    let answers: Answers
    let done: () -> Void
    @State private var percent = 0
    private var lines: [String] {
        ["Matching sessions to \(answers.goal.lowercased())", "Guarding against \((answers["obstacle"] ?? "distractions").lowercased())", "Scheduling \(answers.minutes) minutes each \(answers.bestTime.lowercased())"]
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Spacer()
            Text("\(percent)%").font(.system(size: 72, weight: .bold)).monospacedDigit().tracking(-2).contentTransition(.numericText())
            Text("Building your plan").font(Theme.title(22)).padding(.top, 4)
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.hairline)
                    Capsule().fill(Theme.ink).frame(width: g.size.width * CGFloat(percent) / 100)
                }
            }
            .frame(height: 6).padding(.top, 20)
            VStack(alignment: .leading, spacing: 18) {
                ForEach(Array(lines.enumerated()), id: \.offset) { i, line in
                    let doneAt = (i + 1) * 30
                    HStack(spacing: 12) {
                        ZStack {
                            Circle().strokeBorder(Theme.hairline, lineWidth: 1.5)
                            if percent >= doneAt {
                                Circle().fill(Theme.ink)
                                Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(Theme.ground)
                            }
                        }
                        .frame(width: 24, height: 24)
                        Text(line).font(.system(size: 17)).foregroundStyle(percent >= doneAt - 30 ? Theme.ink : Theme.ink3)
                    }
                }
            }
            .padding(.top, 32)
            Spacer()
            Spacer()
        }
        .padding(.horizontal, Theme.gutter)
        .task {
            while percent < 100 {
                try? await Task.sleep(nanoseconds: 28_000_000)
                withAnimation(.linear(duration: 0.05)) { percent += 1 }
                if percent % 30 == 0 { Haptic.select() }
            }
            Haptic.success()
            try? await Task.sleep(nanoseconds: 450_000_000)
            done()
        }
    }
}

/// The plan, right before the paywall: what the user gets, in their own words.
private struct PlanSummary: View {
    let answers: Answers
    let next: () -> Void
    var body: some View {
        Screen(title: "Your plan is ready.", subtitle: "Built for \(answers.goal.lowercased()), around your day.", cta: "Start my plan", next: next) {
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    Tile(value: "\(answers.minutes)", unit: "min", label: "Every day")
                    Tile(value: "\(max(1, answers.minutes / 25))", unit: answers.minutes / 25 > 1 ? "sessions" : "session", label: "Of 25 minutes")
                }
                HStack(spacing: 12) {
                    Tile(value: answers.bestTime, unit: nil, label: "Start time")
                    Tile(value: "14", unit: "days", label: "To a habit")
                }
                HStack(alignment: .top, spacing: 12) {
                    Circle().fill(Theme.accent).frame(width: 8, height: 8).padding(.top, 7)
                    Text("Week one keeps sessions short so you start every day. From week two they grow as your focus does.")
                        .font(.system(size: 15)).foregroundStyle(Theme.ink2)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).strokeBorder(Theme.hairline))
            }
        }
    }
}

private struct Tile: View {
    let value: String
    let unit: String?
    let label: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(Theme.caption).foregroundStyle(Theme.ink2)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value).font(.system(size: 30, weight: .bold)).tracking(-0.6).minimumScaleFactor(0.6).lineLimit(1)
                if let unit { Text(unit).font(.system(size: 15, weight: .medium)).foregroundStyle(Theme.ink2) }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.fill, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
    }
}
