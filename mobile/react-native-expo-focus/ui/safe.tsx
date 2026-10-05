// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: a full-screen container that keeps content clear of the notch and the home indicator.
// Docs: https://revenuedot.app/docs/sdks/react-native
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";

export function SafeScreen({ bottom = true, children }: { bottom?: boolean; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.ground, paddingTop: insets.top, paddingBottom: bottom ? insets.bottom : 0 }}>
      {children}
    </View>
  );
}
