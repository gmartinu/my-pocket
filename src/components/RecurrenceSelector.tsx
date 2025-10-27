import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Switch, Text, Chip, Portal, Modal, Button, useTheme, List } from 'react-native-paper';
import {
  RecurringExpenseConfig,
  RecurrenceFrequency,
  RECURRENCE_OPTIONS,
} from '../types/recurring';

interface RecurrenceSelectorProps {
  config: RecurringExpenseConfig;
  onChange: (config: RecurringExpenseConfig) => void;
  disabled?: boolean;
}

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  config,
  onChange,
  disabled = false,
}) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const handleToggle = () => {
    if (config.isRecurring) {
      // Disable recurring
      onChange({
        isRecurring: false,
      });
    } else {
      // Enable recurring with default monthly
      onChange({
        isRecurring: true,
        frequency: 'mensal',
        startDate: new Date(),
      });
    }
  };

  const handleFrequencySelect = (frequency: RecurrenceFrequency) => {
    onChange({
      ...config,
      frequency,
    });
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <Text variant="labelLarge">Despesa Recorrente</Text>
          <Text variant="bodySmall" style={styles.hint}>
            Será copiada automaticamente para os próximos meses
          </Text>
        </View>
        <Switch value={config.isRecurring} onValueChange={handleToggle} disabled={disabled} />
      </View>

      {config.isRecurring && (
        <View style={styles.frequencyContainer}>
          <Chip
            icon={RECURRENCE_OPTIONS[config.frequency || 'mensal'].icon}
            onPress={() => !disabled && setModalVisible(true)}
            style={styles.frequencyChip}
            disabled={disabled}
          >
            {RECURRENCE_OPTIONS[config.frequency || 'mensal'].label}
          </Chip>
        </View>
      )}

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Frequência da Recorrência
          </Text>

          {Object.entries(RECURRENCE_OPTIONS).map(([key, info]) => (
            <List.Item
              key={key}
              title={info.label}
              description={info.description}
              left={(props) => <List.Icon {...props} icon={info.icon} />}
              onPress={() => handleFrequencySelect(key as RecurrenceFrequency)}
              style={[
                styles.frequencyOption,
                config.frequency === key && { backgroundColor: theme.colors.primaryContainer },
              ]}
            />
          ))}

          <Button onPress={() => setModalVisible(false)} style={styles.closeButton}>
            Fechar
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  hint: {
    opacity: 0.6,
    marginTop: 4,
  },
  frequencyContainer: {
    marginTop: 12,
  },
  frequencyChip: {
    alignSelf: 'flex-start',
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  frequencyOption: {
    borderRadius: 8,
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 16,
  },
});
