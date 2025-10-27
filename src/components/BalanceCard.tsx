import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, Portal, Dialog, TextInput, Button, useTheme } from 'react-native-paper';
import { formatCurrency } from '../utils/calculations';

interface BalanceCardProps {
  saldoInicial: number;
  onUpdateSaldo: (saldo: number) => Promise<void>;
}

export default function BalanceCard({ saldoInicial, onUpdateSaldo }: BalanceCardProps) {
  const theme = useTheme();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newSaldo, setNewSaldo] = useState(String(saldoInicial));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(newSaldo.replace(',', '.'));
    if (isNaN(parsed)) return;

    setLoading(true);
    try {
      await onUpdateSaldo(parsed);
      setDialogVisible(false);
    } catch (error) {
      console.error('Error updating saldo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card style={styles.card} elevation={2}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="titleMedium">Saldo Inicial</Text>
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => {
                setNewSaldo(String(saldoInicial));
                setDialogVisible(true);
              }}
            />
          </View>
          <Text
            variant="headlineLarge"
            style={[
              styles.value,
              { color: theme.colors.primary },
            ]}
          >
            {formatCurrency(saldoInicial)}
          </Text>
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Atualizar Saldo Inicial</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Saldo"
              value={newSaldo}
              onChangeText={setNewSaldo}
              keyboardType="numeric"
              mode="outlined"
              disabled={loading}
              left={<TextInput.Affix text="R$" />}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
            >
              Salvar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    fontWeight: 'bold',
  },
});
