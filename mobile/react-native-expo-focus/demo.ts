// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: development builds only. EXPO_PUBLIC_RD_SCREEN=<name> opens one screen with sample answers, for
// screenshots and UI tests: welcome, goal, insight, reminders, building, plan, paywall, plans, home, settings.
// Docs: https://revenuedot.app/docs/sdks/react-native
import type { Answers } from "./onboarding/questions";

const screens = ["welcome", "goal", "insight", "reminders", "building", "plan", "paywall", "plans", "home", "settings"] as const;
export type DemoName = (typeof screens)[number];

// Expo inlines EXPO_PUBLIC_ variables when it bundles, so set it before `expo start` (or restart with --clear).
const requested = process.env.EXPO_PUBLIC_RD_SCREEN;

export const demoScreen: DemoName | null = __DEV__ && screens.includes(requested as DemoName) ? (requested as DemoName) : null;

export const demoAnswers: Answers = {
  goal: "Deep work",
  attention: "10 to 25 minutes",
  obstacle: "My phone",
  best_time: "Morning",
  daily_minutes: "60",
  source: "A friend",
};

/** Where each onboarding demo screen sits in the step list (see onboarding/questions.ts). */
export const demoOnboardingStep: Partial<Record<DemoName, number>> = { welcome: 0, goal: 1, insight: 4, reminders: 8, building: 9, plan: 10 };
