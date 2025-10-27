import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Portal,
  Modal,
  Text,
  TextInput,
  Button,
  useTheme,
  HelperText,
  List,
  Chip,
} from 'react-native-paper';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { WorkspaceRole } from '../../types/workspace';

interface ShareWorkspaceModalProps {
  visible: boolean;
  workspaceId: string;
  onDismiss: () => void;
}

export default function ShareWorkspaceModal({
  visible,
  workspaceId,
  onDismiss,
}: ShareWorkspaceModalProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { workspaces, findUserByEmail, addMember } = useWorkspace();
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('editor');
  const [foundUser, setFoundUser] = useState<{
    id: string;
    email: string;
    displayName: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const workspace = workspaces.find((w) => w.id === workspaceId);

  const handleSearch = async () => {
    if (!email.trim()) {
      setError('Digite um email válido');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Email inválido');
      return;
    }

    setSearching(true);
    setError('');
    setFoundUser(null);

    try {
      console.log('🔍 Buscando usuário com email:', email.trim().toLowerCase());
      const result = await findUserByEmail(email.trim());
      console.log('📊 Resultado da busca:', result);

      if (!result) {
        console.log('❌ Usuário não encontrado no Firestore');
        setError('Usuário não encontrado. Verifique se o email está correto e se o usuário já se registrou no app.');
        return;
      }

      // Check if it's the current user
      if (result.id === user?.uid) {
        setError('Você não pode adicionar a si mesmo');
        return;
      }

      // Check if user is already a member
      const isAlreadyMember = workspace?.members.some((m) => m.userId === result.id);
      if (isAlreadyMember) {
        setError('Este usuário já é membro do workspace');
        return;
      }

      console.log('✅ Usuário encontrado:', result);
      setFoundUser(result);
    } catch (err: any) {
      console.error('❌ Erro ao buscar usuário:', err);
      setError(err.message || 'Erro ao buscar usuário');
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async () => {
    if (!foundUser) return;

    setLoading(true);
    setError('');

    try {
      await addMember(
        workspaceId,
        foundUser.id,
        foundUser.email,
        foundUser.displayName,
        selectedRole
      );

      // Reset and close
      setEmail('');
      setFoundUser(null);
      setSelectedRole('editor');
      onDismiss();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar membro');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setEmail('');
    setFoundUser(null);
    setSelectedRole('editor');
    setError('');
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Text variant="headlineSmall" style={styles.title}>
            Compartilhar Workspace
          </Text>

          <TextInput
            label="Email do usuário"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            placeholder="usuario@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            disabled={loading || searching}
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
            onSubmitEditing={handleSearch}
          />

          <Button
            mode="contained-tonal"
            onPress={handleSearch}
            loading={searching}
            disabled={searching || loading || !email.trim()}
            style={styles.searchButton}
            icon="magnify"
          >
            Buscar Usuário
          </Button>

          {error ? (
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          ) : null}

          {searching && (
            <Text variant="bodySmall" style={styles.searching}>
              Buscando usuário...
            </Text>
          )}

          {foundUser && (
            <View style={styles.userFound}>
              <List.Item
                title={foundUser.displayName}
                description={foundUser.email}
                left={(props) => <List.Icon {...props} icon="account" />}
                style={styles.userItem}
              />

              <Text variant="titleSmall" style={styles.roleTitle}>
                Selecione a permissão:
              </Text>

              <View style={styles.roleChips}>
                <Chip
                  selected={selectedRole === 'owner'}
                  onPress={() => setSelectedRole('owner')}
                  style={styles.chip}
                  mode="outlined"
                >
                  Owner
                </Chip>
                <Chip
                  selected={selectedRole === 'editor'}
                  onPress={() => setSelectedRole('editor')}
                  style={styles.chip}
                  mode="outlined"
                >
                  Editor
                </Chip>
                <Chip
                  selected={selectedRole === 'viewer'}
                  onPress={() => setSelectedRole('viewer')}
                  style={styles.chip}
                  mode="outlined"
                >
                  Viewer
                </Chip>
              </View>

              <Text variant="bodySmall" style={styles.roleDescription}>
                {selectedRole === 'owner' && '• Controle total sobre o workspace'}
                {selectedRole === 'editor' && '• Pode editar despesas e cartões'}
                {selectedRole === 'viewer' && '• Pode apenas visualizar'}
              </Text>
            </View>
          )}

          <View style={styles.buttons}>
            <Button
              mode="outlined"
              onPress={handleDismiss}
              disabled={loading}
              style={styles.button}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleAddMember}
              loading={loading}
              disabled={loading || !foundUser}
              style={styles.button}
            >
              Adicionar
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
    maxHeight: '80%',
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
  },
  searchButton: {
    marginBottom: 8,
  },
  searching: {
    marginBottom: 16,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  userFound: {
    marginBottom: 16,
  },
  userItem: {
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  roleTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  roleChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flex: 1,
  },
  roleDescription: {
    opacity: 0.7,
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  button: {
    minWidth: 100,
  },
});
