// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the sample apps' design system in Compose. Monochrome ink on white (inverted in dark mode), one gold
// accent for "selected" and "live", hairline borders instead of shadows, large type, pill buttons, light haptics.
// Docs: https://revenuedot.app/docs/sdks/android   Design: examples/mobile/DESIGN.md
package com.example.revenuedot.paywall

import android.os.Build
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.TextSelectionColors
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineBreak
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import kotlin.math.cos
import kotlin.math.sin

/** Ink and ground swap in dark mode; every other colour is ink at an opacity, so one pair drives the whole app.
 *  `sheet` lifts bottom sheets off a black ground in dark mode, the way iOS elevates its sheets. */
@Immutable
class FocusColors(val ink: Color, val ground: Color, val sheet: Color) {
    val ink2 = ink.copy(alpha = 0.62f)
    val ink3 = ink.copy(alpha = 0.42f)
    val hairline = ink.copy(alpha = 0.10f)
    val fill = ink.copy(alpha = 0.04f)
}

private val LocalFocusColors = staticCompositionLocalOf { FocusColors(Color.Black, Color.White, Color.White) }

object Theme {
    val accent = Color(0xFFF7B500)
    val gutter = 24.dp
    val radius = 16.dp
    val card = RoundedCornerShape(radius)
    val colors: FocusColors @Composable get() = LocalFocusColors.current

    /** Display titles: bold with tight tracking. Line height stays close to the size and lines are balanced, so long
     *  headlines read as a block instead of leaving one word on the last line. */
    fun display(size: Int, tracking: Float) = TextStyle(fontSize = size.sp, fontWeight = FontWeight.Bold, letterSpacing = tracking.sp,
        lineHeight = (size * 1.12f).sp, lineBreak = LineBreak.Heading)
    fun text(size: Int, weight: FontWeight = FontWeight.Normal) = TextStyle(fontSize = size.sp, fontWeight = weight, lineHeight = (size * 1.3f).sp)
    val mono = TextStyle(fontSize = 13.sp, fontFamily = FontFamily.Monospace)
}

/** Material 3 is only plumbing here: its colour roles are pinned to ink and ground so nothing comes out tinted or purple. */
@Composable
fun FocusTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val colors = remember(dark) { if (dark) FocusColors(Color.White, Color.Black, Color(0xFF1C1C1E)) else FocusColors(Color.Black, Color.White, Color.White) }
    val ink = colors.ink
    val ground = colors.ground
    val scheme = if (dark) {
        darkColorScheme(primary = ink, onPrimary = ground, background = ground, onBackground = ink, surface = ground, onSurface = ink,
            surfaceVariant = ground, onSurfaceVariant = colors.ink2, surfaceTint = Color.Transparent, outline = colors.hairline,
            surfaceContainerLow = ground, surfaceContainer = ground, surfaceContainerHigh = ground, secondary = ink, tertiary = ink)
    } else {
        lightColorScheme(primary = ink, onPrimary = ground, background = ground, onBackground = ink, surface = ground, onSurface = ink,
            surfaceVariant = ground, onSurfaceVariant = colors.ink2, surfaceTint = Color.Transparent, outline = colors.hairline,
            surfaceContainerLow = ground, surfaceContainer = ground, surfaceContainerHigh = ground, secondary = ink, tertiary = ink)
    }
    MaterialTheme(colorScheme = scheme) {
        CompositionLocalProvider(
            LocalFocusColors provides colors,
            LocalContentColor provides ink,
            LocalTextStyle provides Theme.text(17),
            androidx.compose.foundation.text.selection.LocalTextSelectionColors provides TextSelectionColors(ink, colors.hairline),
            content = content,
        )
    }
}

/** A light tap on buttons, a tick on selections, a success buzz when something completes. */
class Haptics(private val view: View) {
    fun tap() = view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
    fun select() = view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
    fun success() = view.performHapticFeedback(if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY)
}

@Composable
fun rememberHaptics(): Haptics {
    val view = LocalView.current
    return remember(view) { Haptics(view) }
}

/** Press feedback without a ripple: the element scales to 0.97 while pressed. */
@Composable
fun Modifier.pressable(enabled: Boolean = true, role: Role = Role.Button, onClick: () -> Unit): Modifier {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.97f else 1f, spring(dampingRatio = 0.8f, stiffness = Spring.StiffnessHigh), label = "press")
    return this.scale(scale).clickable(source, indication = null, enabled = enabled, role = role, onClick = onClick)
}

/** The primary action: ink pill, full width, 56 tall. Disabled fades it to 30%. */
@Composable
fun PrimaryButton(title: String, modifier: Modifier = Modifier, enabled: Boolean = true, busy: Boolean = false, onClick: () -> Unit) {
    val haptics = rememberHaptics()
    val c = Theme.colors
    val alpha by animateFloatAsState(if (enabled) 1f else 0.3f, tween(150), label = "enabled")
    Box(
        modifier
            .fillMaxWidth()
            .alpha(alpha)
            .height(56.dp)
            .pressable(enabled = enabled && !busy) { haptics.tap(); onClick() }
            .background(c.ink, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (busy) CircularProgressIndicator(Modifier.size(22.dp), color = c.ground, strokeWidth = 2.dp)
        else Text(title, style = Theme.text(17, FontWeight.SemiBold), color = c.ground)
    }
}

/** A quiet text action under the primary button (Restore, Not now). */
@Composable
fun QuietButton(title: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val haptics = rememberHaptics()
    Box(modifier.defaultMinSize(minHeight = 44.dp).pressable { haptics.tap(); onClick() }.padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
        Text(title, style = Theme.text(15, FontWeight.Medium), color = Theme.colors.ink2)
    }
}

/** A selectable row: a hairline card that turns ink-bordered with the gold dot when selected. */
@Composable
fun OptionRow(title: String, selected: Boolean, subtitle: String? = null, icon: ImageVector? = null, onClick: () -> Unit) {
    val haptics = rememberHaptics()
    val c = Theme.colors
    Row(
        Modifier
            .fillMaxWidth()
            .semantics { this.selected = selected }
            .pressable { haptics.select(); onClick() }
            .background(if (selected) c.fill else Color.Transparent, Theme.card)
            .border(if (selected) 1.5.dp else 1.dp, if (selected) c.ink else c.hairline, Theme.card)
            .padding(horizontal = 18.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (icon != null) Box(Modifier.width(28.dp), contentAlignment = Alignment.Center) { Icon(icon, null, Modifier.size(22.dp), tint = c.ink) }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(title, style = Theme.text(17, FontWeight.SemiBold))
            if (subtitle != null) Text(subtitle, style = Theme.text(14), color = c.ink2)
        }
        SelectionDot(selected)
    }
}

/** Empty ring, or an ink ring with the gold dot: the brand's "selected". */
@Composable
fun SelectionDot(on: Boolean) {
    val c = Theme.colors
    Box(Modifier.size(22.dp).border(if (on) 2.dp else 1.5.dp, if (on) c.ink else c.ink3.copy(alpha = 0.42f * 0.6f), CircleShape), contentAlignment = Alignment.Center) {
        AnimatedVisibility(on, enter = scaleIn(spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMedium)), exit = scaleOut()) {
            Box(Modifier.size(10.dp).background(Theme.accent, CircleShape))
        }
    }
}

/** Thin progress bar for multi-step onboarding. */
@Composable
fun StepBar(step: Int, total: Int, modifier: Modifier = Modifier) {
    val c = Theme.colors
    val fraction by animateFloatAsState(step.toFloat() / total.coerceAtLeast(1), spring(dampingRatio = 0.85f, stiffness = Spring.StiffnessLow), label = "step")
    Box(modifier.height(4.dp).background(c.hairline, CircleShape).semantics { contentDescription = "Step $step of $total" }) {
        Box(Modifier.fillMaxWidth(fraction).fillMaxHeight().background(c.ink, CircleShape))
    }
}

/** Small uppercase label above a section. */
@Composable
fun Eyebrow(text: String, modifier: Modifier = Modifier) {
    Text(text.uppercase(), modifier, style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.07.em), color = Theme.colors.ink3)
}

/** The RevenueDot mark: an ink tile with an R whose leg ends in the gold dot. */
@Composable
fun BrandMark(size: Dp = 44.dp) {
    val c = Theme.colors
    Box(Modifier.size(size).background(c.ink, RoundedCornerShape(size * 0.24f)), contentAlignment = Alignment.Center) {
        Text("R", Modifier.offset(x = -size * 0.04f), style = TextStyle(fontSize = (size.value * 0.56f).sp, fontWeight = FontWeight.Bold, lineHeight = (size.value * 0.6f).sp), color = c.ground)
        Box(Modifier.offset(x = size * 0.22f, y = size * 0.2f).size(size * 0.2f).background(Theme.accent, CircleShape))
    }
}

/** The progress ring: hairline track, ink arc, gold dot at the tip. */
@Composable
fun FocusRing(progress: Float, modifier: Modifier = Modifier, lineWidth: Dp = 12.dp, content: @Composable () -> Unit = {}) {
    val c = Theme.colors
    val p by animateFloatAsState(progress.coerceIn(0f, 1f), spring(dampingRatio = 0.85f, stiffness = Spring.StiffnessLow), label = "ring")
    Box(modifier, contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize()) {
            val w = lineWidth.toPx()
            val d = size.minDimension - w
            val topLeft = Offset((size.width - d) / 2, (size.height - d) / 2)
            drawArc(c.hairline, 0f, 360f, false, topLeft, Size(d, d), style = Stroke(w))
            if (p > 0f) {
                drawArc(c.ink, -90f, 360f * p, false, topLeft, Size(d, d), style = Stroke(w, cap = StrokeCap.Round))
                val a = Math.toRadians((360.0 * p) - 90.0)
                drawCircle(Theme.accent, w * 0.55f / 2, Offset(center.x + d / 2 * cos(a).toFloat(), center.y + d / 2 * sin(a).toFloat()))
            }
        }
        content()
    }
}

/** A hairline-bordered card. */
fun Modifier.hairlineCard(c: FocusColors, radius: Dp = Theme.radius) = border(1.dp, c.hairline, RoundedCornerShape(radius))

/** A bottom sheet with the app's look: no tint, no elevation, a small grey handle. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FocusSheet(onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val c = Theme.colors
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        containerColor = c.sheet,
        contentColor = c.ink,
        tonalElevation = 0.dp,
        scrimColor = Color.Black.copy(alpha = 0.3f),
        dragHandle = { Box(Modifier.padding(top = 8.dp).size(width = 36.dp, height = 5.dp).background(c.ink.copy(alpha = 0.18f), CircleShape)) },
        content = content,
    )
}
