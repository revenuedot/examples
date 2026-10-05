// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the paywall, built from the current offering with the 2026 patterns that convert best:
// page 1 sells the value in the user's own words; page 2 shows how the free trial works, the plans with annual
// pre-selected, and the renewal disclosure. Closing it offers the shorter plan once before leaving.
// Docs: https://revenuedot.app/docs/guides/paywalls
package app.revenuedot.sandbox

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.outlined.LockOpen
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.NotificationsOff
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.outlined.TrackChanges
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineBreak
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PaywallView(model: SandboxModel, answers: Answers, onClose: () -> Unit) {
    val c = Theme.colors
    val haptics = rememberHaptics()
    val activity = LocalContext.current.findActivity()
    var page by rememberSaveable { mutableIntStateOf(if (DemoScreen.name == "plans") 1 else 0) }
    var selectedID by rememberSaveable { mutableStateOf<String?>(null) }
    var exitOffer by rememberSaveable { mutableStateOf(false) }
    var offeredExit by rememberSaveable { mutableStateOf(false) }

    val isPreview = model.plans.isEmpty()
    val plans = if (isPreview) Plan.preview else model.plans
    val selected = plans.firstOrNull { it.id == selectedID } ?: plans.first()

    fun buy(plan: Plan) {
        val pkg = plan.pkg
        if (pkg == null || activity == null) { model.message = "Preview plans can't be bought. Create an offering first."; return }
        model.launch { if (purchase(activity, pkg)) { haptics.success(); onClose() } }
    }

    // Closing while the annual plan is selected offers the shortest plan once; then the X closes.
    fun close() {
        if (!offeredExit && plans.size > 1 && selected.id == plans.first().id) { offeredExit = true; exitOffer = true } else onClose()
    }

    BackHandler { if (page == 1) page = 0 else close() }

    Column(Modifier.fillMaxSize().background(c.ground)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(44.dp).pressable { haptics.tap(); close() }.semantics { contentDescription = "Close" }, contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Close, null, Modifier.size(22.dp), tint = c.ink3)
            }
            Spacer(Modifier.weight(1f))
            Box(Modifier.defaultMinSize(minHeight = 44.dp).pressable { model.launch { if (restore()) onClose() } }.padding(horizontal = 8.dp), contentAlignment = Alignment.Center) {
                Text("Restore", style = Theme.text(15, FontWeight.Medium), color = c.ink2)
            }
        }

        AnimatedContent(
            page,
            Modifier.weight(1f),
            transitionSpec = {
                val dir = if (targetState > initialState) 1 else -1
                (slideInHorizontally(tween(320, easing = FastOutSlowInEasing)) { it * dir } + fadeIn(tween(320))) togetherWith
                    (slideOutHorizontally(tween(320, easing = FastOutSlowInEasing)) { -it * dir } + fadeOut(tween(200)))
            },
            contentAlignment = Alignment.TopStart,
            label = "paywall",
        ) { p ->
            if (p == 0) ValuePage(answers) else PlansPage(plans, selected) { selectedID = it }
        }

        Column(
            Modifier.fillMaxWidth().padding(start = Theme.gutter, end = Theme.gutter, top = 12.dp, bottom = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            PrimaryButton(if (page == 0) "Continue" else cta(selected), busy = model.busy) {
                if (page == 0) page = 1 else buy(selected)
            }
            if (page == 1) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Rounded.Check, null, Modifier.size(15.dp), tint = c.ink2)
                    Text("No commitment, cancel anytime", style = Theme.text(14, FontWeight.Medium), color = c.ink2)
                }
                Text(disclosure(selected), style = Theme.text(12).copy(lineBreak = LineBreak.Heading), color = c.ink3, textAlign = TextAlign.Center)
                LegalLinks()
                if (isPreview) {
                    Text("Preview prices. Create an offering in your RevenueDot dashboard to sell real plans.",
                        style = Theme.text(12).copy(lineBreak = LineBreak.Heading), color = c.ink3, textAlign = TextAlign.Center)
                }
                if (model.message.isNotEmpty()) Text(model.message, style = Theme.text(13).copy(lineBreak = LineBreak.Heading), color = c.ink2, textAlign = TextAlign.Center)
            }
        }
    }

    if (exitOffer) {
        val short = plans.last()
        FocusSheet(onDismiss = { exitOffer = false }) {
            ExitOffer(short, buy = { exitOffer = false; buy(short) }, leave = { exitOffer = false; onClose() })
        }
    }
}

/** "Start my free week" for a 7-day trial, the trial length for other trials, "Continue" without one. */
private fun cta(plan: Plan): String {
    val d = plan.trialDays ?: return "Continue"
    return if (d == 7) "Start my free week" else "Start my $d-day free trial"
}

/** Google Play asks for the price, the renewal and how to cancel next to the button that starts the subscription. */
private fun disclosure(plan: Plan): String {
    val d = plan.trialDays ?: return "${plan.price}. Auto-renews until you cancel in Google Play."
    return "$d days free, then ${plan.price}. Auto-renews. Cancel anytime in Google Play."
}

@Composable
private fun LegalLinks() {
    val uri = LocalUriHandler.current
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        listOf("Terms" to SandboxConfig.TERMS_URL, "Privacy" to SandboxConfig.PRIVACY_URL).forEach { (label, url) ->
            Text(label, Modifier.pressable { uri.openUri(url) }, style = Theme.text(12, FontWeight.Medium), color = Theme.colors.ink2)
        }
    }
}

/** Page 1: the value, in the user's words. Short benefit lines, no comparison table. */
@Composable
private fun ValuePage(answers: Answers) {
    val c = Theme.colors
    val benefits = listOf(
        Triple(Icons.Outlined.TrackChanges, "Your ${answers.minutes}-minute daily plan", "Built for ${answers.goal.lowercase()}, adjusted every week"),
        Triple(Icons.Outlined.Timer, "Unlimited deep sessions", "25, 50 and 90 minutes, or your own length"),
        Triple(Icons.Outlined.NotificationsOff, "Distraction shield", "Silences ${(answers["obstacle"] ?: "notifications").lowercase()} while you focus"),
        Triple(Icons.AutoMirrored.Outlined.TrendingUp, "Progress you can see", "Streaks, weekly reports and focus trends"),
    )
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = Theme.gutter, end = Theme.gutter, top = 8.dp)) {
        Eyebrow("Focus Pro")
        Text("Your plan for ${answers.goal.lowercase()} is ready. Unlock it.", Modifier.padding(top = 10.dp), style = Theme.display(34, -0.9f))
        Column(Modifier.padding(top = 32.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
            benefits.forEach { (icon, title, detail) -> Benefit(icon, title, detail) }
        }
        SandboxConfig.review?.let { (text, author) ->
            Column(Modifier.padding(top = 32.dp).fillMaxWidth().hairlineCard(c).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row { repeat(5) { Icon(Icons.Rounded.Star, null, Modifier.size(14.dp), tint = Theme.accent) } }
                Text("“$text”", style = Theme.text(15))
                Text(author, style = Theme.text(13), color = c.ink2)
            }
        }
    }
}

@Composable
private fun Benefit(icon: ImageVector, title: String, detail: String) {
    val c = Theme.colors
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        Box(Modifier.size(40.dp).background(c.fill, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
            Icon(icon, null, Modifier.size(21.dp), tint = c.ink)
        }
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(title, style = Theme.text(17, FontWeight.SemiBold))
            Text(detail, style = Theme.text(15), color = c.ink2)
        }
    }
}

/** Page 2: how the trial works, then the plans. The billed amount is the largest price on each card. */
@Composable
private fun PlansPage(plans: List<Plan>, selected: Plan, select: (String) -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = Theme.gutter, end = Theme.gutter, top = 8.dp, bottom = 8.dp)) {
        val days = selected.trialDays
        if (days != null) {
            Text("How your free trial works", style = Theme.display(28, -0.6f))
            TrialTimeline(days, selected.price, Modifier.padding(top = 24.dp))
        } else {
            Text("Choose your plan", style = Theme.display(28, -0.6f))
        }
        Column(Modifier.padding(top = 28.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            plans.forEach { p -> PlanCard(p, p.id == selected.id) { select(p.id) } }
        }
    }
}

/** Today, reminder, charge: the three steps that take the fear out of a trial. */
@Composable
fun TrialTimeline(days: Int, price: String, modifier: Modifier = Modifier) {
    val c = Theme.colors
    val steps = listOf(
        Triple(Icons.Outlined.LockOpen, "Today", "Get full access to your plan and every session."),
        Triple(Icons.Outlined.Notifications, "Day ${(days - 2).coerceAtLeast(1)}", "We'll remind you that your trial is ending."),
        Triple(Icons.Outlined.StarOutline, "Day $days", "You're charged $price. Cancel anytime before."),
    )
    Column(modifier) {
        steps.forEachIndexed { i, (icon, title, detail) ->
            val last = i == steps.lastIndex
            Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(36.dp).background(if (i == 0) Theme.accent else c.fill, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(icon, null, Modifier.size(17.dp), tint = if (i == 0) Color.Black else c.ink2)
                    }
                    if (!last) Box(Modifier.width(2.dp).weight(1f).background(c.hairline))
                }
                Column(Modifier.padding(top = 6.dp, bottom = if (last) 0.dp else 14.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(title, style = Theme.text(17, FontWeight.SemiBold))
                    Text(detail, style = Theme.text(15), color = c.ink2)
                }
            }
        }
    }
}

@Composable
private fun PlanCard(plan: Plan, selected: Boolean, onClick: () -> Unit) {
    val c = Theme.colors
    val haptics = rememberHaptics()
    Box(Modifier.fillMaxWidth().semantics { this.selected = selected }.pressable { haptics.select(); onClick() }) {
        Row(
            Modifier
                .fillMaxWidth()
                .background(if (selected) c.fill else Color.Transparent, Theme.card)
                .border(if (selected) 2.dp else 1.dp, if (selected) c.ink else c.hairline, Theme.card)
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            SelectionDot(selected)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(plan.title, style = Theme.text(17, FontWeight.SemiBold))
                plan.trialDays?.let { Text("$it-day free trial", style = Theme.text(14), color = c.ink2) }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(plan.price, style = Theme.text(17, FontWeight.Bold))
                plan.perWeek?.let { Text(it, style = Theme.text(13), color = c.ink2) }
            }
        }
        plan.badge?.let {
            Text(
                it.uppercase(),
                Modifier.align(Alignment.TopEnd).offset(x = (-16).dp, y = (-11).dp).background(Theme.accent, CircleShape).padding(horizontal = 10.dp, vertical = 5.dp),
                style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp, lineHeight = 13.sp),
                color = Color.Black,
            )
        }
    }
}

/** Shown once when the user closes the paywall with the annual plan selected. */
@Composable
private fun ExitOffer(plan: Plan, buy: () -> Unit, leave: () -> Unit) {
    val c = Theme.colors
    Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(start = Theme.gutter, end = Theme.gutter, bottom = 8.dp)) {
        Text("Not ready for a year?", Modifier.padding(top = 24.dp), style = Theme.display(26, -0.5f))
        Text("Start with ${plan.title.lowercase()} for ${plan.price}. Cancel anytime.", Modifier.padding(top = 8.dp), style = Theme.text(17), color = c.ink2)
        PrimaryButton("Start ${plan.title.lowercase()}", Modifier.padding(top = 40.dp), onClick = buy)
        QuietButton("No thanks", Modifier.align(Alignment.CenterHorizontally).padding(top = 4.dp), onClick = leave)
    }
}

/** The SDK's purchase call needs the Activity that hosts Play's purchase sheet. */
tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
