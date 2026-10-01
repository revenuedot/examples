// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: home. Today's ring, the week and the sessions; Deep and Flow open the paywall until the `pro`
// entitlement is active. The account sheet and a running session open from here.
// Docs: https://revenuedot.app/docs/sdks/react-native
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { ChevronRight, Lock, Play, User } from "lucide-react-native";
import { demoScreen } from "../demo";
import { useModel } from "../model";
import { bestTimeOf, goalOf, minutesOf, type Answers } from "../onboarding/questions";
import { Paywall } from "../paywall/Paywall";
import { Settings } from "../settings/Settings";
import { dayKey, readJSON, writeJSON } from "../storage";
import { font, haptic, space, useTheme } from "../theme";
import { BrandMark, FocusRing } from "../ui/brand";
import { Border, Eyebrow, PrimaryButton, Tap } from "../ui/controls";
import { SafeScreen } from "../ui/safe";
import { SessionScreen, sessions, type Session } from "./Session";

// iOS can't present a sheet while another one is still sliding away, so the next one waits for it.
const AFTER_DISMISS_MS = 400;

export function Home({ answers, restartOnboarding, openSettings = false }: { answers: Answers; restartOnboarding: () => void; openSettings?: boolean }) {
  const t = useTheme();
  const model = useModel();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [log, setLog] = useState<Record<string, number>>({});
  const [paywall, setPaywall] = useState(false);
  const [settings, setSettings] = useState(openSettings);
  const [running, setRunning] = useState<Session | null>(null);

  // Minutes focused per day stay on the device.
  useEffect(() => { if (!demoScreen) readJSON("focusLog", {}).then(setLog); }, []);
  const addMinutes = (m: number) =>
    setLog((l) => {
      const next = { ...l, [dayKey(new Date())]: (l[dayKey(new Date())] ?? 0) + m };
      if (!demoScreen) writeJSON("focusLog", next);
      return next;
    });

  const goal = minutesOf(answers);
  const today = log[dayKey(new Date())] ?? 0;
  const afterSettings = (then: () => void) => {
    setSettings(false);
    setTimeout(then, AFTER_DISMISS_MS);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.ground }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.date, { color: t.ink2 }]}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </Text>
            <Text style={[font.display(34, -0.8), { color: t.ink }]}>Today</Text>
          </View>
          {model.isPro ? (
            <View style={styles.pro}>
              <View style={[styles.proDot, { backgroundColor: t.accent }]} />
              <Text style={[styles.proText, { color: t.ink }]}>Pro</Text>
              <Border color={t.hairline} radius={15} />
            </View>
          ) : null}
          <Tap onPress={() => { haptic.tap(); setSettings(true); }} label="Account and settings" style={[styles.account, { backgroundColor: t.fill }]}>
            <User size={19} color={t.ink} strokeWidth={2.2} />
          </Tap>
        </View>

        <View style={styles.ringCard}>
          <FocusRing progress={today / Math.max(goal, 1)} size={128} lineWidth={12} from={0}>
            <Text style={[styles.today, font.digits, { color: t.ink }]}>{today}</Text>
            <Text style={[styles.ofGoal, { color: t.ink2 }]}>of {goal} min</Text>
          </FocusRing>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[font.title(20), { color: t.ink }]}>{today >= goal ? "Goal reached." : `${goal - today} minutes to go`}</Text>
            <Text style={[styles.planLine, { color: t.ink2 }]}>
              Your plan: {goalOf(answers).toLowerCase()}, each {bestTimeOf(answers).toLowerCase()}.
            </Text>
          </View>
          <Border color={t.hairline} radius={space.radius + 4} />
        </View>

        <Week log={log} goal={goal} />

        <View style={{ marginTop: 36 }}>
          <Eyebrow text="Sessions" />
        </View>
        <View style={styles.sessions}>
          {sessions.map((s) => {
            const locked = s.pro && !model.isPro;
            return <SessionRow key={s.id} session={s} locked={locked} onPress={() => (locked ? setPaywall(true) : setRunning(s))} />;
          })}
        </View>

        {model.isPro ? null : (
          <Tap onPress={() => { haptic.tap(); setPaywall(true); }} label="Unlock your full plan" style={[styles.upgrade, { backgroundColor: t.fill }]}>
            <BrandMark size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.upgradeTitle, { color: t.ink }]}>Unlock your full plan</Text>
              <Text style={[styles.upgradeDetail, { color: t.ink2 }]}>Deep and Flow sessions, reports, the shield</Text>
            </View>
            <ChevronRight size={18} color={t.ink3} strokeWidth={2.4} />
          </Tap>
        )}
      </ScrollView>

      <View style={[styles.pinned, { paddingBottom: 4 + insets.bottom, backgroundColor: t.ground }]}>
        <Svg style={styles.fade} width={width} height={24} pointerEvents="none">
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.ground} stopOpacity={0} />
              <Stop offset="1" stopColor={t.ground} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={24} fill="url(#fade)" />
        </Svg>
        <PrimaryButton title="Start a 25-minute session" onPress={() => setRunning(sessions[0])} />
      </View>

      <Modal visible={paywall} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPaywall(false)}>
        <SafeAreaProvider>
          <SafeScreen>
            <Paywall answers={answers} onClose={() => setPaywall(false)} />
          </SafeScreen>
        </SafeAreaProvider>
      </Modal>

      <Modal visible={running != null} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setRunning(null)}>
        <SafeAreaProvider>
          <SafeScreen>
            {running ? (
              <SessionScreen
                session={running}
                end={(done) => {
                  if (done) addMinutes(running.minutes);
                  setRunning(null);
                }}
              />
            ) : null}
          </SafeScreen>
        </SafeAreaProvider>
      </Modal>

      <Modal visible={settings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettings(false)}>
        <SafeAreaProvider>
          <Settings
            close={() => setSettings(false)}
            upgrade={() => afterSettings(() => setPaywall(true))}
            restartOnboarding={() => afterSettings(restartOnboarding)}
          />
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

/** Seven circles from Sunday; a day turns ink with the gold dot when its goal was met. */
function Week({ log, goal }: { log: Record<string, number>; goal: number }) {
  const t = useTheme();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  return (
    <View style={styles.week}>
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const isToday = dayKey(d) === dayKey(now);
        const met = (log[dayKey(d)] ?? 0) >= goal;
        return (
          <View key={i} style={styles.day}>
            <Text style={[styles.dayLabel, { color: isToday ? t.ink : t.ink3 }]}>{d.toLocaleDateString(undefined, { weekday: "narrow" })}</Text>
            <View style={[styles.dayCircle, met ? { backgroundColor: t.ink } : { borderColor: isToday ? t.ink : t.hairline, borderWidth: isToday ? 1.5 : 1 }]}>
              {met ? <View style={[styles.dayDot, { backgroundColor: t.accent }]} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SessionRow({ session, locked, onPress }: { session: Session; locked: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Tap onPress={() => { haptic.tap(); onPress(); }} label={`${session.title}, ${session.minutes} minutes${locked ? ", Pro" : ""}`} style={styles.session}>
      <View style={[styles.sessionMinutes, { backgroundColor: t.fill }]}>
        <Text style={[styles.sessionMinutesText, font.digits, { color: t.ink }]}>{session.minutes}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.sessionTitle, { color: t.ink }]}>{session.title}</Text>
        <Text style={[styles.sessionDetail, { color: t.ink2 }]}>{session.detail}</Text>
      </View>
      {locked ? <Lock size={16} color={t.ink3} fill={t.ink3} strokeWidth={2.2} /> : <Play size={15} color={t.ink} fill={t.ink} strokeWidth={2} />}
      <Border color={t.hairline} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 8 },
  date: { fontSize: 14, fontWeight: "500" },
  pro: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15 },
  proDot: { width: 7, height: 7, borderRadius: 4 },
  proText: { fontSize: 13, fontWeight: "600" },
  account: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  ringCard: { flexDirection: "row", alignItems: "center", gap: 24, padding: 20, marginTop: 28, borderRadius: space.radius + 4 },
  today: { fontSize: 34, fontWeight: "700", lineHeight: 40 },
  ofGoal: { fontSize: 12 },
  planLine: { fontSize: 15, lineHeight: 20 },
  week: { flexDirection: "row", marginTop: 28 },
  day: { flex: 1, alignItems: "center", gap: 8 },
  dayLabel: { fontSize: 12, fontWeight: "500" },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  sessions: { marginTop: 12, gap: 12 },
  session: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: space.radius },
  sessionMinutes: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sessionMinutesText: { fontSize: 20, fontWeight: "700" },
  sessionTitle: { fontSize: 17, fontWeight: "600" },
  sessionDetail: { fontSize: 14 },
  upgrade: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, marginTop: 24, borderRadius: space.radius },
  upgradeTitle: { fontSize: 16, fontWeight: "600" },
  upgradeDetail: { fontSize: 14 },
  pinned: { paddingHorizontal: space.gutter, paddingTop: 8 },
  fade: { position: "absolute", top: -24, left: 0 },
});
