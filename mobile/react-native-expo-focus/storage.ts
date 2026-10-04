// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: what Focus keeps on the device: whether onboarding is done, the answers, minutes focused per day and
// how many sessions were finished. Subscription state is never stored here; it always comes from RevenueDot.
// Docs: https://revenuedot.app/docs/sdks/react-native
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
}

/** "2026-09-30" in local time, the key for one day of the focus log. */
export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
