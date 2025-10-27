import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar, useTheme } from 'react-native-paper';
import { formatCurrency, calculateSpendingPercentage } from '../utils/calculations';

interface SummaryCardProps {
  saldoInicial: number;
  totalDespesas: number;
  totalCartoes: number;
  sobra: number;
}

export default function SummaryCard({
  saldoInicial,
  totalDespesas,
  totalCartoes,
  sobra,
}: SummaryCardProps) {
  const theme = useTheme();

  const spendingPercentage = calculateSpendingPercentage(
    totalDespesas,
    totalCartoes,
    saldoInicial
  );
  const progressValue = Math.min(spendingPercentage / 100, 1);

  const sobraColor = sobra >= 0 ? '#4CAF50' : '#F44336';
  const despesasColor = '#F44336';
  const cartoesColor = '#FF9800';

  return (
    <Card style={styles.card} elevation={2}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          Resumo do Mês
        </Text>

        <View style={styles.row}>
          <Text variant="bodyMedium">Despesas Planejadas</Text>
          <Text
            variant="bodyMedium"
            style={[styles.value, { color: despesasColor }]}
          >
            -{formatCurrency(totalDespesas)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text variant="bodyMedium">Cartões (Fatura)</Text>
          <Text
            variant="bodyMedium"
            style={[styles.value, { color: cartoesColor }]}
          >
            -{formatCurrency(totalCartoes)}
          </Text>
        </View>

        <View style={[styles.row, styles.divider]}>
          <Text variant="titleMedium" style={styles.sobraLabel}>
            Sobra Projetada
          </Text>
          <Text
            variant="titleLarge"
            style={[styles.sobraValue, { color: sobraColor }]}
          >
            {formatCurrency(sobra)}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <Text variant="bodySmall" style={styles.progressLabel}>
            Projeção: {spendingPercentage.toFixed(1)}% do saldo inicial
          </Text>
          <ProgressBar
            progress={progressValue}
            color={progressValue > 0.9 ? '#F44336' : theme.colors.primary}
            style={styles.progressBar}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontWeight: '600',
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 4,
  },
  sobraLabel: {
    fontWeight: 'bold',
  },
  sobraValue: {
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressLabel: {
    marginBottom: 8,
    opacity: 0.7,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
});
