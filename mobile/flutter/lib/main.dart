// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the paywall screen: current offering, purchase, restore, customer info and logIn.
// Docs: https://revenuedot.app/docs/sdks/flutter   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import 'revenuedot.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await configureRevenueDot();
  runApp(const MaterialApp(home: PaywallPage()));
}

class PaywallPage extends StatefulWidget {
  const PaywallPage({super.key});

  @override
  State<PaywallPage> createState() => _PaywallPageState();
}

class _PaywallPageState extends State<PaywallPage> {
  List<Package> _packages = [];
  CustomerInfo? _customerInfo;
  String _appUserId = '';
  String _message = '';
  bool _busy = false;
  final _userId = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Customer info also changes outside this screen (renewals reach RevenueDot from the stores).
    Purchases.addCustomerInfoUpdateListener(_onCustomerInfo);
    _run('Load', () async {
      // GET /v1/subscribers/{id}/offerings on your RevenueDot server.
      final offerings = await Purchases.getOfferings();
      _packages = offerings.current?.availablePackages ?? [];
      if (offerings.current == null) _message = 'No current offering. Create one in the RevenueDot dashboard.';
      return Purchases.getCustomerInfo();
    });
  }

  @override
  void dispose() {
    Purchases.removeCustomerInfoUpdateListener(_onCustomerInfo);
    _userId.dispose();
    super.dispose();
  }

  void _onCustomerInfo(CustomerInfo info) => setState(() => _customerInfo = info);

  Future<void> _run(String label, Future<CustomerInfo> Function() action) async {
    setState(() => _busy = true);
    try {
      final info = await action();
      final id = await Purchases.appUserID;
      setState(() {
        _customerInfo = info;
        _appUserId = id;
        if (label != 'Load') _message = '$label: done.';
      });
    } on PlatformException catch (e) {
      // A cancelled purchase is not an error worth showing.
      final cancelled = PurchasesErrorHelper.getErrorCode(e) == PurchasesErrorCode.purchaseCancelledError;
      setState(() => _message = cancelled ? 'Purchase cancelled.' : '$label failed: ${e.message}');
    } finally {
      setState(() => _busy = false);
    }
  }

  // The store (or the Test Store dialog) takes payment; the SDK then posts it to POST /v1/receipts.
  Future<void> _buy(Package package) =>
      _run('Purchase', () async => (await Purchases.purchase(PurchaseParams.package(package))).customerInfo);

  // Restore sends this Apple ID / Google account's purchases to RevenueDot.
  Future<void> _restore() => _run('Restore', Purchases.restorePurchases);

  // logIn switches to your own user id; an anonymous user's purchases move with them.
  Future<void> _logIn() => _run('Log in', () async => (await Purchases.logIn(_userId.text.trim())).customerInfo);

  @override
  Widget build(BuildContext context) {
    final pro = _customerInfo?.entitlements.active[entitlement];
    return Scaffold(
      appBar: AppBar(title: const Text('Go Pro')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(pro != null ? 'Pro is active until ${pro.expirationDate ?? 'forever'}' : 'Pro is not active'),
          const SizedBox(height: 12),
          for (final package in _packages)
            ListTile(
              title: Text(package.storeProduct.title),
              trailing: Text(package.storeProduct.priceString),
              onTap: _busy ? null : () => _buy(package),
            ),
          if (_busy) const LinearProgressIndicator(),
          Text(_message),
          TextButton(onPressed: _busy ? null : _restore, child: const Text('Restore purchases')),
          Row(children: [
            Expanded(child: TextField(controller: _userId, decoration: const InputDecoration(labelText: 'Your user id'))),
            TextButton(onPressed: _busy ? null : _logIn, child: const Text('Log in')),
          ]),
          Text('App user id: $_appUserId', style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
