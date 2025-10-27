import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Switch, IconButton, useTheme, Chip } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Despesa } from '../types/month';
import { formatCurrency } from '../utils/calculations';
import { RECURRENCE_OPTIONS } from '../types/recurring';

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

  const borderColor = despesa.pago ? theme.colors.primary : theme.colors.outline;
  const iconColor = despesa.pago ? theme.colors.primary : theme.colors.onSurfaceDisabled;

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
                <View style={styles.nameRow}>
                  <Text variant="titleMedium" style={styles.name}>
                    {despesa.nome}
                  </Text>
                  {despesa.recurring?.isRecurring && despesa.recurring.frequency && (
                    <Chip
                      icon={() => (
                        <MaterialCommunityIcons
                          name={RECURRENCE_OPTIONS[despesa.recurring.frequency!].icon as any}
                          size={14}
                          color={theme.colors.primary}
                        />
                      )}
                      compact
                      style={[styles.recurrenceChip, { backgroundColor: theme.colors.primaryContainer }]}
                      textStyle={[styles.recurrenceText, { color: theme.colors.primary }]}
                    >
                      {RECURRENCE_OPTIONS[despesa.recurring.frequency!].label}
                    </Chip>
                  )}
                </View>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  name: {
    fontWeight: '600',
  },
  recurrenceChip: {
    height: 22,
  },
  recurrenceText: {
    fontSize: 10,
    fontWeight: '600',
    marginVertical: 0,
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
