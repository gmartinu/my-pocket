import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Portal,
  Modal,
  Text,
  TextInput,
  Switch,
  Button,
  useTheme,
  HelperText,
  Dialog,
} from 'react-native-paper';
import { Despesa } from '../../types/month';
import { evaluateFormula, formatCurrency } from '../../utils/calculations';
import { RecurrenceSelector } from '../../components/RecurrenceSelector';
import { RecurringExpenseConfig } from '../../types/recurring';

interface DespesaFormModalProps {
  visible: boolean;
  despesa?: Despesa | null;
  onDismiss: () => void;
  onSave: (data: {
    nome: string;
    valorPlanejado: string;
    pago: boolean;
    recurring?: RecurringExpenseConfig;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function DespesaFormModal({
  visible,
  despesa,
  onDismiss,
  onSave,
  onDelete,
}: DespesaFormModalProps) {
  const theme = useTheme();
  const [nome, setNome] = useState('');
  const [valorPlanejado, setValorPlanejado] = useState('');
  const [pago, setPago] = useState(false);
  const [recurring, setRecurring] = useState<RecurringExpenseConfig>({
    isRecurring: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  // Reset form when modal opens/closes or despesa changes
  useEffect(() => {
    if (visible) {
      if (despesa) {
        setNome(despesa.nome);
        setValorPlanejado(String(despesa.valorPlanejado));
        setPago(despesa.pago);
        setRecurring(despesa.recurring || { isRecurring: false });
      } else {
        setNome('');
        setValorPlanejado('');
        setPago(false);
        setRecurring({ isRecurring: false });
      }
      setError('');
      setDeleteDialogVisible(false);
    }
  }, [visible, despesa]);

  // Calculate value from formula
  const getCalculatedValue = (): number | null => {
    if (!valorPlanejado.trim()) return null;
    try {
      return evaluateFormula(valorPlanejado);
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

    if (!valorPlanejado.trim()) {
      return 'Valor é obrigatório';
    }

    const calculated = getCalculatedValue();
    if (calculated === null) {
      return 'Fórmula inválida';
    }

    if (calculated <= 0) {
      return 'Valor deve ser maior que zero';
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
      await onSave({
        nome: nome.trim(),
        valorPlanejado,
        pago,
        recurring: recurring.isRecurring ? recurring : undefined,
      });
      onDismiss();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar despesa');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePress = () => {
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!despesa || !onDelete) return;

    setLoading(true);
    try {
      await onDelete(despesa.id);
      setDeleteDialogVisible(false);
      onDismiss();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir despesa');
      setDeleteDialogVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const calculatedValue = getCalculatedValue();
  const isEditMode = !!despesa;

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
            {isEditMode ? 'Editar Despesa' : 'Nova Despesa'}
          </Text>

          <TextInput
            label="Nome da despesa"
            value={nome}
            onChangeText={setNome}
            mode="outlined"
            placeholder="Ex: Aluguel, Internet, Mercado"
            maxLength={50}
            disabled={loading}
            style={styles.input}
            left={<TextInput.Icon icon="label" />}
          />

          <TextInput
            label="Valor"
            value={valorPlanejado}
            onChangeText={setValorPlanejado}
            mode="outlined"
            placeholder="Ex: 150 ou 100+50"
            keyboardType="numeric"
            disabled={loading}
            style={styles.input}
            left={<TextInput.Icon icon="currency-usd" />}
          />

          {calculatedValue !== null && (
            <HelperText type="info" style={styles.helperText}>
              Calculado: {formatCurrency(calculatedValue)}
            </HelperText>
          )}

          {error ? (
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          ) : null}

          <View style={styles.switchContainer}>
            <Text variant="bodyLarge">Marcar como pago</Text>
            <Switch
              value={pago}
              onValueChange={setPago}
              disabled={loading}
              color={theme.colors.primary}
            />
          </View>

          <RecurrenceSelector
            config={recurring}
            onChange={setRecurring}
            disabled={loading}
          />

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
          <Text>Deseja realmente excluir esta despesa?</Text>
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
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
