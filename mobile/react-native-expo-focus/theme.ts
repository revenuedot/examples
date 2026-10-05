// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the Focus design tokens. Ink on white (inverted in dark mode), one gold accent, hairlines, light haptics.
// Docs: https://revenuedot.app/docs/sdks/react-native   Design notes: ../DESIGN.md
import { Platform, useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";

export type Palette = {
  ground: string;
  /** Sheets sit one step above the ground in dark mode, like iOS's elevated background. */
  sheet: string;
  ink: string;
  ink2: string;
  ink3: string;
  hairline: string;
  fill: string;
  accent: string;
  dark: boolean;
};

const ACCENT = "#F7B500";

const light: Palette = {
  ground: "#FFFFFF",
  sheet: "#FFFFFF",
  ink: "#000000",
  ink2: "rgba(0,0,0,0.62)",
  ink3: "rgba(0,0,0,0.42)",
  hairline: "rgba(0,0,0,0.10)",
  fill: "rgba(0,0,0,0.04)",
  accent: ACCENT,
  dark: false,
};

const dark: Palette = {
  ground: "#000000",
  sheet: "#1C1C1E",
  ink: "#FFFFFF",
  ink2: "rgba(255,255,255,0.62)",
  ink3: "rgba(255,255,255,0.42)",
  hairline: "rgba(255,255,255,0.10)",
  fill: "rgba(255,255,255,0.04)",
  accent: ACCENT,
  dark: true,
};

export function useTheme(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

export const space = { gutter: 24, radius: 16 } as const;

export const font = {
  /** Display titles: bold with tight tracking (40 welcome, 30 questions, 34 paywall). */
  display: (size: number, tracking = -size * 0.02) => ({ fontSize: size, fontWeight: "700" as const, letterSpacing: tracking }),
  title: (size = 22) => ({ fontSize: size, fontWeight: "600" as const }),
  body: { fontSize: 17 },
  caption: { fontSize: 13 },
  mono: Platform.select({ ios: "ui-monospace", android: "monospace", default: "ui-monospace, SFMono-Regular, Menlo, monospace" }),
  digits: { fontVariant: ["tabular-nums" as const] },
};

/** The native driver isn't available on the web build; everything else animates off the JS thread. */
export const nativeDriver = Platform.OS !== "web";

// Haptics do nothing on the web, and a phone with haptics off rejects; neither should surface as an error.
const quiet = (p: Promise<void>) => p.catch(() => {});
export const haptic = {
  tap: () => Platform.OS !== "web" && quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: () => Platform.OS !== "web" && quiet(Haptics.selectionAsync()),
  success: () => Platform.OS !== "web" && quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
