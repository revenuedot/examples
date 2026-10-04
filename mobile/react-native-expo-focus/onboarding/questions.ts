// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the onboarding quiz content and step order. Each question id becomes a customer attribute
// `onboarding_<id>` in RevenueDot, so audiences and experiments can target the answers.
// Docs: https://revenuedot.app/docs/guides/targeting-and-experiments
import {
  BellDot, BookOpen, BookText, Hourglass, Laptop, Moon, Paintbrush, Smartphone, Sun, Sunrise, Sunset, Volume2, type LucideIcon,
} from "lucide-react-native";

/** The user's answers, keyed by question id. */
export type Answers = Record<string, string>;

export const goalOf = (a: Answers) => a.goal ?? "Deep work";
export const minutesOf = (a: Answers) => Number(a.daily_minutes) || 30;
export const bestTimeOf = (a: Answers) => a.best_time ?? "Morning";

export type Question = {
  id: string;
  title: string;
  subtitle: string;
  options: { value: string; detail?: string; icon?: LucideIcon }[];
};

export const questions: Question[] = [
  {
    id: "goal",
    title: "What do you want to focus on?",
    subtitle: "We'll shape every session around it.",
    options: [
      { value: "Deep work", detail: "Long, uninterrupted blocks", icon: Laptop },
      { value: "Study", detail: "Exams, courses, languages", icon: BookOpen },
      { value: "Creative projects", detail: "Writing, design, music", icon: Paintbrush },
      { value: "Reading", detail: "Finish more books", icon: BookText },
    ],
  },
  {
    id: "attention",
    title: "How long can you focus before you get distracted?",
    subtitle: "Be honest. There's no wrong answer.",
    options: [{ value: "Under 10 minutes" }, { value: "10 to 25 minutes" }, { value: "25 to 45 minutes" }, { value: "Over 45 minutes" }],
  },
  {
    id: "obstacle",
    title: "What breaks your focus most?",
    subtitle: "We'll guard against it first.",
    options: [
      { value: "My phone", icon: Smartphone },
      { value: "Notifications", icon: BellDot },
      { value: "Putting it off", icon: Hourglass },
      { value: "Noise around me", icon: Volume2 },
    ],
  },
  {
    id: "best_time",
    title: "When do you feel sharpest?",
    subtitle: "Your sessions will start then.",
    options: [
      { value: "Morning", icon: Sunrise },
      { value: "Afternoon", icon: Sun },
      { value: "Evening", icon: Sunset },
      { value: "Late night", icon: Moon },
    ],
  },
  {
    id: "daily_minutes",
    title: "How much time can you give it a day?",
    subtitle: "Small and steady beats big and rare.",
    options: [
      { value: "15", detail: "Easy start" },
      { value: "30", detail: "Most popular" },
      { value: "60", detail: "Serious" },
      { value: "90", detail: "All in" },
    ],
  },
  {
    id: "source",
    title: "How did you hear about us?",
    subtitle: "It helps us reach people like you.",
    options: [
      { value: "App Store" }, { value: "A friend" }, { value: "TikTok" }, { value: "Instagram" }, { value: "YouTube" }, { value: "Somewhere else" },
    ],
  },
];

export type Step =
  | { kind: "welcome" }
  | { kind: "question"; index: number }
  | { kind: "insight" }
  | { kind: "reminders" }
  | { kind: "building" }
  | { kind: "plan" };

const q = (index: number): Step => ({ kind: "question", index });

/** The insight screen sits after the obstacle question, where the user has just named the problem. */
export const steps: Step[] = [
  { kind: "welcome" }, q(0), q(1), q(2), { kind: "insight" }, q(3), q(4), q(5), { kind: "reminders" }, { kind: "building" }, { kind: "plan" },
];

/** "60" reads as "1 hour" on the daily-minutes question. */
export function optionLabel(questionId: string, value: string): string {
  if (questionId !== "daily_minutes") return value;
  const m = Number(value);
  return m === 60 ? "1 hour" : m === 90 ? "1.5 hours" : `${m} minutes`;
}
