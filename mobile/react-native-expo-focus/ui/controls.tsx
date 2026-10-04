// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the shared controls of the Focus sample: pill buttons, option rows with the gold selection dot,
// the onboarding step bar and section labels. Every press scales to 0.97 and taps the haptic engine.
// Docs: https://revenuedot.app/docs/sdks/react-native   Design notes: ../../DESIGN.md
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { haptic, nativeDriver, space, useTheme } from "../theme";

type TapProps = {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  label?: string;
  selected?: boolean;
};

/** A pressable that scales down slightly while held, like SwiftUI's button press. */
export function Tap({ onPress, disabled, style, children, label, selected }: TapProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, speed: 40, bounciness: 0, useNativeDriver: nativeDriver }).start();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** The primary action: a full-width ink capsule, 56 tall. Disabled fades it to 30%. */
export function PrimaryButton({ title, onPress, busy, disabled }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  const t = useTheme();
  const fade = useRef(new Animated.Value(disabled ? 0.3 : 1)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: disabled ? 0.3 : 1, duration: 150, useNativeDriver: nativeDriver }).start();
  }, [disabled, fade]);
  return (
    <Animated.View style={{ opacity: fade }}>
      <Tap onPress={() => { haptic.tap(); onPress(); }} disabled={disabled || busy} label={title} style={[styles.primary, { backgroundColor: t.ink }]}>
        {busy ? <ActivityIndicator color={t.ground} /> : <Text style={[styles.primaryLabel, { color: t.ground }]}>{title}</Text>}
      </Tap>
    </Animated.View>
  );
}

/** A quiet text action under the primary button (Restore, Not now, No thanks). */
export function QuietButton({ title, onPress }: { title: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="button" style={styles.quiet} hitSlop={8}>
      {({ pressed }) => <Text style={[styles.quietLabel, { color: t.ink2, opacity: pressed ? 0.5 : 1 }]}>{title}</Text>}
    </Pressable>
  );
}

/** Empty ring, or an ink ring with the gold dot: the brand's "selected". */
export function SelectionDot({ on }: { on: boolean }) {
  const t = useTheme();
  const dot = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(dot, { toValue: on ? 1 : 0, speed: 24, bounciness: 8, useNativeDriver: nativeDriver }).start();
  }, [on, dot]);
  return (
    <View style={[styles.dotRing, { borderColor: on ? t.ink : t.ink3, borderWidth: on ? 2 : 1.5, opacity: on ? 1 : 0.6 }]}>
      <Animated.View style={[styles.dot, { backgroundColor: t.accent, transform: [{ scale: dot }] }]} />
    </View>
  );
}

/** A hairline card; selected means an ink border, the fill background and the gold dot. */
export function OptionRow({ title, subtitle, icon: Icon, selected, onPress, trailing }: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  selected: boolean;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Tap onPress={() => { haptic.select(); onPress(); }} label={title} selected={selected} style={[styles.option, selected && { backgroundColor: t.fill }]}>
      {Icon ? <View style={styles.optionIcon}><Icon size={20} color={t.ink} strokeWidth={1.8} /></View> : null}
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: t.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.optionSubtitle, { color: t.ink2 }]}>{subtitle}</Text> : null}
      </View>
      {trailing}
      <SelectionDot on={selected} />
      <Border color={selected ? t.ink : t.hairline} width={selected ? 1.5 : 1} />
    </Tap>
  );
}

/** A border drawn over a card, so a thicker selected border doesn't nudge the content (SwiftUI's strokeBorder). */
export function Border({ color, width = 1, radius = space.radius }: { color: string; width?: number; radius?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderColor: color, borderWidth: width, borderRadius: radius }]} />;
}

/** The thin progress bar over the onboarding quiz. */
export function StepBar({ step, total }: { step: number; total: number }) {
  const t = useTheme();
  const v = useRef(new Animated.Value(step / total)).current;
  useEffect(() => {
    // Width can't use the native driver, so this one runs on the JS thread.
    Animated.spring(v, { toValue: step / Math.max(total, 1), speed: 14, bounciness: 0, useNativeDriver: false }).start();
  }, [step, total, v]);
  return (
    <View style={[styles.bar, { backgroundColor: t.hairline }]} accessibilityLabel={`Step ${step} of ${total}`}>
      <Animated.View style={[styles.barFill, { backgroundColor: t.ink, width: v.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
    </View>
  );
}

/** Small uppercase label above a section. */
export function Eyebrow({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={[styles.eyebrow, { color: t.ink3 }]}>{text.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  primary: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  primaryLabel: { fontSize: 17, fontWeight: "600" },
  quiet: { minHeight: 44, alignItems: "center", justifyContent: "center", alignSelf: "center", paddingHorizontal: 12 },
  quietLabel: { fontSize: 15, fontWeight: "500" },
  dotRing: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderRadius: space.radius },
  optionIcon: { width: 28, alignItems: "center" },
  optionText: { flex: 1, gap: 3 },
  optionTitle: { fontSize: 17, fontWeight: "600" },
  optionSubtitle: { fontSize: 14 },
  bar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  eyebrow: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8, lineHeight: 16 },
});
