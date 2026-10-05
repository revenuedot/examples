// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the account sheet. The plan card reads the `pro` entitlement; Restore and Manage subscription are
// required by the stores. The collapsed Developer section shows what RevenueDot sees for this install.
// Docs: https://revenuedot.app/docs/sdks/flutter
import 'dart:io' show Platform;

import 'package:flutter/cupertino.dart' show CupertinoIcons;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import 'home.dart' show formatDate;
import 'model.dart';
import 'revenuedot.dart';
import 'theme.dart';

Future<void> showAccountSheet(BuildContext context,
        {required FocusModel model, required VoidCallback upgrade, required VoidCallback restartOnboarding}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      barrierColor: Colors.black.withValues(alpha: 0.2),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
      clipBehavior: Clip.antiAlias,
      builder: (_) => FractionallySizedBox(
        heightFactor: 1,
        child: AccountSheet(model: model, upgrade: upgrade, restartOnboarding: restartOnboarding),
      ),
    );

class AccountSheet extends StatefulWidget {
  const AccountSheet({super.key, required this.model, required this.upgrade, required this.restartOnboarding});

  final FocusModel model;
  final VoidCallback upgrade;
  final VoidCallback restartOnboarding;

  @override
  State<AccountSheet> createState() => _AccountSheetState();
}

class _AccountSheetState extends State<AccountSheet> {
  final _userId = TextEditingController(text: 'sandbox_user_1');
  bool _developer = false;

  FocusModel get model => widget.model;

  @override
  void dispose() {
    _userId.dispose();
    super.dispose();
  }

  /// The store's own subscription page: RevenueDot's management URL when there is one, else the store default.
  Future<void> _manage() async {
    final url = model.customerInfo?.managementURL ??
        (Platform.isIOS
            ? 'https://apps.apple.com/account/subscriptions'
            : 'https://play.google.com/store/account/subscriptions');
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return ListenableBuilder(
      listenable: model,
      builder: (context, _) => ColoredBox(
        color: c.ground,
        child: Column(children: [
          SizedBox(
            height: 64,
            width: double.infinity,
            child: Stack(alignment: Alignment.center, children: [
              Text('Account', style: txt(17, fontWeight: FontWeight.w600, color: c.ink)),
              Positioned(
                right: 16,
                child: Pressable(
                  semanticLabel: 'Done',
                  onTap: () => Navigator.of(context).pop(),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    child: Text('Done', style: txt(17, fontWeight: FontWeight.w600, color: c.ink)),
                  ),
                ),
              ),
            ]),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(gutter, 8, gutter, 32),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _planCard(c),
                const SizedBox(height: 28),
                _group(
                    c,
                    [
                      _Row(icon: CupertinoIcons.arrow_clockwise, title: 'Restore purchases', onTap: model.restore),
                      _Row(icon: CupertinoIcons.creditcard, title: 'Manage subscription', onTap: _manage),
                      _Row(icon: CupertinoIcons.sparkles, title: 'Redo onboarding', onTap: widget.restartOnboarding),
                    ],
                    indent: 52),
                const SizedBox(height: 28),
                _developerSection(c),
                if (model.message.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text(model.message, style: txt(14, color: c.ink2)),
                ],
                const SizedBox(height: 28),
                Row(children: [
                  const BrandMark(size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text('Subscriptions by RevenueDot, the open-source RevenueCat alternative.',
                        style: txt(13, color: c.ink3)),
                  ),
                ]),
              ]),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _planCard(FocusColors c) {
    final e = model.proEntitlement;
    final active = e != null && e.isActive;
    final expires = DateTime.tryParse(e?.expirationDate ?? '')?.toLocal();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: cardDecoration(c, r: radius + 4),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: model.isPro ? FocusColors.accent : c.ink3, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Text(model.isPro ? 'Focus Pro' : 'Free plan', style: txt(22, fontWeight: FontWeight.w600, color: c.ink)),
        ]),
        const SizedBox(height: 14),
        if (active) ...[
          Text(
            e.willRenew
                ? 'Renews ${expires == null ? '' : formatDate(expires)}'
                : 'Ends ${expires == null ? 'never' : formatDate(expires)}',
            style: txt(15, color: c.ink2),
          ),
          if (e.periodType == PeriodType.trial) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: ShapeDecoration(color: c.fill, shape: const StadiumBorder()),
              child: Text('Free trial', style: txt(13, fontWeight: FontWeight.w600, color: c.ink)),
            ),
          ],
        ] else ...[
          Text('Upgrade for Deep and Flow sessions, weekly reports and the distraction shield.',
              style: txt(15, color: c.ink2)),
          const SizedBox(height: 14),
          PrimaryButton(title: 'See plans', onPressed: widget.upgrade),
        ],
      ]),
    );
  }

  Widget _developerSection(FocusColors c) {
    final loggedIn = model.loggedInId;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Pressable(
        semanticLabel: 'Developer',
        onTap: () => setState(() => _developer = !_developer),
        child: SizedBox(
          height: 44,
          child: Row(children: [
            const Eyebrow('Developer'),
            const Spacer(),
            AnimatedRotation(
              turns: _developer ? 0.5 : 0,
              duration: const Duration(milliseconds: 220),
              child: Icon(CupertinoIcons.chevron_down, size: 14, color: c.ink3),
            ),
          ]),
        ),
      ),
      AnimatedSize(
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
        alignment: Alignment.topCenter,
        child: !_developer
            ? const SizedBox(width: double.infinity)
            : _group(c, [
                _Field(
                    label: 'App user id',
                    value: model.appUserId.isEmpty ? 'not configured' : model.appUserId,
                    copy: model.appUserId.isNotEmpty),
                _Field(label: 'Entitlement $entitlement', value: model.isPro ? 'active' : 'not active'),
                _Field(
                    label: 'Subscriptions',
                    value: model.activeSubscriptions.isEmpty ? 'none' : model.activeSubscriptions.join(', ')),
                _Field(label: 'Current offering', value: model.offeringId ?? 'none'),
                _Field(label: 'Server', value: serverHost),
                if (model.loadError != null)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(model.loadError!, style: txt(13, color: c.ink2)),
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: SizedBox(
                    height: 52,
                    child: Row(children: [
                      Expanded(
                        child: loggedIn == null
                            ? TextField(
                                controller: _userId,
                                autocorrect: false,
                                enableSuggestions: false,
                                style: mono(13).copyWith(color: c.ink),
                                onChanged: (_) => setState(() {}),
                                decoration: InputDecoration.collapsed(
                                    hintText: 'User id', hintStyle: mono(13).copyWith(color: c.ink3)),
                              )
                            : Text(loggedIn, style: mono(13).copyWith(color: c.ink)),
                      ),
                      Pressable(
                        semanticLabel: loggedIn == null ? 'Log in' : 'Log out',
                        onTap: model.busy || !model.configured || (loggedIn == null && _userId.text.trim().isEmpty)
                            ? null
                            : () {
                                Haptic.tap();
                                model.toggleLogin(_userId.text.trim());
                              },
                        child: Padding(
                          padding: const EdgeInsets.only(left: 12),
                          child: Text(loggedIn == null ? 'Log in' : 'Log out',
                              style: TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.w600, color: model.configured ? c.ink : c.ink3)),
                        ),
                      ),
                    ]),
                  ),
                ),
              ]),
      ),
    ]);
  }

  /// A hairline group of rows separated by dividers.
  Widget _group(FocusColors c, List<Widget> rows, {double indent = 0}) => Container(
        width: double.infinity,
        decoration: cardDecoration(c),
        child: Column(children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) Divider(indent: indent, height: 1, thickness: 1, color: c.hairline),
            rows[i],
          ],
        ]),
      );
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.title, required this.onTap});

  final IconData icon;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Semantics(
      button: true,
      label: title,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          Haptic.tap();
          onTap();
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SizedBox(
            height: 52,
            child: Row(children: [
              SizedBox(width: 22, child: Icon(icon, size: 19, color: c.ink)),
              const SizedBox(width: 14),
              Expanded(child: Text(title, style: txt(17, color: c.ink))),
              Icon(CupertinoIcons.chevron_right, size: 15, color: c.ink3),
            ]),
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.value, this.copy = false});

  final String label;
  final String value;
  final bool copy;

  @override
  Widget build(BuildContext context) {
    final c = FocusColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SizedBox(
        height: 48,
        child: Row(children: [
          Text(label, style: txt(14, color: c.ink2)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(_middleTruncate(value, 26),
                textAlign: TextAlign.end, maxLines: 1, style: mono(13).copyWith(color: c.ink)),
          ),
          if (copy)
            Semantics(
              button: true,
              label: 'Copy app user id',
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  Clipboard.setData(ClipboardData(text: value));
                  Haptic.success();
                },
                child: Padding(
                  padding: const EdgeInsets.only(left: 10),
                  child: Icon(CupertinoIcons.doc_on_doc, size: 16, color: c.ink2),
                ),
              ),
            ),
        ]),
      ),
    );
  }

  /// Long ids ($RCAnonymousID:...) keep both ends visible, like iOS's middle truncation.
  static String _middleTruncate(String s, int max) =>
      s.length <= max ? s : '${s.substring(0, max ~/ 2 - 1)}…${s.substring(s.length - (max ~/ 2 - 1))}';
}
