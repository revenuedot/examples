// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: the root layout. Configures RevenueDot once and shares purchase state with every screen.
// Docs: https://revenuedot.app/docs/sdks/react-native   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PurchasesProvider } from "../lib/purchases";
import { useTheme } from "../lib/theme";

export default function RootLayout() {
  const t = useTheme();
  return (
    <PurchasesProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: t.bg }, headerTintColor: t.text, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="paywall" options={{ title: "Go Pro", presentation: "modal" }} />
      </Stack>
    </PurchasesProvider>
  );
}
