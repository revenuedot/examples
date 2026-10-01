// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the app's flow. First launch: onboarding, then the paywall, then home. Later launches open home;
// Pro sessions open the paywall again.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.sandbox

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    private val model: SandboxModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        DemoScreen.read(intent)
        setContent { FocusTheme { RootView(model) } }
    }

    /** A second `am start --es RDScreen ...` reaches the running activity here; rebuild so it opens that screen. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        DemoScreen.read(intent)
        recreate()
    }
}

private enum class Stage { Onboarding, Paywall, Home }

@Composable
private fun RootView(model: SandboxModel) {
    val prefs = LocalContext.current.let { remember { it.getSharedPreferences("focus", Context.MODE_PRIVATE) } }
    val demo = DemoScreen.name
    var stage by rememberSaveable {
        mutableStateOf(
            when {
                demo == "paywall" || demo == "plans" -> Stage.Paywall
                demo == "home" || demo == "settings" -> Stage.Home
                demo != null -> Stage.Onboarding
                prefs.getBoolean("onboarded", false) -> Stage.Home
                else -> Stage.Onboarding
            },
        )
    }
    var answers by remember { mutableStateOf(if (demo != null) DemoScreen.answers else prefs.answers()) }

    // Demo launches never write, so screenshots don't change what a real first launch sees.
    fun finishOnboarding() {
        if (demo == null) prefs.edit().putBoolean("onboarded", true).apply()
        stage = Stage.Home
    }

    Box(Modifier.fillMaxSize().background(Theme.colors.ground).systemBarsPadding()) {
        AnimatedContent(stage, transitionSpec = { fadeIn(tween(300)) togetherWith fadeOut(tween(300)) }, label = "root") { s ->
            when (s) {
                Stage.Onboarding -> OnboardingView { a ->
                    answers = a
                    if (demo == null) prefs.edit().putString("answers", JSONObject(a).toString()).apply()
                    model.save(a)
                    stage = Stage.Paywall
                }
                Stage.Paywall -> PaywallView(model, answers) { finishOnboarding() }
                Stage.Home -> HomeView(model, answers, restartOnboarding = {
                    if (demo == null) prefs.edit().putBoolean("onboarded", false).apply()
                    stage = Stage.Onboarding
                })
            }
        }
    }
}

private fun SharedPreferences.answers(): Answers {
    val json = JSONObject(getString("answers", null) ?: "{}")
    return json.keys().asSequence().associateWith { json.getString(it) }
}
