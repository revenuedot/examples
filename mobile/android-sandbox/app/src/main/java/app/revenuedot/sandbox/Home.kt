// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: home. Today's ring, the week, and sessions; the Pro ones open the paywall until the `pro`
// entitlement is active. The Play rating request comes after the first finished session, never during onboarding.
// Docs: https://revenuedot.app/docs/sdks/android
package app.revenuedot.sandbox

import android.app.Activity
import android.content.Context
import android.text.format.DateFormat
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.play.core.review.ReviewManagerFactory
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** Minutes focused per day, kept on the device. */
class FocusLog(context: Context) {
    private val prefs = context.getSharedPreferences("focus_log", Context.MODE_PRIVATE)
    private val days = mutableStateMapOf<String, Int>().apply { prefs.all.forEach { (k, v) -> if (v is Int) put(k, v) } }

    fun minutes(on: Date) = days[key(on)] ?: 0
    fun add(minutes: Int) {
        val k = key(Date())
        days[k] = (days[k] ?: 0) + minutes
        prefs.edit().putInt(k, days.getValue(k)).apply()
    }

    private fun key(d: Date) = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(d)
}

class Session(val id: String, val title: String, val minutes: Int, val detail: String, val pro: Boolean)

private val sessions = listOf(
    Session("classic", "Classic", 25, "The one that works", pro = false),
    Session("deep", "Deep", 50, "For hard problems", pro = true),
    Session("flow", "Flow", 90, "A full block, no breaks", pro = true),
)

@Composable
fun HomeView(model: SandboxModel, answers: Answers, restartOnboarding: () -> Unit) {
    val c = Theme.colors
    val context = LocalContext.current
    val log = remember { FocusLog(context) }
    var paywall by rememberSaveable { mutableStateOf(false) }
    var settings by rememberSaveable { mutableStateOf(DemoScreen.name == "settings") }
    var runningID by rememberSaveable { mutableStateOf<String?>(null) }
    // Kept after the session closes so its exit animation still has something to draw.
    var lastSession by remember { mutableStateOf(sessions[0]) }
    val goal = answers.minutes
    val today = log.minutes(Date())

    fun start(s: Session) { lastSession = s; runningID = s.id }

    Box(Modifier.fillMaxSize().background(c.ground)) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = Theme.gutter, end = Theme.gutter, bottom = 120.dp)) {
            Header(model.isPro) { settings = true }
            RingCard(today, goal, answers, Modifier.padding(top = 28.dp))
            Week(log, goal, Modifier.padding(top = 28.dp))
            Eyebrow("Sessions", Modifier.padding(top = 36.dp))
            Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                sessions.forEach { s ->
                    val locked = s.pro && !model.isPro
                    SessionRow(s, locked) { if (locked) paywall = true else start(s) }
                }
            }
            if (!model.isPro) UpgradeCard(Modifier.padding(top = 24.dp)) { paywall = true }
        }

        // The pinned action, with the list fading out underneath it.
        Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth()) {
            Box(Modifier.fillMaxWidth().height(24.dp).background(Brush.verticalGradient(listOf(c.ground.copy(alpha = 0f), c.ground))))
            PrimaryButton("Start a 25-minute session", Modifier.background(c.ground).padding(start = Theme.gutter, end = Theme.gutter, top = 8.dp, bottom = 4.dp)) { start(sessions[0]) }
        }

        AnimatedVisibility(paywall, enter = slideInVertically(tween(360)) { it }, exit = slideOutVertically(tween(300)) { it }) {
            PaywallView(model, answers) { paywall = false }
        }
        AnimatedVisibility(runningID != null, enter = slideInVertically(tween(360)) { it } + fadeIn(), exit = slideOutVertically(tween(300)) { it } + fadeOut()) {
            FocusSessionView(lastSession) { done -> if (done) log.add(lastSession.minutes); runningID = null }
        }
    }

    if (settings) {
        FocusSheet(onDismiss = { settings = false }) {
            SettingsView(
                model,
                done = { settings = false },
                upgrade = { settings = false; paywall = true },
                restartOnboarding = { settings = false; restartOnboarding() },
            )
        }
    }
}

@Composable
private fun Header(isPro: Boolean, openAccount: () -> Unit) {
    val c = Theme.colors
    val haptics = rememberHaptics()
    val locale = Locale.getDefault()
    val date = remember { SimpleDateFormat(DateFormat.getBestDateTimePattern(locale, "EEEEMMMMd"), locale).format(Date()) }
    Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(date, style = Theme.text(14, FontWeight.Medium), color = c.ink2)
            Text("Today", style = Theme.display(34, -0.8f))
        }
        if (isPro) ProPill()
        Box(
            Modifier.size(40.dp).pressable { haptics.tap(); openAccount() }.background(c.fill, CircleShape).semantics { contentDescription = "Account and settings" },
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Person, null, Modifier.size(21.dp), tint = c.ink)
        }
    }
}

@Composable
fun ProPill() {
    val c = Theme.colors
    Row(
        Modifier.height(30.dp).border(1.dp, c.hairline, CircleShape).padding(horizontal = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(7.dp).background(Theme.accent, CircleShape))
        Text("Pro", style = Theme.text(13, FontWeight.SemiBold))
    }
}

@Composable
private fun RingCard(today: Int, goal: Int, answers: Answers, modifier: Modifier) {
    val c = Theme.colors
    Row(
        modifier.fillMaxWidth().hairlineCard(c, Theme.radius + 4.dp).padding(20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        FocusRing(today.toFloat() / goal.coerceAtLeast(1), Modifier.size(128.dp)) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("$today", style = TextStyle(fontSize = 34.sp, fontWeight = FontWeight.Bold, lineHeight = 38.sp))
                Text("of $goal min", style = Theme.text(12), color = c.ink2)
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(if (today >= goal) "Goal reached." else "${goal - today} minutes to go", style = Theme.text(20, FontWeight.SemiBold))
            Text("Your plan: ${answers.goal.lowercase()}, each ${answers.bestTime.lowercase()}.", style = Theme.text(15), color = c.ink2)
        }
    }
}

@Composable
private fun Week(log: FocusLog, goal: Int, modifier: Modifier) {
    val c = Theme.colors
    val locale = Locale.getDefault()
    val days = remember {
        val cal = Calendar.getInstance()
        cal.set(Calendar.DAY_OF_WEEK, cal.firstDayOfWeek)
        List(7) { i -> (cal.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, i) } }
    }
    val todayCal = Calendar.getInstance()
    Row(modifier.fillMaxWidth()) {
        days.forEach { d ->
            val isToday = d.get(Calendar.YEAR) == todayCal.get(Calendar.YEAR) && d.get(Calendar.DAY_OF_YEAR) == todayCal.get(Calendar.DAY_OF_YEAR)
            val met = log.minutes(d.time) >= goal
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(SimpleDateFormat("EEEEE", locale).format(d.time), style = Theme.text(12, FontWeight.Medium), color = if (isToday) c.ink else c.ink3)
                Box(
                    Modifier.size(32.dp)
                        .then(if (met) Modifier.background(c.ink, CircleShape) else Modifier)
                        .border(if (isToday) 1.5.dp else 1.dp, if (isToday) c.ink else c.hairline, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    if (met) Box(Modifier.size(8.dp).background(Theme.accent, CircleShape))
                }
            }
        }
    }
}

@Composable
private fun UpgradeCard(modifier: Modifier, onClick: () -> Unit) {
    val c = Theme.colors
    val haptics = rememberHaptics()
    Row(
        modifier.fillMaxWidth().pressable { haptics.tap(); onClick() }.background(c.fill, Theme.card).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        BrandMark(40.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("Unlock your full plan", style = Theme.text(16, FontWeight.SemiBold))
            Text("Deep and Flow sessions, reports, the shield", style = Theme.text(14), color = c.ink2)
        }
        Icon(Icons.Rounded.ChevronRight, null, Modifier.size(20.dp), tint = c.ink3)
    }
}

@Composable
private fun SessionRow(session: Session, locked: Boolean, onClick: () -> Unit) {
    val c = Theme.colors
    val haptics = rememberHaptics()
    Row(
        Modifier.fillMaxWidth()
            .semantics { contentDescription = "${session.title}, ${session.minutes} minutes${if (locked) ", Pro" else ""}" }
            .pressable { haptics.tap(); onClick() }
            .hairlineCard(c)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(Modifier.size(48.dp).background(c.fill, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
            Text("${session.minutes}", style = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.Bold))
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(session.title, style = Theme.text(17, FontWeight.SemiBold))
            Text(session.detail, style = Theme.text(14), color = c.ink2)
        }
        Icon(if (locked) Icons.Rounded.Lock else Icons.Rounded.PlayArrow, null, Modifier.size(if (locked) 16.dp else 20.dp), tint = if (locked) c.ink3 else c.ink)
    }
}

/** A running session: a big countdown and the ring. "Finish" credits the minutes so the sample is quick to try. */
@Composable
private fun FocusSessionView(session: Session, end: (Boolean) -> Unit) {
    val c = Theme.colors
    val haptics = rememberHaptics()
    val context = LocalContext.current
    var left by remember { mutableIntStateOf(session.minutes * 60) }
    LaunchedEffect(session.id) {
        while (left > 0) { delay(1000); left -= 1 }
    }
    BackHandler { end(false) }
    Column(Modifier.fillMaxSize().background(c.ground).padding(horizontal = Theme.gutter, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(session.title, style = Theme.text(15, FontWeight.SemiBold), color = c.ink2)
            Spacer(Modifier.weight(1f))
            QuietButton("End") { end(false) }
        }
        Spacer(Modifier.weight(1f))
        FocusRing(1f - left.toFloat() / (session.minutes * 60), Modifier.size(260.dp), lineWidth = 10.dp) {
            Text("%02d:%02d".format(left / 60, left % 60), style = TextStyle(fontSize = 60.sp, fontWeight = FontWeight.SemiBold, fontFamily = FontFamily.Monospace))
        }
        Text("Phone down. You've got this.", Modifier.padding(top = 32.dp), style = Theme.text(17), color = c.ink2)
        Spacer(Modifier.weight(1f))
        PrimaryButton("Finish session") {
            haptics.success()
            val prefs = context.getSharedPreferences("focus", Context.MODE_PRIVATE)
            val finished = prefs.getInt("finishedSessions", 0) + 1
            prefs.edit().putInt("finishedSessions", finished).apply()
            if (finished == 1) context.findActivity()?.let(::requestReview)
            end(true)
        }
    }
}

/** Play decides whether the review sheet actually shows (it is quota-limited), so the app never waits on it. */
private fun requestReview(activity: Activity) {
    val manager = ReviewManagerFactory.create(activity)
    manager.requestReviewFlow().addOnCompleteListener { task ->
        if (task.isSuccessful) manager.launchReviewFlow(activity, task.result)
    }
}
