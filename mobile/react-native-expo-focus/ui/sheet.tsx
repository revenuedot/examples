// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: a short bottom sheet (the exit offer). React Native's Modal has no height detents, so the sheet
// slides up over a dimmed backdrop itself; it works the same on iOS, Android and the web.
// Docs: https://revenuedot.app/docs/guides/paywalls
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nativeDriver, useTheme } from "../theme";

export function BottomSheet({ visible, height, onDismiss, children }: { visible: boolean; height: number; onDismiss: () => void; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(v, {
      toValue: visible ? 1 : 0,
      duration: visible ? 340 : 240,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start(({ finished }) => { if (finished && !visible) setMounted(false); });
  }, [visible, v]);

  const total = height + insets.bottom;
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] }) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Dismiss" />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { height: total, paddingBottom: insets.bottom, backgroundColor: t.sheet, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [total, 0] }) }] },
        ]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "#000" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden" },
});
