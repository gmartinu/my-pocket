import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, SegmentedButtons, useTheme, Surface, ActivityIndicator } from 'react-native-paper';
// Victory charts temporarily disabled - TODO: fix victory-native
// @ts-ignore
// import { VictoryChart, VictoryLine, VictoryPie, VictoryBar, VictoryAxis } from 'victory-native';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { supabase } from '../../config/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface MonthData {
  month: string;
  total: number;
  despesas: number;
  cartoes: number;
}

interface CategoryData {
  x: string;
  y: number;
  label?: string;
}

export default function ReportsScreen() {
  const theme = useTheme();
  const { activeWorkspace } = useWorkspace();
  const [period, setPeriod] = useState('6m');
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [insights, setInsights] = useState({
    averageExpense: 0,
    highestMonth: '',
    lowestMonth: '',
    trend: 'stable' as 'up' | 'down' | 'stable',
  });

  useEffect(() => {
    if (activeWorkspace) {
      loadReportsData();
    }
  }, [activeWorkspace, period]);

  const loadReportsData = async () => {
    if (!activeWorkspace) return;

    setLoading(true);
    try {
      console.log('📊 [ReportsScreen] Loading reports data for workspace:', activeWorkspace.id);

      // Calculate date range based on period
      const monthsToLoad = period === '3m' ? 3 : period === '6m' ? 6 : 12;

      // Query months from Supabase (using the view month_totals)
      const { data: monthsData, error: monthsError } = await supabase
        .from('month_totals')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(monthsToLoad);

      if (monthsError) throw monthsError;

      console.log('📊 [ReportsScreen] Loaded months:', monthsData?.length);

      // Process monthly data
      const months: MonthData[] = [];
      const categories: { [key: string]: number } = {};

      if (monthsData) {
        for (const monthData of monthsData) {
          const monthName = monthData.month_name || monthData.month_id;

          const despesasTotal = monthData.total_expenses || 0;
          const cartoesTotal = monthData.total_cards || 0;

          months.push({
            month: monthName,
            total: despesasTotal + cartoesTotal,
            despesas: despesasTotal,
            cartoes: cartoesTotal,
          });

          // Load expense instances to extract categories
          const { data: expenses } = await supabase
            .from('expense_instances')
            .select('metadata')
            .eq('month_id', monthData.month_id)
            .eq('workspace_id', activeWorkspace.id);

          // Extract categories from metadata
          expenses?.forEach((expense: any) => {
            const cat = expense.metadata?.categoria || 'Outros';
            const value = expense.metadata?.value_calculated || 0;
            categories[cat] = (categories[cat] || 0) + value;
          });
        }
      }

      // Reverse to show oldest to newest
      months.reverse();

      // Convert categories to chart data
      const catData: CategoryData[] = Object.entries(categories).map(([name, value]) => ({
        x: name,
        y: value,
        label: `${name}\nR$ ${value.toFixed(0)}`,
      }));

      console.log('📊 [ReportsScreen] Categories found:', catData.length);

      // Calculate insights
      const total = months.reduce((sum, m) => sum + m.total, 0);
      const average = months.length > 0 ? total / months.length : 0;

      const sortedByTotal = [...months].sort((a, b) => b.total - a.total);
      const highest = sortedByTotal[0]?.month || '';
      const lowest = sortedByTotal[sortedByTotal.length - 1]?.month || '';

      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (months.length >= 2) {
        const recent = months[months.length - 1].total;
        const previous = months[months.length - 2].total;
        if (recent > previous * 1.1) trend = 'up';
        else if (recent < previous * 0.9) trend = 'down';
      }

      setMonthlyData(months);
      setCategoryData(catData);
      setInsights({
        averageExpense: average,
        highestMonth: highest,
        lowestMonth: lowest,
        trend,
      });

      console.log('✅ [ReportsScreen] Reports data loaded successfully');
    } catch (error) {
      console.error('❌ [ReportsScreen] Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Carregando relatórios...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Relatórios
        </Text>

        {/* Period Selector */}
        <SegmentedButtons
          value={period}
          onValueChange={setPeriod}
          buttons={[
            { value: '3m', label: '3 meses' },
            { value: '6m', label: '6 meses' },
            { value: '12m', label: '1 ano' },
          ]}
          style={styles.periodSelector}
        />

        {/* Insights Cards */}
        <View style={styles.insightsContainer}>
          <Card style={styles.insightCard} mode="contained">
            <Card.Content>
              <Text variant="bodySmall" style={styles.insightLabel}>
                Gasto Médio Mensal
              </Text>
              <Text variant="headlineSmall" style={[styles.insightValue, { color: theme.colors.primary }]}>
                R$ {insights.averageExpense.toFixed(2)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.insightCard} mode="contained">
            <Card.Content>
              <Text variant="bodySmall" style={styles.insightLabel}>
                Tendência
              </Text>
              <Text variant="headlineSmall" style={[
                styles.insightValue,
                { color: insights.trend === 'up' ? theme.colors.error : insights.trend === 'down' ? theme.colors.primary : theme.colors.onSurface }
              ]}>
                {insights.trend === 'up' ? '↑ Subindo' : insights.trend === 'down' ? '↓ Caindo' : '→ Estável'}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Monthly Evolution Chart - Temporarily disabled */}
        {/* TODO: Fix victory-native installation */}
        {monthlyData.length > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Evolução de Gastos Mensais
            </Text>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text variant="bodyMedium" style={{ opacity: 0.6 }}>
                Gráfico temporariamente desabilitado
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.4, marginTop: 8 }}>
                (Instalando victory-native...)
              </Text>
            </View>
          </Surface>
        )}

        {/* Category Distribution Chart - Temporarily disabled */}
        {categoryData.length > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Distribuição por Categoria
            </Text>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text variant="bodyMedium" style={{ opacity: 0.6 }}>
                Gráfico temporariamente desabilitado
              </Text>
            </View>
          </Surface>
        )}

        {/* Despesas vs Cartões Comparison - Temporarily disabled */}
        {monthlyData.length > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Despesas vs Cartões (Últimos 3 Meses)
            </Text>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text variant="bodyMedium" style={{ opacity: 0.6 }}>
                Gráfico temporariamente desabilitado
              </Text>
            </View>
          </Surface>
        )}

        {monthlyData.length === 0 && (
          <Surface style={styles.emptyState} elevation={1}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Nenhum dado disponível para o período selecionado
            </Text>
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  periodSelector: {
    marginBottom: 16,
  },
  insightsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  insightCard: {
    flex: 1,
  },
  insightLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  insightValue: {
    fontWeight: 'bold',
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  chartTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  pieChartContainer: {
    alignItems: 'center',
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
  },
  emptyText: {
    opacity: 0.7,
    textAlign: 'center',
  },
});
