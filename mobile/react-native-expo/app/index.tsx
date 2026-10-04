// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the home screen. Free content, a Pro-gated card, restore purchases and the connection details.
// Docs: https://revenuedot.app/docs/concepts/entitlements   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Purchases from "react-native-purchases";
import { ProGate } from "../lib/ProGate";
import { usePurchases } from "../lib/purchases";
import { ENTITLEMENT, errorText, serverHost } from "../lib/revenuedot";
import { useTheme } from "../lib/theme";

export default function Home() {
  const { status, error, isPro, customerInfo, restore, reload } = usePurchases();
  const t = useTheme();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRestore() {
    setBusy(true);
    setNote(null);
    try {
      setNote((await restore()) ? "Restored: Pro is active." : "Nothing to restore for this account.");
    } catch (e) {
      setNote(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const expires = customerInfo?.entitlements.active[ENTITLEMENT]?.expirationDate;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ color: t.text, fontSize: 28, fontWeight: "800" }}>{isPro ? "You are Pro" : "Welcome"}</Text>
      <Text style={{ color: t.muted, fontSize: 15, lineHeight: 21 }}>Everything on this screen is free except the card below, which sits behind the "{ENTITLEMENT}" entitlement.</Text>

      {status === "loading" && <ActivityIndicator />}
      {status === "error" && (
        <View style={{ backgroundColor: t.card, borderRadius: 12, padding: 16, gap: 8 }}>
          <Text style={{ color: t.danger, fontWeight: "600" }}>RevenueDot is not connected</Text>
          <Text style={{ color: t.muted }}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void reload()}>
            <Text style={{ color: t.text, fontWeight: "600" }}>Try again</Text>
          </Pressable>
        </View>
      )}

      <ProGate>
        <View style={{ backgroundColor: t.card, borderColor: t.ok, borderWidth: 1, borderRadius: 16, padding: 20, gap: 8 }}>
          <Text style={{ color: t.ok, fontSize: 18, fontWeight: "700" }}>Pro unlocked</Text>
          <Text style={{ color: t.text, fontSize: 15, lineHeight: 21 }}>Put your paid feature here. This card only renders while the entitlement is active.</Text>
          {expires ? <Text style={{ color: t.muted, fontSize: 13 }}>Renews or ends {new Date(expires).toLocaleDateString()}</Text> : null}
        </View>
      </ProGate>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void onRestore()}
        style={{ borderColor: t.border, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: busy ? 0.5 : 1 }}
      >
        <Text style={{ color: t.text, fontSize: 16, fontWeight: "600" }}>Restore purchases</Text>
      </Pressable>
      {note ? <Text style={{ color: t.muted, textAlign: "center" }}>{note}</Text> : null}

      <View style={{ gap: 4, marginTop: 8 }}>
        <Text style={{ color: t.muted, fontSize: 12 }}>Server: {serverHost}</Text>
        <Text selectable style={{ color: t.muted, fontSize: 12 }}>
          App user: {customerInfo?.originalAppUserId ?? "not loaded"}
        </Text>
        {__DEV__ && customerInfo ? (
          <Pressable onPress={() => void Purchases.invalidateCustomerInfoCache().then(reload)}>
            <Text style={{ color: t.muted, fontSize: 12, textDecorationLine: "underline" }}>Refresh from server</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
