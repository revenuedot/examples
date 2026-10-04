// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the sessions and a running one: a big countdown inside the ring. "Finish session" credits the minutes
// right away so the sample is quick to try. The first finished session asks for a rating, never onboarding.
// Docs: https://revenuedot.app/docs/sdks/react-native
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as StoreReview from "expo-store-review";
import { demoScreen } from "../demo";
import { readJSON, writeJSON } from "../storage";
import { font, haptic, space, useTheme } from "../theme";
import { FocusRing } from "../ui/brand";
import { PrimaryButton } from "../ui/controls";

export type Session = { id: string; title: string; minutes: number; detail: string; pro: boolean };

export const sessions: Session[] = [
  { id: "classic", title: "Classic", minutes: 25, detail: "The one that works", pro: false },
  { id: "deep", title: "Deep", minutes: 50, detail: "For hard problems", pro: true },
  { id: "flow", title: "Flow", minutes: 90, detail: "A full block, no breaks", pro: true },
];

export function SessionScreen({ session, end }: { session: Session; end: (done: boolean) => void }) {
  const t = useTheme();
  const total = session.minutes * 60;
  const [left, setLeft] = useState(total);

  useEffect(() => {
    const timer = setInterval(() => setLeft((l) => Math.max(l - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const finish = async () => {
    haptic.success();
    const finished = (await readJSON("finishedSessions", 0)) + 1;
    if (!demoScreen) writeJSON("finishedSessions", finished);
    // Apple's rule (5.6.3): ask after a moment of success, never during onboarding.
    if (finished === 1 && !demoScreen && (await StoreReview.isAvailableAsync().catch(() => false))) StoreReview.requestReview().catch(() => {});
    end(true);
  };

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={[styles.title, { color: t.ink2 }]}>{session.title}</Text>
        <Pressable onPress={() => { haptic.tap(); end(false); }} style={styles.end} accessibilityRole="button">
          {({ pressed }) => <Text style={[styles.endLabel, { color: t.ink2, opacity: pressed ? 0.5 : 1 }]}>End</Text>}
        </Pressable>
      </View>
      <View style={styles.center}>
        <FocusRing progress={1 - left / total} size={260} lineWidth={10}>
          <Text style={[styles.clock, { color: t.ink, fontFamily: font.mono }]} accessibilityLabel={`${mm} minutes ${ss} seconds left`}>
            {mm}:{ss}
          </Text>
        </FocusRing>
        <Text style={[styles.cheer, { color: t.ink2 }]}>Phone down. You've got this.</Text>
      </View>
      <PrimaryButton title="Finish session" onPress={finish} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.gutter, paddingVertical: 8 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "600" },
  end: { minHeight: 44, justifyContent: "center", paddingLeft: 12 },
  endLabel: { fontSize: 15, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  clock: { fontSize: 60, fontWeight: "600", fontVariant: ["tabular-nums"] },
  cheer: { fontSize: 17, marginTop: 32 },
});
