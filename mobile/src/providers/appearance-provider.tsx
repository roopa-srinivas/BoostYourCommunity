import { createContext, use, useEffect, useState } from 'react';
import { Appearance, Platform, useColorScheme as useSystemColorScheme } from 'react-native';

export type AppearancePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'appearance';

type AppearanceState = {
  preference: AppearancePreference;
  /** What's actually showing: the preference, or the device's setting for "system". */
  scheme: 'light' | 'dark';
  setPreference: (preference: AppearancePreference) => void;
};

const AppearanceContext = createContext<AppearanceState>({
  preference: 'system',
  scheme: 'light',
  setPreference: () => {},
});

function readPreference(): AppearancePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Light, dark, or follow the device; remembered on this device. */
export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState(readPreference);
  const system = useSystemColorScheme();

  // On phones, also tell the OS, so native parts (tab bar, maps, keyboard,
  // switches) match. The web has no equivalent, so the app's colors follow
  // the context below.
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  function setPreference(next: AppearancePreference) {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Applies until the app closes.
    }
  }

  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  return <AppearanceContext value={{ preference, scheme, setPreference }}>{children}</AppearanceContext>;
}

export function useAppearance() {
  return use(AppearanceContext);
}
