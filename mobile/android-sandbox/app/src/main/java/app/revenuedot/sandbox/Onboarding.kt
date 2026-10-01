// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the onboarding quiz before the paywall, in the shape that converts best in 2026: one question per
// screen with a progress bar, a "building your plan" moment, then a plan summary, then the paywall. The answers are
// saved as RevenueDot customer attributes, so audiences, targeting rules and experiments can use them.
// Docs: https://revenuedot.app/docs/guides/targeting-and-experiments
package app.revenuedot.sandbox

import android.Manifest
import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.automirrored.outlined.VolumeUp
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.Bedtime
import androidx.compose.material.icons.outlined.Brush
import androidx.compose.material.icons.outlined.HourglassEmpty
import androidx.compose.material.icons.outlined.Laptop
import androidx.compose.material.icons.outlined.NightsStay
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.PhoneAndroid
import androidx.compose.material.icons.outlined.WbSunny
import androidx.compose.material.icons.outlined.WbTwilight
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

/** The user's answers, keyed by question id. */
typealias Answers = Map<String, String>

val Answers.goal get() = this["goal"] ?: "Deep work"
val Answers.minutes get() = this["daily_minutes"]?.toIntOrNull() ?: 30
val Answers.bestTime get() = this["best_time"] ?: "Morning"

class Question(val id: String, val title: String, val subtitle: String, val options: List<Option>) {
    class Option(val value: String, val detail: String? = null, val icon: ImageVector? = null)
}

private val questions = listOf(
    Question("goal", "What do you want to focus on?", "We'll shape every session around it.", listOf(
        Question.Option("Deep work", "Long, uninterrupted blocks", Icons.Outlined.Laptop),
        Question.Option("Study", "Exams, courses, languages", Icons.AutoMirrored.Outlined.MenuBook),
        Question.Option("Creative projects", "Writing, design, music", Icons.Outlined.Brush),
        Question.Option("Reading", "Finish more books", Icons.Outlined.AutoStories),
    )),
    Question("attention", "How long can you focus before you get distracted?", "Be honest. There's no wrong answer.", listOf(
        Question.Option("Under 10 minutes"), Question.Option("10 to 25 minutes"), Question.Option("25 to 45 minutes"), Question.Option("Over 45 minutes"),
    )),
    Question("obstacle", "What breaks your focus most?", "We'll guard against it first.", listOf(
        Question.Option("My phone", icon = Icons.Outlined.PhoneAndroid), Question.Option("Notifications", icon = Icons.Outlined.NotificationsActive),
        Question.Option("Putting it off", icon = Icons.Outlined.HourglassEmpty), Question.Option("Noise around me", icon = Icons.AutoMirrored.Outlined.VolumeUp),
    )),
    Question("best_time", "When do you feel sharpest?", "Your sessions will start then.", listOf(
        Question.Option("Morning", icon = Icons.Outlined.WbTwilight), Question.Option("Afternoon", icon = Icons.Outlined.WbSunny),
        Question.Option("Evening", icon = Icons.Outlined.NightsStay), Question.Option("Late night", icon = Icons.Outlined.Bedtime),
    )),
    Question("daily_minutes", "How much time can you give it a day?", "Small and steady beats big and rare.", listOf(
        Question.Option("15", "Easy start"), Question.Option("30", "Most popular"), Question.Option("60", "Serious"), Question.Option("90", "All in"),
    )),
    Question("source", "How did you hear about us?", "It helps us reach people like you.", listOf(
        Question.Option("Google Play"), Question.Option("A friend"), Question.Option("TikTok"), Question.Option("Instagram"),
        Question.Option("YouTube"), Question.Option("Somewhere else"),
    )),
)

private sealed interface Step {
    data object Welcome : Step
    data class Ask(val index: Int) : Step
    data object Insight : Step
    data object Reminders : Step
    data object Building : Step
    data object PlanReady : Step
}

private val steps = listOf(Step.Welcome, Step.Ask(0), Step.Ask(1), Step.Ask(2), Step.Insight, Step.Ask(3), Step.Ask(4), Step.Ask(5),
    Step.Reminders, Step.Building, Step.PlanReady)

@Composable
fun OnboardingView(onFinish: (Answers) -> Unit) {
    val demo = DemoScreen.name
    var index by rememberSaveable { mutableIntStateOf(demo?.let { DemoScreen.onboardingSteps[it] } ?: 0) }
    var answers by rememberSaveable { mutableStateOf(if (demo == null) emptyMap() else DemoScreen.answers) }
    val haptics = rememberHaptics()
    val c = Theme.colors
    // The bar covers the quiz itself, not the welcome or the final two screens.
    val showsBar = index > 0 && index < steps.size - 2

    fun move(by: Int) { index = (index + by).coerceIn(0, steps.size - 1) }
    BackHandler(enabled = index > 0 && index < steps.size - 2) { move(-1) }

    Column(Modifier.fillMaxSize().background(c.ground)) {
        if (showsBar) {
            Row(Modifier.padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(44.dp).pressable { haptics.tap(); move(-1) }.semantics { contentDescription = "Back" }, contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.ChevronLeft, null, Modifier.size(30.dp), tint = c.ink)
                }
                StepBar(index, steps.size - 3, Modifier.weight(1f))
                Spacer(Modifier.size(44.dp))
            }
        }
        AnimatedContent(
            index,
            Modifier.weight(1f),
            transitionSpec = {
                val dir = if (targetState > initialState) 1 else -1
                (slideInHorizontally(tween(320, easing = FastOutSlowInEasing)) { it * dir } + fadeIn(tween(320))) togetherWith
                    (slideOutHorizontally(tween(320, easing = FastOutSlowInEasing)) { -it * dir } + fadeOut(tween(200)))
            },
            label = "onboarding",
        ) { i ->
            when (val step = steps[i]) {
                Step.Welcome -> Welcome { move(1) }
                is Step.Ask -> {
                    val q = questions[step.index]
                    QuestionStep(q, answers[q.id], { answers = answers + (q.id to it) }) { move(1) }
                }
                Step.Insight -> Insight(answers.goal) { move(1) }
                Step.Reminders -> Reminders(answers.bestTime) { move(1) }
                Step.Building -> BuildingPlan(answers) { move(1) }
                Step.PlanReady -> PlanSummary(answers) { onFinish(answers) }
            }
        }
    }
}

/** Every quiz screen: big title, short subtitle, content, and a Continue button pinned to the bottom. */
@Composable
private fun Screen(
    title: String,
    subtitle: String?,
    cta: String = "Continue",
    canContinue: Boolean = true,
    next: () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    val c = Theme.colors
    Column(Modifier.fillMaxSize().padding(start = Theme.gutter, end = Theme.gutter, bottom = 12.dp)) {
        Text(title, Modifier.padding(top = 20.dp), style = Theme.display(30, -0.6f))
        if (subtitle != null) Text(subtitle, Modifier.padding(top = 8.dp), style = Theme.text(17), color = c.ink2)
        Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(vertical = 24.dp), content = content)
        PrimaryButton(cta, enabled = canContinue, onClick = next)
    }
}

@Composable
private fun Welcome(next: () -> Unit) {
    val c = Theme.colors
    Column(Modifier.fillMaxSize().padding(horizontal = Theme.gutter, vertical = 12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BrandMark(28.dp)
            Text("Focus", style = Theme.text(17, FontWeight.SemiBold))
        }
        Spacer(Modifier.weight(1f))
        FocusRing(0.68f, Modifier.size(196.dp).align(Alignment.CenterHorizontally), lineWidth = 14.dp) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("41", style = TextStyle(fontSize = 52.sp, fontWeight = FontWeight.Bold, lineHeight = 56.sp))
                Text("of 60 min", style = Theme.text(13), color = c.ink2)
            }
        }
        Spacer(Modifier.weight(1f))
        Text("Do your best work, every day.", style = Theme.display(40, -1.2f))
        Text("Focus sessions built around your goal. Setup takes a minute.", Modifier.padding(top = 12.dp), style = Theme.text(18), color = c.ink2)
        PrimaryButton("Get started", Modifier.padding(top = 32.dp), onClick = next)
        Text("A RevenueDot sample app", Modifier.fillMaxWidth().padding(top = 14.dp), style = Theme.text(13), color = c.ink3, textAlign = TextAlign.Center)
    }
}

@Composable
private fun QuestionStep(question: Question, answer: String?, choose: (String) -> Unit, next: () -> Unit) {
    fun label(v: String): String {
        val m = v.toIntOrNull()
        if (question.id != "daily_minutes" || m == null) return v
        return when (m) { 60 -> "1 hour"; 90 -> "1.5 hours"; else -> "$m minutes" }
    }
    Screen(question.title, question.subtitle, canContinue = answer != null, next = next) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            question.options.forEach { o -> OptionRow(label(o.value), answer == o.value, o.detail, o.icon) { choose(o.value) } }
        }
    }
}

/** A screen between questions that shows why the method works. The curves are an illustration, not data. */
@Composable
private fun Insight(goal: String, next: () -> Unit) {
    val c = Theme.colors
    val drawn = remember { Animatable(0f) }
    LaunchedEffect(Unit) { delay(200); drawn.animateTo(1f, tween(1100, easing = FastOutSlowInEasing)) }
    Screen("A plan beats willpower.", "Short daily sessions compound. Willpower fades by week two.", next = next) {
        Box(Modifier.fillMaxWidth().background(c.fill, Theme.card).padding(20.dp)) {
            Canvas(Modifier.fillMaxWidth().height(200.dp)) {
                curve(listOf(0.18f, 0.22f, 0.20f, 0.17f, 0.15f, 0.12f, 0.10f), drawn.value, c.ink3, 2.5.dp.toPx(), dashed = true)
                curve(listOf(0.18f, 0.28f, 0.40f, 0.52f, 0.66f, 0.78f, 0.92f), drawn.value, c.ink, 3.5.dp.toPx(), dashed = false)
                if (drawn.value >= 0.98f) drawCircle(Theme.accent, 7.dp.toPx(), Offset(size.width, size.height * (1 - 0.92f)))
            }
        }
        Row(Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            Legend(c.ink, "With a daily plan")
            Legend(c.ink3, "On willpower", dashed = true)
        }
        Text("Illustration. Your Focus plan for ${goal.lowercase()} keeps sessions short enough to start every day.",
            Modifier.padding(top = 16.dp), style = Theme.text(13), color = c.ink3)
    }
}

@Composable
private fun Legend(color: Color, text: String, dashed: Boolean = false) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.width(18.dp).height(3.dp).alpha(if (dashed) 0.7f else 1f).background(color, CircleShape))
        Text(text, style = Theme.text(14, FontWeight.Medium), color = Theme.colors.ink2)
    }
}

/** A smooth curve through evenly spaced points (0 = bottom, 1 = top), drawn up to `fraction` of its length. */
private fun DrawScope.curve(points: List<Float>, fraction: Float, color: Color, width: Float, dashed: Boolean) {
    val pts = points.mapIndexed { i, v -> Offset(size.width * i / (points.size - 1), size.height * (1 - v)) }
    val path = Path().apply {
        moveTo(pts[0].x, pts[0].y)
        for (i in 1 until pts.size) {
            val a = pts[i - 1]
            val b = pts[i]
            val mid = (a.x + b.x) / 2
            cubicTo(mid, a.y, mid, b.y, b.x, b.y)
        }
    }
    val measure = PathMeasure().apply { setPath(path, false) }
    val part = Path()
    measure.getSegment(0f, measure.length * fraction, part, true)
    val effect = if (dashed) PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 6.dp.toPx() + width)) else null
    drawPath(part, color, style = Stroke(width, cap = StrokeCap.Round, pathEffect = effect))
}

/** Asks for notification permission with context first; the system prompt only appears after "Turn on reminders". */
@Composable
private fun Reminders(time: String, next: () -> Unit) {
    val c = Theme.colors
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { next() }
    Column(Modifier.fillMaxSize().padding(start = Theme.gutter, end = Theme.gutter, bottom = 12.dp)) {
        Spacer(Modifier.weight(1f))
        Box {
            Box(Modifier.size(88.dp).background(c.fill, RoundedCornerShape(24.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.Notifications, null, Modifier.size(40.dp), tint = c.ink)
            }
            Box(Modifier.align(Alignment.TopEnd).offset(x = 4.dp, y = (-4).dp).size(16.dp).background(Theme.accent, CircleShape))
        }
        Text("Get a nudge when you're sharpest.", Modifier.padding(top = 28.dp), style = Theme.display(30, -0.6f))
        Text("One quiet reminder each ${time.lowercase()}. People who turn reminders on keep their streak far longer.",
            Modifier.padding(top = 10.dp), style = Theme.text(17), color = c.ink2)
        Spacer(Modifier.weight(1f))
        PrimaryButton("Turn on reminders") {
            // Android 13 made notifications a runtime permission; older versions grant it at install.
            if (Build.VERSION.SDK_INT >= 33) ask.launch(Manifest.permission.POST_NOTIFICATIONS) else next()
        }
        QuietButton("Not now", Modifier.align(Alignment.CenterHorizontally).padding(top = 6.dp), onClick = next)
    }
}

/** "Building your plan": a percentage that counts up while three checks tick in. */
@Composable
private fun BuildingPlan(answers: Answers, done: () -> Unit) {
    val c = Theme.colors
    val haptics = rememberHaptics()
    var percent by remember { mutableIntStateOf(0) }
    val bar by animateFloatAsState(percent / 100f, tween(50, easing = LinearEasing), label = "bar")
    val lines = listOf(
        "Matching sessions to ${answers.goal.lowercase()}",
        "Guarding against ${(answers["obstacle"] ?: "distractions").lowercase()}",
        "Scheduling ${answers.minutes} minutes each ${answers.bestTime.lowercase()}",
    )
    LaunchedEffect(Unit) {
        while (percent < 100) {
            delay(28)
            percent += 1
            if (percent % 30 == 0) haptics.select()
        }
        haptics.success()
        delay(450)
        done()
    }
    Column(Modifier.fillMaxSize().padding(horizontal = Theme.gutter)) {
        Spacer(Modifier.weight(1f))
        Text("$percent%", style = TextStyle(fontSize = 72.sp, fontWeight = FontWeight.Bold, letterSpacing = (-2).sp, lineHeight = 76.sp))
        Text("Building your plan", Modifier.padding(top = 4.dp), style = Theme.text(22, FontWeight.SemiBold))
        Box(Modifier.padding(top = 20.dp).fillMaxWidth().height(6.dp).background(c.hairline, CircleShape)) {
            Box(Modifier.fillMaxWidth(bar).fillMaxHeight().background(c.ink, CircleShape))
        }
        Column(Modifier.padding(top = 32.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            lines.forEachIndexed { i, line ->
                val doneAt = (i + 1) * 30
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    CheckCircle(percent >= doneAt, 24.dp)
                    Text(line, style = Theme.text(17), color = if (percent >= doneAt - 30) c.ink else c.ink3)
                }
            }
        }
        Spacer(Modifier.weight(2f))
    }
}

@Composable
private fun CheckCircle(on: Boolean, size: Dp) {
    val c = Theme.colors
    Box(
        Modifier.size(size).then(if (on) Modifier.background(c.ink, CircleShape) else Modifier.border(1.5.dp, c.hairline, CircleShape)),
        contentAlignment = Alignment.Center,
    ) {
        if (on) Icon(Icons.Rounded.Check, null, Modifier.size(15.dp), tint = c.ground)
    }
}

/** The plan, right before the paywall: what the user gets, in their own words. */
@Composable
private fun PlanSummary(answers: Answers, next: () -> Unit) {
    val c = Theme.colors
    val sessions = (answers.minutes / 25).coerceAtLeast(1)
    Screen("Your plan is ready.", "Built for ${answers.goal.lowercase()}, around your day.", cta = "Start my plan", next = next) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Tile("${answers.minutes}", "min", "Every day", Modifier.weight(1f))
                Tile("$sessions", if (sessions > 1) "sessions" else "session", "Of 25 minutes", Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Tile(answers.bestTime, null, "Start time", Modifier.weight(1f))
                Tile("14", "days", "To a habit", Modifier.weight(1f))
            }
            Row(
                Modifier.fillMaxWidth().hairlineCard(c).padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(Modifier.padding(top = 7.dp).size(8.dp).background(Theme.accent, CircleShape))
                Text("Week one keeps sessions short so you start every day. From week two they grow as your focus does.",
                    style = Theme.text(15), color = c.ink2)
            }
        }
    }
}

@Composable
private fun Tile(value: String, unit: String?, label: String, modifier: Modifier = Modifier) {
    val c = Theme.colors
    Column(modifier.background(c.fill, Theme.card).padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = Theme.text(13), color = c.ink2)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            // Shrinks long values ("Late night") to fit the tile instead of wrapping.
            var scale by remember(value) { mutableStateOf(1f) }
            Text(value, Modifier.alignByBaseline(), style = Theme.display(30, -0.6f).let { it.copy(fontSize = it.fontSize * scale) }, maxLines = 1, softWrap = false,
                onTextLayout = { if (it.didOverflowWidth && scale > 0.6f) scale -= 0.05f })
            if (unit != null) Text(unit, Modifier.alignByBaseline(), style = Theme.text(15, FontWeight.Medium), color = c.ink2)
        }
    }
}
