// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the one sandbox screen: offerings, Subscribe for pro_monthly, the pro entitlement, Restore, and log in/out.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.sandbox

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.Offerings
import com.revenuecat.purchases.Package
import com.revenuecat.purchases.PurchaseParams
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesException
import com.revenuecat.purchases.PurchasesTransactionException
import com.revenuecat.purchases.awaitCustomerInfo
import com.revenuecat.purchases.awaitLogIn
import com.revenuecat.purchases.awaitLogOut
import com.revenuecat.purchases.awaitOfferings
import com.revenuecat.purchases.awaitPurchase
import com.revenuecat.purchases.awaitRestore
import kotlinx.coroutines.launch

private const val ENTITLEMENT = "pro"
private const val PACKAGE = "pro_monthly"
private val Ink = Color(0xFF111111)
private val Muted = Color(0xFF6B6B6B)
private val Gold = Color(0xFFF7B500)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { SandboxScreen(this) }
    }
}

/** The pro_monthly package, matched by package identifier or by Play product id (pro_monthly or pro_monthly:base-plan). */
private fun Offerings.proMonthly(): Package? = current?.availablePackages?.firstOrNull {
    it.identifier == PACKAGE || it.product.id == PACKAGE || it.product.id.startsWith("$PACKAGE:")
}

@Composable
fun SandboxScreen(activity: ComponentActivity) {
    val scope = rememberCoroutineScope()
    val purchases = Purchases.sharedInstance
    var offerings by remember { mutableStateOf<Offerings?>(null) }
    var info by remember { mutableStateOf<CustomerInfo?>(null) }
    var anonymous by remember { mutableStateOf(purchases.isAnonymous) }
    var userId by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("Loading…") }
    var busy by remember { mutableStateOf(false) }

    fun update(c: CustomerInfo) { info = c; anonymous = purchases.isAnonymous }
    fun act(label: String, block: suspend () -> CustomerInfo) = scope.launch {
        busy = true
        try {
            update(block())
            message = "$label: done."
        } catch (e: PurchasesTransactionException) {
            message = if (e.userCancelled) "$label: cancelled." else "$label failed: ${e.message}"
        } catch (e: PurchasesException) {
            message = "$label failed: ${e.message}"
        } finally {
            busy = false
        }
    }

    // Renewals and refunds reach RevenueDot from Google Play while the app is open; the listener shows them.
    DisposableEffect(Unit) {
        purchases.updatedCustomerInfoListener = com.revenuecat.purchases.interfaces.UpdatedCustomerInfoListener { update(it) }
        onDispose { purchases.removeUpdatedCustomerInfoListener() }
    }
    LaunchedEffect(Unit) {
        act("Load") {
            offerings = purchases.awaitOfferings()
            purchases.awaitCustomerInfo()
        }
    }

    val pro = info?.entitlements?.active?.get(ENTITLEMENT)
    val pkg = offerings?.proMonthly()

    Column(
        Modifier.fillMaxSize().background(Color.White).safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(10.dp).background(Gold, CircleShape))
            Text("RevenueDot Sandbox", color = Ink, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
        }
        Text("Google Play internal testing build against api.revenuedot.app", color = Muted, fontSize = 13.sp)
        HorizontalDivider(color = Color(0xFFE5E5E5))

        Label("Offerings")
        val current = offerings?.current
        if (offerings == null) Body("Not loaded yet.")
        else if (current == null) Body("No current offering in this RevenueDot project.")
        else {
            Body("Current: ${current.identifier}")
            current.availablePackages.forEach { Body("• ${it.identifier}  ${it.product.id}  ${it.product.price.formatted}") }
        }
        SquareButton(if (pkg != null) "Subscribe (${pkg.product.price.formatted}/month)" else "Subscribe", enabled = !busy && pkg != null) {
            act("Subscribe") { purchases.awaitPurchase(PurchaseParams.Builder(activity, pkg!!).build()).customerInfo }
        }
        if (offerings != null && pkg == null) Body("No $PACKAGE package in the current offering.")

        HorizontalDivider(color = Color(0xFFE5E5E5))
        Label("Customer")
        Body("App user id: ${purchases.appUserID}")
        Body(if (pro != null) "Entitlement $ENTITLEMENT: active, ${if (pro.willRenew) "renews" else "expires"} ${pro.expirationDate ?: "never"}" else "Entitlement $ENTITLEMENT: not active")
        Body("Active subscriptions: ${info?.activeSubscriptions?.joinToString().orEmpty().ifEmpty { "none" }}")

        SquareButton("Restore", enabled = !busy, outlined = true) { act("Restore") { purchases.awaitRestore() } }
        if (anonymous) {
            OutlinedTextField(userId, { userId = it }, label = { Text("App user id to log in as") }, singleLine = true,
                shape = RectangleShape, modifier = Modifier.fillMaxWidth())
            SquareButton("Log in", enabled = !busy && userId.isNotBlank(), outlined = true) {
                act("Log in") { purchases.awaitLogIn(userId.trim()).customerInfo }
            }
        } else {
            SquareButton("Log out", enabled = !busy, outlined = true) { act("Log out") { purchases.awaitLogOut() } }
        }
        Text(message, color = Ink, fontSize = 14.sp)
    }
}

@Composable private fun Label(text: String) = Text(text.uppercase(), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Medium)
@Composable private fun Body(text: String) = Text(text, color = Ink, fontSize = 15.sp)

@Composable
private fun SquareButton(text: String, enabled: Boolean, outlined: Boolean = false, onClick: () -> Unit) {
    val modifier = Modifier.fillMaxWidth()
    if (outlined) {
        OutlinedButton(onClick, modifier, enabled, shape = RectangleShape, colors = ButtonDefaults.outlinedButtonColors(contentColor = Ink)) { Text(text) }
    } else {
        Button(onClick, modifier, enabled, shape = RectangleShape, colors = ButtonDefaults.buttonColors(containerColor = Ink, contentColor = Color.White)) { Text(text) }
    }
}
