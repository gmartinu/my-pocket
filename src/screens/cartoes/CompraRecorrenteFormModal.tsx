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
import { RecurringTemplate, RecurrenceFrequency, Card, TemplateMetadata } from '../../types/supabase';
import { evaluateFormula, formatCurrency } from '../../utils/calculations';

interface CompraRecorrenteFormModalProps {
  visible: boolean;
  template?: RecurringTemplate | null;
  cards: Card[]; // Lista de cartões disponíveis
  onDismiss: () => void;
  onSave: (data: {
    name: string;
    value_formula: string;
    frequency: RecurrenceFrequency;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    card_id?: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function CompraRecorrenteFormModal({
  visible,
  template,
  cards,
  onDismiss,
  onSave,
  onDelete,
}: CompraRecorrenteFormModalProps) {
  const theme = useTheme();
  const [nome, setNome] = useState('');
  const [valorFormula, setValorFormula] = useState('');
  const [frequencia, setFrequencia] = useState<RecurrenceFrequency>('mensal');
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [isAtivo, setIsAtivo] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [frequenciaMenuVisible, setFrequenciaMenuVisible] = useState(false);
  const [cardMenuVisible, setCardMenuVisible] = useState(false);
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
        const metadata = (template.metadata || {}) as TemplateMetadata;
        setSelectedCardId(metadata.card_id);
      } else {
        setNome('');
        setValorFormula('');
        setFrequencia('mensal');
        setDataInicio(new Date());
        setDataFim(undefined);
        setIsAtivo(true);
        // Set first card as default
        setSelectedCardId(cards.length > 0 ? cards[0].id : undefined);
      }
      setError('');
      setDeleteDialogVisible(false);
    }
  }, [visible, template, cards]);

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

    if (!selectedCardId) {
      return 'Selecione um cartão';
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
        card_id: selectedCardId,
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

  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const selectedCardName = selectedCard ? selectedCard.name : 'Selecione um cartão';

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
            {isEditMode ? 'Editar Compra Recorrente' : 'Nova Compra Recorrente'}
          </Text>

          <TextInput
            label="Nome da compra"
            value={nome}
            onChangeText={setNome}
            mode="outlined"
            placeholder="Ex: Netflix, Spotify, Seguro"
            maxLength={50}
            disabled={loading}
            style={styles.input}
            left={<TextInput.Icon icon="cart" />}
          />

          <TextInput
            label="Valor"
            value={valorFormula}
            onChangeText={setValorFormula}
            mode="outlined"
            placeholder="Ex: 35.90 ou 30+5.90"
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

          {/* Card Selection Menu */}
          <Menu
            visible={cardMenuVisible}
            onDismiss={() => setCardMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setCardMenuVisible(true)}
                icon="credit-card"
                style={styles.menuButton}
                contentStyle={styles.menuButtonContent}
              >
                Cartão: {selectedCardName}
              </Button>
            }
          >
            {cards.map((card) => (
              <Menu.Item
                key={card.id}
                onPress={() => {
                  setSelectedCardId(card.id);
                  setCardMenuVisible(false);
                }}
                title={card.name}
              />
            ))}
          </Menu>

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

          <Divider style={styles.divider} />

          {/* Date Pickers */}
          <View style={styles.dateRow}>
            <Button
              mode="outlined"
              onPress={() => setDataInicioPickerVisible(true)}
              icon="calendar-start"
              style={styles.dateButton}
            >
              Início: {dataInicio.toLocaleDateString('pt-BR')}
            </Button>

            <Button
              mode="outlined"
              onPress={() => setDataFimPickerVisible(true)}
              icon="calendar-end"
              style={styles.dateButton}
            >
              {dataFim ? `Fim: ${dataFim.toLocaleDateString('pt-BR')}` : 'Sem fim'}
            </Button>
          </View>

          {dataInicioPickerVisible && (
            <DateTimePicker
              value={dataInicio}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setDataInicioPickerVisible(Platform.OS === 'ios');
                if (selectedDate) {
                  setDataInicio(selectedDate);
                }
              }}
            />
          )}

          {dataFimPickerVisible && (
            <DateTimePicker
              value={dataFim || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setDataFimPickerVisible(Platform.OS === 'ios');
                if (event.type === 'set') {
                  setDataFim(selectedDate);
                } else if (event.type === 'dismissed') {
                  setDataFim(undefined);
                }
              }}
            />
          )}

          {dataFim && (
            <Button
              mode="text"
              onPress={() => setDataFim(undefined)}
              style={styles.clearDateButton}
            >
              Remover data de fim
            </Button>
          )}

          <Divider style={styles.divider} />

          {/* Active Switch */}
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text variant="bodyLarge">Ativo</Text>
              <Text variant="bodySmall" style={styles.switchSubLabel}>
                {isAtivo
                  ? 'Compra será criada automaticamente'
                  : 'Compra não será criada automaticamente'}
              </Text>
            </View>
            <Switch value={isAtivo} onValueChange={setIsAtivo} />
          </View>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              disabled={loading}
              style={styles.actionButton}
            >
              Cancelar
            </Button>

            {isEditMode && onDelete && (
              <Button
                mode="outlined"
                onPress={handleDeletePress}
                disabled={loading}
                textColor={theme.colors.error}
                style={styles.actionButton}
              >
                Excluir
              </Button>
            )}

            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={styles.actionButton}
            >
              Salvar
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
        <Dialog.Title>Confirmar exclusão</Dialog.Title>
        <Dialog.Content>
          <Text>Deseja excluir esta compra recorrente?</Text>
          <Text style={{ marginTop: 8, opacity: 0.7 }}>
            Compras já criadas em meses anteriores não serão afetadas.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDeleteDialogVisible(false)}>Cancelar</Button>
          <Button onPress={handleConfirmDelete} textColor={theme.colors.error}>
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
    padding: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  title: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
  },
  helperText: {
    marginTop: -8,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  menuButton: {
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  menuButtonContent: {
    justifyContent: 'flex-start',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    flex: 1,
  },
  clearDateButton: {
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    flex: 1,
  },
  switchSubLabel: {
    opacity: 0.6,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});
