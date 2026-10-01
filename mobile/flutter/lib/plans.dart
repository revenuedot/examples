// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: turns the current offering's packages into paywall plans: billed price, price per week, savings badge
// and free-trial length. With no offering yet (a fresh project) it supplies preview plans; buying them is disabled.
// Docs: https://revenuedot.app/docs/guides/paywalls
import 'package:purchases_flutter/purchases_flutter.dart';

class Plan {
  const Plan(
      {required this.id,
      required this.title,
      required this.price,
      this.perWeek,
      this.badge,
      this.trialDays,
      this.package});

  final String id;
  final String title;

  /// The billed amount, "$59.99/year": always the most prominent price on a card (App Store rule).
  final String price;

  /// "$1.15 per week", shown smaller under the billed amount.
  final String? perWeek;

  /// "Save 77%", on the annual plan only.
  final String? badge;
  final int? trialDays;

  /// Null for preview plans, which cannot be bought.
  final Package? package;

  /// Shown until the project has an offering, so the paywall's layout can be reviewed on a fresh install.
  static const preview = [
    Plan(
        id: 'preview_annual',
        title: 'Yearly',
        price: r'$59.99/year',
        perWeek: r'$1.15 per week',
        badge: 'Save 77%',
        trialDays: 7),
    Plan(id: 'preview_weekly', title: 'Weekly', price: r'$4.99/week'),
  ];

  /// Annual first (pre-selected), then the shorter plans. The annual badge compares its price per week with the
  /// shortest plan's, which is what the user would otherwise pay.
  static List<Plan> fromPackages(List<Package> packages) {
    Package? find(PackageType t) => packages.where((p) => p.packageType == t).firstOrNull;
    final annual = find(PackageType.annual);
    final shortest = find(PackageType.weekly) ?? find(PackageType.monthly);
    const rank = [
      PackageType.annual,
      PackageType.weekly,
      PackageType.monthly,
      PackageType.sixMonth,
      PackageType.threeMonth,
      PackageType.twoMonth,
      PackageType.lifetime,
    ];
    int order(Package p) => rank.contains(p.packageType) ? rank.indexOf(p.packageType) : rank.length;
    final sorted = [...packages]..sort((a, b) => order(a).compareTo(order(b)));

    return sorted.map((p) {
      final product = p.storeProduct;
      String? badge;
      final a = _weekly(p), s = shortest == null ? null : _weekly(shortest);
      if (identical(p, annual) && a != null && s != null && s > 0) {
        final pct = ((1 - a / s) * 100).round();
        if (pct >= 5) badge = 'Save $pct%';
      }
      final week =
          product.pricePerWeekString ?? (_weekly(p) == null ? null : _format(product.priceString, _weekly(p)!));
      final showWeek = p.packageType != PackageType.weekly && p.packageType != PackageType.lifetime && week != null;
      return Plan(
        id: p.identifier,
        title: _title(p),
        price: '${product.priceString}${_per(p.packageType)}',
        perWeek: showWeek ? '$week per week' : null,
        badge: badge,
        trialDays: _trialDays(product),
        package: p,
      );
    }).toList();
  }

  /// The SDK's own price per week when it has one; otherwise the price divided by the package's length.
  static double? _weekly(Package p) {
    if (p.storeProduct.pricePerWeek case final w?) return w;
    final weeks = switch (p.packageType) {
      PackageType.weekly => 1.0,
      PackageType.monthly => 52 / 12,
      PackageType.twoMonth => 52 / 6,
      PackageType.threeMonth => 13.0,
      PackageType.sixMonth => 26.0,
      PackageType.annual => 52.0,
      _ => null,
    };
    return weeks == null ? null : p.storeProduct.price / weeks;
  }

  /// Formats [amount] in the product's own currency style by swapping the number inside its price string,
  /// so "$59.99" gives "$1.15" and "59,99 €" gives "1,15 €".
  static String _format(String priceString, double amount) {
    final number = RegExp(r'\d[\d.,\s]*\d|\d').firstMatch(priceString);
    if (number == null) return amount.toStringAsFixed(2);
    final comma = number.group(0)!.contains(',') && !number.group(0)!.contains('.');
    final value = (amount * 100).floor() / 100; // round down, so the per-week price never overstates the saving
    final text = value.toStringAsFixed(2);
    return priceString.replaceRange(number.start, number.end, comma ? text.replaceAll('.', ',') : text);
  }

  static String _title(Package p) => switch (p.packageType) {
        PackageType.annual => 'Yearly',
        PackageType.sixMonth => '6 months',
        PackageType.threeMonth => '3 months',
        PackageType.twoMonth => '2 months',
        PackageType.monthly => 'Monthly',
        PackageType.weekly => 'Weekly',
        PackageType.lifetime => 'Lifetime',
        _ => p.storeProduct.title.isEmpty ? p.identifier : p.storeProduct.title,
      };

  static String _per(PackageType t) => switch (t) {
        PackageType.annual => '/year',
        PackageType.sixMonth => '/6 months',
        PackageType.threeMonth => '/3 months',
        PackageType.twoMonth => '/2 months',
        PackageType.monthly => '/month',
        PackageType.weekly => '/week',
        _ => '',
      };

  /// App Store trials arrive as a free introductory price; Google Play trials as the default option's free phase.
  static int? _trialDays(StoreProduct product) {
    final intro = product.introductoryPrice;
    if (intro != null && intro.price == 0) return _days(intro.periodUnit, intro.periodNumberOfUnits);
    final free = product.defaultOption?.freePhase?.billingPeriod;
    if (free != null) return _days(free.unit, free.value);
    return null;
  }

  static int? _days(PeriodUnit unit, int n) => switch (unit) {
        PeriodUnit.day => n,
        PeriodUnit.week => n * 7,
        PeriodUnit.month => n * 30,
        PeriodUnit.year => n * 365,
        _ => null,
      };
}
