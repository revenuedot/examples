// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the brand mark (an ink tile with an R whose leg ends in the gold dot) and the progress ring
// (hairline track, ink arc, gold dot at the tip), drawn with react-native-svg.
// Docs: https://revenuedot.app/docs/sdks/react-native   Design notes: ../../DESIGN.md
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../theme";
import { useTweened } from "./motion";

export function BrandMark({ size = 44 }: { size?: number }) {
  const t = useTheme();
  const dot = size * 0.2;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: t.ink, alignItems: "center", justifyContent: "center" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={{ color: t.ground, fontSize: size * 0.56, lineHeight: size * 0.7, fontWeight: "700", transform: [{ translateX: -size * 0.04 }] }}>R</Text>
      <View style={{ position: "absolute", width: dot, height: dot, borderRadius: dot / 2, backgroundColor: t.accent, left: size * 0.5 + size * 0.22 - dot / 2, top: size * 0.5 + size * 0.2 - dot / 2 }} />
    </View>
  );
}

/** `progress` runs 0 to 1; changes ease in. `from` sets where the first draw starts (0 animates it in). */
export function FocusRing({ progress, size, lineWidth = 12, from, children }: { progress: number; size: number; lineWidth?: number; from?: number; children?: ReactNode }) {
  const t = useTheme();
  const p = useTweened(Math.min(Math.max(progress, 0), 1), { duration: 700, from });
  const r = (size - lineWidth) / 2;
  const c = size / 2;
  const length = 2 * Math.PI * r;
  const a = (360 * p - 90) * (Math.PI / 180);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={t.hairline} strokeWidth={lineWidth} fill="none" />
        {p > 0.001 ? (
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={t.ink}
            strokeWidth={lineWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${length} ${length}`}
            strokeDashoffset={length * (1 - p)}
            transform={`rotate(-90 ${c} ${c})`}
          />
        ) : null}
        {p > 0.001 ? <Circle cx={c + r * Math.cos(a)} cy={c + r * Math.sin(a)} r={lineWidth * 0.275} fill={t.accent} /> : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>{children}</View>
    </View>
  );
}
