// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: debug builds only. --dart-define=RD_SCREEN=<name> opens one screen with sample answers, for screenshots
// and UI tests: welcome, goal, insight, reminders, building, plan, paywall, plans, home, settings.
// Docs: https://revenuedot.app/docs/sdks/flutter
import 'package:flutter/foundation.dart';

abstract final class DemoScreen {
  static const _name = String.fromEnvironment('RD_SCREEN');

  /// Null in release builds and when RD_SCREEN is not set.
  static String? get name => kDebugMode && _name.isNotEmpty ? _name : null;

  static const answers = {
    'goal': 'Deep work',
    'attention': '10 to 25 minutes',
    'obstacle': 'My phone',
    'best_time': 'Morning',
    'daily_minutes': '60',
    'source': 'A friend',
  };

  /// Index into the onboarding steps for each screen name.
  static const onboardingSteps = {'welcome': 0, 'goal': 1, 'insight': 4, 'reminders': 8, 'building': 9, 'plan': 10};
}
