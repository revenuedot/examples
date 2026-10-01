// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the account sheet. The plan card reads the `pro` entitlement; Restore and Manage subscription are
// required on iOS. The collapsed Developer section shows what RevenueDot sees: app user id, entitlement, offering.
// Docs: https://revenuedot.app/docs/sdks/react-native
import { useState, type ReactNode } from "react";
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import Purchases from "react-native-purchases";
import { ChevronDown, ChevronRight, Copy, CreditCard, RotateCw, Sparkles, type LucideIcon } from "lucide-react-native";
import { config } from "../config";
import { useModel } from "../model";
import { serverHost } from "../revenuedot";
import { font, haptic, space, useTheme } from "../theme";
import { BrandMark } from "../ui/brand";
import { Border, Eyebrow, PrimaryButton } from "../ui/controls";

const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null);

export function Settings({ close, upgrade, restartOnboarding }: { close: () => void; upgrade: () => void; restartOnboarding: () => void }) {
  const t = useTheme();
  const model = useModel();
  const insets = useSafeAreaInsets();
  const [developer, setDeveloper] = useState(false);
  const [userID, setUserID] = useState("sandbox_user_1");
  const e = model.proEntitlement;

  const manage = async () => {
    try {
      await Purchases.showManageSubscriptions();
    } catch (err) {
      model.setMessage(`Manage subscription failed: ${(err as Error)?.message ?? String(err)}`);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: t.sheet }]}>
      <View style={styles.bar}>
        <Text style={[styles.barTitle, { color: t.ink }]}>Account</Text>
        <Pressable onPress={close} style={styles.done} accessibilityRole="button" hitSlop={8}>
          {({ pressed }) => <Text style={[styles.doneLabel, { color: t.ink, opacity: pressed ? 0.5 : 1 }]}>Done</Text>}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 24 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.planCard}>
          <View style={styles.planHead}>
            <View style={[styles.planDot, { backgroundColor: model.isPro ? t.accent : t.ink3 }]} />
            <Text style={[font.title(22), { color: t.ink }]}>{model.isPro ? "Focus Pro" : "Free plan"}</Text>
          </View>
          {e ? (
            <>
              <Text style={[styles.body15, { color: t.ink2 }]}>
                {e.willRenew ? `Renews ${shortDate(e.expirationDate) ?? ""}` : `Ends ${shortDate(e.expirationDate) ?? "never"}`}
              </Text>
              {e.periodType === "TRIAL" ? (
                <View style={[styles.trialTag, { backgroundColor: t.fill }]}>
                  <Text style={[styles.trialText, { color: t.ink }]}>Free trial</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={[styles.body15, { color: t.ink2 }]}>Upgrade for Deep and Flow sessions, weekly reports and the distraction shield.</Text>
              <PrimaryButton title="See plans" onPress={upgrade} />
            </>
          )}
          <Border color={t.hairline} radius={space.radius + 4} />
        </View>

        <Group>
          <Row icon={RotateCw} title="Restore purchases" onPress={() => model.restore()} />
          <Divider inset={52} />
          <Row icon={CreditCard} title="Manage subscription" onPress={manage} />
          <Divider inset={52} />
          <Row icon={Sparkles} title="Redo onboarding" onPress={restartOnboarding} />
        </Group>

        <View>
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setDeveloper((d) => !d);
            }}
            style={styles.devHead}
            accessibilityRole="button"
            accessibilityState={{ expanded: developer }}
          >
            <Eyebrow text="Developer" />
            <ChevronDown size={16} color={t.ink3} strokeWidth={2.4} style={{ transform: [{ rotate: developer ? "180deg" : "0deg" }] }} />
          </Pressable>
          {developer ? (
            <Group>
              <Field label="App user id" value={model.appUserID || "…"} copy />
              <Divider />
              <Field label={`Entitlement ${config.entitlement}`} value={model.isPro ? "active" : "not active"} />
              <Divider />
              <Field label="Subscriptions" value={model.activeSubscriptions.length ? model.activeSubscriptions.join(", ") : "none"} />
              <Divider />
              <Field label="Current offering" value={model.offeringID ?? "none"} />
              <Divider />
              <Field label="Server" value={serverHost} />
              <Divider />
              {model.loadError ? (
                <>
                  <Text style={[styles.loadError, { color: t.ink2 }]}>{model.loadError}</Text>
                  <Divider />
                </>
              ) : null}
              <View style={styles.login}>
                {model.loggedInID == null ? (
                  <TextInput
                    value={userID}
                    onChangeText={setUserID}
                    placeholder="User id"
                    placeholderTextColor={t.ink3}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { color: t.ink, fontFamily: font.mono }]}
                  />
                ) : (
                  <Text style={[styles.input, { color: t.ink, fontFamily: font.mono }]} numberOfLines={1}>{model.loggedInID}</Text>
                )}
                <Pressable
                  onPress={() => model.toggleLogin(userID.trim())}
                  disabled={model.busy || (model.loggedInID == null && !userID.trim())}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  {({ pressed }) => (
                    <Text style={[styles.loginLabel, { color: t.ink, opacity: model.busy ? 0.3 : pressed ? 0.5 : 1 }]}>
                      {model.loggedInID == null ? "Log in" : "Log out"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </Group>
          ) : null}
        </View>

        {model.message ? <Text style={[styles.message, { color: t.ink2 }]}>{model.message}</Text> : null}

        <View style={styles.credit}>
          <BrandMark size={22} />
          <Text style={[font.caption, { color: t.ink3, flex: 1 }]}>Subscriptions by RevenueDot, the open-source RevenueCat alternative.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Group({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.group}>
      {children}
      <Border color={t.hairline} />
    </View>
  );
}

function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.hairline, marginLeft: inset }} />;
}

function Row({ icon: Icon, title, onPress }: { icon: LucideIcon; title: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.fill }]}>
      <View style={styles.rowIcon}><Icon size={19} color={t.ink} strokeWidth={1.9} /></View>
      <Text style={[styles.rowTitle, { color: t.ink }]}>{title}</Text>
      <ChevronRight size={17} color={t.ink3} strokeWidth={2.4} />
    </Pressable>
  );
}

function Field({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: t.ink2 }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: t.ink, fontFamily: font.mono }]} numberOfLines={1} ellipsizeMode="middle" selectable>
        {value}
      </Text>
      {copy ? (
        <Pressable
          onPress={() => { Clipboard.setStringAsync(value).catch(() => {}); haptic.success(); }}
          accessibilityRole="button"
          accessibilityLabel="Copy app user id"
          hitSlop={10}
        >
          {({ pressed }) => <Copy size={15} color={t.ink2} strokeWidth={2} style={{ opacity: pressed ? 0.4 : 1 }} />}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { height: 56, alignItems: "center", justifyContent: "center" },
  barTitle: { fontSize: 17, fontWeight: "600" },
  done: { position: "absolute", right: 20, height: 56, justifyContent: "center" },
  doneLabel: { fontSize: 17, fontWeight: "600" },
  scroll: { paddingHorizontal: space.gutter, paddingTop: 8, gap: 28 },
  planCard: { padding: 20, gap: 14, borderRadius: space.radius + 4 },
  planHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  planDot: { width: 8, height: 8, borderRadius: 4 },
  body15: { fontSize: 15, lineHeight: 20 },
  trialTag: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  trialText: { fontSize: 13, fontWeight: "600" },
  group: { borderRadius: space.radius, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, minHeight: 52 },
  rowIcon: { width: 22, alignItems: "center" },
  rowTitle: { flex: 1, fontSize: 17 },
  devHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  field: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 48 },
  fieldLabel: { fontSize: 14 },
  fieldValue: { flex: 1, fontSize: 13, textAlign: "right" },
  loadError: { fontSize: 13, lineHeight: 18, padding: 16 },
  login: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, minHeight: 52 },
  input: { flex: 1, fontSize: 13, paddingVertical: 8 },
  loginLabel: { fontSize: 15, fontWeight: "600" },
  message: { fontSize: 14, lineHeight: 19 },
  credit: { flexDirection: "row", alignItems: "center", gap: 10 },
});
