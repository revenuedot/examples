// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the entitlement gate. Wrap anything paid in <ProGate>; free users see the locked card instead.
// Docs: https://revenuedot.app/docs/concepts/entitlements   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { usePurchases } from "./purchases";
import { useTheme } from "./theme";

export function ProGate({ children }: { children: ReactNode }) {
  const { isPro, status } = usePurchases();
  const router = useRouter();
  const t = useTheme();
  if (isPro) return <>{children}</>;
  return (
    <View style={{ backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: 16, padding: 20, gap: 12 }}>
      <Text style={{ color: t.text, fontSize: 18, fontWeight: "700" }}>Pro feature</Text>
      <Text style={{ color: t.muted, fontSize: 15, lineHeight: 21 }}>This part of the app is for subscribers. Unlock it with a Test Store purchase; it costs nothing.</Text>
      <Pressable
        accessibilityRole="button"
        disabled={status === "loading"}
        onPress={() => router.push("/paywall")}
        style={{ backgroundColor: t.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: status === "loading" ? 0.5 : 1 }}
      >
        <Text style={{ color: t.onAccent, fontSize: 16, fontWeight: "600" }}>Unlock Pro</Text>
      </Pressable>
    </View>
  );
}
