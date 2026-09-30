// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: loads offerings and customer info, and runs purchase, restore and logIn with the coroutine API.
// Docs: https://revenuedot.app/docs/sdks/android   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
package com.example.revenuedot.paywall

import android.app.Activity
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.Package
import com.revenuecat.purchases.PurchaseParams
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesException
import com.revenuecat.purchases.PurchasesTransactionException
import com.revenuecat.purchases.awaitCustomerInfo
import com.revenuecat.purchases.awaitLogIn
import com.revenuecat.purchases.awaitOfferings
import com.revenuecat.purchases.awaitPurchase
import com.revenuecat.purchases.awaitRestore
import com.revenuecat.purchases.interfaces.UpdatedCustomerInfoListener
import kotlinx.coroutines.launch

const val ENTITLEMENT = "pro" // the entitlement lookup key in your RevenueDot project

class PaywallViewModel : ViewModel() {
    var packages by mutableStateOf<List<Package>>(emptyList()); private set
    var customerInfo by mutableStateOf<CustomerInfo?>(null); private set
    var message by mutableStateOf(""); private set
    var busy by mutableStateOf(false); private set
    val appUserId: String get() = Purchases.sharedInstance.appUserID

    // Customer info also changes outside this screen (renewals reach RevenueDot from Google Play).
    private val listener = UpdatedCustomerInfoListener { customerInfo = it }

    init {
        Purchases.sharedInstance.updatedCustomerInfoListener = listener
        run("Load") {
            // GET /v1/subscribers/{id}/offerings on your RevenueDot server.
            val offerings = Purchases.sharedInstance.awaitOfferings()
            packages = offerings.current?.availablePackages.orEmpty()
            if (offerings.current == null) message = "No current offering. Create one in the RevenueDot dashboard."
            Purchases.sharedInstance.awaitCustomerInfo()
        }
    }

    val isPro: Boolean get() = customerInfo?.entitlements?.active?.containsKey(ENTITLEMENT) == true

    fun buy(activity: Activity, pkg: Package) = viewModelScope.launch {
        busy = true
        try {
            // Google Play (or the Test Store dialog) takes payment; the SDK then posts it to POST /v1/receipts.
            customerInfo = Purchases.sharedInstance.awaitPurchase(PurchaseParams.Builder(activity, pkg).build()).customerInfo
            message = "Purchased ${pkg.identifier}."
        } catch (e: PurchasesTransactionException) {
            message = if (e.userCancelled) "Purchase cancelled." else "Purchase failed: ${e.message}"
        } finally {
            busy = false
        }
    }

    /** Restore sends this Google account's purchases to RevenueDot; the project's transfer setting decides who gets them. */
    fun restore() = run("Restore") { Purchases.sharedInstance.awaitRestore() }

    /** logIn switches to your own user id; an anonymous user's purchases move with them. */
    fun logIn(id: String) = run("Log in") { Purchases.sharedInstance.awaitLogIn(id).customerInfo }

    private fun run(label: String, action: suspend () -> CustomerInfo) = viewModelScope.launch {
        busy = true
        try {
            customerInfo = action()
            if (label != "Load") message = "$label: done."
        } catch (e: PurchasesException) {
            message = "$label failed: ${e.message}"
        } finally {
            busy = false
        }
    }
}
