import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, useTheme, Chip, Switch } from 'react-native-paper';
import { RecurringTemplate } from '../types/supabase';
import { formatCurrency } from '../utils/calculations';

interface RecurrenteCardProps {
  template: RecurringTemplate;
  onToggleAtivo: (id: string, isActive: boolean) => void;
  onPress: (template: RecurringTemplate) => void;
  onDelete: (id: string) => void;
  readonly?: boolean;
}

export default function RecurrenteCard({
  template,
  onToggleAtivo,
  onPress,
  onDelete,
  readonly = false,
}: RecurrenteCardProps) {
  const theme = useTheme();

  const borderColor = template.is_active ? theme.colors.primary : theme.colors.outline;
  const iconColor = template.is_active ? theme.colors.primary : theme.colors.onSurfaceDisabled;

  const frequencyLabels: Record<string, string> = {
    mensal: 'Mensal',
    bimestral: 'Bimestral',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  };

  const frequencyLabel = frequencyLabels[template.frequency || 'mensal'] || 'Mensal';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  };

  const startDate = formatDate(template.start_date);
  const endDate = formatDate(template.end_date);
  const dateRange = endDate ? `${startDate} → ${endDate}` : `Desde ${startDate}`;

  return (
    <Card
      style={[styles.card, { borderLeftColor: borderColor }]}
      onPress={() => !readonly && onPress(template)}
    >
      <Card.Content>
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <IconButton
              icon="sync"
              size={24}
              iconColor={iconColor}
              style={styles.icon}
            />
            <View style={styles.textContent}>
              <View style={styles.nameRow}>
                <Text variant="titleMedium" style={styles.name}>
                  {template.name}
                </Text>
                {!template.is_active && (
                  <Chip
                    icon="pause-circle"
                    compact
                    mode="outlined"
                    style={styles.pausedChip}
                    textStyle={styles.pausedText}
                  >
                    Pausado
                  </Chip>
                )}
              </View>
              <View style={styles.detailsRow}>
                <Text
                  variant="titleSmall"
                  style={[styles.value, { color: theme.colors.primary }]}
                >
                  {formatCurrency(template.value_calculated || 0)}
                </Text>
                <Text variant="bodySmall" style={styles.frequency}>
                  • {frequencyLabel}
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.dateRange}>
                {dateRange}
              </Text>
            </View>
          </View>
          {!readonly && (
            <View style={styles.actions}>
              <Switch
                value={template.is_active || false}
                onValueChange={(value) => onToggleAtivo(template.id, value)}
                color={theme.colors.primary}
              />
              <IconButton
                icon="delete"
                size={20}
                onPress={() => onDelete(template.id)}
                iconColor={theme.colors.error}
              />
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
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
  pausedChip: {
    height: 22,
    paddingHorizontal: 4,
  },
  pausedText: {
    fontSize: 10,
    fontWeight: '600',
    marginVertical: 0,
    lineHeight: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  value: {
    fontWeight: 'bold',
  },
  frequency: {
    opacity: 0.6,
    marginLeft: 4,
  },
  dateRange: {
    opacity: 0.6,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
