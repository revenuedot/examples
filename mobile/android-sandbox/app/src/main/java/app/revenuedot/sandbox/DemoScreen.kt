// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: debug builds only. The intent extra `RDScreen` opens one screen with sample answers, for screenshots and
// UI tests: welcome, goal, insight, reminders, building, plan, paywall, plans, home, settings.
// Docs: https://revenuedot.app/docs/sdks/android   Try: adb shell am start -S -n app.revenuedot.sandbox/.MainActivity --es RDScreen paywall
package app.revenuedot.sandbox

import android.content.Intent

object DemoScreen {
    /** Set once from the launch intent; release builds ignore the extra. */
    var name: String? = null
        private set

    fun read(intent: Intent?) {
        name = if (BuildConfig.DEBUG) intent?.getStringExtra("RDScreen") else null
    }

    val answers: Answers = mapOf("goal" to "Deep work", "attention" to "10 to 25 minutes", "obstacle" to "My phone",
        "best_time" to "Morning", "daily_minutes" to "60", "source" to "A friend")

    val onboardingSteps = mapOf("welcome" to 0, "goal" to 1, "insight" to 4, "reminders" to 8, "building" to 9, "plan" to 10)
}
