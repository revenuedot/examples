// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the paywall, built from the current offering with the 2026 patterns that convert best: page 1 sells the
// value in the user's own words; page 2 shows how the free trial works, the plans with annual pre-selected, and the
// disclosure Apple requires. Closing it offers the shortest plan once before leaving.
// Docs: https://revenuedot.app/docs/guides/paywalls
import 'package:flutter/cupertino.dart' show CupertinoIcons;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'demo_screen.dart';
import 'model.dart';
import 'onboarding.dart' show Answers, AnswerValues;
import 'plans.dart';
import 'revenuedot.dart';
import 'theme.dart';

/// One real App Store review shown on page 1. Leave null until your app has one; never invent reviews.
const ({String text, String author})? review = null;

class Paywall extends StatefulWidget {
  const Paywall({super.key, required this.model, required this.answers, required this.onClose});

  final FocusModel model;
  final Answers answers;
  final VoidCallback onClose;

  @override
  State<Paywall> createState() => _PaywallState();
}

class _PaywallState extends State<Paywall> {
  int _page = DemoScreen.name == 'plans' ? 1 : 0;
  String? _selectedId;
  bool _offeredExit = false;

  FocusModel get model => widget.model;
  bool get _isPreview => model.plans.isEmpty;
  List<Plan> get _plans => _isPreview ? Plan.preview : model.plans;
  Plan? get _selected => _plans.where((p) => p.id == _selectedId).firstOrNull ?? _plans.firstOrNull;

  String get _cta {
    final d = _selected?.trialDays;
    if (d == null) return 'Continue';
    return d == 7 ? 'Start my free week' : 'Start my $d-day free trial';
  }

  String get _disclosure {
    final p = _selected;
    if (p == null) return '';
    final days = p.trialDays;
    if (days != null) return '$days days free, then ${p.price}. Auto-renews. Cancel anytime in Settings.';
    return '${p.price}. Auto-renews until you cancel in Settings.';
  }

  Future<void> _buy(Plan plan) async {
    final package = plan.package;
    if (package == null) {
      model.say("Preview plans can't be bought. Create an offering first.");
      return;
    }
    if (await model.purchase(package)) {
      Haptic.success();
      widget.onClose();
    }
  }

  /// Closing while the annual plan is selected offers the shortest plan once; the next close leaves.
  Future<void> _close() async {
    if (!_offeredExit && _plans.length > 1 && _selected?.id == _plans.first.id) {
      _offeredExit = true;
      final shortest = _plans.last;
      final buy = await showModalBottomSheet<bool>(
        context: context,
        useSafeArea: true,
        barrierColor: Colors.black.withValues(alpha: 0.2),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
        builder: (_) => _ExitOffer(plan: shortest),
      );
      if (buy == true) {
        setState(() => _selectedId = shortest.id);
        await _buy(shortest);
      } else if (buy == false) {
        widget.onClose();
      }
    } else {
      widget.onClose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return ListenableBuilder(
      listenable: model,
      builder: (context, _) => ColoredBox(
        color: c.ground,
        child: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(children: [
                Pressable(
                  semanticLabel: 'Close',
                  onTap: () {
                    Haptic.tap();
                    _close();
                  },
                  child: SizedBox.square(dimension: 44, child: Icon(CupertinoIcons.xmark, size: 20, color: c.ink3)),
                ),
                const Spacer(),
                Pressable(
                  semanticLabel: 'Restore',
                  onTap: () async {
                    Haptic.tap();
                    if (await model.restore()) widget.onClose();
                  },
                  child: SizedBox(
                    height: 44,
                    child: Center(
                      widthFactor: 1,
                      child: Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: Text('Restore', style: txt(15, fontWeight: FontWeight.w500, color: c.ink2)),
                      ),
                    ),
                  ),
                ),
              ]),
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 320),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                layoutBuilder: (current, previous) =>
                    Stack(alignment: Alignment.topCenter, children: [...previous, if (current != null) current]),
                transitionBuilder: (child, animation) {
                  final incoming = child.key == ValueKey(_page);
                  final from = Offset(incoming ? 0.3 : -0.3, 0);
                  return FadeTransition(
                    opacity: animation,
                    child: SlideTransition(
                        position: Tween(begin: from, end: Offset.zero).animate(animation), child: child),
                  );
                },
                child: _page == 0
                    ? _ValuePage(key: const ValueKey(0), answers: widget.answers)
                    : _PlansPage(
                        key: const ValueKey(1),
                        plans: _plans,
                        selected: _selected,
                        onSelect: (p) => setState(() => _selectedId = p.id),
                      ),
              ),
            ),
            _footer(c),
          ]),
        ),
      ),
    );
  }

  Widget _footer(FocusColors c) {
    final small = txt(12, color: c.ink3);
    return Padding(
      padding: const EdgeInsets.fromLTRB(gutter, 12, gutter, 8),
      child: Column(children: [
        PrimaryButton(
          title: _page == 0 ? 'Continue' : _cta,
          busy: model.busy,
          onPressed: () {
            if (_page == 0) {
              setState(() => _page = 1);
            } else if (_selected != null) {
              _buy(_selected!);
            }
          },
        ),
        if (_page == 1) ...[
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(CupertinoIcons.checkmark_alt, size: 16, color: c.ink2),
            const SizedBox(width: 6),
            Flexible(
              child: Text('No commitment, cancel anytime', style: txt(14, fontWeight: FontWeight.w500, color: c.ink2)),
            ),
          ]),
          const SizedBox(height: 10),
          Text(_disclosure, style: small, textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            _Link('Terms', termsUrl),
            const SizedBox(width: 16),
            _Link('Privacy', privacyUrl),
          ]),
          if (_isPreview)
            Text('Preview prices. Create an offering in your RevenueDot dashboard to sell real plans.',
                style: small, textAlign: TextAlign.center),
          if (model.message.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(model.message, style: txt(13, color: c.ink2), textAlign: TextAlign.center),
          ],
        ],
      ]),
    );
  }
}

class _Link extends StatelessWidget {
  const _Link(this.title, this.url);

  final String title;
  final String url;

  @override
  Widget build(BuildContext context) => Pressable(
        semanticLabel: title,
        onTap: () => launchUrl(Uri.parse(url), mode: LaunchMode.inAppBrowserView),
        child: SizedBox(
          height: 32,
          child: Center(
            widthFactor: 1,
            child: Text(title, style: txt(12, fontWeight: FontWeight.w500, color: FocusColors.of(context).ink2)),
          ),
        ),
      );
}

/// Page 1: the value, in the user's words. Short benefit lines, no comparison table.
class _ValuePage extends StatelessWidget {
  const _ValuePage({super.key, required this.answers});

  final Answers answers;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    final benefits = [
      (
        CupertinoIcons.scope,
        'Your ${answers.minutes}-minute daily plan',
        'Built for ${answers.goal.toLowerCase()}, adjusted every week'
      ),
      (CupertinoIcons.timer, 'Unlimited deep sessions', '25, 50 and 90 minutes, or your own length'),
      (
        CupertinoIcons.bell_slash,
        'Distraction shield',
        'Silences ${(answers['obstacle'] ?? 'notifications').toLowerCase()} while you focus'
      ),
      (CupertinoIcons.graph_square, 'Progress you can see', 'Streaks, weekly reports and focus trends'),
    ];
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(gutter, 8, gutter, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Eyebrow('Focus Pro'),
        const SizedBox(height: 10),
        Text('Your plan for ${answers.goal.toLowerCase()} is ready. Unlock it.',
            style: display(34, tracking: -0.9).copyWith(color: c.ink)),
        const SizedBox(height: 32),
        for (final (icon, title, detail) in benefits)
          Padding(
            padding: const EdgeInsets.only(bottom: 22),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: c.fill, borderRadius: BorderRadius.circular(12)),
                child: Icon(icon, size: 20, color: c.ink),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: txt(17, fontWeight: FontWeight.w600, color: c.ink)),
                  const SizedBox(height: 3),
                  Text(detail, style: txt(15, color: c.ink2)),
                ]),
              ),
            ]),
          ),
        if (review case final r?)
          Container(
            margin: const EdgeInsets.only(top: 10),
            padding: const EdgeInsets.all(16),
            decoration: cardDecoration(c),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                for (var i = 0; i < 5; i++) const Icon(CupertinoIcons.star_fill, size: 12, color: FocusColors.accent)
              ]),
              const SizedBox(height: 8),
              Text('“${r.text}”', style: txt(15, color: c.ink)),
              const SizedBox(height: 8),
              Text(r.author, style: txt(13, color: c.ink2)),
            ]),
          ),
      ]),
    );
  }
}

/// Page 2: how the trial works, then the plans. The billed amount is the largest price on each card.
class _PlansPage extends StatelessWidget {
  const _PlansPage({super.key, required this.plans, required this.selected, required this.onSelect});

  final List<Plan> plans;
  final Plan? selected;
  final ValueChanged<Plan> onSelect;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    final days = selected?.trialDays;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(gutter, 8, gutter, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        AnimatedSize(
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: days != null
              ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('How your free trial works', style: display(28, tracking: -0.6).copyWith(color: c.ink)),
                  const SizedBox(height: 24),
                  TrialTimeline(days: days, price: selected!.price),
                ])
              : SizedBox(
                  width: double.infinity,
                  child: Text('Choose your plan', style: display(28, tracking: -0.6).copyWith(color: c.ink)),
                ),
        ),
        const SizedBox(height: 28),
        for (final p in plans)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _PlanCard(plan: p, selected: p.id == selected?.id, onTap: () => onSelect(p)),
          ),
      ]),
    );
  }
}

/// Today, reminder, charge: the three steps that take the fear out of a trial.
class TrialTimeline extends StatelessWidget {
  const TrialTimeline({super.key, required this.days, required this.price});

  final int days;
  final String price;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    final steps = [
      (CupertinoIcons.lock_open, 'Today', 'Get full access to your plan and every session.'),
      (CupertinoIcons.bell, 'Day ${days - 2 < 1 ? 1 : days - 2}', "We'll remind you that your trial is ending."),
      (CupertinoIcons.star, 'Day $days', "You're charged $price. Cancel anytime before."),
    ];
    return Column(children: [
      for (var i = 0; i < steps.length; i++)
        IntrinsicHeight(
          child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Column(children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(color: i == 0 ? FocusColors.accent : c.fill, shape: BoxShape.circle),
                // The gold step keeps black ink in dark mode, so it stays readable on the accent.
                child: Icon(steps[i].$1, size: 17, color: i == 0 ? Colors.black : c.ink2),
              ),
              if (i < steps.length - 1)
                Expanded(
                    child: Container(width: 2, constraints: const BoxConstraints(minHeight: 22), color: c.hairline)),
            ]),
            const SizedBox(width: 16),
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(top: 6, bottom: i < steps.length - 1 ? 14 : 0),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(steps[i].$2, style: txt(17, fontWeight: FontWeight.w600, color: c.ink)),
                  const SizedBox(height: 3),
                  Text(steps[i].$3, style: txt(15, color: c.ink2)),
                ]),
              ),
            ),
          ]),
        ),
    ]);
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan, required this.selected, required this.onTap});

  final Plan plan;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Pressable(
      selected: selected,
      semanticLabel: '${plan.title}, ${plan.price}${plan.badge != null ? ', ${plan.badge}' : ''}',
      onTap: () {
        Haptic.select();
        onTap();
      },
      child: Stack(clipBehavior: Clip.none, children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.all(18),
          decoration: cardDecoration(c, selected: selected, width: 2),
          child: Row(children: [
            SelectionDot(on: selected),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(plan.title, style: txt(17, fontWeight: FontWeight.w600, color: c.ink)),
                if (plan.trialDays != null) ...[
                  const SizedBox(height: 3),
                  Text('${plan.trialDays}-day free trial', style: txt(14, color: c.ink2)),
                ],
              ]),
            ),
            const SizedBox(width: 8),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(plan.price, style: txt(17, fontWeight: FontWeight.w700, color: c.ink, fontFeatures: tabular)),
              if (plan.perWeek != null) ...[
                const SizedBox(height: 3),
                Text(plan.perWeek!, style: txt(13, color: c.ink2, fontFeatures: tabular)),
              ],
            ]),
          ]),
        ),
        if (plan.badge != null)
          Positioned(
            right: 16,
            top: -11,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: const ShapeDecoration(color: FocusColors.accent, shape: StadiumBorder()),
              child: Text(plan.badge!.toUpperCase(),
                  style: txt(11, fontWeight: FontWeight.w700, letterSpacing: 0.5, color: Colors.black)),
            ),
          ),
      ]),
    );
  }
}

/// Shown once when the user closes the paywall with the annual plan selected. Pops true to buy, false to leave.
class _ExitOffer extends StatelessWidget {
  const _ExitOffer({required this.plan});

  final Plan plan;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(gutter, 28, gutter, 8),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Not ready for a year?', style: display(26, tracking: -0.5).copyWith(color: c.ink)),
          const SizedBox(height: 8),
          Text('Start with ${plan.title.toLowerCase()} for ${plan.price}. Cancel anytime.',
              style: txt(17, color: c.ink2)),
          const SizedBox(height: 40),
          PrimaryButton(title: 'Start ${plan.title.toLowerCase()}', onPressed: () => Navigator.pop(context, true)),
          const SizedBox(height: 4),
          Center(child: QuietButton(title: 'No thanks', onPressed: () => Navigator.pop(context, false))),
        ]),
      ),
    );
  }
}
