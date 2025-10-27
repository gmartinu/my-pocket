import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  MD3LightTheme,
  MD3DarkTheme,
  MD3Theme,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4CAF50',
    primaryContainer: '#C8E6C9',
    secondary: '#2196F3',
    secondaryContainer: '#BBDEFB',
    tertiary: '#FF9800',
    tertiaryContainer: '#FFE0B2',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    surfaceDisabled: '#E0E0E0',
    background: '#F7F8FC',
    error: '#D32F2F',
    errorContainer: '#FFCDD2',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#1B5E20',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#0D47A1',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#E65100',
    onSurface: '#212121',
    onSurfaceVariant: '#757575',
    onSurfaceDisabled: '#BDBDBD',
    onError: '#FFFFFF',
    onErrorContainer: '#B71C1C',
    onBackground: '#212121',
    outline: '#BDBDBD',
    outlineVariant: '#E0E0E0',
    inverseSurface: '#212121',
    inverseOnSurface: '#FAFAFA',
    inversePrimary: '#81C784',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.4)',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F5F5F5',
      level3: '#EEEEEE',
      level4: '#E0E0E0',
      level5: '#BDBDBD',
    },
  },
};

const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#66BB6A',
    primaryContainer: '#2E7D32',
    secondary: '#64B5F6',
    secondaryContainer: '#1976D2',
    tertiary: '#FFB74D',
    tertiaryContainer: '#F57C00',
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',
    surfaceDisabled: '#3C3C3C',
    background: '#121212',
    error: '#EF5350',
    errorContainer: '#C62828',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#C8E6C9',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#BBDEFB',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#FFE0B2',
    onSurface: '#E0E0E0',
    onSurfaceVariant: '#BDBDBD',
    onSurfaceDisabled: '#757575',
    onError: '#FFFFFF',
    onErrorContainer: '#FFCDD2',
    onBackground: '#E0E0E0',
    outline: '#616161',
    outlineVariant: '#424242',
    inverseSurface: '#E0E0E0',
    inverseOnSurface: '#212121',
    inversePrimary: '#4CAF50',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.6)',
    elevation: {
      level0: 'transparent',
      level1: '#1E1E1E',
      level2: '#232323',
      level3: '#2C2C2C',
      level4: '#373737',
      level5: '#424242',
    },
  },
};

interface ThemeContextData {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: MD3Theme;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  if (loading) {
    return null; // or a loading screen
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
