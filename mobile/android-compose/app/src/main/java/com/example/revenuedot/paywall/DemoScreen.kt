// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: debug builds only. The intent extra `RDScreen` opens one screen, for screenshots and UI tests: paywall,
// plans, home, settings (home with the Developer section open). Other names from DESIGN.md open home.
// Docs: https://revenuedot.app/docs/sdks/android   Try: adb shell am start -S -n com.example.revenuedot.paywall/.MainActivity --es RDScreen plans
package com.example.revenuedot.paywall

import android.content.Intent

object DemoScreen {
    /** Set from the launch intent; release builds ignore the extra. */
    var name: String? = null
        private set

    fun read(intent: Intent?) {
        name = if (BuildConfig.DEBUG) intent?.getStringExtra("RDScreen") else null
    }
}
