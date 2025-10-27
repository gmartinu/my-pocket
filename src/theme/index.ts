import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Light theme colors
const lightColors = {
  primary: '#4CAF50',
  accent: '#4CAF50',
  background: '#F7F8FC',
  surface: '#FFFFFF',
  error: '#D32F2F',
  text: '#212121',
  onSurface: '#212121',
  disabled: '#757575',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#4CAF50',
};

// Dark theme colors (for future Phase 8)
const darkColors = {
  primary: '#4CAF50',
  accent: '#4CAF50',
  background: '#121212',
  surface: '#1E1E1E',
  error: '#CF6679',
  text: '#FFFFFF',
  onSurface: '#FFFFFF',
  disabled: '#757575',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#4CAF50',
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
  roundness: 8,
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  roundness: 8,
};

// Default export is light theme
export default lightTheme;
