// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: debug builds only. `-RDScreen <name>` opens one screen with sample answers, for screenshots and UI tests:
// welcome, goal, insight, reminders, building, plan, paywall, plans, home, settings.
import Foundation

enum DemoScreen {
    static var name: String? {
        #if DEBUG
        UserDefaults.standard.string(forKey: "RDScreen")
        #else
        nil
        #endif
    }
    static let answers: Answers = ["goal": "Deep work", "attention": "10 to 25 minutes", "obstacle": "My phone", "best_time": "Morning", "daily_minutes": "60", "source": "A friend"]
    static let onboardingSteps = ["welcome": 0, "goal": 1, "insight": 4, "reminders": 8, "building": 9, "plan": 10]
}
