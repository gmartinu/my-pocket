import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, useTheme, ActivityIndicator, Chip, Surface, IconButton } from 'react-native-paper';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { supabase } from '../../config/supabase';
import { useNavigation } from '@react-navigation/native';

interface MonthHistoryItem {
  id: string;
  nome: string;
  saldoInicial: number;
  sobra: number;
  totalDespesas: number;
  totalCartoes: number;
  criadoEm: string;
  year: number;
}

export default function MonthHistoryScreen() {
  const theme = useTheme();
  const { activeWorkspace } = useWorkspace();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState<MonthHistoryItem[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [stats, setStats] = useState({
    averageExpense: 0,
    highestExpenseMonth: '',
    highestSurplusMonth: '',
  });

  useEffect(() => {
    if (activeWorkspace) {
      loadMonthHistory();
    }
  }, [activeWorkspace]);

  const loadMonthHistory = async () => {
    if (!activeWorkspace) return;

    setLoading(true);
    try {
      console.log('📜 [MonthHistoryScreen] Loading month history for workspace:', activeWorkspace.id);

      // Query months from Supabase (using the view month_totals)
      const { data: monthsData, error: monthsError } = await supabase
        .from('month_totals')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (monthsError) throw monthsError;

      console.log('📜 [MonthHistoryScreen] Loaded months:', monthsData?.length);

      const monthsList: MonthHistoryItem[] = [];
      const yearsSet = new Set<number>();

      if (monthsData) {
        monthsData.forEach((data) => {
          const despesasTotal = data.total_expenses || 0;
          const cartoesTotal = data.total_cards || 0;
          const sobra = (data.saldo_inicial || 0) - despesasTotal - cartoesTotal;

          monthsList.push({
            id: data.month_id || '',
            nome: data.month_name || data.month_id || '',
            saldoInicial: data.saldo_inicial || 0,
            sobra: sobra,
            totalDespesas: despesasTotal,
            totalCartoes: cartoesTotal,
            criadoEm: '', // Not available in month_totals view
            year: data.year || new Date().getFullYear(),
          });

          yearsSet.add(data.year || new Date().getFullYear());
        });
      }

      // Calculate stats
      const totalExpenses = monthsList.reduce((sum, m) => sum + m.totalDespesas + m.totalCartoes, 0);
      const average = monthsList.length > 0 ? totalExpenses / monthsList.length : 0;

      const sortedByExpense = [...monthsList].sort((a, b) =>
        (b.totalDespesas + b.totalCartoes) - (a.totalDespesas + a.totalCartoes)
      );
      const sortedBySurplus = [...monthsList].sort((a, b) => b.sobra - a.sobra);

      setMonths(monthsList);
      setYears(Array.from(yearsSet).sort((a, b) => b - a));
      setStats({
        averageExpense: average,
        highestExpenseMonth: sortedByExpense[0]?.nome || '',
        highestSurplusMonth: sortedBySurplus[0]?.nome || '',
      });

      console.log('✅ [MonthHistoryScreen] Month history loaded successfully');
    } catch (error) {
      console.error('❌ [MonthHistoryScreen] Failed to load month history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMonths = selectedYear
    ? months.filter((m) => m.year === selectedYear)
    : months;

  const renderMonthCard = ({ item }: { item: MonthHistoryItem }) => {
    const totalGastos = item.totalDespesas + item.totalCartoes;

    return (
      <Card
        style={styles.monthCard}
        mode="contained"
        onPress={() => {
          // Navigate to month detail (if implemented)
          // navigation.navigate('MonthDetail', { monthId: item.id });
        }}
      >
        <Card.Content>
          <View style={styles.monthHeader}>
            <Text variant="titleLarge" style={styles.monthName}>
              {item.nome}
            </Text>
            <IconButton
              icon="chevron-right"
              size={24}
              onPress={() => {}}
            />
          </View>

          <View style={styles.monthStats}>
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>
                Sobra
              </Text>
              <Text
                variant="titleMedium"
                style={[
                  styles.statValue,
                  { color: item.sobra >= 0 ? theme.colors.primary : theme.colors.error },
                ]}
              >
                R$ {item.sobra.toFixed(2)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>
                Gastos
              </Text>
              <Text variant="titleMedium" style={styles.statValue}>
                R$ {totalGastos.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.breakdown}>
            <View style={styles.breakdownItem}>
              <Text variant="bodySmall">Despesas:</Text>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                R$ {item.totalDespesas.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text variant="bodySmall">Cartões:</Text>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                R$ {item.totalCartoes.toFixed(2)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Carregando histórico...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Histórico de Meses
        </Text>

        {/* Stats Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsContainer}
        >
          <Surface style={styles.statCard} elevation={1}>
            <Text variant="bodySmall" style={styles.statCardLabel}>
              Gasto Médio
            </Text>
            <Text variant="titleMedium" style={[styles.statCardValue, { color: theme.colors.primary }]}>
              R$ {stats.averageExpense.toFixed(2)}
            </Text>
          </Surface>

          <Surface style={styles.statCard} elevation={1}>
            <Text variant="bodySmall" style={styles.statCardLabel}>
              Maior Gasto
            </Text>
            <Text variant="titleSmall" style={styles.statCardValue}>
              {stats.highestExpenseMonth}
            </Text>
          </Surface>

          <Surface style={styles.statCard} elevation={1}>
            <Text variant="bodySmall" style={styles.statCardLabel}>
              Maior Sobra
            </Text>
            <Text variant="titleSmall" style={styles.statCardValue}>
              {stats.highestSurplusMonth}
            </Text>
          </Surface>
        </ScrollView>

        {/* Year Filter */}
        {years.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.yearFilter}
            contentContainerStyle={styles.yearFilterContent}
          >
            <Chip
              selected={selectedYear === null}
              onPress={() => setSelectedYear(null)}
              style={styles.yearChip}
            >
              Todos
            </Chip>
            {years.map((year) => (
              <Chip
                key={year}
                selected={selectedYear === year}
                onPress={() => setSelectedYear(year)}
                style={styles.yearChip}
              >
                {year}
              </Chip>
            ))}
          </ScrollView>
        )}

        {/* Months List */}
        <FlatList
          data={filteredMonths}
          renderItem={renderMonthCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Surface style={styles.emptyState} elevation={1}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                Nenhum mês encontrado
              </Text>
            </Surface>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  statsScroll: {
    marginBottom: 16,
  },
  statsContainer: {
    gap: 12,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    minWidth: 140,
  },
  statCardLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  statCardValue: {
    fontWeight: 'bold',
  },
  yearFilter: {
    marginBottom: 16,
  },
  yearFilterContent: {
    gap: 8,
  },
  yearChip: {
    marginRight: 0,
  },
  listContainer: {
    paddingBottom: 16,
  },
  monthCard: {
    marginBottom: 12,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthName: {
    fontWeight: 'bold',
  },
  monthStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  breakdownItem: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  emptyText: {
    opacity: 0.7,
    textAlign: 'center',
  },
});
