import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Portal,
  Modal,
  Text,
  TextInput,
  Button,
  Switch,
  useTheme,
  HelperText,
  Dialog,
} from "react-native-paper";
import { Compra } from "../../types/month";
import { evaluateFormula, formatCurrency } from "../../utils/calculations";

interface CompraFormModalProps {
  visible: boolean;
  compra?: Compra | null;
  cartaoId: string;
  onDismiss: () => void;
  onSave: (data: {
    descricao: string;
    valorTotal: number;
    parcelaAtual: number;
    parcelasTotal: number;
    marcado: boolean;
    data?: Date;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function CompraFormModal({
  visible,
  compra,
  cartaoId,
  onDismiss,
  onSave,
  onDelete,
}: CompraFormModalProps) {
  const theme = useTheme();
  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [parcelaAtual, setParcelaAtual] = useState("1");
  const [parcelasTotal, setParcelasTotal] = useState("1");
  const [marcado, setMarcado] = useState(true);
  const [data, setData] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  // Reset form when modal opens/closes or compra changes
  useEffect(() => {
    if (visible) {
      if (compra) {
        setDescricao(compra.descricao);
        setValorTotal(String(compra.valorTotal));
        setParcelaAtual(String(compra.parcelaAtual));
        setParcelasTotal(String(compra.parcelasTotal));
        setMarcado(compra.marcado);
        setData(
          compra.data
            ? compra.data instanceof Date
              ? compra.data
              : compra.data.toDate()
            : new Date()
        );
      } else {
        setDescricao("");
        setValorTotal("");
        setParcelaAtual("1");
        setParcelasTotal("1");
        setMarcado(true);
        setData(new Date());
      }
      setError("");
      setDeleteDialogVisible(false);
      setShowDatePicker(false);
    }
  }, [visible, compra]);

  // Calculate value from formula
  const getCalculatedValor = (): number | null => {
    if (!valorTotal.trim()) return null;
    try {
      return evaluateFormula(valorTotal);
    } catch {
      return null;
    }
  };

  const validate = (): string | null => {
    if (!descricao.trim()) {
      return "Descrição é obrigatória";
    }

    if (descricao.trim().length < 3) {
      return "Descrição deve ter no mínimo 3 caracteres";
    }

    if (!valorTotal.trim()) {
      return "Valor é obrigatório";
    }

    const calculated = getCalculatedValor();
    if (calculated === null) {
      return "Valor inválido";
    }

    if (calculated <= 0) {
      return "Valor deve ser maior que zero";
    }

    const parcelaAtualNum = parseInt(parcelaAtual);
    const parcelasTotalNum = parseInt(parcelasTotal);

    if (isNaN(parcelaAtualNum) || parcelaAtualNum < 1) {
      return "Parcela atual deve ser maior que zero";
    }

    if (isNaN(parcelasTotalNum) || parcelasTotalNum < 1) {
      return "Total de parcelas deve ser maior que zero";
    }

    if (parcelaAtualNum > parcelasTotalNum) {
      return "Parcela atual não pode ser maior que o total";
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
    setError("");

    try {
      const valorCalculado = getCalculatedValor();
      if (valorCalculado === null) {
        setError("Erro ao calcular valor");
        return;
      }

      await onSave({
        descricao: descricao.trim(),
        valorTotal: valorCalculado,
        parcelaAtual: parseInt(parcelaAtual),
        parcelasTotal: parseInt(parcelasTotal),
        marcado,
        data,
      });
      onDismiss();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar compra");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePress = () => {
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!compra || !onDelete) return;

    setLoading(true);
    try {
      await onDelete(compra.id);
      setDeleteDialogVisible(false);
      onDismiss();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir compra");
      setDeleteDialogVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const calculatedValor = getCalculatedValor();
  const isEditMode = !!compra;

  const valorParcela =
    calculatedValor && parseInt(parcelasTotal) > 0
      ? calculatedValor / parseInt(parcelasTotal)
      : null;

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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Text variant="headlineSmall" style={styles.title}>
            {isEditMode ? "Editar Compra" : "Nova Compra"}
          </Text>

          <TextInput
            label="Descrição"
            value={descricao}
            onChangeText={setDescricao}
            mode="outlined"
            placeholder="Ex: Notebook, Celular, TV"
            maxLength={50}
            disabled={loading}
            style={styles.input}
            left={<TextInput.Icon icon="cart" />}
          />

          <TextInput
            label="Valor total"
            value={valorTotal}
            onChangeText={setValorTotal}
            mode="outlined"
            placeholder="Ex: 1200 ou 800+400"
            keyboardType="numeric"
            disabled={loading}
            style={styles.input}
            left={<TextInput.Icon icon="currency-usd" />}
          />

          <Pressable onPress={() => !loading && setShowDatePicker(true)}>
            <View pointerEvents="none">
              <TextInput
                label="Data da compra"
                value={data.toLocaleDateString("pt-BR")}
                mode="outlined"
                editable={false}
                style={styles.input}
                left={<TextInput.Icon icon="calendar" />}
              />
            </View>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={data}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === "ios");
                if (selectedDate) {
                  setData(selectedDate);
                }
              }}
            />
          )}

          <View style={styles.parcelasRow}>
            <TextInput
              label="Parcela atual"
              value={parcelaAtual}
              onChangeText={setParcelaAtual}
              mode="outlined"
              keyboardType="number-pad"
              disabled={loading}
              style={[styles.input, styles.parcelaInput]}
            />
            <Text style={styles.parcelasSeparator}>/</Text>
            <TextInput
              label="Total de parcelas"
              value={parcelasTotal}
              onChangeText={setParcelasTotal}
              mode="outlined"
              keyboardType="number-pad"
              disabled={loading}
              style={[styles.input, styles.parcelaInput]}
            />
          </View>

          {valorParcela !== null && (
            <HelperText type="info" style={styles.helperText}>
              Valor da parcela: {formatCurrency(valorParcela)}
            </HelperText>
          )}

          {error ? (
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          ) : null}

          <View style={styles.switchContainer}>
            <Text variant="bodyLarge">Marcar para pagamento neste mês</Text>
            <Switch
              value={marcado}
              onValueChange={setMarcado}
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
                {isEditMode ? "Salvar" : "Adicionar"}
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
          <Text>Deseja realmente excluir esta compra?</Text>
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
    fontWeight: "bold",
  },
  input: {
    marginBottom: 16,
  },
  parcelasRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  parcelaInput: {
    flex: 1,
  },
  parcelasSeparator: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  helperText: {
    marginTop: -12,
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  rightButtons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    minWidth: 100,
  },
});
