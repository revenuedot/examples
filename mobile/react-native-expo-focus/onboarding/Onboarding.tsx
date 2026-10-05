// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the onboarding flow in the shape that converts best in 2026: one question per screen with a progress
// bar, an insight, a reminders ask, "building your plan", then the plan summary. The paywall comes right after.
// Docs: https://revenuedot.app/docs/guides/targeting-and-experiments
import { useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { haptic, useTheme } from "../theme";
import { StepBar } from "../ui/controls";
import { useEnter } from "../ui/motion";
import { BuildingPlan, PlanSummary } from "./plan";
import { bestTimeOf, goalOf, questions, steps, type Answers } from "./questions";
import { Insight, QuestionStep, Reminders, Welcome } from "./steps";

export function Onboarding({ initialStep = 0, initialAnswers = {}, onFinish }: { initialStep?: number; initialAnswers?: Answers; onFinish: (a: Answers) => void }) {
  const t = useTheme();
  const [index, setIndex] = useState(initialStep);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [forward, setForward] = useState(true);
  const step = steps[index];
  // The bar covers the quiz itself, not the welcome or the last two screens.
  const showsBar = index > 0 && index < steps.length - 2;

  const move = (by: number) => {
    setForward(by > 0);
    setIndex((i) => Math.min(Math.max(i + by, 0), steps.length - 1));
  };
  const next = () => move(1);

  let content;
  switch (step.kind) {
    case "welcome":
      content = <Welcome next={next} />;
      break;
    case "question": {
      const q = questions[step.index];
      content = <QuestionStep question={q} answer={answers[q.id]} onAnswer={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} next={next} />;
      break;
    }
    case "insight":
      content = <Insight goal={goalOf(answers)} next={next} />;
      break;
    case "reminders":
      content = <Reminders time={bestTimeOf(answers)} next={next} />;
      break;
    case "building":
      content = <BuildingPlan answers={answers} done={next} />;
      break;
    case "plan":
      content = <PlanSummary answers={answers} next={() => onFinish(answers)} />;
      break;
  }

  return (
    <View style={[styles.root, { backgroundColor: t.ground }]}>
      {showsBar ? (
        <View style={styles.nav}>
          <Pressable onPress={() => { haptic.tap(); move(-1); }} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Back">
            {({ pressed }) => <ChevronLeft size={26} color={t.ink} strokeWidth={2.2} style={{ opacity: pressed ? 0.4 : 1 }} />}
          </Pressable>
          <StepBar step={index} total={steps.length - 3} />
          <View style={styles.navButton} />
        </View>
      ) : null}
      <Enter key={index} from={forward ? 40 : -40}>{content}</Enter>
    </View>
  );
}

function Enter({ from, children }: { from: number; children: ReactNode }) {
  const style = useEnter(from);
  return <Animated.View style={[styles.content, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10 },
  navButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { flex: 1 },
});
