import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';

/**
 * Root navigator that decides which screen to show based on auth state
 */
export default function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: workspaceLoading } = useWorkspace();
  const theme = useTheme();
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

  // Check if user needs to create first workspace
  useEffect(() => {
    if (user && !workspaceLoading) {
      if (workspaces.length === 0) {
        setShowWorkspaceModal(true);
      } else {
        setShowWorkspaceModal(false);
      }
    }
  }, [user, workspaces, workspaceLoading]);

  // Show loading screen while checking auth state or loading workspaces
  if (authLoading || (user && workspaceLoading)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <>
          <MainTabNavigator />
          <CreateWorkspaceModal
            visible={showWorkspaceModal}
            onDismiss={() => setShowWorkspaceModal(false)}
            mandatory={workspaces.length === 0}
          />
        </>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
});
