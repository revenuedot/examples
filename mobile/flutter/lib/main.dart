// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: entry point. Configures purchases_flutter against RevenueDot once, then starts the Focus app.
// Docs: https://revenuedot.app/docs/sdks/flutter   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'model.dart';
import 'revenuedot.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final setupError = await configureRevenueDot();
  final prefs = await SharedPreferences.getInstance();
  runApp(FocusApp(model: FocusModel(setupError: setupError), prefs: prefs));
}
