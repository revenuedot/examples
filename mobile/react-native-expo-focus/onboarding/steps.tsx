// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the quiz screens: welcome, one question per screen, the "a plan beats willpower" insight and the
// reminders ask. Each has a big title, a short subtitle and one pinned button.
// Docs: https://revenuedot.app/docs/guides/targeting-and-experiments
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { ClipPath, Defs, G, Path, Rect, Circle } from "react-native-svg";
import { Bell } from "lucide-react-native";
import { BrandMark, FocusRing } from "../ui/brand";
import { OptionRow, PrimaryButton, QuietButton } from "../ui/controls";
import { useTweened } from "../ui/motion";
import { font, space, useTheme } from "../theme";
import { optionLabel, type Question } from "./questions";

/** Every quiz screen: title, subtitle, scrolling content and a Continue pinned to the bottom. */
export function Screen({ title, subtitle, cta = "Continue", canContinue = true, next, children }: {
  title: string;
  subtitle?: string;
  cta?: string;
  canContinue?: boolean;
  next: () => void;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.screen}>
      <Text style={[font.display(30, -0.6), styles.title, { color: t.ink }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: t.ink2 }]}>{subtitle}</Text> : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} alwaysBounceVertical={false}>
        {children}
      </ScrollView>
      <PrimaryButton title={cta} onPress={next} disabled={!canContinue} />
    </View>
  );
}

export function Welcome({ next }: { next: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.screen, { paddingTop: 12 }]}>
      <View style={styles.brandRow}>
        <BrandMark size={28} />
        <Text style={[styles.brandName, { color: t.ink }]}>Focus</Text>
      </View>
      <View style={styles.center}>
        <FocusRing progress={0.68} size={196} lineWidth={14} from={0}>
          <Text style={[styles.ringValue, font.digits, { color: t.ink }]}>41</Text>
          <Text style={[font.caption, { color: t.ink2 }]}>of 60 min</Text>
        </FocusRing>
      </View>
      <Text style={[font.display(40, -1.2), { color: t.ink }]}>Do your best work, every day.</Text>
      <Text style={[styles.lead, { color: t.ink2 }]}>Focus sessions built around your goal. Setup takes a minute.</Text>
      <View style={{ marginTop: 32 }}>
        <PrimaryButton title="Get started" onPress={next} />
      </View>
      <Text style={[font.caption, styles.credit, { color: t.ink3 }]}>A RevenueDot sample app</Text>
    </View>
  );
}

export function QuestionStep({ question, answer, onAnswer, next }: { question: Question; answer?: string; onAnswer: (v: string) => void; next: () => void }) {
  return (
    <Screen title={question.title} subtitle={question.subtitle} canContinue={answer != null} next={next}>
      <View style={{ gap: 12 }}>
        {question.options.map((o) => (
          <OptionRow key={o.value} title={optionLabel(question.id, o.value)} subtitle={o.detail} icon={o.icon} selected={answer === o.value} onPress={() => onAnswer(o.value)} />
        ))}
      </View>
    </Screen>
  );
}

/** Between questions: why the method works. The curves are an illustration, not data, and say so. */
export function Insight({ goal, next }: { goal: string; next: () => void }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const drawn = useTweened(1, { from: 0, duration: 1100, delay: 200 });
  const pad = 20;
  const h = 200;
  const w = Math.max(width - pad * 2, 0);
  const plan = curve([0.18, 0.28, 0.4, 0.52, 0.66, 0.78, 0.92], w, h);
  const willpower = curve([0.18, 0.22, 0.2, 0.17, 0.15, 0.12, 0.1], w, h);
  return (
    <Screen title="A plan beats willpower." subtitle="Short daily sessions compound. Willpower fades by week two." next={next}>
      <View style={{ gap: 16 }}>
        <View style={[styles.chart, { backgroundColor: t.fill }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 ? (
            <Svg width={width} height={h + pad * 2}>
              <Defs>
                {/* Drawing the curves left to right: a clip that widens, so the dashed line keeps its dashes. */}
                <ClipPath id="reveal">
                  <Rect x={0} y={0} width={pad + w * drawn + 4} height={h + pad * 2} />
                </ClipPath>
              </Defs>
              <G clipPath="url(#reveal)">
                <G transform={`translate(${pad} ${pad})`}>
                  <Path d={willpower} stroke={t.ink3} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="4 6" fill="none" />
                  <Path d={plan} stroke={t.ink} strokeWidth={3.5} strokeLinecap="round" fill="none" />
                </G>
              </G>
              <Circle cx={pad + w} cy={pad + h * (1 - 0.92)} r={7} fill={t.accent} opacity={drawn > 0.98 ? 1 : 0} />
            </Svg>
          ) : null}
        </View>
        <View style={styles.legendRow}>
          <Legend color={t.ink} text="With a daily plan" />
          <Legend color={t.ink3} text="On willpower" faded />
        </View>
        <Text style={[font.caption, { color: t.ink3 }]}>
          Illustration. Your Focus plan for {goal.toLowerCase()} keeps sessions short enough to start every day.
        </Text>
      </View>
    </Screen>
  );
}

function Legend({ color, text, faded }: { color: string; text: string; faded?: boolean }) {
  const t = useTheme();
  return (
    <View style={styles.legend}>
      <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: color, opacity: faded ? 0.7 : 1 }} />
      <Text style={[styles.legendText, { color: t.ink2 }]}>{text}</Text>
    </View>
  );
}

/** A smooth line through evenly spaced points; values are heights from 0 (bottom) to 1 (top). */
function curve(points: number[], w: number, h: number): string {
  const pts = points.map((v, i) => [(w * i) / (points.length - 1), h - h * v] as const);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const mid = (ax + bx) / 2;
    d += ` C ${mid} ${ay} ${mid} ${by} ${bx} ${by}`;
  }
  return d;
}

/**
 * Explains the reminder before any system prompt. To schedule real reminders, add expo-notifications and call
 * `Notifications.requestPermissionsAsync()` in `turnOn`; the sample leaves it out because its config plugin adds
 * the push entitlement, which a free Apple developer account can't sign.
 */
export function Reminders({ time, next }: { time: string; next: () => void }) {
  const t = useTheme();
  const turnOn = () => next();
  return (
    <View style={styles.screen}>
      <View style={{ flex: 1 }} />
      <View style={styles.bellWrap}>
        <View style={[styles.bell, { backgroundColor: t.fill }]}>
          <Bell size={40} color={t.ink} strokeWidth={1.6} />
        </View>
        <View style={[styles.bellDot, { backgroundColor: t.accent }]} />
      </View>
      <Text style={[font.display(30, -0.6), { color: t.ink, marginTop: 28 }]}>Get a nudge when you're sharpest.</Text>
      <Text style={[styles.subtitle, { color: t.ink2, marginTop: 10 }]}>
        One quiet reminder each {time.toLowerCase()}. People who turn reminders on keep their streak far longer.
      </Text>
      <View style={{ flex: 1 }} />
      <PrimaryButton title="Turn on reminders" onPress={turnOn} />
      <View style={{ marginTop: 6 }}>
        <QuietButton title="Not now" onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.gutter, paddingBottom: 12 },
  title: { marginTop: 20 },
  subtitle: { fontSize: 17, lineHeight: 22, marginTop: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandName: { fontSize: 17, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  ringValue: { fontSize: 52, fontWeight: "700", lineHeight: 58 },
  lead: { fontSize: 18, lineHeight: 24, marginTop: 12 },
  credit: { textAlign: "center", marginTop: 14 },
  chart: { borderRadius: space.radius, overflow: "hidden" },
  legendRow: { flexDirection: "row", gap: 20 },
  legend: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendText: { fontSize: 14, fontWeight: "500" },
  bellWrap: { width: 88, height: 88 },
  bell: { width: 88, height: 88, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  bellDot: { position: "absolute", width: 16, height: 16, borderRadius: 8, top: -4, right: -4 },
});
