// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: home and the running session. Today's ring, the week, and sessions; the Pro ones open the paywall
// until the `pro` entitlement is active. The rating request comes after a finished session, never in onboarding.
// Docs: https://revenuedot.app/docs/sdks/flutter
import 'dart:async';

import 'package:flutter/cupertino.dart' show CupertinoIcons;
import 'package:flutter/material.dart';
import 'package:in_app_review/in_app_review.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'demo_screen.dart';
import 'model.dart';
import 'onboarding.dart' show Answers, AnswerValues;
import 'paywall.dart';
import 'settings.dart';
import 'theme.dart';

/// Minutes focused per day, kept on the device.
class FocusLog {
  FocusLog(this._prefs);

  final SharedPreferences _prefs;

  static String key(DateTime d) => 'focus_${d.year}-${d.month}-${d.day}';
  int minutes(DateTime d) => _prefs.getInt(key(d)) ?? 0;
  Future<void> add(int m) => _prefs.setInt(key(DateTime.now()), minutes(DateTime.now()) + m);

  int get finishedSessions => _prefs.getInt('finished_sessions') ?? 0;
  Future<void> countSession() => _prefs.setInt('finished_sessions', finishedSessions + 1);
}

class Session {
  const Session(this.title, this.minutes, this.detail, {this.pro = false});
  final String title;
  final int minutes;
  final String detail;
  final bool pro;
}

const sessions = [
  Session('Classic', 25, 'The one that works'),
  Session('Deep', 50, 'For hard problems', pro: true),
  Session('Flow', 90, 'A full block, no breaks', pro: true),
];

/// Full-screen routes slide up, like iOS's fullScreenCover.
Route<T> coverRoute<T>(Widget child) => PageRouteBuilder<T>(
      transitionDuration: const Duration(milliseconds: 380),
      reverseTransitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (_, __, ___) => child,
      transitionsBuilder: (_, a, __, child) => SlideTransition(
        position: Tween(begin: const Offset(0, 1), end: Offset.zero)
            .animate(CurvedAnimation(parent: a, curve: Curves.easeOutCubic, reverseCurve: Curves.easeInCubic)),
        child: child,
      ),
    );

class Home extends StatefulWidget {
  const Home(
      {super.key, required this.model, required this.answers, required this.prefs, required this.restartOnboarding});

  final FocusModel model;
  final Answers answers;
  final SharedPreferences prefs;
  final VoidCallback restartOnboarding;

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  late final _log = FocusLog(widget.prefs);

  FocusModel get model => widget.model;
  int get _goal => widget.answers.minutes;

  @override
  void initState() {
    super.initState();
    if (DemoScreen.name == 'settings') WidgetsBinding.instance.addPostFrameCallback((_) => _openSettings());
  }

  void _openPaywall() => Navigator.of(context).push(coverRoute<void>(Paywall(
        model: model,
        answers: widget.answers,
        onClose: () => Navigator.of(context).pop(),
      )));

  Future<void> _start(Session s) async {
    final done = await Navigator.of(context).push<bool>(coverRoute(SessionScreen(session: s, log: _log)));
    if (done == true) {
      await _log.add(s.minutes);
      setState(() {});
    }
  }

  void _openSettings() => showAccountSheet(
        context,
        model: model,
        upgrade: () {
          Navigator.of(context).pop();
          _openPaywall();
        },
        restartOnboarding: () {
          Navigator.of(context).pop();
          widget.restartOnboarding();
        },
      );

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return ListenableBuilder(
      listenable: model,
      builder: (context, _) => Scaffold(
        backgroundColor: c.ground,
        body: SafeArea(
          bottom: false,
          child: Stack(children: [
            SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(gutter, 8, gutter, 120),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _header(c),
                const SizedBox(height: 28),
                _ring(c),
                const SizedBox(height: 28),
                _week(c),
                const SizedBox(height: 36),
                const Eyebrow('Sessions'),
                const SizedBox(height: 12),
                for (final s in sessions)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _SessionRow(
                      session: s,
                      locked: s.pro && !model.isPro,
                      onTap: () => s.pro && !model.isPro ? _openPaywall() : _start(s),
                    ),
                  ),
                if (!model.isPro) ...[const SizedBox(height: 12), _upgradeCard(c)],
              ]),
            ),
            Positioned(left: 0, right: 0, bottom: 0, child: _pinnedButton(c)),
          ]),
        ),
      ),
    );
  }

  Widget _pinnedButton(FocusColors c) {
    return Column(mainAxisSize: MainAxisSize.min, children: [
      // A short fade so content scrolls under the button instead of being cut off by an edge.
      Container(
        height: 24,
        decoration: BoxDecoration(
          gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [c.ground.withValues(alpha: 0), c.ground]),
        ),
      ),
      ColoredBox(
        color: c.ground,
        child: SafeArea(
          top: false,
          minimum: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(gutter, 0, gutter, 4),
            child: PrimaryButton(title: 'Start a 25-minute session', onPressed: () => _start(sessions[0])),
          ),
        ),
      ),
    ]);
  }

  Widget _header(FocusColors c) {
    return Row(children: [
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_formatToday(DateTime.now()), style: txt(14, fontWeight: FontWeight.w500, color: c.ink2)),
          const SizedBox(height: 2),
          Text('Today', style: display(34, tracking: -0.8).copyWith(color: c.ink)),
        ]),
      ),
      if (model.isPro) ...[
        Container(
          height: 30,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: ShapeDecoration(shape: StadiumBorder(side: BorderSide(color: c.hairline))),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Container(
                width: 7,
                height: 7,
                decoration: const BoxDecoration(color: FocusColors.accent, shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Text('Pro', style: txt(13, fontWeight: FontWeight.w600, color: c.ink)),
          ]),
        ),
        const SizedBox(width: 8),
      ],
      Pressable(
        semanticLabel: 'Account and settings',
        onTap: () {
          Haptic.tap();
          _openSettings();
        },
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(color: c.fill, shape: BoxShape.circle),
          child: Icon(CupertinoIcons.person, size: 20, color: c.ink),
        ),
      ),
    ]);
  }

  Widget _ring(FocusColors c) {
    final today = _log.minutes(DateTime.now());
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: cardDecoration(c, r: radius + 4),
      child: Row(children: [
        FocusRing(
          progress: today / (_goal < 1 ? 1 : _goal),
          size: 128,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('$today',
                style: txt(34, fontWeight: FontWeight.w700, color: c.ink, height: 1.1, fontFeatures: tabular)),
            Text('of $_goal min', style: txt(12, color: c.ink2)),
          ]),
        ),
        const SizedBox(width: 24),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(today >= _goal ? 'Goal reached.' : '${_goal - today} minutes to go',
                style: txt(20, fontWeight: FontWeight.w600, color: c.ink)),
            const SizedBox(height: 6),
            Text('Your plan: ${widget.answers.goal.toLowerCase()}, each ${widget.answers.bestTime.toLowerCase()}.',
                style: txt(15, color: c.ink2)),
          ]),
        ),
      ]),
    );
  }

  Widget _week(FocusColors c) {
    final l = MaterialLocalizations.of(context);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    // The week starts on the locale's first day (Sunday in the US, Monday in most of Europe).
    final start = today.subtract(Duration(days: (today.weekday % 7 - l.firstDayOfWeekIndex) % 7));
    return Row(children: [
      for (var i = 0; i < 7; i++)
        Builder(builder: (context) {
          final d = DateTime(start.year, start.month, start.day + i);
          final isToday = d == today;
          final met = _log.minutes(d) >= _goal;
          return Expanded(
            child: Column(children: [
              Text(l.narrowWeekdays[d.weekday % 7],
                  style: txt(12, fontWeight: FontWeight.w500, color: isToday ? c.ink : c.ink3)),
              const SizedBox(height: 8),
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: met ? c.ink : null,
                  border: met ? null : Border.all(color: isToday ? c.ink : c.hairline, width: isToday ? 1.5 : 1),
                ),
                alignment: Alignment.center,
                child: met
                    ? Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(color: FocusColors.accent, shape: BoxShape.circle))
                    : null,
              ),
            ]),
          );
        }),
    ]);
  }

  Widget _upgradeCard(FocusColors c) {
    return Pressable(
      semanticLabel: 'Unlock your full plan',
      onTap: () {
        Haptic.tap();
        _openPaywall();
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: c.fill, borderRadius: BorderRadius.circular(radius)),
        child: Row(children: [
          const BrandMark(size: 40),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Unlock your full plan', style: txt(16, fontWeight: FontWeight.w600, color: c.ink)),
              const SizedBox(height: 2),
              Text('Deep and Flow sessions, reports, the shield', style: txt(14, color: c.ink2)),
            ]),
          ),
          Icon(CupertinoIcons.chevron_right, size: 15, color: c.ink3),
        ]),
      ),
    );
  }
}

const _weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

String _formatToday(DateTime d) => '${_weekdays[d.weekday - 1]}, ${_months[d.month - 1]} ${d.day}';

/// "Sep 30, 2026", for renewal dates.
String formatDate(DateTime d) => '${_months[d.month - 1]} ${d.day}, ${d.year}';

class _SessionRow extends StatelessWidget {
  const _SessionRow({required this.session, required this.locked, required this.onTap});

  final Session session;
  final bool locked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Pressable(
      semanticLabel: '${session.title}, ${session.minutes} minutes${locked ? ', Pro' : ''}',
      onTap: () {
        Haptic.tap();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: cardDecoration(c),
        child: Row(children: [
          Container(
            width: 48,
            height: 48,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: c.fill, borderRadius: BorderRadius.circular(12)),
            child: Text('${session.minutes}',
                style: txt(20, fontWeight: FontWeight.w700, color: c.ink, fontFeatures: tabular)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(session.title, style: txt(17, fontWeight: FontWeight.w600, color: c.ink)),
              const SizedBox(height: 2),
              Text(session.detail, style: txt(14, color: c.ink2)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 4),
            child: Icon(locked ? CupertinoIcons.lock_fill : CupertinoIcons.play_fill,
                size: 17, color: locked ? c.ink3 : c.ink),
          ),
        ]),
      ),
    );
  }
}

/// A running session: a big countdown in the ring. "Finish session" credits the minutes so the sample is quick to
/// try. The first finished session asks for a store rating (never during onboarding).
class SessionScreen extends StatefulWidget {
  const SessionScreen({super.key, required this.session, required this.log});

  final Session session;
  final FocusLog log;

  @override
  State<SessionScreen> createState() => _SessionScreenState();
}

class _SessionScreenState extends State<SessionScreen> {
  late int _left = widget.session.minutes * 60;
  late final Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_left <= 0) return t.cancel();
      setState(() => _left--);
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  Future<void> _finish() async {
    Haptic.success();
    await widget.log.countSession();
    if (widget.log.finishedSessions == 1 && await InAppReview.instance.isAvailable()) {
      await InAppReview.instance.requestReview();
    }
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    final total = widget.session.minutes * 60;
    String two(int n) => n.toString().padLeft(2, '0');
    return Scaffold(
      backgroundColor: c.ground,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(gutter, 8, gutter, 12),
          child: Column(children: [
            Row(children: [
              Text(widget.session.title, style: txt(15, fontWeight: FontWeight.w600, color: c.ink2)),
              const Spacer(),
              Pressable(
                semanticLabel: 'End',
                onTap: () {
                  Haptic.tap();
                  Navigator.of(context).pop(false);
                },
                child: SizedBox(
                  height: 44,
                  child: Center(
                    widthFactor: 1,
                    child: Text('End', style: txt(15, fontWeight: FontWeight.w500, color: c.ink2)),
                  ),
                ),
              ),
            ]),
            const Spacer(),
            FocusRing(
              progress: 1 - _left / total,
              lineWidth: 10,
              size: 260,
              child: Text('${two(_left ~/ 60)}:${two(_left % 60)}',
                  style: mono(56, weight: FontWeight.w600).copyWith(color: c.ink, letterSpacing: -1)),
            ),
            const SizedBox(height: 32),
            Text("Phone down. You've got this.", style: txt(17, color: c.ink2)),
            const Spacer(),
            PrimaryButton(title: 'Finish session', onPressed: _finish),
          ]),
        ),
      ),
    );
  }
}
