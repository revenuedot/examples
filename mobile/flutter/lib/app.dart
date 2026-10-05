// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the app's flow. First launch: onboarding, then the paywall, then home. Later launches open home.
// Light and dark follow the system.
// Docs: https://revenuedot.app/docs/sdks/flutter
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'demo_screen.dart';
import 'home.dart';
import 'model.dart';
import 'onboarding.dart';
import 'paywall.dart';
import 'theme.dart';

class FocusApp extends StatelessWidget {
  const FocusApp({super.key, required this.model, required this.prefs});

  final FocusModel model;
  final SharedPreferences prefs;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Focus',
      debugShowCheckedModeBanner: false,
      theme: focusTheme(Brightness.light),
      darkTheme: focusTheme(Brightness.dark),
      themeMode: ThemeMode.system,
      home: _Root(model: model, prefs: prefs),
    );
  }
}

enum _Stage { onboarding, paywall, home }

class _Root extends StatefulWidget {
  const _Root({required this.model, required this.prefs});

  final FocusModel model;
  final SharedPreferences prefs;

  @override
  State<_Root> createState() => _RootState();
}

class _RootState extends State<_Root> {
  late _Stage _stage = _initialStage();
  late Answers _answers = _loadAnswers();

  _Stage _initialStage() => switch (DemoScreen.name) {
        'home' || 'settings' => _Stage.home,
        'paywall' || 'plans' => _Stage.paywall,
        null => widget.prefs.getBool('onboarded') == true ? _Stage.home : _Stage.onboarding,
        _ => _Stage.onboarding,
      };

  Answers _loadAnswers() {
    if (DemoScreen.name != null) return {...DemoScreen.answers};
    final raw = widget.prefs.getString('answers');
    return raw == null ? {} : Map<String, String>.from(jsonDecode(raw) as Map);
  }

  @override
  void initState() {
    super.initState();
    widget.model.load();
  }

  void _finishQuiz(Answers answers) {
    _answers = answers;
    widget.prefs.setString('answers', jsonEncode(answers));
    widget.model.saveAnswers(answers);
    setState(() => _stage = _Stage.paywall);
  }

  void _finishPaywall() {
    widget.prefs.setBool('onboarded', true);
    setState(() => _stage = _Stage.home);
  }

  void _restart() {
    widget.prefs.setBool('onboarded', false);
    setState(() => _stage = _Stage.onboarding);
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value:
          (dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark).copyWith(statusBarColor: Colors.transparent),
      child: Material(
        color: FocusColors.of(context).ground,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: switch (_stage) {
            _Stage.onboarding => OnboardingFlow(key: const ValueKey('onboarding'), onFinish: _finishQuiz),
            _Stage.paywall =>
              Paywall(key: const ValueKey('paywall'), model: widget.model, answers: _answers, onClose: _finishPaywall),
            _Stage.home => Home(
                key: const ValueKey('home'),
                model: widget.model,
                answers: _answers,
                prefs: widget.prefs,
                restartOnboarding: _restart,
              ),
          },
        ),
      ),
    );
  }
}
