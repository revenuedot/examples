// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the paywall. Lists the current offering's packages, buys the selected one and restores purchases.
// Docs: https://revenuedot.app/docs/sdks/react-native   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { usePurchases } from "../lib/purchases";
import { errorText } from "../lib/revenuedot";
import { useTheme } from "../lib/theme";

export default function Paywall() {
  const { status, error, offering, purchase, restore } = usePurchases();
  const router = useRouter();
  const t = useTheme();
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const packages = offering?.availablePackages ?? [];
  const selected: PurchasesPackage | undefined = packages.find((p) => p.identifier === picked) ?? packages[0];

  async function run(action: () => Promise<boolean>, none: string) {
    setBusy(true);
    setNote(null);
    try {
      if (await action()) router.back();
      else setNote(none);
    } catch (e) {
      setNote(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: "800" }}>Unlock Pro</Text>
      <Text style={{ color: t.muted, fontSize: 15, lineHeight: 21 }}>Pick a plan. In the Test Store a dialog asks you to confirm, and no money moves.</Text>

      {status === "loading" && <ActivityIndicator />}
      {status === "error" && <Text style={{ color: t.danger }}>{error}</Text>}
      {status === "ready" && packages.length === 0 && (
        <Text style={{ color: t.muted }}>No offering is current yet. In your RevenueDot project, make an offering current and add a package to it (npm run setup:test-store does this).</Text>
      )}

      {packages.map((pkg) => {
        const on = pkg.identifier === selected?.identifier;
        return (
          <Pressable
            key={pkg.identifier}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => setPicked(pkg.identifier)}
            style={{ backgroundColor: t.card, borderColor: on ? t.accent : t.border, borderWidth: on ? 2 : 1, borderRadius: 14, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>{pkg.product.title || pkg.identifier}</Text>
              {pkg.product.description ? <Text style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>{pkg.product.description}</Text> : null}
            </View>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>{pkg.product.priceString}</Text>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        disabled={busy || !selected}
        onPress={() => selected && void run(() => purchase(selected), "Purchase cancelled.")}
        style={{ backgroundColor: t.accent, borderRadius: 12, paddingVertical: 16, alignItems: "center", opacity: busy || !selected ? 0.5 : 1 }}
      >
        <Text style={{ color: t.onAccent, fontSize: 16, fontWeight: "700" }}>{busy ? "Working..." : "Continue"}</Text>
      </Pressable>

      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(restore, "Nothing to restore for this account.")} style={{ alignItems: "center", paddingVertical: 8 }}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }}>Restore purchases</Text>
      </Pressable>

      {note ? <Text style={{ color: t.muted, textAlign: "center" }}>{note}</Text> : null}
      <Text style={{ color: t.muted, fontSize: 12, textAlign: "center" }}>Before you ship, add links to your Terms of Use and Privacy Policy here. Apple requires both on every paywall.</Text>
    </ScrollView>
  );
}
