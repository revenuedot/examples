// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: walks the whole Focus flow on an iPhone-sized screen without the SDK (preview plans): onboarding quiz,
// building the plan, the two paywall pages, the exit offer, home and the account sheet. Overflows fail the test.
// Docs: https://revenuedot.app/docs/sdks/flutter
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:revenuedot_focus/app.dart';
import 'package:revenuedot_focus/model.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('onboarding, paywall, exit offer, home and account', (tester) async {
    tester.view.physicalSize = const Size(402, 874) * 3;
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final model = FocusModel(setupError: 'No API key.');

    await tester.pumpWidget(FocusApp(model: model, prefs: prefs));
    expect(find.text('Do your best work, every day.'), findsOneWidget);

    Future<void> tap(String text) async {
      await tester.tap(find.text(text).last);
      await tester.pumpAndSettle();
    }

    await tap('Get started');
    // Continue stays disabled until an answer is chosen.
    await tap('Continue');
    expect(find.text('What do you want to focus on?'), findsOneWidget);

    for (final answer in ['Deep work', '10 to 25 minutes', 'My phone']) {
      await tap(answer);
      await tap('Continue');
    }
    expect(find.text('A plan beats willpower.'), findsOneWidget);
    await tap('Continue');
    for (final answer in ['Morning', '1 hour', 'A friend']) {
      await tap(answer);
      await tap('Continue');
    }
    expect(find.textContaining('Get a nudge when'), findsOneWidget);
    await tap('Not now');

    expect(find.text('Building your plan'), findsOneWidget);
    expect(find.text('Scheduling 60 minutes each morning'), findsOneWidget);
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();

    expect(find.text('Your plan is ready.'), findsOneWidget);
    expect(prefs.getString('answers'), isNull);
    await tap('Start my plan');
    expect(prefs.getString('answers'), contains('"daily_minutes":"60"'));

    expect(find.text('Your plan for deep work is ready. Unlock it.'), findsOneWidget);
    await tap('Continue');
    expect(find.text('How your free trial works'), findsOneWidget);
    expect(find.text(r'$59.99/year'), findsOneWidget);
    expect(find.text('SAVE 77%'), findsOneWidget);
    expect(find.text('Start my free week'), findsOneWidget);
    expect(find.text('No commitment, cancel anytime'), findsOneWidget);
    expect(find.text(r'7 days free, then $59.99/year. Auto-renews. Cancel anytime in Settings.'), findsOneWidget);

    // Preview plans cannot be bought.
    await tap('Start my free week');
    expect(find.textContaining("Preview plans can't be bought"), findsOneWidget);

    // First close offers the weekly plan; "No thanks" leaves to home.
    await tester.tap(find.bySemanticsLabel('Close'));
    await tester.pumpAndSettle();
    expect(find.text('Not ready for a year?'), findsOneWidget);
    await tap('No thanks');

    expect(find.text('Today'), findsOneWidget);
    expect(find.text('60 minutes to go'), findsOneWidget);
    expect(find.text('Unlock your full plan'), findsOneWidget);
    expect(prefs.getBool('onboarded'), isTrue);

    await tester.tap(find.bySemanticsLabel('Account and settings'));
    await tester.pumpAndSettle();
    expect(find.text('Free plan'), findsOneWidget);
    await tap('DEVELOPER');
    expect(find.text('No API key.'), findsOneWidget);
    expect(find.text('Current offering'), findsOneWidget);
  });
}
