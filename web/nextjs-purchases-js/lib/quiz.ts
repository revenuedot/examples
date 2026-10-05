// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the Focus onboarding quiz, the same questions and copy as the mobile sample apps (examples/mobile/DESIGN.md).
// Each answer is saved as the customer attribute onboarding_<question id>, so audiences and experiments can use it.
// Docs: https://revenuedot.app/docs/guides/targeting-and-experiments
import type { IconName } from "./icons";

export type Answers = Record<string, string>;

export interface Question {
  id: string;
  title: string;
  subtitle: string;
  options: { value: string; label?: string; detail?: string; icon?: IconName }[];
}

export const QUESTIONS: Record<string, Question> = {
  goal: {
    id: "goal", title: "What do you want to focus on?", subtitle: "We'll shape every session around it.",
    options: [
      { value: "Deep work", detail: "Long, uninterrupted blocks", icon: "laptop" },
      { value: "Study", detail: "Exams, courses, languages", icon: "book" },
      { value: "Creative projects", detail: "Writing, design, music", icon: "brush" },
      { value: "Reading", detail: "Finish more books", icon: "bookOpen" },
    ],
  },
  attention: {
    id: "attention", title: "How long can you focus before you get distracted?", subtitle: "Be honest. There's no wrong answer.",
    options: [{ value: "Under 10 minutes" }, { value: "10 to 25 minutes" }, { value: "25 to 45 minutes" }, { value: "Over 45 minutes" }],
  },
  obstacle: {
    id: "obstacle", title: "What breaks your focus most?", subtitle: "We'll guard against it first.",
    options: [
      { value: "My phone", icon: "phone" }, { value: "Notifications", icon: "bellBadge" },
      { value: "Putting it off", icon: "hourglass" }, { value: "Noise around me", icon: "speaker" },
    ],
  },
  best_time: {
    id: "best_time", title: "When do you feel sharpest?", subtitle: "Your sessions will start then.",
    options: [
      { value: "Morning", icon: "sunrise" }, { value: "Afternoon", icon: "sun" },
      { value: "Evening", icon: "sunset" }, { value: "Late night", icon: "moon" },
    ],
  },
  daily_minutes: {
    id: "daily_minutes", title: "How much time can you give it a day?", subtitle: "Small and steady beats big and rare.",
    options: [
      { value: "15", label: "15 minutes", detail: "Easy start" }, { value: "30", label: "30 minutes", detail: "Most popular" },
      { value: "60", label: "1 hour", detail: "Serious" }, { value: "90", label: "1.5 hours", detail: "All in" },
    ],
  },
  source: {
    id: "source", title: "How did you hear about us?", subtitle: "It helps us reach people like you.",
    options: [
      { value: "App Store" }, { value: "A friend" }, { value: "TikTok" }, { value: "Instagram" }, { value: "YouTube" }, { value: "Somewhere else" },
    ],
  },
};

/** Used by the ?screen= preview links, so any screen can be opened directly with believable answers. */
export const SAMPLE_ANSWERS: Answers = {
  goal: "Deep work", attention: "10 to 25 minutes", obstacle: "My phone", best_time: "Morning", daily_minutes: "60", source: "A friend",
};

export const goalOf = (a: Answers) => (a.goal ?? "Deep work").toLowerCase();
export const minutesOf = (a: Answers) => Number(a.daily_minutes) || 30;
export const timeOf = (a: Answers) => (a.best_time ?? "Morning").toLowerCase();
export const obstacleOf = (a: Answers) => (a.obstacle ?? "notifications").toLowerCase();

/** onboarding_goal, onboarding_daily_minutes, …: the attribute names RevenueDot audiences filter on. */
export function toAttributes(a: Answers): Record<string, string> {
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [`onboarding_${k}`, v]));
}
