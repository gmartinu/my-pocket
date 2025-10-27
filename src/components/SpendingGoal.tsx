import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar, IconButton, Portal, Modal, TextInput, Button, useTheme } from 'react-native-paper';
import { AnimatedProgressBar } from './AnimatedComponents';

interface SpendingGoalProps {
  goal?: number;
  currentSpending: number;
  onGoalChange: (goal: number | undefined) => void;
}

export const SpendingGoal: React.FC<SpendingGoalProps> = ({
  goal,
  currentSpending,
  onGoalChange,
}) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [goalInput, setGoalInput] = useState(goal?.toString() || '');

  if (!goal) {
    return (
      <>
        <Card style={styles.card} onPress={() => setModalVisible(true)}>
          <Card.Content style={styles.addGoalContent}>
            <IconButton icon="target" size={32} />
            <Text variant="bodyLarge">Definir Meta de Gastos</Text>
            <Text variant="bodySmall" style={styles.hint}>
              Estabeleça um limite mensal para seus gastos
            </Text>
          </Card.Content>
        </Card>

        <GoalModal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          goalInput={goalInput}
          setGoalInput={setGoalInput}
          onSave={() => {
            const value = parseFloat(goalInput);
            if (value > 0) {
              onGoalChange(value);
              setModalVisible(false);
            }
          }}
          onRemove={() => {
            onGoalChange(undefined);
            setGoalInput('');
            setModalVisible(false);
          }}
        />
      </>
    );
  }

  const progress = currentSpending / goal;
  const remaining = goal - currentSpending;
  const isOverBudget = currentSpending > goal;

  // Determine color based on progress
  let progressColor = theme.colors.primary;
  if (progress >= 1) {
    progressColor = theme.colors.error;
  } else if (progress >= 0.8) {
    progressColor = theme.colors.tertiary;
  }

  return (
    <>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <IconButton icon="target" size={24} style={styles.icon} />
              <View>
                <Text variant="titleMedium" style={styles.title}>
                  Meta de Gastos
                </Text>
                <Text variant="bodySmall" style={styles.goalAmount}>
                  R$ {goal.toFixed(2)}
                </Text>
              </View>
            </View>
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => setModalVisible(true)}
            />
          </View>

          <View style={styles.progressContainer}>
            <AnimatedProgressBar
              progress={Math.min(progress, 1)}
              height={12}
              progressColor={progressColor}
              borderRadius={6}
            />
          </View>

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>
                Gasto
              </Text>
              <Text
                variant="titleMedium"
                style={[styles.statValue, { color: isOverBudget ? theme.colors.error : theme.colors.onSurface }]}
              >
                R$ {currentSpending.toFixed(2)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>
                {isOverBudget ? 'Excedido' : 'Restante'}
              </Text>
              <Text
                variant="titleMedium"
                style={[
                  styles.statValue,
                  { color: isOverBudget ? theme.colors.error : theme.colors.primary },
                ]}
              >
                R$ {Math.abs(remaining).toFixed(2)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>
                Progresso
              </Text>
              <Text variant="titleMedium" style={styles.statValue}>
                {(progress * 100).toFixed(0)}%
              </Text>
            </View>
          </View>

          {isOverBudget && (
            <Card style={[styles.warningCard, { backgroundColor: theme.colors.errorContainer }]}>
              <Card.Content style={styles.warningContent}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer }}>
                  ⚠️ Você ultrapassou sua meta de gastos em R$ {Math.abs(remaining).toFixed(2)}
                </Text>
              </Card.Content>
            </Card>
          )}
        </Card.Content>
      </Card>

      <GoalModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        goalInput={goalInput}
        setGoalInput={setGoalInput}
        onSave={() => {
          const value = parseFloat(goalInput);
          if (value > 0) {
            onGoalChange(value);
            setModalVisible(false);
          }
        }}
        onRemove={() => {
          onGoalChange(undefined);
          setGoalInput('');
          setModalVisible(false);
        }}
      />
    </>
  );
};

interface GoalModalProps {
  visible: boolean;
  onDismiss: () => void;
  goalInput: string;
  setGoalInput: (value: string) => void;
  onSave: () => void;
  onRemove: () => void;
}

const GoalModal: React.FC<GoalModalProps> = ({
  visible,
  onDismiss,
  goalInput,
  setGoalInput,
  onSave,
  onRemove,
}) => {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <Text variant="titleLarge" style={styles.modalTitle}>
          Meta de Gastos
        </Text>

        <TextInput
          label="Valor da Meta (R$)"
          value={goalInput}
          onChangeText={setGoalInput}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="currency-usd" />}
        />

        <Text variant="bodySmall" style={styles.modalHint}>
          Defina um valor máximo que você deseja gastar neste mês
        </Text>

        <View style={styles.modalButtons}>
          {goalInput && (
            <Button mode="text" onPress={onRemove} textColor={theme.colors.error}>
              Remover Meta
            </Button>
          )}
          <View style={styles.modalButtonsRight}>
            <Button mode="text" onPress={onDismiss}>
              Cancelar
            </Button>
            <Button mode="contained" onPress={onSave}>
              Salvar
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  addGoalContent: {
    alignItems: 'center',
    padding: 16,
  },
  hint: {
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    margin: 0,
  },
  title: {
    fontWeight: 'bold',
  },
  goalAmount: {
    opacity: 0.7,
  },
  progressContainer: {
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    opacity: 0.6,
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  warningCard: {
    marginTop: 12,
  },
  warningContent: {
    padding: 8,
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
  input: {
    marginBottom: 8,
  },
  modalHint: {
    opacity: 0.6,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalButtonsRight: {
    flexDirection: 'row',
    gap: 8,
  },
});
