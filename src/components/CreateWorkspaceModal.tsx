import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Portal, Dialog, TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useWorkspace } from '../contexts/WorkspaceContext';

interface CreateWorkspaceModalProps {
  visible: boolean;
  onDismiss: () => void;
  mandatory?: boolean;
}

export default function CreateWorkspaceModal({
  visible,
  onDismiss,
  mandatory = false,
}: CreateWorkspaceModalProps) {
  const theme = useTheme();
  const { createWorkspace } = useWorkspace();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    // Validate name
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (name.trim().length < 3) {
      setError('Nome deve ter no mínimo 3 caracteres');
      return;
    }

    if (name.trim().length > 30) {
      setError('Nome deve ter no máximo 30 caracteres');
      return;
    }

    // Create workspace
    setLoading(true);
    setError('');

    try {
      await createWorkspace(name.trim());
      setName('');
      onDismiss();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!mandatory) {
      setName('');
      setError('');
      onDismiss();
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleCancel} dismissable={!mandatory}>
        <Dialog.Title>
          {mandatory ? 'Crie seu primeiro workspace' : 'Novo Workspace'}
        </Dialog.Title>
        <Dialog.Content>
          {mandatory && (
            <Text variant="bodyMedium" style={styles.mandatoryText}>
              Para começar, você precisa criar um workspace. Um workspace é um contexto
              financeiro independente (ex: Pessoal, Família, Empresa).
            </Text>
          )}

          <TextInput
            label="Nome do workspace"
            value={name}
            onChangeText={setName}
            mode="outlined"
            placeholder="Ex: Pessoal"
            maxLength={30}
            disabled={loading}
            style={styles.input}
            left={<TextInput.Icon icon="folder" />}
          />

          {error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          {!mandatory && (
            <Button onPress={handleCancel} disabled={loading}>
              Cancelar
            </Button>
          )}
          <Button
            mode="contained"
            onPress={handleCreate}
            loading={loading}
            disabled={loading}
          >
            Criar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  mandatoryText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  input: {
    marginTop: 8,
  },
  errorText: {
    marginTop: 8,
  },
});
