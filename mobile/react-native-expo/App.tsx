// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: a paywall screen: current offering, purchase, restore, customer info and logIn.
// Docs: https://revenuedot.app/docs/sdks/react-native   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Button, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesOffering, type PurchasesPackage } from "react-native-purchases";
import { configureRevenueDot } from "./revenuedot";

const ENTITLEMENT = "pro"; // the entitlement lookup key in your RevenueDot project

export default function App() {
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [appUserId, setAppUserId] = useState("");

  const load = useCallback(async () => {
    await configureRevenueDot();
    // Both calls go to your RevenueDot server: GET /v1/subscribers/{id}/offerings and GET /v1/subscribers/{id}.
    const [offerings, info] = await Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()]);
    setOffering(offerings.current);
    setCustomerInfo(info);
    setAppUserId(await Purchases.getAppUserID());
    if (!offerings.current) setMessage("No current offering. Create one in the RevenueDot dashboard.");
  }, []);

  useEffect(() => {
    load().catch((e) => setMessage(`Could not load: ${String(e?.message ?? e)}`)).finally(() => setBusy(false));
    // Customer info also changes outside this screen (renewals, logIn), so keep it in sync.
    const listener = (info: CustomerInfo) => setCustomerInfo(info);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
  }, [load]);

  const run = async (label: string, action: () => Promise<CustomerInfo>) => {
    setBusy(true);
    setMessage("");
    try {
      setCustomerInfo(await action());
      setAppUserId(await Purchases.getAppUserID());
      setMessage(`${label}: done.`);
    } catch (e: any) {
      // A cancelled purchase is not an error worth showing.
      setMessage(e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ? "Purchase cancelled." : `${label} failed: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  // The store (or the Test Store dialog) handles payment; the SDK then posts the receipt to POST /v1/receipts.
  const buy = (pkg: PurchasesPackage) => run("Purchase", async () => (await Purchases.purchasePackage(pkg)).customerInfo);
  // Restore asks the store for this Apple ID / Google account's purchases and sends them to RevenueDot.
  const restore = () => run("Restore", () => Purchases.restorePurchases());
  // logIn moves an anonymous user's purchases to your own user id (see the transfer rules in the docs).
  const logIn = () => userId.trim() && run("Log in", async () => (await Purchases.logIn(userId.trim())).customerInfo);

  const pro = customerInfo?.entitlements.active[ENTITLEMENT];
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Go Pro</Text>
      <Text style={styles.entitlement}>{pro ? `Pro is active${pro.expirationDate ? ` until ${pro.expirationDate}` : " for life"}` : "Pro is not active"}</Text>
      <FlatList
        data={offering?.availablePackages ?? []}
        keyExtractor={(p) => p.identifier}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => buy(item)} disabled={busy}>
            <Text style={styles.rowTitle}>{item.product.title || item.product.identifier}</Text>
            <Text>{item.product.priceString}</Text>
          </Pressable>
        )}
      />
      {busy ? <ActivityIndicator /> : null}
      <Text style={styles.message}>{message}</Text>
      <Button title="Restore purchases" onPress={restore} disabled={busy} />
      <View style={styles.login}>
        <TextInput style={styles.input} placeholder="Your user id" autoCapitalize="none" value={userId} onChangeText={setUserId} />
        <Button title="Log in" onPress={logIn} disabled={busy} />
      </View>
      <Text style={styles.small}>App user id: {appUserId || "…"}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 8, backgroundColor: "#FDFEF6" },
  title: { fontSize: 28, fontWeight: "700", marginTop: 24 },
  entitlement: { fontSize: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTitle: { fontWeight: "600" },
  message: { minHeight: 20 },
  login: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { flex: 1, borderWidth: StyleSheet.hairlineWidth, padding: 8 },
  small: { color: "#5E5852", fontSize: 12 },
});
