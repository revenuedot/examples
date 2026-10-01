// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: turns the current offering's packages into paywall plans: price per week, savings, free trial length.
// With no offering loaded yet (a fresh project), it shows preview plans so the design still renders; buying is off.
// Docs: https://revenuedot.app/docs/guides/paywalls
package com.example.revenuedot.paywall

import com.revenuecat.purchases.Package
import com.revenuecat.purchases.PackageType
import com.revenuecat.purchases.models.Period
import com.revenuecat.purchases.models.StoreProduct
import kotlin.math.roundToInt

data class Plan(
    val id: String,
    val title: String,
    /** The billed amount, "$59.99/year": always the most prominent price on the card. */
    val price: String,
    /** "$1.15 per week", shown smaller under the billed amount. */
    val perWeek: String?,
    /** "Save 77%", on the annual plan only. */
    val badge: String?,
    val trialDays: Int?,
    val pkg: Package?,
) {
    companion object {
        private val rank = listOf(PackageType.ANNUAL, PackageType.WEEKLY, PackageType.MONTHLY, PackageType.SIX_MONTH,
            PackageType.THREE_MONTH, PackageType.TWO_MONTH, PackageType.LIFETIME)

        /** Annual first (pre-selected), then the shorter plans. The annual badge compares price per week with the
         *  shortest plan, which is what the user would otherwise pay. */
        fun from(packages: List<Package>): List<Plan> {
            val annual = packages.firstOrNull { it.packageType == PackageType.ANNUAL }
            val shortest = packages.firstOrNull { it.packageType == PackageType.WEEKLY } ?: packages.firstOrNull { it.packageType == PackageType.MONTHLY }
            return packages.sortedBy { rank.indexOf(it.packageType).let { i -> if (i < 0) 9 else i } }.map { p ->
                val product = p.product
                var badge: String? = null
                val s = shortest?.product?.pricePerWeek()?.amountMicros
                val a = product.pricePerWeek()?.amountMicros
                if (p === annual && s != null && s > 0 && a != null) {
                    val pct = ((1 - a.toDouble() / s) * 100).roundToInt()
                    if (pct >= 5) badge = "Save $pct%"
                }
                Plan(
                    id = p.identifier,
                    title = title(p),
                    price = product.price.formatted + per(p),
                    perWeek = if (p.packageType == PackageType.WEEKLY || p.packageType == PackageType.LIFETIME) null
                    else product.pricePerWeek()?.formatted?.let { "$it per week" },
                    badge = badge,
                    trialDays = trialDays(product),
                    pkg = p,
                )
            }
        }

        /** Shown until the project has an offering, so the paywall's layout can be reviewed on a fresh install. */
        val preview = listOf(
            Plan("preview_annual", "Yearly", "$59.99/year", "$1.15 per week", "Save 77%", 7, null),
            Plan("preview_weekly", "Weekly", "$4.99/week", null, null, null, null),
        )

        private fun title(p: Package) = when (p.packageType) {
            PackageType.ANNUAL -> "Yearly"
            PackageType.SIX_MONTH -> "6 months"
            PackageType.THREE_MONTH -> "3 months"
            PackageType.TWO_MONTH -> "2 months"
            PackageType.MONTHLY -> "Monthly"
            PackageType.WEEKLY -> "Weekly"
            PackageType.LIFETIME -> "Lifetime"
            else -> p.product.name.ifEmpty { p.identifier }
        }

        private fun per(p: Package) = when (p.packageType) {
            PackageType.ANNUAL -> "/year"
            PackageType.SIX_MONTH -> "/6 months"
            PackageType.THREE_MONTH -> "/3 months"
            PackageType.TWO_MONTH -> "/2 months"
            PackageType.MONTHLY -> "/month"
            PackageType.WEEKLY -> "/week"
            else -> ""
        }

        /** Play puts a free trial in the default subscription option's free phase (only when the user is eligible). */
        private fun trialDays(product: StoreProduct): Int? {
            val period = product.defaultOption?.freePhase?.billingPeriod ?: return null
            return when (period.unit) {
                Period.Unit.DAY -> period.value
                Period.Unit.WEEK -> period.value * 7
                Period.Unit.MONTH -> period.value * 30
                Period.Unit.YEAR -> period.value * 365
                Period.Unit.UNKNOWN -> null
            }
        }
    }
}
