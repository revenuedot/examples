// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: light and dark colours and the few shared styles, so the screens stay short.
// Docs: https://revenuedot.app/docs/sdks/react-native   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { useColorScheme } from "react-native";

const light = { bg: "#ffffff", card: "#f4f4f5", text: "#111111", muted: "#6b7280", border: "#e4e4e7", accent: "#111111", onAccent: "#ffffff", ok: "#16a34a", danger: "#dc2626" };
const dark = { bg: "#000000", card: "#18181b", text: "#fafafa", muted: "#a1a1aa", border: "#27272a", accent: "#fafafa", onAccent: "#000000", ok: "#4ade80", danger: "#f87171" };

export type Theme = typeof light;

/** Colours for the current system appearance. */
export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
