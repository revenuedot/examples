// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: points purchases_flutter at your RevenueDot server and configures it once.
// Docs: https://revenuedot.app/docs/sdks/flutter   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

/// Pass at build time: flutter run --dart-define=REVENUEDOT_URL=http://10.0.2.2:8787 --dart-define=REVENUEDOT_API_KEY=test_...
/// The iOS simulator reaches your computer as localhost; the Android emulator as 10.0.2.2.
const serverUrl = String.fromEnvironment('REVENUEDOT_URL', defaultValue: 'http://localhost:8787');
const testKey = String.fromEnvironment('REVENUEDOT_API_KEY');
const iosKey = String.fromEnvironment('REVENUEDOT_IOS_KEY');
const androidKey = String.fromEnvironment('REVENUEDOT_ANDROID_KEY');

/// The entitlement the paywall unlocks (its lookup key in RevenueDot).
const entitlement = 'pro';

/// Apple requires Terms and Privacy links on every paywall. Replace both with your app's own pages.
const termsUrl = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const privacyUrl = 'https://revenuedot.app/legal/privacy';

/// The host the SDK talks to, shown in Account > Developer.
String get serverHost => Uri.tryParse(serverUrl)?.authority ?? serverUrl;

/// Configures the SDK and returns null, or returns why it could not. Without a key the app still runs on preview
/// plans, so the design can be reviewed before a RevenueDot project exists.
Future<String?> configureRevenueDot() async {
  final storeKey = Platform.isIOS ? iosKey : androidKey;
  final apiKey = storeKey.isNotEmpty ? storeKey : testKey;
  if (apiKey.isEmpty) return 'No API key. Pass --dart-define=REVENUEDOT_API_KEY=test_... (see README).';
  await Purchases.setLogLevel(kDebugMode ? LogLevel.debug : LogLevel.info);
  // Point the SDK at your RevenueDot server; nothing else in the app changes. It must run before configure.
  // (Flutter web cannot use a proxy URL yet, so this example targets iOS and Android.)
  await Purchases.setProxyURL(serverUrl);
  // entitlementVerificationMode stays at the Flutter default (disabled): RevenueDot does not sign with RevenueCat's key.
  await Purchases.configure(PurchasesConfiguration(apiKey));
  return null;
}
