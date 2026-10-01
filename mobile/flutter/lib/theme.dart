// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the Focus design system. Ink on white (inverted in dark mode), one gold accent, hairlines instead of
// shadows, large system type, capsule buttons and light haptics. Tokens match ../DESIGN.md.
// Docs: https://revenuedot.app/docs/sdks/flutter   Design notes: ../DESIGN.md
import 'dart:io' show Platform;
import 'dart:math' as math;

import 'package:flutter/foundation.dart' show defaultTargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Colour tokens for the current brightness. Read with `Focus.of(context)`.
class FocusColors {
  const FocusColors._(this.ink, this.ground);

  static const accent = Color(0xFFF7B500);
  static const light = FocusColors._(Color(0xFF000000), Color(0xFFFFFFFF));
  static const dark = FocusColors._(Color(0xFFFFFFFF), Color(0xFF000000));

  final Color ink;
  final Color ground;
  Color get ink2 => ink.withValues(alpha: 0.62);
  Color get ink3 => ink.withValues(alpha: 0.42);
  Color get hairline => ink.withValues(alpha: 0.10);
  Color get fill => ink.withValues(alpha: 0.04);

  static FocusColors of(BuildContext context) => Theme.of(context).brightness == Brightness.dark ? dark : light;
}

const gutter = 24.0;
const radius = 16.0;

/// SF's built-in tracking per point size. Native iOS text gets this from Core Text; Flutter shapes text itself, so it
/// is applied here. Values follow Apple's table, adjusted at 20 to 26pt where Flutter's SF Display face sets tighter
/// than Core Text's optical sizes (measured against the SwiftUI app). Other sizes use the nearest listed size.
const _sfTracking = {
  11: 0.06,
  12: 0.0,
  13: -0.08,
  14: -0.15,
  15: -0.23,
  16: -0.31,
  17: -0.43,
  18: -0.44,
  19: -0.45,
  20: 0.35,
  22: 0.25,
  24: 0.3,
  26: 0.35,
  28: 0.38,
  30: 0.40,
  34: 0.37,
  40: 0.37,
  52: 0.32,
  56: 0.30,
  72: 0.14,
};

double _tracking(double size) {
  if (!Platform.isIOS) return 0;
  final key = _sfTracking.keys.reduce((a, b) => (a - size).abs() <= (b - size).abs() ? a : b);
  return _sfTracking[key]!;
}

/// Text in the system font. [letterSpacing] is extra tracking on top of the font's own, like SwiftUI's .tracking.
/// From 20pt up iOS switches to SF Pro Display, as native text does.
TextStyle txt(double size,
        {FontWeight? fontWeight,
        Color? color,
        double letterSpacing = 0,
        double? height,
        List<FontFeature>? fontFeatures}) =>
    TextStyle(
      fontSize: size,
      fontWeight: fontWeight,
      color: color,
      // Flutter's default SF line height is ~1.45; native iOS text sits at ~1.2.
      height: height ?? 1.2,
      fontFeatures: fontFeatures,
      letterSpacing: _tracking(size) + letterSpacing,
      fontFamily: Platform.isIOS ? (size >= 20 ? 'CupertinoSystemDisplay' : 'CupertinoSystemText') : null,
    );

/// Display titles: bold with tight tracking (40 on welcome, 30 on questions, 34 on the paywall).
TextStyle display(double size, {double tracking = 0}) =>
    txt(size, fontWeight: FontWeight.w700, letterSpacing: tracking);

const tabular = [FontFeature.tabularFigures()];

/// Monospaced text for ids and the countdown: SF-adjacent Menlo on iOS, the platform monospace elsewhere.
TextStyle mono(double size, {FontWeight weight = FontWeight.w400}) => TextStyle(
      fontSize: size,
      fontWeight: weight,
      letterSpacing: 0,
      height: 1.2,
      fontFamily: Platform.isIOS || Platform.isMacOS ? 'Menlo' : 'monospace',
      fontFamilyFallback: const ['Courier', 'monospace'],
    );

/// Material 3 is plumbing only: no seed colour, no elevation, no tinted surfaces.
ThemeData focusTheme(Brightness brightness) {
  final c = brightness == Brightness.dark ? FocusColors.dark : FocusColors.light;
  final scheme = ColorScheme(
    brightness: brightness,
    primary: c.ink,
    onPrimary: c.ground,
    secondary: c.ink,
    onSecondary: c.ground,
    error: c.ink,
    onError: c.ground,
    surface: c.ground,
    onSurface: c.ink,
    surfaceTint: Colors.transparent,
  );
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: c.ground,
    splashFactory: NoSplash.splashFactory,
    highlightColor: Colors.transparent,
    dividerColor: c.hairline,
    dividerTheme: DividerThemeData(color: c.hairline, thickness: 0.5, space: 0.5),
    textSelectionTheme:
        TextSelectionThemeData(cursorColor: c.ink, selectionColor: FocusColors.accent.withValues(alpha: 0.35)),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c.ground,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      modalElevation: 0,
      showDragHandle: false,
    ),
    textTheme: (brightness == Brightness.dark
            ? Typography.material2021(platform: defaultTargetPlatform).white
            : Typography.material2021(platform: defaultTargetPlatform).black)
        .apply(bodyColor: c.ink, displayColor: c.ink),
  );
}

abstract final class Haptic {
  static void tap() => HapticFeedback.lightImpact();
  static void select() => HapticFeedback.selectionClick();
  // Flutter has no notification-style haptic; a medium impact is the closest to iOS's success buzz.
  static void success() => HapticFeedback.mediumImpact();
}

/// Press feedback: scales the child to 0.97 while a finger is down.
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.child, this.onTap, this.semanticLabel, this.selected});

  final Widget child;
  final VoidCallback? onTap;
  final String? semanticLabel;
  final bool? selected;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  void _set(bool v) {
    if (_down != v) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null;
    return Semantics(
      button: true,
      enabled: enabled,
      selected: widget.selected,
      label: widget.semanticLabel,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? (_) => _set(true) : null,
        onTapUp: enabled ? (_) => _set(false) : null,
        onTapCancel: () => _set(false),
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _down ? 0.97 : 1,
          duration: const Duration(milliseconds: 160),
          curve: Curves.easeOutCubic,
          child: widget.child,
        ),
      ),
    );
  }
}

/// The primary action: a full-width ink capsule, 56 tall. Fades to 30% when disabled.
class PrimaryButton extends StatelessWidget {
  const PrimaryButton(
      {super.key, required this.title, required this.onPressed, this.busy = false, this.enabled = true});

  final String title;
  final VoidCallback onPressed;
  final bool busy;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    final active = enabled && !busy;
    return AnimatedOpacity(
      opacity: enabled ? 1 : 0.3,
      duration: const Duration(milliseconds: 150),
      child: Pressable(
        semanticLabel: title,
        onTap: active
            ? () {
                Haptic.tap();
                onPressed();
              }
            : null,
        child: Container(
          height: 56,
          width: double.infinity,
          alignment: Alignment.center,
          decoration: ShapeDecoration(color: c.ink, shape: const StadiumBorder()),
          child: busy
              ? SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: c.ground))
              : Text(title, style: txt(17, fontWeight: FontWeight.w600, color: c.ground)),
        ),
      ),
    );
  }
}

/// A quiet text action under the primary button (Not now, No thanks).
class QuietButton extends StatelessWidget {
  const QuietButton({super.key, required this.title, required this.onPressed});

  final String title;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Pressable(
      semanticLabel: title,
      onTap: () {
        Haptic.tap();
        onPressed();
      },
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 44, minWidth: 88),
        child: Center(
          widthFactor: 1,
          child: Text(title, style: txt(15, fontWeight: FontWeight.w500, color: FocusColors.of(context).ink2)),
        ),
      ),
    );
  }
}

/// Hairline card used by option rows, plan cards and session rows; ink border and fill when selected.
BoxDecoration cardDecoration(FocusColors c,
        {bool selected = false, double width = 1.5, double r = radius, bool filled = false}) =>
    BoxDecoration(
      color: selected || filled ? c.fill : null,
      borderRadius: BorderRadius.circular(r),
      border: Border.all(color: selected ? c.ink : c.hairline, width: selected ? width : 1),
    );

/// A selectable row: hairline card that turns ink-bordered with a gold dot when selected.
class OptionRow extends StatelessWidget {
  const OptionRow(
      {super.key, required this.title, this.subtitle, this.icon, required this.selected, required this.onTap});

  final String title;
  final String? subtitle;
  final IconData? icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Pressable(
      selected: selected,
      semanticLabel: title,
      onTap: () {
        Haptic.select();
        onTap();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: cardDecoration(c, selected: selected),
        child: Row(children: [
          if (icon != null) ...[
            SizedBox(width: 28, child: Icon(icon, size: 22, color: c.ink)),
            const SizedBox(width: 14)
          ],
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: txt(17, fontWeight: FontWeight.w600, color: c.ink)),
              if (subtitle != null) ...[
                const SizedBox(height: 3),
                Text(subtitle!, style: txt(14, color: c.ink2)),
              ],
            ]),
          ),
          const SizedBox(width: 8),
          SelectionDot(on: selected),
        ]),
      ),
    );
  }
}

/// Empty ring, or an ink ring with the gold dot: the brand's "selected".
class SelectionDot extends StatelessWidget {
  const SelectionDot({super.key, required this.on});

  final bool on;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: on ? c.ink : c.ink.withValues(alpha: 0.25), width: on ? 2 : 1.5),
      ),
      alignment: Alignment.center,
      child: AnimatedScale(
        scale: on ? 1 : 0,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutBack,
        child: Container(
            width: 10, height: 10, decoration: const BoxDecoration(color: FocusColors.accent, shape: BoxShape.circle)),
      ),
    );
  }
}

/// Thin progress bar for the onboarding quiz.
class StepBar extends StatelessWidget {
  const StepBar({super.key, required this.value, this.height = 4});

  final double value;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(height),
      child: SizedBox(
        height: height,
        child: Stack(children: [
          Positioned.fill(child: ColoredBox(color: c.hairline)),
          TweenAnimationBuilder<double>(
            tween: Tween(end: value.clamp(0, 1)),
            duration: const Duration(milliseconds: 380),
            curve: Curves.easeOutCubic,
            builder: (context, v, _) => FractionallySizedBox(
              widthFactor: v,
              heightFactor: 1,
              child: DecoratedBox(decoration: BoxDecoration(color: c.ink, borderRadius: BorderRadius.circular(height))),
            ),
          ),
        ]),
      ),
    );
  }
}

/// Small uppercase label above a section.
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(),
      style: txt(12, fontWeight: FontWeight.w600, letterSpacing: 0.8, color: FocusColors.of(context).ink3));
}

/// The RevenueDot mark: an ink tile with an R whose leg ends in the gold dot.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 44});

  final double size;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: c.ink, borderRadius: BorderRadius.circular(size * 0.24)),
        child: Stack(alignment: Alignment.center, children: [
          Transform.translate(
            offset: Offset(-size * 0.04, 0),
            child: Text('R', style: txt(size * 0.56, fontWeight: FontWeight.w700, color: c.ground, height: 1)),
          ),
          Transform.translate(
            offset: Offset(size * 0.22, size * 0.2),
            child: Container(
                width: size * 0.2,
                height: size * 0.2,
                decoration: const BoxDecoration(color: FocusColors.accent, shape: BoxShape.circle)),
          ),
        ]),
      ),
    );
  }
}

/// The progress ring: hairline track, ink arc, gold dot at the tip. Animates between values.
class FocusRing extends StatelessWidget {
  const FocusRing(
      {super.key, required this.progress, this.lineWidth = 12, this.size = 128, this.child, this.animate = true});

  final double progress;
  final double lineWidth;
  final double size;
  final Widget? child;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    final p = progress.clamp(0.0, 1.0);
    return SizedBox.square(
      dimension: size,
      child: TweenAnimationBuilder<double>(
        tween: Tween(end: p),
        duration: animate ? const Duration(milliseconds: 700) : Duration.zero,
        curve: Curves.easeOutCubic,
        builder: (context, v, child) => CustomPaint(
          painter: _RingPainter(v, lineWidth, c.ink, c.hairline),
          child: Center(child: child),
        ),
        child: child,
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.p, this.width, this.ink, this.track);

  final double p;
  final double width;
  final Color ink;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    // Like SwiftUI's Circle().stroke, the stroke is centred on the frame's edge; the tip dot sits half a stroke in.
    final r = math.min(size.width, size.height) / 2;
    final center = size.center(Offset.zero);
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, r, stroke..color = track);
    if (p <= 0) return;
    final sweep = 2 * math.pi * p;
    canvas.drawArc(Rect.fromCircle(center: center, radius: r), -math.pi / 2, sweep, false, stroke..color = ink);
    final a = sweep - math.pi / 2;
    final dot = r - width / 2;
    canvas.drawCircle(
        center + Offset(dot * math.cos(a), dot * math.sin(a)), width * 0.55 / 2, Paint()..color = FocusColors.accent);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.p != p || old.ink != ink || old.track != track || old.width != width;
}

/// Back chevron used on quiz screens.
class BackChevron extends StatelessWidget {
  const BackChevron({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Pressable(
        semanticLabel: 'Back',
        onTap: () {
          Haptic.tap();
          onTap();
        },
        child: SizedBox.square(
            dimension: 44, child: Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: FocusColors.of(context).ink)),
      );
}
