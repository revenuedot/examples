// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the account sheet. The plan card reads the `pro` entitlement; Restore and Manage subscription come
// next. The Developer section shows what RevenueDot sees: app user id, entitlement, subscriptions, offering, server.
// Docs: https://revenuedot.app/docs/sdks/android
package app.revenuedot.sandbox

import android.content.ClipData
import android.content.ClipboardManager
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.CreditCard
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.revenuecat.purchases.PeriodType
import com.revenuecat.purchases.Purchases
import java.text.DateFormat

@Composable
fun SettingsView(model: SandboxModel, done: () -> Unit, upgrade: () -> Unit, restartOnboarding: () -> Unit) {
    val c = Theme.colors
    val context = LocalContext.current
    val uri = LocalUriHandler.current
    Column(Modifier.fillMaxHeight(0.94f).navigationBarsPadding()) {
        Box(Modifier.fillMaxWidth().height(52.dp).padding(horizontal = 8.dp)) {
            Text("Account", Modifier.align(Alignment.Center), style = Theme.text(17, FontWeight.SemiBold))
            Box(Modifier.align(Alignment.CenterEnd).defaultMinSize(minWidth = 44.dp, minHeight = 44.dp).pressable(onClick = done).padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                Text("Done", style = Theme.text(17, FontWeight.SemiBold))
            }
        }
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = Theme.gutter, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            PlanCard(model, upgrade)
            Group {
                LinkRow(Icons.Outlined.Refresh, "Restore purchases") { model.launch { restore() } }
                HorizontalDivider(Modifier.padding(start = 52.dp), color = c.hairline)
                LinkRow(Icons.Outlined.CreditCard, "Manage subscription") {
                    // Play's subscription center, or the store page RevenueDot reports for this customer.
                    uri.openUri(model.customerInfo?.managementURL?.toString() ?: "https://play.google.com/store/account/subscriptions?package=${context.packageName}")
                }
                HorizontalDivider(Modifier.padding(start = 52.dp), color = c.hairline)
                LinkRow(Icons.Outlined.AutoAwesome, "Redo onboarding", restartOnboarding)
            }
            Developer(model)
            if (model.message.isNotEmpty()) Text(model.message, style = Theme.text(14), color = c.ink2)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                BrandMark(22.dp)
                Text("Subscriptions by RevenueDot, the open-source RevenueCat alternative.", style = Theme.text(13), color = c.ink3)
            }
        }
    }
}

@Composable
private fun PlanCard(model: SandboxModel, upgrade: () -> Unit) {
    val c = Theme.colors
    val e = model.proEntitlement
    Column(Modifier.fillMaxWidth().hairlineCard(c, Theme.radius + 4.dp).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.size(8.dp).background(if (model.isPro) Theme.accent else c.ink3, CircleShape))
            Text(if (model.isPro) "Focus Pro" else "Free plan", style = Theme.text(22, FontWeight.SemiBold))
        }
        if (e != null && e.isActive) {
            val date = e.expirationDate?.let { DateFormat.getDateInstance(DateFormat.MEDIUM).format(it) }
            Text(if (e.willRenew) "Renews ${date.orEmpty()}" else "Ends ${date ?: "never"}", style = Theme.text(15), color = c.ink2)
            if (e.periodType == PeriodType.TRIAL) {
                Text("Free trial", Modifier.background(c.fill, CircleShape).padding(horizontal = 10.dp, vertical = 4.dp), style = Theme.text(13, FontWeight.SemiBold))
            }
        } else {
            Text("Upgrade for Deep and Flow sessions, weekly reports and the distraction shield.", style = Theme.text(15), color = c.ink2)
            PrimaryButton("See plans", onClick = upgrade)
        }
    }
}

@Composable
private fun Developer(model: SandboxModel) {
    val c = Theme.colors
    var open by rememberSaveable { mutableStateOf(false) }
    var userID by rememberSaveable { mutableStateOf("sandbox_user_1") }
    val turn by animateFloatAsState(if (open) 180f else 0f, label = "chevron")
    Column {
        Row(
            Modifier.fillMaxWidth().height(44.dp).clickable(remember { MutableInteractionSource() }, null) { open = !open },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Eyebrow("Developer")
            Spacer(Modifier.weight(1f))
            Icon(Icons.Rounded.KeyboardArrowDown, null, Modifier.size(20.dp).rotate(turn), tint = c.ink3)
        }
        AnimatedVisibility(open, enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
            Group {
                Field("App user id", model.appUserID, copy = true)
                HorizontalDivider(color = c.hairline)
                Field("Entitlement ${SandboxConfig.ENTITLEMENT}", if (model.isPro) "active" else "not active")
                HorizontalDivider(color = c.hairline)
                Field("Subscriptions", model.activeSubscriptions.ifEmpty { listOf("none") }.joinToString())
                HorizontalDivider(color = c.hairline)
                Field("Current offering", model.offeringID ?: "none")
                HorizontalDivider(color = c.hairline)
                Field("Server", Purchases.proxyURL?.host ?: "api.revenuecat.com")
                HorizontalDivider(color = c.hairline)
                model.loadError?.let {
                    Text(it, Modifier.fillMaxWidth().padding(16.dp), style = Theme.text(13), color = c.ink2)
                    HorizontalDivider(color = c.hairline)
                }
                Row(Modifier.fillMaxWidth().defaultMinSize(minHeight = 52.dp).padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (model.anonymous) {
                        BasicTextField(
                            userID, { userID = it }, Modifier.weight(1f),
                            textStyle = Theme.mono.copy(color = c.ink), singleLine = true, cursorBrush = SolidColor(c.ink),
                            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false),
                            decorationBox = { inner -> Box { if (userID.isEmpty()) Text("User id", style = Theme.mono, color = c.ink3); inner() } },
                        )
                    } else {
                        Text(model.appUserID, Modifier.weight(1f), style = Theme.mono, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    val enabled = !model.busy && (!model.anonymous || userID.isNotBlank())
                    Box(Modifier.defaultMinSize(minHeight = 44.dp).pressable(enabled) { model.launch { toggleLogin(userID.trim()) } }.padding(start = 12.dp), contentAlignment = Alignment.Center) {
                        Text(if (model.anonymous) "Log in" else "Log out", style = Theme.text(15, FontWeight.SemiBold), color = if (enabled) c.ink else c.ink3)
                    }
                }
            }
        }
    }
}

@Composable
private fun Group(content: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth().hairlineCard(Theme.colors)) { content() }
}

@Composable
private fun LinkRow(icon: ImageVector, title: String, action: () -> Unit) {
    val c = Theme.colors
    val haptics = rememberHaptics()
    Row(
        Modifier.fillMaxWidth().defaultMinSize(minHeight = 52.dp).clickable { haptics.tap(); action() }.padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(Modifier.width(22.dp), contentAlignment = Alignment.Center) { Icon(icon, null, Modifier.size(20.dp), tint = c.ink) }
        Text(title, Modifier.weight(1f), style = Theme.text(17))
        Icon(Icons.Rounded.ChevronRight, null, Modifier.size(20.dp), tint = c.ink3)
    }
}

@Composable
private fun Field(label: String, value: String, copy: Boolean = false) {
    val c = Theme.colors
    val haptics = rememberHaptics()
    val context = LocalContext.current
    Row(
        Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(label, style = Theme.text(14), color = c.ink2)
        Text(value, Modifier.weight(1f), style = Theme.mono, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.End)
        if (copy) {
            Box(Modifier.size(32.dp).pressable { context.getSystemService(ClipboardManager::class.java)?.setPrimaryClip(ClipData.newPlainText(label, value)); haptics.success() }.semantics { contentDescription = "Copy app user id" }, contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.ContentCopy, null, Modifier.size(16.dp), tint = c.ink2)
            }
        }
    }
}
