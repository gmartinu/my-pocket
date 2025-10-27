import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, List, Divider, Button, Surface, useTheme as usePaperTheme, Switch } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function SettingsScreen() {
  const paperTheme = usePaperTheme();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: paperTheme.colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Configurações
        </Text>

        <Surface style={styles.surface} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Aparência
          </Text>
          <List.Item
            title="Modo Escuro"
            description={isDarkMode ? 'Ativado' : 'Desativado'}
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
          />
        </Surface>

        <Surface style={styles.surface} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Conta
          </Text>
          <List.Item
            title={user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuário'}
            description={user?.email}
            left={(props) => <List.Icon {...props} icon="account" />}
          />
          <Divider />
          <List.Item
            title="ID do usuário"
            description={user?.id}
            left={(props) => <List.Icon {...props} icon="identifier" />}
          />
        </Surface>

        <Surface style={styles.surface} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Preferências
          </Text>
          <List.Item
            title="Notificações"
            description="Em breve"
            left={(props) => <List.Icon {...props} icon="bell" />}
            disabled
          />
        </Surface>

        <Surface style={styles.surface} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Sobre
          </Text>
          <List.Item
            title="Versão"
            description="1.0.0 - Phase 8"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          <Divider />
          <List.Item
            title="Créditos"
            description="Desenvolvido com ❤️"
            left={(props) => <List.Icon {...props} icon="heart" />}
          />
        </Surface>

        <Button
          mode="contained"
          onPress={handleLogout}
          icon="logout"
          style={styles.logoutButton}
          buttonColor={paperTheme.colors.error}
        >
          Sair
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  surface: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 16,
  },
});
