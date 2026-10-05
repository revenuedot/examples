// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: small animation hooks on the built-in Animated API and requestAnimationFrame, so the sample needs no
// animation library. Both work the same on iOS, Android and the web.
// Docs: https://revenuedot.app/docs/sdks/react-native
import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { nativeDriver } from "../theme";

/** Eases a number toward `target` and re-renders on each frame; for SVG values the native driver can't animate. */
export function useTweened(target: number, { duration = 600, delay = 0, from: initial = target } = {}): number {
  const [value, setValue] = useState(initial);
  const from = useRef(initial);
  const current = useRef(initial);
  useEffect(() => {
    from.current = current.current;
    let frame = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      start ??= t + delay;
      const k = Math.min(Math.max((t - start) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - k, 3);
      current.current = from.current + (target - from.current) * eased;
      setValue(current.current);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay]);
  return value;
}

/** Slides and fades content in when it mounts: the step-to-step motion of onboarding and the paywall. */
export function useEnter(fromX: number, duration = 320) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [v, duration]);
  return {
    opacity: v,
    transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [fromX, 0] }) }],
  };
}
