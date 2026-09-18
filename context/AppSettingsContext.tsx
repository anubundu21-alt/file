import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppearancePreference = 'system' | 'light' | 'dark';

type AppSettingsValue = {
  ready: boolean;
  appearance: AppearancePreference;
  notificationsEnabled: boolean;
  resolvedScheme: 'light' | 'dark';
  setAppearance: (value: AppearancePreference) => void;
  setNotificationsEnabled: (value: boolean) => void;
};

const APPEARANCE_KEY = 'sift-appearance';
const NOTIFICATIONS_KEY = 'sift-notifications';

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

function applyNativeScheme(preference: AppearancePreference) {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

function isAppearance(value: string | null): value is AppearancePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePreference>('system');
  const [notificationsEnabled, setNotificationsState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [storedAppearance, storedNotifications] = await Promise.all([
          AsyncStorage.getItem(APPEARANCE_KEY),
          AsyncStorage.getItem(NOTIFICATIONS_KEY),
        ]);
        if (!active) return;
        const nextAppearance = isAppearance(storedAppearance) ? storedAppearance : 'system';
        setAppearanceState(nextAppearance);
        applyNativeScheme(nextAppearance);
        if (storedNotifications === 'on' || storedNotifications === 'off') {
          setNotificationsState(storedNotifications === 'on');
        }
      } finally {
        if (active) setReady(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const setAppearance = useCallback((value: AppearancePreference) => {
    setAppearanceState(value);
    applyNativeScheme(value);
    void AsyncStorage.setItem(APPEARANCE_KEY, value);
  }, []);

  const setNotificationsEnabled = useCallback((value: boolean) => {
    setNotificationsState(value);
    void AsyncStorage.setItem(NOTIFICATIONS_KEY, value ? 'on' : 'off');
  }, []);

  const resolvedScheme: 'light' | 'dark' = appearance === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : appearance;

  const value = useMemo<AppSettingsValue>(() => ({
    ready,
    appearance,
    notificationsEnabled,
    resolvedScheme,
    setAppearance,
    setNotificationsEnabled,
  }), [appearance, notificationsEnabled, ready, resolvedScheme, setAppearance, setNotificationsEnabled]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return context;
}

export function useOptionalAppSettings() {
  return useContext(AppSettingsContext);
}
