// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the two-page paywall built from the current offering, with the disclosure and links Apple requires.
// Closing it with the annual plan selected offers the shortest plan once; the second close leaves.
// Docs: https://revenuedot.app/docs/guides/paywalls
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { config } from "../config";
import { useModel } from "../model";
import type { Answers } from "../onboarding/questions";
import { previewPlans, type Plan } from "../plans";
import { font, haptic, space, useTheme } from "../theme";
import { PrimaryButton, QuietButton } from "../ui/controls";
import { useEnter } from "../ui/motion";
import { BottomSheet } from "../ui/sheet";
import { PlansPage, ValuePage } from "./pages";

export function Paywall({ answers, onClose, startOnPlans = false }: { answers: Answers; onClose: () => void; startOnPlans?: boolean }) {
  const t = useTheme();
  const model = useModel();
  const [page, setPage] = useState(startOnPlans ? 1 : 0);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [exitOffer, setExitOffer] = useState(false);
  const [offeredExit, setOfferedExit] = useState(false);

  const isPreview = model.plans.length === 0;
  const plans = isPreview ? previewPlans : model.plans;
  // Annual is first and pre-selected.
  const selected = plans.find((p) => p.id === selectedID) ?? plans[0];
  const shortest = plans[plans.length - 1];

  // A message left over from the account sheet doesn't belong here.
  const { setMessage } = model;
  useEffect(() => setMessage(""), [setMessage]);

  const buy = async (plan: Plan) => {
    if (!plan.pkg) {
      model.setMessage("Preview plans can't be bought. Create an offering first.");
      return;
    }
    if (await model.purchase(plan.pkg)) {
      haptic.success();
      onClose();
    }
  };

  const close = () => {
    if (!offeredExit && plans.length > 1 && selected?.id === plans[0].id) {
      setOfferedExit(true);
      setExitOffer(true);
    } else {
      onClose();
    }
  };

  const restore = async () => {
    if (await model.restore()) onClose();
  };

  const cta = page === 0 ? "Continue" : !selected?.trialDays ? "Continue" : selected.trialDays === 7 ? "Start my free week" : `Start my ${selected.trialDays}-day free trial`;
  const disclosure = !selected
    ? ""
    : selected.trialDays
      ? `${selected.trialDays} days free, then ${selected.price}. Auto-renews. Cancel anytime in Settings.`
      : `${selected.price}. Auto-renews until you cancel in Settings.`;

  return (
    <View style={[styles.root, { backgroundColor: t.ground }]}>
      <View style={styles.top}>
        <Pressable onPress={() => { haptic.tap(); close(); }} style={styles.close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={4}>
          {({ pressed }) => <X size={22} color={t.ink3} strokeWidth={2.2} style={{ opacity: pressed ? 0.5 : 1 }} />}
        </Pressable>
        <Pressable onPress={restore} style={styles.restore} accessibilityRole="button" disabled={model.busy}>
          {({ pressed }) => <Text style={[styles.restoreLabel, { color: t.ink2, opacity: pressed ? 0.5 : 1 }]}>Restore</Text>}
        </Pressable>
      </View>

      <PageIn key={page} from={page === 0 ? -40 : 40}>
        {page === 0 ? <ValuePage answers={answers} /> : <PlansPage plans={plans} selected={selected} onSelect={setSelectedID} />}
      </PageIn>

      <View style={styles.footer}>
        <PrimaryButton title={cta} busy={model.busy} onPress={() => (page === 0 ? setPage(1) : selected && buy(selected))} />
        {page === 1 ? (
          <>
            <View style={styles.assure}>
              <Check size={14} color={t.ink2} strokeWidth={3} />
              <Text style={[styles.assureText, { color: t.ink2 }]}>No commitment, cancel anytime</Text>
            </View>
            <Text style={[styles.small, { color: t.ink3 }]}>{disclosure}</Text>
            <View style={styles.links}>
              <Text style={[styles.link, { color: t.ink2 }]} onPress={() => Linking.openURL(config.termsURL)} accessibilityRole="link">Terms</Text>
              <Text style={[styles.link, { color: t.ink2 }]} onPress={() => Linking.openURL(config.privacyURL)} accessibilityRole="link">Privacy</Text>
            </View>
            {isPreview ? (
              <Text style={[styles.small, { color: t.ink3 }]}>Preview prices. Create an offering in your RevenueDot dashboard to sell real plans.</Text>
            ) : null}
            {model.message ? <Text style={[font.caption, styles.center, { color: t.ink2 }]}>{model.message}</Text> : null}
          </>
        ) : null}
      </View>

      <BottomSheet visible={exitOffer} height={260} onDismiss={() => setExitOffer(false)}>
        <View style={styles.offer}>
          <Text style={[font.display(26, -0.5), { color: t.ink }]}>Not ready for a year?</Text>
          {shortest ? (
            <Text style={[styles.offerText, { color: t.ink2 }]}>
              Start with {shortest.title.toLowerCase()} for {shortest.price}. Cancel anytime.
            </Text>
          ) : null}
          <View style={{ flex: 1 }} />
          <PrimaryButton
            title={`Start ${shortest?.title.toLowerCase() ?? "now"}`}
            onPress={() => {
              setExitOffer(false);
              if (shortest) buy(shortest);
            }}
          />
          <View style={{ marginTop: 4 }}>
            <QuietButton title="No thanks" onPress={() => { setExitOffer(false); onClose(); }} />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

function PageIn({ from, children }: { from: number; children: ReactNode }) {
  const style = useEnter(from);
  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  restore: { minHeight: 44, justifyContent: "center", paddingLeft: 12 },
  restoreLabel: { fontSize: 15, fontWeight: "500" },
  footer: { paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 8, gap: 10 },
  assure: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  assureText: { fontSize: 14, fontWeight: "500" },
  small: { fontSize: 12, lineHeight: 16, textAlign: "center" },
  links: { flexDirection: "row", justifyContent: "center", gap: 16 },
  link: { fontSize: 12, fontWeight: "500" },
  center: { textAlign: "center" },
  offer: { flex: 1, paddingHorizontal: space.gutter, paddingTop: 28, paddingBottom: 8 },
  offerText: { fontSize: 17, lineHeight: 22, marginTop: 8 },
});
