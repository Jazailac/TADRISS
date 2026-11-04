import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';
const storageKey = 'tadriss.theme-preference';
const isPreference = (value: string | null): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';
type Appearance = {
  preference: ThemePreference;
  select: (value: ThemePreference) => void;
  motionAllowed: boolean;
};
const AppearanceContext = createContext<Appearance | null>(null);

/** Keep the requested mode distinct from the resolved device colour scheme. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [motionAllowed, setMotionAllowed] = useState(false);
  // Restore the saved choice: a language switch to or from Arabic reloads the whole app.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (alive && isPreference(saved)) {
          colorScheme.set(saved);
          setPreference(saved);
        }
      })
      .catch(() => {
        // Unreadable storage only means following the device until the next choice.
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (alive) setMotionAllowed(!reduced);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      setMotionAllowed(!reduced);
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  const select = (value: ThemePreference) => {
    colorScheme.set(value);
    setPreference(value);
    AsyncStorage.setItem(storageKey, value).catch(() => {
      // The choice still applies for this session.
    });
  };
  return (
    <AppearanceContext.Provider value={{ preference, select, motionAllowed }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): Appearance {
  const appearance = useContext(AppearanceContext);
  if (!appearance) throw new Error('useAppearance outside <AppearanceProvider>');
  return appearance;
}
