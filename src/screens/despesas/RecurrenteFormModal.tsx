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
  Menu,
  Divider,
  Switch,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RecurringTemplate, RecurrenceFrequency } from '../../types/supabase';
import { evaluateFormula, formatCurrency } from '../../utils/calculations';

interface RecurrenteFormModalProps {
  visible: boolean;
  template?: RecurringTemplate | null;
  onDismiss: () => void;
  onSave: (data: {
    name: string;
    value_formula: string;
    frequency: RecurrenceFrequency;
    start_date: string;
    end_date?: string;
    is_active: boolean;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function RecurrenteFormModal({
  visible,
  template,
  onDismiss,
  onSave,
  onDelete,
}: RecurrenteFormModalProps) {
  const theme = useTheme();
  const [nome, setNome] = useState('');
  const [valorFormula, setValorFormula] = useState('');
  const [frequencia, setFrequencia] = useState<RecurrenceFrequency>('mensal');
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [isAtivo, setIsAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [frequenciaMenuVisible, setFrequenciaMenuVisible] = useState(false);
  const [dataInicioPickerVisible, setDataInicioPickerVisible] = useState(false);
  const [dataFimPickerVisible, setDataFimPickerVisible] = useState(false);

  // Reset form when modal opens/closes or template changes
  useEffect(() => {
    if (visible) {
      if (template) {
        setNome(template.name);
        setValorFormula(template.value_formula);
        setFrequencia((template.frequency as RecurrenceFrequency) || 'mensal');
        setDataInicio(template.start_date ? new Date(template.start_date) : new Date());
        setDataFim(template.end_date ? new Date(template.end_date) : undefined);
        setIsAtivo(template.is_active !== false);
      } else {
        setNome('');
        setValorFormula('');
        setFrequencia('mensal');
        setDataInicio(new Date());
        setDataFim(undefined);
        setIsAtivo(true);
      }
      setError('');
      setDeleteDialogVisible(false);
    }
  }, [visible, template]);

  // Calculate value from formula
  const getCalculatedValue = (): number | null => {
    if (!valorFormula.trim()) return null;
    try {
      return evaluateFormula(valorFormula);
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

    if (!valorFormula.trim()) {
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
        name: nome.trim(),
        value_formula: valorFormula,
        frequency: frequencia,
        start_date: dataInicio.toISOString().split('T')[0],
        end_date: dataFim ? dataFim.toISOString().split('T')[0] : undefined,
        is_active: isAtivo,
      });
      onDismiss();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePress = () => {
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!template || !onDelete) return;

    setLoading(true);
    try {
      await onDelete(template.id);
      setDeleteDialogVisible(false);
      onDismiss();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir template');
      setDeleteDialogVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const calculatedValue = getCalculatedValue();
  const isEditMode = !!template;

  const frequencyLabels: Record<RecurrenceFrequency, string> = {
    mensal: 'Mensal',
    bimestral: 'Bimestral',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  };

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
            {isEditMode ? 'Editar Template Recorrente' : 'Novo Template Recorrente'}
          </Text>

          <TextInput
            label="Nome da despesa"
            value={nome}
            onChangeText={setNome}
            mode="outlined"
            placeholder="Ex: Aluguel, Internet, Água"
            maxLength={50}
            disabled={loading}
            style={styles.input}
            left={<TextInput.Icon icon="label" />}
          />

          <TextInput
            label="Valor"
            value={valorFormula}
            onChangeText={setValorFormula}
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

          <Divider style={styles.divider} />

          {/* Frequency Menu */}
          <Menu
            visible={frequenciaMenuVisible}
            onDismiss={() => setFrequenciaMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setFrequenciaMenuVisible(true)}
                icon="calendar-sync"
                style={styles.menuButton}
                contentStyle={styles.menuButtonContent}
              >
                Frequência: {frequencyLabels[frequencia]}
              </Button>
            }
          >
            <Menu.Item onPress={() => { setFrequencia('mensal'); setFrequenciaMenuVisible(false); }} title="Mensal" />
            <Menu.Item onPress={() => { setFrequencia('bimestral'); setFrequenciaMenuVisible(false); }} title="Bimestral" />
            <Menu.Item onPress={() => { setFrequencia('trimestral'); setFrequenciaMenuVisible(false); }} title="Trimestral" />
            <Menu.Item onPress={() => { setFrequencia('semestral'); setFrequenciaMenuVisible(false); }} title="Semestral" />
            <Menu.Item onPress={() => { setFrequencia('anual'); setFrequenciaMenuVisible(false); }} title="Anual" />
          </Menu>

          {/* Date pickers */}
          <View style={styles.dateRow}>
            <Button
              mode="outlined"
              icon="calendar-start"
              style={styles.dateButton}
              disabled={loading}
              onPress={() => setDataInicioPickerVisible(true)}
            >
              Início: {dataInicio.toLocaleDateString('pt-BR')}
            </Button>
            <Button
              mode="outlined"
              icon="calendar-end"
              style={styles.dateButton}
              disabled={loading}
              onPress={() => setDataFimPickerVisible(true)}
            >
              {dataFim ? `Fim: ${dataFim.toLocaleDateString('pt-BR')}` : 'Sem fim'}
            </Button>
          </View>

          {/* Clear end date button */}
          {dataFim && (
            <Button
              mode="text"
              onPress={() => setDataFim(undefined)}
              disabled={loading}
              icon="close-circle"
              style={{ marginTop: -8 }}
              compact
            >
              Remover data de fim
            </Button>
          )}

          <HelperText type="info">
            {dataFim
              ? `Template ativo de ${dataInicio.toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}`
              : 'Template ativo indefinidamente a partir de ' + dataInicio.toLocaleDateString('pt-BR')
            }
          </HelperText>

          <Divider style={styles.divider} />

          {/* Active toggle */}
          <View style={styles.switchContainer}>
            <View>
              <Text variant="bodyLarge">Template ativo</Text>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                {isAtivo ? 'Gera despesas automaticamente' : 'Pausado (não gera despesas)'}
              </Text>
            </View>
            <Switch
              value={isAtivo}
              onValueChange={setIsAtivo}
              disabled={loading}
              color={theme.colors.primary}
            />
          </View>

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
                {isEditMode ? 'Salvar' : 'Criar Template'}
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
          <Text variant="bodyMedium">Deseja excluir este template recorrente?</Text>
          <Text variant="bodySmall" style={{ marginTop: 8, opacity: 0.7 }}>
            ⚠️ As despesas já criadas em meses anteriores não serão afetadas.
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 8, opacity: 0.7 }}>
            💡 Este template não gerará mais despesas nos próximos meses.
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

      {/* Date Pickers */}
      {dataInicioPickerVisible && (
        <DateTimePicker
          value={dataInicio}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setDataInicioPickerVisible(Platform.OS === 'ios');
            if (event.type === 'set' && selectedDate) {
              setDataInicio(selectedDate);
            }
          }}
        />
      )}

      {dataFimPickerVisible && (
        <DateTimePicker
          value={dataFim || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setDataFimPickerVisible(Platform.OS === 'ios');
            if (event.type === 'set' && selectedDate) {
              setDataFim(selectedDate);
            }
          }}
        />
      )}
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
    maxHeight: '90%',
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
  divider: {
    marginVertical: 16,
  },
  menuButton: {
    marginBottom: 12,
  },
  menuButtonContent: {
    justifyContent: 'flex-start',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  dateButton: {
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    minWidth: 100,
  },
});
