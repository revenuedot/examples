// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the paywall's two pages. Page 1 sells the value in the user's own words; page 2 shows how the free
// trial works, then the plan cards, where the billed amount is always the largest price.
// Docs: https://revenuedot.app/docs/guides/paywalls
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Bell, BellOff, ChartLine, LockOpen, Star, Target, Timer, type LucideIcon } from "lucide-react-native";
import { config } from "../config";
import { goalOf, minutesOf, type Answers } from "../onboarding/questions";
import type { Plan } from "../plans";
import { font, haptic, space, useTheme } from "../theme";
import { Border, Eyebrow, SelectionDot, Tap } from "../ui/controls";

/** Page 1: short benefit lines in the user's words, no comparison table. */
export function ValuePage({ answers }: { answers: Answers }) {
  const t = useTheme();
  const benefits: [LucideIcon, string, string][] = [
    [Target, `Your ${minutesOf(answers)}-minute daily plan`, `Built for ${goalOf(answers).toLowerCase()}, adjusted every week`],
    [Timer, "Unlimited deep sessions", "25, 50 and 90 minutes, or your own length"],
    [BellOff, "Distraction shield", `Silences ${(answers.obstacle ?? "notifications").toLowerCase()} while you focus`],
    [ChartLine, "Progress you can see", "Streaks, weekly reports and focus trends"],
  ];
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} alwaysBounceVertical={false}>
      <Eyebrow text="Focus Pro" />
      <Text style={[font.display(34, -0.9), { color: t.ink, marginTop: 10 }]}>
        Your plan for {goalOf(answers).toLowerCase()} is ready. Unlock it.
      </Text>
      <View style={styles.benefits}>
        {benefits.map(([Icon, title, detail]) => (
          <View key={title} style={styles.benefit}>
            <View style={[styles.benefitIcon, { backgroundColor: t.fill }]}>
              <Icon size={20} color={t.ink} strokeWidth={1.8} />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: t.ink }]}>{title}</Text>
              <Text style={[styles.benefitDetail, { color: t.ink2 }]}>{detail}</Text>
            </View>
          </View>
        ))}
      </View>
      {config.review ? (
        <View style={styles.review}>
          <View style={{ flexDirection: "row", gap: 2 }}>
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={12} color={t.accent} fill={t.accent} />)}
          </View>
          <Text style={{ fontSize: 15, color: t.ink }}>“{config.review.text}”</Text>
          <Text style={[font.caption, { color: t.ink2 }]}>{config.review.author}</Text>
          <Border color={t.hairline} />
        </View>
      ) : null}
    </ScrollView>
  );
}

/** Page 2: how the trial works, then the plans with annual first. */
export function PlansPage({ plans, selected, onSelect }: { plans: Plan[]; selected: Plan | undefined; onSelect: (id: string) => void }) {
  const t = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} alwaysBounceVertical={false}>
      {selected?.trialDays ? (
        <>
          <Text style={[font.display(28, -0.6), { color: t.ink }]}>How your free trial works</Text>
          <TrialTimeline days={selected.trialDays} price={selected.price} />
        </>
      ) : (
        <Text style={[font.display(28, -0.6), { color: t.ink }]}>Choose your plan</Text>
      )}
      <View style={styles.cards}>
        {plans.map((p) => <PlanCard key={p.id} plan={p} selected={p.id === selected?.id} onPress={() => onSelect(p.id)} />)}
      </View>
    </ScrollView>
  );
}

/** Today, reminder, charge: the three steps that take the fear out of a trial. */
function TrialTimeline({ days, price }: { days: number; price: string }) {
  const t = useTheme();
  const steps: [LucideIcon, string, string][] = [
    [LockOpen, "Today", "Get full access to your plan and every session."],
    [Bell, `Day ${Math.max(days - 2, 1)}`, "We'll remind you that your trial is ending."],
    [Star, `Day ${days}`, `You're charged ${price}. Cancel anytime before.`],
  ];
  return (
    <View style={{ marginTop: 24 }}>
      {steps.map(([Icon, title, detail], i) => {
        const last = i === steps.length - 1;
        return (
          <View key={title} style={styles.stepRow}>
            <View style={styles.stepRail}>
              <View style={[styles.stepIcon, { backgroundColor: i === 0 ? t.accent : t.fill }]}>
                <Icon size={16} color={i === 0 ? "#000" : t.ink2} strokeWidth={2.2} />
              </View>
              {last ? null : <View style={[styles.stepLine, { backgroundColor: t.hairline }]} />}
            </View>
            <View style={[styles.stepText, { paddingBottom: last ? 0 : 14 }]}>
              <Text style={[styles.stepTitle, { color: t.ink }]}>{title}</Text>
              <Text style={[styles.stepDetail, { color: t.ink2 }]}>{detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PlanCard({ plan, selected, onPress }: { plan: Plan; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Tap onPress={() => { haptic.select(); onPress(); }} label={`${plan.title}, ${plan.price}`} selected={selected} style={[styles.card, selected && { backgroundColor: t.fill }]}>
      <SelectionDot on={selected} />
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, { color: t.ink }]}>{plan.title}</Text>
        {plan.trialDays ? <Text style={[styles.cardDetail, { color: t.ink2 }]}>{plan.trialDays}-day free trial</Text> : null}
      </View>
      <View style={styles.cardPrice}>
        <Text style={[styles.price, font.digits, { color: t.ink }]}>{plan.price}</Text>
        {plan.perWeek ? <Text style={[styles.perWeek, { color: t.ink2 }]}>{plan.perWeek}</Text> : null}
      </View>
      <Border color={selected ? t.ink : t.hairline} width={selected ? 2 : 1} />
      {plan.badge ? (
        <View style={[styles.badge, { backgroundColor: t.accent }]}>
          <Text style={styles.badgeText}>{plan.badge.toUpperCase()}</Text>
        </View>
      ) : null}
    </Tap>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.gutter, paddingTop: 8, paddingBottom: 8 },
  benefits: { marginTop: 32, gap: 22 },
  benefit: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  benefitText: { flex: 1, gap: 3 },
  benefitTitle: { fontSize: 17, fontWeight: "600" },
  benefitDetail: { fontSize: 15, lineHeight: 20 },
  review: { marginTop: 32, padding: 16, gap: 8, borderRadius: space.radius },
  stepRow: { flexDirection: "row", gap: 16 },
  stepRail: { alignItems: "center" },
  stepIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  stepLine: { width: 2, flex: 1, minHeight: 22 },
  stepText: { flex: 1, gap: 3, paddingTop: 6 },
  stepTitle: { fontSize: 17, fontWeight: "600" },
  stepDetail: { fontSize: 15, lineHeight: 20 },
  cards: { marginTop: 28, gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 18, borderRadius: space.radius },
  cardText: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  cardDetail: { fontSize: 14 },
  cardPrice: { alignItems: "flex-end", gap: 3 },
  price: { fontSize: 17, fontWeight: "700" },
  perWeek: { fontSize: 13 },
  badge: { position: "absolute", top: -11, right: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: "#000" },
});
