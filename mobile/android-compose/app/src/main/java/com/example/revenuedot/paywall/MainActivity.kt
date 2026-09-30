// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the paywall screen in Jetpack Compose: packages, entitlement state, restore and logIn.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package com.example.revenuedot.paywall

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { Surface { PaywallScreen(this) } } }
    }
}

@Composable
fun PaywallScreen(activity: ComponentActivity, model: PaywallViewModel = viewModel()) {
    var userId by remember { mutableStateOf("") }
    Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Go Pro", style = MaterialTheme.typography.headlineLarge)
        val pro = model.customerInfo?.entitlements?.active?.get(ENTITLEMENT)
        Text(if (pro != null) "Pro is active until ${pro.expirationDate ?: "forever"}" else "Pro is not active")
        LazyColumn {
            items(model.packages, key = { it.identifier }) { pkg ->
                Row(
                    Modifier.fillMaxWidth().clickable(enabled = !model.busy) { model.buy(activity, pkg) }.padding(vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(pkg.product.title)
                    Text(pkg.product.price.formatted)
                }
                HorizontalDivider()
            }
        }
        Button(onClick = { model.restore() }, enabled = !model.busy) { Text("Restore purchases") }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(userId, { userId = it }, label = { Text("Your user id") }, modifier = Modifier.weight(1f))
            Button(onClick = { model.logIn(userId.trim()) }, enabled = !model.busy && userId.isNotBlank()) { Text("Log in") }
        }
        Text(model.message)
        Text("App user id: ${model.appUserId}", style = MaterialTheme.typography.bodySmall)
    }
}
