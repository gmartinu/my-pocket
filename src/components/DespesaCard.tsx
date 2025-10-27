import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Switch, IconButton, useTheme } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { Despesa } from '../types/month';
import { formatCurrency } from '../utils/calculations';

interface DespesaCardProps {
  despesa: Despesa;
  onTogglePago: (id: string, pago: boolean) => void;
  onPress: (despesa: Despesa) => void;
  onDelete: (id: string) => void;
  readonly?: boolean;
}

export default function DespesaCard({
  despesa,
  onTogglePago,
  onPress,
  onDelete,
  readonly = false,
}: DespesaCardProps) {
  const theme = useTheme();

  const borderColor = despesa.pago ? '#4CAF50' : '#BDBDBD';
  const iconColor = despesa.pago ? theme.colors.primary : '#9E9E9E';

  const renderRightActions = () => {
    if (readonly) return null;
    return (
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
        onPress={() => onDelete(despesa.id)}
      >
        <IconButton
          icon="delete"
          iconColor="white"
          size={24}
        />
        <Text style={styles.deleteText}>Deletar</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      enabled={!readonly}
    >
      <Card
        style={[styles.card, { borderLeftColor: borderColor }]}
        onPress={() => !readonly && onPress(despesa)}
      >
        <Card.Content>
          <View style={styles.content}>
            <View style={styles.leftContent}>
              <IconButton
                icon="receipt"
                size={24}
                iconColor={iconColor}
                style={styles.icon}
              />
              <View style={styles.textContent}>
                <Text variant="titleMedium" style={styles.name}>
                  {despesa.nome}
                </Text>
                <Text
                  variant="titleSmall"
                  style={[styles.value, { color: theme.colors.primary }]}
                >
                  {formatCurrency(despesa.valorCalculado)}
                </Text>
              </View>
            </View>
            <Switch
              value={despesa.pago}
              onValueChange={(value) => onTogglePago(despesa.id, value)}
              color={theme.colors.primary}
              disabled={readonly}
            />
          </View>
        </Card.Content>
      </Card>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    marginHorizontal: 16,
    borderLeftWidth: 4,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    margin: 0,
  },
  textContent: {
    marginLeft: 8,
    flex: 1,
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontWeight: 'bold',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginBottom: 8,
    borderRadius: 8,
    marginRight: 16,
  },
  deleteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
