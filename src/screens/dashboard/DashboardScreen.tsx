import React from 'react';
import { StyleSheet, ScrollView, View, ActivityIndicator } from 'react-native';
import { Text, Surface, useTheme, Button, Banner, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MainTabNavigationProp } from '../../types/navigation';
import WorkspaceSelector from '../../components/WorkspaceSelector';
import MonthSelector from '../../components/MonthSelector';
import BalanceCard from '../../components/BalanceCard';
import SummaryCard from '../../components/SummaryCard';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useMonth } from '../../hooks/useMonth';
import { useSync } from '../../contexts/SyncContext';
import { formatCurrency } from '../../utils/calculations';
import { getNextMonthId, formatMonthName } from '../../utils/dateUtils';

export default function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation<MainTabNavigationProp>();
  const { activeWorkspace } = useWorkspace();
  const { syncStatus, isOnline } = useSync();
  const {
    month,
    loading,
    currentMonthId,
    goToNextMonth,
    goToPreviousMonth,
    updateSaldoInicial,
    recalculateTotals,
  } = useMonth();

  // Reload totals when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      if (month && !loading) {
        recalculateTotals();
      }
    }, [month?.id, recalculateTotals, loading])
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando mês...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!month) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <Text>Erro ao carregar mês</Text>
        </View>
      </SafeAreaView>
    );
  }

  const nextMonthId = getNextMonthId(currentMonthId);
  const nextMonthName = formatMonthName(nextMonthId);

  // Get sync status icon and color
  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'cloud-sync';
      case 'error':
        return 'cloud-off-outline';
      default:
        return 'cloud-check-outline';
    }
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return theme.colors.primary;
      case 'error':
        return '#F44336';
      default:
        return '#4CAF50';
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Offline Banner */}
        {!isOnline && (
          <Banner visible={!isOnline} icon="wifi-off">
            You're offline. Changes will sync when you reconnect.
          </Banner>
        )}

        <SafeAreaView style={styles.header} edges={['left', 'right']}>
          <View style={styles.headerLeft}>
            <Text variant="headlineMedium" style={styles.title}>
              Dashboard
            </Text>
            <IconButton
              icon={getSyncIcon()}
              iconColor={getSyncColor()}
              size={20}
              animated
            />
          </View>
          <WorkspaceSelector />
        </SafeAreaView>

        <SafeAreaView style={styles.content} edges={['left', 'right']}>
          {/* Month Selector */}
          <MonthSelector
            monthId={currentMonthId}
            onPrevious={goToPreviousMonth}
            onNext={goToNextMonth}
            loading={loading}
          />

          {/* Balance Card */}
          <BalanceCard
            saldoInicial={month.saldoInicial}
            onUpdateSaldo={updateSaldoInicial}
          />

          {/* Summary Card */}
          <SummaryCard
            saldoInicial={month.saldoInicial}
            totalDespesas={month.totalDespesas}
            totalCartoes={month.totalCartoes}
            sobra={month.sobra}
          />

          {/* Quick Actions */}
          <Surface style={styles.actionsCard} elevation={1}>
            <Text variant="titleMedium" style={styles.actionsTitle}>
              Ações Rápidas
            </Text>
            <View style={styles.actionsRow}>
              <Button
                mode="contained-tonal"
                icon="receipt"
                style={styles.actionButton}
                onPress={() => navigation.navigate('Despesas')}
              >
                Despesas
              </Button>
              <Button
                mode="contained-tonal"
                icon="credit-card"
                style={styles.actionButton}
                onPress={() => navigation.navigate('Cartoes')}
              >
                Cartões
              </Button>
            </View>
          </Surface>

          {/* Next Month Projection */}
          <Surface style={styles.projectionCard} elevation={1}>
            <Text variant="titleMedium" style={styles.projectionTitle}>
              Projeção: {nextMonthName}
            </Text>
            <View style={styles.projectionRow}>
              <Text variant="bodyMedium">Saldo inicial projetado</Text>
              <Text
                variant="titleMedium"
                style={[
                  styles.projectionValue,
                  { color: month.sobra >= 0 ? '#4CAF50' : '#F44336' },
                ]}
              >
                {formatCurrency(month.sobra)}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.projectionNote}>
              Baseado na sobra do mês atual
            </Text>
          </Surface>

          {/* Phase Progress */}
          <Surface style={styles.surface} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Progresso do Projeto
            </Text>
            <Text variant="bodyMedium" style={styles.featureText}>
              ✅ Autenticação (Fase 1)
            </Text>
            <Text variant="bodyMedium" style={styles.featureText}>
              ✅ Workspaces (Fase 2)
            </Text>
            <Text variant="bodyMedium" style={styles.featureText}>
              ✅ Dashboard e Meses (Fase 3)
            </Text>
            <Text variant="bodyMedium" style={styles.featureText}>
              ✅ Despesas CRUD (Fase 4)
            </Text>
            <Text variant="bodyMedium" style={styles.featureText}>
              ✅ Cartões de Crédito (Fase 5)
            </Text>
            <Text variant="bodyMedium" style={styles.featureText}>
              ✅ Sincronização em Tempo Real (Fase 7)
            </Text>
          </Surface>
        </SafeAreaView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  actionsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  actionsTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  projectionCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  projectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectionValue: {
    fontWeight: 'bold',
  },
  projectionNote: {
    opacity: 0.6,
    marginTop: 8,
  },
  surface: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  featureText: {
    marginBottom: 8,
  },
});
