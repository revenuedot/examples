// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the app's flow. Home shows the Pro state; "See plans" slides the two-page paywall up over it, and a
// purchase or restore that unlocks `pro` closes it.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package com.example.revenuedot.paywall

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier

class MainActivity : ComponentActivity() {
    private val model: PaywallViewModel by viewModels()

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

@Composable
private fun RootView(model: PaywallViewModel) {
    var paywall by rememberSaveable { mutableStateOf(DemoScreen.name == "paywall" || DemoScreen.name == "plans") }
    Box(Modifier.fillMaxSize().background(Theme.colors.ground).systemBarsPadding()) {
        HomeView(model, upgrade = { paywall = true })
        AnimatedVisibility(paywall, enter = slideInVertically(tween(360)) { it }, exit = slideOutVertically(tween(300)) { it }) {
            PaywallView(model) { paywall = false }
        }
    }
}
