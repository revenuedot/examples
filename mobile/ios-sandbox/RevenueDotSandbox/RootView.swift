// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the app's flow. First launch: onboarding, then the paywall, then home. Later launches open home;
// Pro sessions open the paywall again.
// Docs: https://revenuedot.app/docs/sdks/ios
import SwiftUI

struct RootView: View {
    @StateObject private var model = SandboxModel()
    @AppStorage("onboarded") private var onboarded = false
    @AppStorage("answers") private var answersJSON = "{}"
    @State private var showPaywall = ["paywall", "plans"].contains(DemoScreen.name ?? "")

    private var answers: Answers {
        DemoScreen.name != nil ? DemoScreen.answers : (try? JSONDecoder().decode(Answers.self, from: Data(answersJSON.utf8))) ?? [:]
    }

    var body: some View {
        ZStack {
            if !onboarded {
                if showPaywall {
                    PaywallView(model: model, answers: answers) { finishOnboarding() }.transition(.opacity)
                } else {
                    OnboardingView { a in
                        answersJSON = String(decoding: (try? JSONEncoder().encode(a)) ?? Data("{}".utf8), as: UTF8.self)
                        model.save(a)
                        withAnimation(.easeInOut(duration: 0.3)) { showPaywall = true }
                    }
                    .transition(.opacity)
                }
            } else {
                HomeView(model: model, answers: answers, restartOnboarding: {
                    withAnimation { onboarded = false; showPaywall = false }
                })
                .transition(.opacity)
            }
        }
        .onAppear { if let s = DemoScreen.name { onboarded = s == "home" || s == "settings" } }
        .task { await model.load() }
        .task { await model.listen() }
    }

    private func finishOnboarding() {
        withAnimation(.easeInOut(duration: 0.3)) { onboarded = true; showPaywall = false }
    }
}
