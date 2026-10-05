// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the onboarding quiz before the paywall, in the shape that converts best in 2026: one question per
// screen with a progress bar, a "building your plan" moment, then a plan summary. The answers are saved as
// RevenueDot customer attributes, so audiences, targeting rules and experiments can use them.
// Docs: https://revenuedot.app/docs/guides/targeting-and-experiments
import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' show PathMetric;

import 'package:flutter/cupertino.dart' show CupertinoIcons;
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import 'demo_screen.dart';
import 'theme.dart';

/// The user's answers, keyed by question id.
typedef Answers = Map<String, String>;

extension AnswerValues on Answers {
  String get goal => this['goal'] ?? 'Deep work';
  int get minutes => int.tryParse(this['daily_minutes'] ?? '') ?? 30;
  String get bestTime => this['best_time'] ?? 'Morning';
}

class _Option {
  const _Option(this.value, {this.detail, this.icon});
  final String value;
  final String? detail;
  final IconData? icon;
}

class _Question {
  const _Question(this.id, this.title, this.subtitle, this.options);
  final String id;
  final String title;
  final String subtitle;
  final List<_Option> options;
}

const _questions = [
  _Question('goal', 'What do you want to focus on?', "We'll shape every session around it.", [
    _Option('Deep work', detail: 'Long, uninterrupted blocks', icon: CupertinoIcons.device_laptop),
    _Option('Study', detail: 'Exams, courses, languages', icon: CupertinoIcons.book),
    _Option('Creative projects', detail: 'Writing, design, music', icon: CupertinoIcons.paintbrush),
    _Option('Reading', detail: 'Finish more books', icon: CupertinoIcons.doc_text),
  ]),
  _Question('attention', 'How long can you focus before you get distracted?', "Be honest. There's no wrong answer.", [
    _Option('Under 10 minutes'),
    _Option('10 to 25 minutes'),
    _Option('25 to 45 minutes'),
    _Option('Over 45 minutes'),
  ]),
  _Question('obstacle', 'What breaks your focus most?', "We'll guard against it first.", [
    _Option('My phone', icon: CupertinoIcons.device_phone_portrait),
    _Option('Notifications', icon: CupertinoIcons.bell),
    _Option('Putting it off', icon: CupertinoIcons.hourglass),
    _Option('Noise around me', icon: CupertinoIcons.speaker_2),
  ]),
  _Question('best_time', 'When do you feel sharpest?', 'Your sessions will start then.', [
    _Option('Morning', icon: CupertinoIcons.sunrise),
    _Option('Afternoon', icon: CupertinoIcons.sun_max),
    _Option('Evening', icon: CupertinoIcons.sunset),
    _Option('Late night', icon: CupertinoIcons.moon),
  ]),
  _Question('daily_minutes', 'How much time can you give it a day?', 'Small and steady beats big and rare.', [
    _Option('15', detail: 'Easy start'),
    _Option('30', detail: 'Most popular'),
    _Option('60', detail: 'Serious'),
    _Option('90', detail: 'All in'),
  ]),
  _Question('source', 'How did you hear about us?', 'It helps us reach people like you.', [
    _Option('App Store'),
    _Option('A friend'),
    _Option('TikTok'),
    _Option('Instagram'),
    _Option('YouTube'),
    _Option('Somewhere else'),
  ]),
];

enum _Kind { welcome, question, insight, reminders, building, plan }

class _Step {
  const _Step(this.kind, [this.question = 0]);
  final _Kind kind;
  final int question;
}

const _steps = [
  _Step(_Kind.welcome),
  _Step(_Kind.question, 0),
  _Step(_Kind.question, 1),
  _Step(_Kind.question, 2),
  _Step(_Kind.insight),
  _Step(_Kind.question, 3),
  _Step(_Kind.question, 4),
  _Step(_Kind.question, 5),
  _Step(_Kind.reminders),
  _Step(_Kind.building),
  _Step(_Kind.plan),
];

class OnboardingFlow extends StatefulWidget {
  const OnboardingFlow({super.key, required this.onFinish});

  final void Function(Answers answers) onFinish;

  @override
  State<OnboardingFlow> createState() => _OnboardingFlowState();
}

class _OnboardingFlowState extends State<OnboardingFlow> {
  int _index = DemoScreen.onboardingSteps[DemoScreen.name] ?? 0;
  final Answers _answers = DemoScreen.name == null ? {} : {...DemoScreen.answers};
  bool _forward = true;

  /// The bar covers the quiz itself, not the welcome or the final two screens.
  bool get _showsBar => _index > 0 && _index < _steps.length - 2;

  void _move(int by) => setState(() {
        _forward = by > 0;
        _index = (_index + by).clamp(0, _steps.length - 1);
      });

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return ColoredBox(
      color: c.ground,
      child: SafeArea(
        child: Column(children: [
          AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOutCubic,
            child: _showsBar
                ? Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Row(children: [
                      BackChevron(onTap: () => _move(-1)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Semantics(
                          label: 'Step $_index of ${_steps.length - 3}',
                          child: StepBar(value: _index / (_steps.length - 3)),
                        ),
                      ),
                      const SizedBox(width: 56),
                    ]),
                  )
                : const SizedBox(width: double.infinity),
          ),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 320),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              transitionBuilder: (child, animation) {
                final incoming = child.key == ValueKey(_index);
                final from = Offset((incoming == _forward) ? 0.3 : -0.3, 0);
                return FadeTransition(
                  opacity: animation,
                  child:
                      SlideTransition(position: Tween(begin: from, end: Offset.zero).animate(animation), child: child),
                );
              },
              child: KeyedSubtree(key: ValueKey(_index), child: _content()),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _content() {
    final step = _steps[_index];
    void next() => _move(1);
    switch (step.kind) {
      case _Kind.welcome:
        return _Welcome(next: next);
      case _Kind.question:
        final q = _questions[step.question];
        return _QuestionStep(
          question: q,
          answer: _answers[q.id],
          onAnswer: (v) => setState(() => _answers[q.id] = v),
          next: next,
        );
      case _Kind.insight:
        return _Insight(goal: _answers.goal, next: next);
      case _Kind.reminders:
        return _Reminders(time: _answers.bestTime, next: next);
      case _Kind.building:
        return _BuildingPlan(answers: _answers, done: next);
      case _Kind.plan:
        return _PlanSummary(answers: _answers, next: () => widget.onFinish({..._answers}));
    }
  }
}

/// Every quiz screen: big title, short subtitle, content, and a Continue button pinned to the bottom.
class _Screen extends StatelessWidget {
  const _Screen(
      {required this.title,
      this.subtitle,
      this.cta = 'Continue',
      this.canContinue = true,
      required this.next,
      required this.child});

  final String title;
  final String? subtitle;
  final String cta;
  final bool canContinue;
  final VoidCallback next;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(gutter, 0, gutter, 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 20),
        Text(title, style: display(30, tracking: -0.6).copyWith(color: c.ink)),
        if (subtitle != null) ...[
          const SizedBox(height: 8),
          Text(subtitle!, style: txt(17, color: c.ink2)),
        ],
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: child,
          ),
        ),
        PrimaryButton(title: cta, enabled: canContinue, onPressed: next),
      ]),
    );
  }
}

class _Welcome extends StatelessWidget {
  const _Welcome({required this.next});

  final VoidCallback next;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(gutter, 12, gutter, 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const BrandMark(size: 28),
          const SizedBox(width: 10),
          Text('Focus', style: txt(17, fontWeight: FontWeight.w600, color: c.ink)),
        ]),
        const Spacer(),
        Center(
          child: FocusRing(
            progress: 41 / 60,
            lineWidth: 14,
            size: 196,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text('41',
                  style: txt(52, fontWeight: FontWeight.w700, color: c.ink, height: 1.05, fontFeatures: tabular)),
              const SizedBox(height: 2),
              Text('of 60 min', style: txt(13, color: c.ink2)),
            ]),
          ),
        ),
        const Spacer(),
        Text('Do your best work, every day.', style: display(40, tracking: -1.2).copyWith(color: c.ink)),
        const SizedBox(height: 12),
        Text('Focus sessions built around your goal. Setup takes a minute.', style: txt(18, color: c.ink2)),
        const SizedBox(height: 32),
        PrimaryButton(title: 'Get started', onPressed: next),
        const SizedBox(height: 14),
        Center(child: Text('A RevenueDot sample app', style: txt(13, color: c.ink3))),
      ]),
    );
  }
}

class _QuestionStep extends StatelessWidget {
  const _QuestionStep({required this.question, required this.answer, required this.onAnswer, required this.next});

  final _Question question;
  final String? answer;
  final ValueChanged<String> onAnswer;
  final VoidCallback next;

  String _label(String v) {
    final m = int.tryParse(v);
    if (question.id != 'daily_minutes' || m == null) return v;
    return m == 60
        ? '1 hour'
        : m == 90
            ? '1.5 hours'
            : '$m minutes';
  }

  @override
  Widget build(BuildContext context) {
    return _Screen(
      title: question.title,
      subtitle: question.subtitle,
      canContinue: answer != null,
      next: next,
      child: Column(children: [
        for (final o in question.options)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: OptionRow(
              title: _label(o.value),
              subtitle: o.detail,
              icon: o.icon,
              selected: answer == o.value,
              onTap: () => onAnswer(o.value),
            ),
          ),
      ]),
    );
  }
}

/// A screen between questions that shows why the method works. The curves are an illustration, not data.
class _Insight extends StatefulWidget {
  const _Insight({required this.goal, required this.next});

  final String goal;
  final VoidCallback next;

  @override
  State<_Insight> createState() => _InsightState();
}

class _InsightState extends State<_Insight> with SingleTickerProviderStateMixin {
  late final _draw = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 200), () {
      if (mounted) _draw.forward();
    });
  }

  @override
  void dispose() {
    _draw.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return _Screen(
      title: 'A plan beats willpower.',
      subtitle: 'Short daily sessions compound. Willpower fades by week two.',
      next: widget.next,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          height: 240,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: c.fill, borderRadius: BorderRadius.circular(radius)),
          child: AnimatedBuilder(
            animation: CurvedAnimation(parent: _draw, curve: Curves.easeInOut),
            builder: (context, _) => CustomPaint(
              size: Size.infinite,
              painter: _CurvesPainter(Curves.easeInOut.transform(_draw.value), c),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Wrap(spacing: 20, runSpacing: 8, children: [
          _Legend(color: c.ink, text: 'With a daily plan'),
          _Legend(color: c.ink3, text: 'On willpower', dashed: true),
        ]),
        const SizedBox(height: 16),
        Text(
          'Illustration. Your Focus plan for ${widget.goal.toLowerCase()} keeps sessions short enough to start every day.',
          style: txt(13, color: c.ink3),
        ),
      ]),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.text, this.dashed = false});

  final Color color;
  final String text;
  final bool dashed;

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Opacity(
          opacity: dashed ? 0.7 : 1,
          child: Container(
              width: 18, height: 3, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
        ),
        const SizedBox(width: 8),
        Text(text, style: txt(14, fontWeight: FontWeight.w500, color: FocusColors.of(context).ink2)),
      ]);
}

class _CurvesPainter extends CustomPainter {
  _CurvesPainter(this.t, this.c);

  final double t;
  final FocusColors c;

  static const _plan = [0.18, 0.28, 0.40, 0.52, 0.66, 0.78, 0.92];
  static const _willpower = [0.18, 0.22, 0.20, 0.17, 0.15, 0.12, 0.10];

  Path _curve(List<double> ys, Size s) {
    final pts = [for (var i = 0; i < ys.length; i++) Offset(s.width * i / (ys.length - 1), s.height * (1 - ys[i]))];
    final p = Path()..moveTo(pts[0].dx, pts[0].dy);
    for (var i = 1; i < pts.length; i++) {
      final a = pts[i - 1], b = pts[i], mid = (a.dx + b.dx) / 2;
      p.cubicTo(mid, a.dy, mid, b.dy, b.dx, b.dy);
    }
    return p;
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (t <= 0) return;
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // Willpower: dashed, drawn up to t.
    final will = _curve(_willpower, size).computeMetrics().first;
    final dashPaint = stroke
      ..color = c.ink3
      ..strokeWidth = 2.5;
    for (double d = 0; d < will.length * t; d += 10) {
      canvas.drawPath(will.extractPath(d, math.min(d + 4, will.length * t)), dashPaint);
    }

    final PathMetric plan = _curve(_plan, size).computeMetrics().first;
    canvas.drawPath(
      plan.extractPath(0, plan.length * t),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 3.5
        ..color = c.ink,
    );
    if (t >= 1) {
      canvas.drawCircle(Offset(size.width, size.height * (1 - _plan.last)), 7, Paint()..color = FocusColors.accent);
    }
  }

  @override
  bool shouldRepaint(_CurvesPainter old) => old.t != t || old.c != c;
}

/// Asks for notification permission with context first; the system prompt only appears after "Turn on reminders".
class _Reminders extends StatelessWidget {
  const _Reminders({required this.time, required this.next});

  final String time;
  final VoidCallback next;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(gutter, 0, gutter, 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Spacer(),
        SizedBox(
          width: 92,
          height: 92,
          child: Stack(clipBehavior: Clip.none, children: [
            Container(
              width: 88,
              height: 88,
              margin: const EdgeInsets.only(top: 4),
              decoration: BoxDecoration(color: c.fill, borderRadius: BorderRadius.circular(24)),
              child: Icon(CupertinoIcons.bell, size: 44, color: c.ink),
            ),
            Positioned(
              right: 0,
              top: 0,
              child: Container(
                  width: 16,
                  height: 16,
                  decoration: const BoxDecoration(color: FocusColors.accent, shape: BoxShape.circle)),
            ),
          ]),
        ),
        const SizedBox(height: 28),
        Text('Get a nudge when you\'re\u00a0sharpest.', style: display(30, tracking: -0.6).copyWith(color: c.ink)),
        const SizedBox(height: 10),
        Text(
          'One quiet reminder each ${time.toLowerCase()}. People who turn reminders on keep their streak far longer.',
          style: txt(17, color: c.ink2),
        ),
        const Spacer(),
        PrimaryButton(
          title: 'Turn on reminders',
          onPressed: () async {
            await Permission.notification.request();
            next();
          },
        ),
        const SizedBox(height: 6),
        Center(child: QuietButton(title: 'Not now', onPressed: next)),
      ]),
    );
  }
}

/// "Building your plan": a percentage that counts up while three checks tick in at 30, 60 and 90.
class _BuildingPlan extends StatefulWidget {
  const _BuildingPlan({required this.answers, required this.done});

  final Answers answers;
  final VoidCallback done;

  @override
  State<_BuildingPlan> createState() => _BuildingPlanState();
}

class _BuildingPlanState extends State<_BuildingPlan> {
  int _percent = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 28), (t) {
      setState(() => _percent++);
      if (_percent % 30 == 0) Haptic.select();
      if (_percent >= 100) {
        t.cancel();
        Haptic.success();
        _timer = Timer(const Duration(milliseconds: 450), () {
          if (mounted) widget.done();
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    final a = widget.answers;
    final lines = [
      'Matching sessions to ${a.goal.toLowerCase()}',
      'Guarding against ${(a['obstacle'] ?? 'distractions').toLowerCase()}',
      'Scheduling ${a.minutes} minutes each ${a.bestTime.toLowerCase()}',
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: gutter),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Spacer(flex: 2),
        Text('$_percent%',
            style: txt(72,
                fontWeight: FontWeight.w700, letterSpacing: -2, height: 1.05, color: c.ink, fontFeatures: tabular)),
        const SizedBox(height: 4),
        Text('Building your plan', style: txt(22, fontWeight: FontWeight.w600, color: c.ink)),
        const SizedBox(height: 20),
        StepBar(value: _percent / 100, height: 6),
        const SizedBox(height: 32),
        for (var i = 0; i < lines.length; i++) ...[
          if (i > 0) const SizedBox(height: 18),
          _Check(text: lines[i], done: _percent >= (i + 1) * 30, active: _percent >= i * 30),
        ],
        const Spacer(flex: 3),
      ]),
    );
  }
}

class _Check extends StatelessWidget {
  const _Check({required this.text, required this.done, required this.active});

  final String text;
  final bool done;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Row(children: [
      AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: done ? c.ink : null,
          border: done ? null : Border.all(color: c.hairline, width: 1.5),
        ),
        child: done ? Icon(Icons.check_rounded, size: 15, color: c.ground) : null,
      ),
      const SizedBox(width: 12),
      Expanded(
        child: AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 200),
          style: txt(17, color: active ? c.ink : c.ink3),
          child: Text(text),
        ),
      ),
    ]);
  }
}

/// The plan, right before the paywall: what the user gets, in their own words.
class _PlanSummary extends StatelessWidget {
  const _PlanSummary({required this.answers, required this.next});

  final Answers answers;
  final VoidCallback next;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    final sessions = math.max(1, answers.minutes ~/ 25);
    return _Screen(
      title: 'Your plan is ready.',
      subtitle: 'Built for ${answers.goal.toLowerCase()}, around your day.',
      cta: 'Start my plan',
      next: next,
      child: Column(children: [
        Row(children: [
          Expanded(child: _Tile(value: '${answers.minutes}', unit: 'min', label: 'Every day')),
          const SizedBox(width: 12),
          Expanded(
              child: _Tile(value: '$sessions', unit: sessions > 1 ? 'sessions' : 'session', label: 'Of 25 minutes')),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _Tile(value: answers.bestTime, label: 'Start time')),
          const SizedBox(width: 12),
          const Expanded(child: _Tile(value: '14', unit: 'days', label: 'To a habit')),
        ]),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: cardDecoration(c),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 8,
              height: 8,
              margin: const EdgeInsets.only(top: 7),
              decoration: const BoxDecoration(color: FocusColors.accent, shape: BoxShape.circle),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Week one keeps sessions short so you start every day. From week two they grow as your focus does.',
                style: txt(15, color: c.ink2),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.value, this.unit, required this.label});

  final String value;
  final String? unit;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: c.fill, borderRadius: BorderRadius.circular(radius)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: txt(13, color: c.ink2)),
        const SizedBox(height: 6),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
            Text(value, style: txt(30, fontWeight: FontWeight.w700, letterSpacing: -0.6, color: c.ink)),
            if (unit != null) ...[
              const SizedBox(width: 4),
              Text(unit!, style: txt(15, fontWeight: FontWeight.w500, color: c.ink2)),
            ],
          ]),
        ),
      ]),
    );
  }
}
