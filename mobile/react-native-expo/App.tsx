// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the app's flow. First launch: onboarding, then the paywall, then home. Later launches open home,
// where Pro sessions open the paywall again.
// Docs: https://revenuedot.app/docs/sdks/react-native   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { demoAnswers, demoOnboardingStep, demoScreen } from "./demo";
import { Home } from "./home/Home";
import { RevenueDotProvider, useModel } from "./model";
import { Onboarding } from "./onboarding/Onboarding";
import type { Answers } from "./onboarding/questions";
import { Paywall } from "./paywall/Paywall";
import { readJSON, writeJSON } from "./storage";
import { nativeDriver, useTheme } from "./theme";
import { SafeScreen } from "./ui/safe";

export default function App() {
  return (
    <SafeAreaProvider>
      <RevenueDotProvider>
        <Root />
      </RevenueDotProvider>
    </SafeAreaProvider>
  );
}

type Saved = { onboarded: boolean; answers: Answers };

function Root() {
  const t = useTheme();
  const model = useModel();
  // A demo screen starts from sample answers and never writes to storage, so it can't change a real install.
  const [saved, setSaved] = useState<Saved | null>(
    demoScreen ? { onboarded: demoScreen === "home" || demoScreen === "settings", answers: demoAnswers } : null,
  );
  const [showPaywall, setShowPaywall] = useState(demoScreen === "paywall" || demoScreen === "plans");

  useEffect(() => {
    if (demoScreen) return;
    Promise.all([readJSON("onboarded", false), readJSON<Answers>("answers", {})]).then(([onboarded, answers]) => setSaved({ onboarded, answers }));
  }, []);

  const update = (next: Saved) => {
    setSaved(next);
    if (!demoScreen) {
      writeJSON("onboarded", next.onboarded);
      writeJSON("answers", next.answers);
    }
  };

  // Blank until storage answers, so a returning user doesn't see onboarding flash by.
  if (!saved) return <View style={{ flex: 1, backgroundColor: t.ground }} />;

  let screen: ReactNode;
  let key: string;
  if (saved.onboarded) {
    key = "home";
    screen = (
      <SafeScreen bottom={false}>
        <Home
          answers={saved.answers}
          openSettings={demoScreen === "settings"}
          restartOnboarding={() => {
            update({ ...saved, onboarded: false });
            setShowPaywall(false);
          }}
        />
      </SafeScreen>
    );
  } else if (showPaywall) {
    key = "paywall";
    screen = (
      <SafeScreen>
        <Paywall answers={saved.answers} startOnPlans={demoScreen === "plans"} onClose={() => update({ ...saved, onboarded: true })} />
      </SafeScreen>
    );
  } else {
    key = "onboarding";
    screen = (
      <SafeScreen>
        <Onboarding
          initialStep={(demoScreen && demoOnboardingStep[demoScreen]) ?? 0}
          initialAnswers={demoScreen ? demoAnswers : {}}
          onFinish={(answers) => {
            update({ onboarded: false, answers });
            model.saveAnswers(answers);
            setShowPaywall(true);
          }}
        />
      </SafeScreen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.ground }}>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <FadeIn key={key}>{screen}</FadeIn>
    </View>
  );
}

function FadeIn({ children }: { children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: nativeDriver }).start();
  }, [v]);
  return <Animated.View style={{ flex: 1, opacity: v }}>{children}</Animated.View>;
}
