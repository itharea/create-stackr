import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { createTheme, ThemeMode, AppTheme } from '@/constants/Theme';

const THEME_STORAGE_KEY = '@app_theme_mode';

interface ThemeContextType {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isSystemDefault: boolean;
  setSystemDefault: (useSystem: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  // Initialize with system theme using Appearance API directly (more reliable than hook)
  const [mode, setModeState] = useState<ThemeMode>(
    () => Appearance.getColorScheme() || 'light'
  );
  const [isSystemDefault, setIsSystemDefault] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const currentSystemTheme = Appearance.getColorScheme();

        if (saved) {
          const { mode: savedMode, useSystem } = JSON.parse(saved);
          setIsSystemDefault(useSystem);
          if (!useSystem) {
            setModeState(savedMode);
          } else if (currentSystemTheme) {
            setModeState(currentSystemTheme);
          }
        } else if (currentSystemTheme) {
          setModeState(currentSystemTheme);
        }
      } catch {
        // Use defaults on error
      }
    })();
  }, []);

  // Sync with system preference when using system default
  useEffect(() => {
    if (isSystemDefault && systemColorScheme) {
      setModeState(systemColorScheme);
    }
  }, [isSystemDefault, systemColorScheme]);

  // Listen for real-time system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (isSystemDefault && colorScheme) {
        setModeState(colorScheme);
      }
    });

    return () => subscription.remove();
  }, [isSystemDefault]);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    setIsSystemDefault(false);
    try {
      await AsyncStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ mode: newMode, useSystem: false })
      );
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const newMode = current === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ mode: newMode, useSystem: false })
      ).catch(() => {});
      return newMode;
    });
    setIsSystemDefault(false);
  }, []);

  const handleSetSystemDefault = useCallback(async (useSystem: boolean) => {
    setIsSystemDefault(useSystem);

    // Determine the mode to use and store
    let modeToStore = mode;
    if (useSystem && systemColorScheme) {
      modeToStore = systemColorScheme;
      setModeState(modeToStore);
    }

    try {
      await AsyncStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ mode: modeToStore, useSystem })
      );
    } catch {
      // Ignore storage errors
    }
  }, [systemColorScheme, mode]);

  const theme = useMemo(() => createTheme(mode), [mode]);

  const value = useMemo(
    () => ({
      theme,
      mode,
      setMode,
      toggleMode,
      isSystemDefault,
      setSystemDefault: handleSetSystemDefault,
    }),
    [theme, mode, setMode, toggleMode, isSystemDefault, handleSetSystemDefault]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Convenience hook for just the theme object (backwards compatible)
export function useAppTheme(): AppTheme {
  const context = useContext(ThemeContext);
  // Fallback to default light theme if no provider
  return context?.theme ?? createTheme('light');
}

// Re-export AppTheme for convenience (so components can import from one place)
export type { AppTheme } from '@/constants/Theme';
