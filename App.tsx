import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { WorkspaceProvider } from './src/contexts/WorkspaceContext';
import { SyncProvider } from './src/contexts/SyncContext';
import { MonthNavigationProvider } from './src/contexts/MonthNavigationContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';

function AppContent() {
  const { theme, isDarkMode } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <ErrorBoundary>
          <AuthProvider>
            <WorkspaceProvider>
              <SyncProvider>
                <MonthNavigationProvider>
                  <AppNavigator />
                  <StatusBar style={isDarkMode ? 'light' : 'dark'} />
                </MonthNavigationProvider>
              </SyncProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ErrorBoundary>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
