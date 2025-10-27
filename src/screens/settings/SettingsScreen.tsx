import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, List, Divider, Button, Surface, useTheme as usePaperTheme, Portal, Dialog, TextInput, Switch } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { migrateUsersDisplayName } from '../../utils/userMigration';

export default function SettingsScreen() {
  const paperTheme = usePaperTheme();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [migrationDialogVisible, setMigrationDialogVisible] = useState(false);
  const [editProfileDialogVisible, setEditProfileDialogVisible] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleMigrateUsers = async () => {
    setMigrationDialogVisible(false);
    setMigrating(true);

    try {
      const stats = await migrateUsersDisplayName();
      Alert.alert(
        'Migração Concluída',
        `✅ Atualizados: ${stats.success}\n⏭️ Ignorados: ${stats.skipped}\n❌ Erros: ${stats.errors}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Erro na Migração', error.message || 'Erro desconhecido', [
        { text: 'OK' },
      ]);
    } finally {
      setMigrating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!displayName.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio');
      return;
    }

    setSaving(true);
    try {
      const { updateUserDisplayName } = await import('../../utils/userMigration');
      await updateUserDisplayName(user.uid, displayName.trim());

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            setEditProfileDialogVisible(false);
            // Reload the page to see changes
            signOut().then(() => {
              Alert.alert('Atenção', 'Faça login novamente para ver as mudanças', [{ text: 'OK' }]);
            });
          }
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
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
            title={user?.displayName || 'Usuário'}
            description={user?.email}
            left={(props) => <List.Icon {...props} icon="account" />}
            right={(props) => <List.Icon {...props} icon="pencil" />}
            onPress={() => setEditProfileDialogVisible(true)}
          />
          <Divider />
          <List.Item
            title="ID do usuário"
            description={user?.uid}
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

        <Surface style={styles.surface} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Ferramentas de Desenvolvedor
          </Text>
          <List.Item
            title="Migrar Usuários"
            description="Adicionar displayName aos usuários existentes"
            left={(props) => <List.Icon {...props} icon="database-sync" />}
            onPress={() => setMigrationDialogVisible(true)}
            disabled={migrating}
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

      {/* Edit Profile Dialog */}
      <Portal>
        <Dialog
          visible={editProfileDialogVisible}
          onDismiss={() => setEditProfileDialogVisible(false)}
        >
          <Dialog.Title>Editar Perfil</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogLabel}>
              Nome de exibição:
            </Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              mode="outlined"
              placeholder="Seu nome"
              disabled={saving}
              style={styles.dialogInput}
            />
            <Text variant="bodySmall" style={styles.dialogHint}>
              Este nome será exibido para outros membros dos workspaces
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditProfileDialogVisible(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onPress={handleSaveProfile} loading={saving} disabled={saving}>
              Salvar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Migration Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={migrationDialogVisible}
          onDismiss={() => setMigrationDialogVisible(false)}
        >
          <Dialog.Title>Migrar Usuários</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Esta operação irá adicionar o campo "displayName" a todos os usuários que não o
              possuem, usando o campo "name" existente ou email como fallback.
            </Text>
            <Text variant="bodyMedium" style={styles.migrationWarning}>
              ⚠️ Esta ação modificará documentos no Firestore. Continue?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMigrationDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleMigrateUsers} mode="contained">
              Migrar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  dialogLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  dialogInput: {
    marginBottom: 8,
  },
  dialogHint: {
    opacity: 0.7,
    marginTop: 4,
  },
  migrationWarning: {
    marginTop: 16,
    fontWeight: '600',
  },
});
