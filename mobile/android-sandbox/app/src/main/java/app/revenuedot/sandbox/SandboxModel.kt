// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: loads offerings and customer info, and runs purchase, restore and logIn/logOut with the coroutine API.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package app.revenuedot.sandbox

import android.app.Activity
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.EntitlementInfo
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
import com.revenuecat.purchases.interfaces.UpdatedCustomerInfoListener
import kotlinx.coroutines.launch

class SandboxModel : ViewModel() {
    private val purchases get() = Purchases.sharedInstance

    var plans by mutableStateOf<List<Plan>>(emptyList()); private set
    var customerInfo by mutableStateOf<CustomerInfo?>(null); private set
    var offeringID by mutableStateOf<String?>(null); private set
    var message by mutableStateOf("")
    var busy by mutableStateOf(false); private set
    var anonymous by mutableStateOf(true); private set
    /** Why offerings or customer info didn't load (shown in Account > Developer, never on the paywall). */
    var loadError by mutableStateOf<String?>(null); private set

    val proEntitlement: EntitlementInfo? get() = customerInfo?.entitlements?.get(SandboxConfig.ENTITLEMENT)
    val isPro: Boolean get() = proEntitlement?.isActive == true
    val appUserID: String get() = purchases.appUserID
    val activeSubscriptions: List<String> get() = customerInfo?.activeSubscriptions?.sorted().orEmpty()

    // Customer info also changes outside the app: renewals reach RevenueDot from Google Play while it is open.
    private val listener = UpdatedCustomerInfoListener { update(it) }

    init {
        purchases.updatedCustomerInfoListener = listener
        anonymous = purchases.isAnonymous
        load()
    }

    override fun onCleared() = purchases.removeUpdatedCustomerInfoListener()

    /** Runs SDK work in the model's scope, so a purchase in flight survives the paywall closing or the screen rotating. */
    fun launch(block: suspend SandboxModel.() -> Unit) = viewModelScope.launch { block() }

    fun load() = viewModelScope.launch {
        try {
            val offerings = purchases.awaitOfferings()
            offeringID = offerings.current?.identifier
            plans = Plan.from(offerings.current?.availablePackages.orEmpty())
            update(purchases.awaitCustomerInfo())
            loadError = null
        } catch (e: PurchasesException) {
            loadError = e.message
        }
    }

    /** Saves the onboarding answers as customer attributes, so audiences and experiments can target them. */
    fun save(answers: Answers) = purchases.setAttributes(answers.mapKeys { "onboarding_${it.key}" })

    /** Returns true when the purchase unlocked the entitlement. */
    suspend fun purchase(activity: Activity, pkg: Package): Boolean {
        busy = true
        return try {
            // Play takes payment; the SDK then posts the purchase token to RevenueDot (POST /v1/receipts).
            update(purchases.awaitPurchase(PurchaseParams.Builder(activity, pkg).build()).customerInfo)
            message = "Welcome to Pro."
            isPro
        } catch (e: PurchasesTransactionException) {
            message = if (e.userCancelled) "" else "Purchase failed: ${e.message}"
            false
        } finally {
            busy = false
        }
    }

    /** Returns true when restoring found an active entitlement. */
    suspend fun restore(): Boolean {
        run("Restore") { purchases.awaitRestore() }
        if (!isPro && message == "Restore: done.") message = "No purchases to restore on this Google account."
        return isPro
    }

    suspend fun toggleLogin(id: String) {
        if (anonymous) run("Log in") { purchases.awaitLogIn(id).customerInfo } else run("Log out") { purchases.awaitLogOut() }
    }

    private fun update(info: CustomerInfo) {
        customerInfo = info
        anonymous = purchases.isAnonymous
    }

    private suspend fun run(label: String, action: suspend () -> CustomerInfo) {
        busy = true
        try {
            update(action())
            message = "$label: done."
        } catch (e: PurchasesException) {
            message = "$label failed: ${e.message}"
        } finally {
            busy = false
        }
    }
}
