// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: loads offerings and customer info, saves onboarding answers as attributes, and runs purchase,
// restore and logIn/logOut. Screens listen to it; the SDK's customer-info listener keeps it current.
// Docs: https://revenuedot.app/docs/sdks/flutter   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import 'plans.dart';
import 'revenuedot.dart';

class FocusModel extends ChangeNotifier {
  /// [setupError] is non-null when the SDK was not configured (no API key); the app then runs on preview plans.
  FocusModel({String? setupError})
      : configured = setupError == null,
        loadError = setupError;

  final bool configured;
  List<Plan> plans = [];
  CustomerInfo? customerInfo;
  String appUserId = '';
  String? offeringId;
  String? loggedInId;
  String message = '';
  bool busy = false;

  /// Why offerings or customer info didn't load. Shown in Account > Developer, never on the paywall.
  String? loadError;

  EntitlementInfo? get proEntitlement => customerInfo?.entitlements.all[entitlement];
  bool get isPro => customerInfo?.entitlements.active.containsKey(entitlement) ?? false;
  List<String> get activeSubscriptions => [...?customerInfo?.activeSubscriptions]..sort();

  Future<void> load() async {
    if (!configured) return;
    // Customer info also changes outside the app (renewals reach RevenueDot from the stores).
    Purchases.addCustomerInfoUpdateListener(_onCustomerInfo);
    try {
      // GET /v1/subscribers/{id}/offerings on your RevenueDot server.
      final offerings = await Purchases.getOfferings();
      offeringId = offerings.current?.identifier;
      plans = Plan.fromPackages(offerings.current?.availablePackages ?? []);
      customerInfo = await Purchases.getCustomerInfo();
      appUserId = await Purchases.appUserID;
      loadError = null;
    } on PlatformException catch (e) {
      loadError = e.message ?? e.code;
    }
    notifyListeners();
  }

  void _onCustomerInfo(CustomerInfo info) {
    customerInfo = info;
    notifyListeners();
  }

  @override
  void dispose() {
    if (configured) Purchases.removeCustomerInfoUpdateListener(_onCustomerInfo);
    super.dispose();
  }

  /// Saves the onboarding answers as customer attributes (onboarding_goal, ...), so RevenueDot audiences,
  /// targeting rules and experiments can use them.
  Future<void> saveAnswers(Map<String, String> answers) async {
    if (!configured) return;
    await Purchases.setAttributes({for (final e in answers.entries) 'onboarding_${e.key}': e.value});
  }

  /// Returns true when the purchase unlocked the entitlement.
  Future<bool> purchase(Package package) async {
    _setBusy(true);
    try {
      // The store (or the Test Store dialog) takes payment; the SDK then posts it to POST /v1/receipts.
      final result = await Purchases.purchase(PurchaseParams.package(package));
      customerInfo = result.customerInfo;
      message = 'Welcome to Pro.';
      return isPro;
    } on PlatformException catch (e) {
      // A cancelled purchase is not an error worth showing.
      final cancelled = PurchasesErrorHelper.getErrorCode(e) == PurchasesErrorCode.purchaseCancelledError;
      message = cancelled ? '' : 'Purchase failed: ${e.message}';
      return false;
    } finally {
      _setBusy(false);
    }
  }

  /// Returns true when restoring found an active entitlement.
  Future<bool> restore() async {
    if (!configured) {
      message = 'Add an API key to restore purchases.';
      notifyListeners();
      return false;
    }
    // Restore sends this Apple ID's or Google account's purchases to RevenueDot.
    final ok = await _run('Restore', Purchases.restorePurchases);
    if (ok && !isPro) message = 'No purchases to restore on this account.';
    notifyListeners();
    return isPro;
  }

  /// logIn switches to your own user id; an anonymous user's purchases move with them. logOut returns to anonymous.
  Future<void> toggleLogin(String id) async {
    if (loggedInId == null) {
      final ok = await _run('Log in', () async => (await Purchases.logIn(id)).customerInfo);
      if (ok) loggedInId = id;
    } else {
      final ok = await _run('Log out', Purchases.logOut);
      if (ok) loggedInId = null;
    }
    notifyListeners();
  }

  Future<bool> _run(String label, Future<CustomerInfo> Function() action) async {
    if (!configured) return false;
    _setBusy(true);
    try {
      customerInfo = await action();
      appUserId = await Purchases.appUserID;
      message = '$label: done.';
      return true;
    } on PlatformException catch (e) {
      message = '$label failed: ${e.message}';
      return false;
    } finally {
      _setBusy(false);
    }
  }

  void _setBusy(bool v) {
    busy = v;
    notifyListeners();
  }

  void say(String text) {
    message = text;
    notifyListeners();
  }
}
