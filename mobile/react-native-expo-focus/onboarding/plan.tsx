// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the two screens between the quiz and the paywall: "building your plan" (a percentage counting to 100
// while three checks tick in) and the plan summary in the user's own words.
// Docs: https://revenuedot.app/docs/guides/paywalls
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { font, haptic, space, useTheme } from "../theme";
import { Border } from "../ui/controls";
import { Screen } from "./steps";
import { bestTimeOf, goalOf, minutesOf, type Answers } from "./questions";

export function BuildingPlan({ answers, done }: { answers: Answers; done: () => void }) {
  const t = useTheme();
  const [percent, setPercent] = useState(0);
  const finished = useRef(done);
  finished.current = done;
  const lines = [
    `Matching sessions to ${goalOf(answers).toLowerCase()}`,
    `Guarding against ${(answers.obstacle ?? "distractions").toLowerCase()}`,
    `Scheduling ${minutesOf(answers)} minutes each ${bestTimeOf(answers).toLowerCase()}`,
  ];

  useEffect(() => {
    let p = 0;
    let leave: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      p += 1;
      setPercent(p);
      if (p % 30 === 0 && p < 100) haptic.select();
      if (p >= 100) {
        clearInterval(timer);
        haptic.success();
        leave = setTimeout(() => finished.current(), 450);
      }
    }, 28);
    return () => { clearInterval(timer); if (leave) clearTimeout(leave); };
  }, []);

  return (
    <View style={styles.building}>
      <View style={{ flex: 1 }} />
      <Text style={[styles.percent, font.digits, { color: t.ink }]}>{percent}%</Text>
      <Text style={[font.title(22), { color: t.ink, marginTop: 4 }]}>Building your plan</Text>
      <View style={[styles.track, { backgroundColor: t.hairline }]}>
        <View style={[styles.fillBar, { backgroundColor: t.ink, width: `${percent}%` }]} />
      </View>
      <View style={styles.checks}>
        {lines.map((line, i) => {
          const doneAt = (i + 1) * 30;
          const ticked = percent >= doneAt;
          return (
            <View key={line} style={styles.checkRow}>
              <View style={[styles.check, ticked ? { backgroundColor: t.ink } : { borderColor: t.hairline, borderWidth: 1.5 }]}>
                {ticked ? <Check size={13} color={t.ground} strokeWidth={3.2} /> : null}
              </View>
              <Text style={[styles.checkText, { color: percent >= doneAt - 30 ? t.ink : t.ink3 }]}>{line}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flex: 2 }} />
    </View>
  );
}

export function PlanSummary({ answers, next }: { answers: Answers; next: () => void }) {
  const t = useTheme();
  const minutes = minutesOf(answers);
  const sessions = Math.max(1, Math.floor(minutes / 25));
  return (
    <Screen title="Your plan is ready." subtitle={`Built for ${goalOf(answers).toLowerCase()}, around your day.`} cta="Start my plan" next={next}>
      <View style={{ gap: 12 }}>
        <View style={styles.tiles}>
          <Tile value={String(minutes)} unit="min" label="Every day" />
          <Tile value={String(sessions)} unit={sessions > 1 ? "sessions" : "session"} label="Of 25 minutes" />
        </View>
        <View style={styles.tiles}>
          <Tile value={bestTimeOf(answers)} label="Start time" />
          <Tile value="14" unit="days" label="To a habit" />
        </View>
        <View style={styles.note}>
          <View style={[styles.noteDot, { backgroundColor: t.accent }]} />
          <Text style={[styles.noteText, { color: t.ink2 }]}>
            Week one keeps sessions short so you start every day. From week two they grow as your focus does.
          </Text>
          <Border color={t.hairline} />
        </View>
      </View>
    </Screen>
  );
}

function Tile({ value, unit, label }: { value: string; unit?: string; label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: t.fill }]}>
      <Text style={[font.caption, { color: t.ink2 }]}>{label}</Text>
      <View style={styles.tileValueRow}>
        <Text style={[styles.tileValue, { color: t.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
        {unit ? <Text style={[styles.tileUnit, { color: t.ink2 }]}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  building: { flex: 1, paddingHorizontal: space.gutter },
  percent: { fontSize: 72, fontWeight: "700", letterSpacing: -2, lineHeight: 80 },
  track: { height: 6, borderRadius: 3, marginTop: 20, overflow: "hidden" },
  fillBar: { height: 6, borderRadius: 3 },
  checks: { marginTop: 32, gap: 18 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  checkText: { fontSize: 17, flex: 1 },
  tiles: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, padding: 16, borderRadius: space.radius, gap: 6 },
  tileValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  tileValue: { fontSize: 30, fontWeight: "700", letterSpacing: -0.6, flexShrink: 1 },
  tileUnit: { fontSize: 15, fontWeight: "500" },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: space.radius },
  noteDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  noteText: { fontSize: 15, lineHeight: 21, flex: 1 },
});
