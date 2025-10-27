import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Portal,
  Modal,
  Text,
  TextInput,
  Button,
  useTheme,
  HelperText,
  Dialog,
} from 'react-native-paper';
import { Cartao } from '../../types/month';
import { evaluateFormula, formatCurrency } from '../../utils/calculations';

interface CartaoFormModalProps {
  visible: boolean;
  cartao?: Cartao | null;
  onDismiss: () => void;
  onSave: (data: { nome: string; limiteTotal: number; compras: any[] }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function CartaoFormModal({
  visible,
  cartao,
  onDismiss,
  onSave,
  onDelete,
}: CartaoFormModalProps) {
  const theme = useTheme();
  const [nome, setNome] = useState('');
  const [limiteTotal, setLimiteTotal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  // Reset form when modal opens/closes or cartao changes
  useEffect(() => {
    if (visible) {
      if (cartao) {
        setNome(cartao.nome);
        setLimiteTotal(String(cartao.limiteTotal));
      } else {
        setNome('');
        setLimiteTotal('');
      }
      setError('');
      setDeleteDialogVisible(false);
    }
  }, [visible, cartao]);

  // Calculate value from formula
  const getCalculatedLimite = (): number | null => {
    if (!limiteTotal.trim()) return null;
    try {
      return evaluateFormula(limiteTotal);
    } catch {
      return null;
    }
  };

  const validate = (): string | null => {
    if (!nome.trim()) {
      return 'Nome é obrigatório';
    }

    if (nome.trim().length < 3) {
      return 'Nome deve ter no mínimo 3 caracteres';
    }

    if (!limiteTotal.trim()) {
      return 'Limite é obrigatório';
    }

    const calculated = getCalculatedLimite();
    if (calculated === null) {
      return 'Valor de limite inválido';
    }

    if (calculated <= 0) {
      return 'Limite deve ser maior que zero';
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const limiteCalculado = getCalculatedLimite();
      if (limiteCalculado === null) {
        setError('Erro ao calcular limite');
        return;
      }

      await onSave({
        nome: nome.trim(),
        limiteTotal: limiteCalculado,
        compras: cartao?.compras || [],
      });
      onDismiss();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cartão');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePress = () => {
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!cartao || !onDelete) return;

    setLoading(true);
    try {
      await onDelete(cartao.id);
      setDeleteDialogVisible(false);
      onDismiss();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir cartão');
      setDeleteDialogVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const calculatedLimite = getCalculatedLimite();
  const isEditMode = !!cartao;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Text variant="headlineSmall" style={styles.title}>
            {isEditMode ? 'Editar Cartão' : 'Novo Cartão'}
          </Text>

          <TextInput
            label="Nome do cartão"
            value={nome}
            onChangeText={setNome}
            mode="outlined"
            placeholder="Ex: Nubank, Itaú, C6"
            maxLength={30}
            disabled={loading}
            style={styles.input}
            left={<TextInput.Icon icon="credit-card" />}
          />

          <TextInput
            label="Limite total"
            value={limiteTotal}
            onChangeText={setLimiteTotal}
            mode="outlined"
            placeholder="Ex: 5000 ou 2000+3000"
            keyboardType="numeric"
            disabled={loading}
            style={styles.input}
            left={<TextInput.Icon icon="currency-usd" />}
          />

          {calculatedLimite !== null && (
            <HelperText type="info" style={styles.helperText}>
              Limite: {formatCurrency(calculatedLimite)}
            </HelperText>
          )}

          {error ? (
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          ) : null}

          <View style={styles.buttons}>
            {isEditMode && onDelete && (
              <Button
                mode="outlined"
                onPress={handleDeletePress}
                disabled={loading}
                textColor={theme.colors.error}
                icon="delete"
                style={styles.button}
              >
                Excluir
              </Button>
            )}
            <View style={styles.rightButtons}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                disabled={loading}
                style={styles.button}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                style={styles.button}
              >
                {isEditMode ? 'Salvar' : 'Adicionar'}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
      >
        <Dialog.Title>Confirmar exclusão</Dialog.Title>
        <Dialog.Content>
          <Text>
            Deseja realmente excluir este cartão? Todas as compras associadas serão perdidas.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={() => setDeleteDialogVisible(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onPress={handleConfirmDelete}
            loading={loading}
            disabled={loading}
            textColor={theme.colors.error}
          >
            Excluir
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  helperText: {
    marginTop: -12,
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    minWidth: 100,
  },
});
