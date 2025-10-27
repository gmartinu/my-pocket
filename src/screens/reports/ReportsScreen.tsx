import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, SegmentedButtons, useTheme, Surface, ActivityIndicator } from 'react-native-paper';
import { VictoryChart, VictoryLine, VictoryPie, VictoryBar, VictoryTheme, VictoryAxis, VictoryLabel } from 'victory-native';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';

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
      // Calculate date range based on period
      const monthsToLoad = period === '3m' ? 3 : period === '6m' ? 6 : 12;

      // Query months from Firestore
      const monthsRef = collection(db, 'workspaces', activeWorkspace.id, 'months');
      const q = query(monthsRef, orderBy('criadoEm', 'desc'), limit(monthsToLoad));
      const snapshot = await getDocs(q);

      // Process monthly data
      const months: MonthData[] = [];
      const categories: { [key: string]: number } = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const monthName = data.nome || doc.id;

        const despesasTotal = data.despesas?.reduce((sum: number, d: any) => sum + (d.valorCalculado || 0), 0) || 0;
        const cartoesTotal = data.cartoes?.reduce((sum: number, c: any) => {
          return sum + (c.compras?.reduce((s: number, comp: any) => s + (comp.valorParcela || 0), 0) || 0);
        }, 0) || 0;

        months.push({
          month: monthName,
          total: despesasTotal + cartoesTotal,
          despesas: despesasTotal,
          cartoes: cartoesTotal,
        });

        // Extract categories (if available)
        data.despesas?.forEach((d: any) => {
          const cat = d.categoria || 'Outros';
          categories[cat] = (categories[cat] || 0) + (d.valorCalculado || 0);
        });
      });

      // Reverse to show oldest to newest
      months.reverse();

      // Convert categories to chart data
      const catData: CategoryData[] = Object.entries(categories).map(([name, value]) => ({
        x: name,
        y: value,
        label: `${name}\nR$ ${value.toFixed(0)}`,
      }));

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
    } catch (error) {
      console.error('Failed to load reports:', error);
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

        {/* Monthly Evolution Chart */}
        {monthlyData.length > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Evolução de Gastos Mensais
            </Text>
            <VictoryChart
              theme={VictoryTheme.material}
              width={SCREEN_WIDTH - 48}
              height={220}
              padding={{ top: 20, bottom: 50, left: 60, right: 20 }}
            >
              <VictoryAxis
                style={{
                  axis: { stroke: theme.colors.outline },
                  tickLabels: { fill: theme.colors.onSurface, fontSize: 10, angle: -45 },
                }}
              />
              <VictoryAxis
                dependentAxis
                style={{
                  axis: { stroke: theme.colors.outline },
                  tickLabels: { fill: theme.colors.onSurface, fontSize: 10 },
                  grid: { stroke: theme.colors.outlineVariant, strokeDasharray: '4,4' },
                }}
              />
              <VictoryLine
                data={monthlyData}
                x="month"
                y="total"
                style={{
                  data: { stroke: theme.colors.primary, strokeWidth: 3 },
                }}
              />
            </VictoryChart>
          </Surface>
        )}

        {/* Category Distribution Chart */}
        {categoryData.length > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Distribuição por Categoria
            </Text>
            <View style={styles.pieChartContainer}>
              <VictoryPie
                data={categoryData}
                colorScale={['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4']}
                labelRadius={({ innerRadius }) => (innerRadius as number) + 30}
                style={{
                  labels: { fill: theme.colors.onSurface, fontSize: 10 },
                }}
                width={SCREEN_WIDTH - 48}
                height={280}
                padding={{ top: 20, bottom: 20, left: 20, right: 20 }}
              />
            </View>
          </Surface>
        )}

        {/* Despesas vs Cartões Comparison */}
        {monthlyData.length > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Despesas vs Cartões (Últimos 3 Meses)
            </Text>
            <VictoryChart
              theme={VictoryTheme.material}
              width={SCREEN_WIDTH - 48}
              height={220}
              domainPadding={{ x: 40 }}
              padding={{ top: 20, bottom: 50, left: 60, right: 20 }}
            >
              <VictoryAxis
                style={{
                  axis: { stroke: theme.colors.outline },
                  tickLabels: { fill: theme.colors.onSurface, fontSize: 10 },
                }}
              />
              <VictoryAxis
                dependentAxis
                style={{
                  axis: { stroke: theme.colors.outline },
                  tickLabels: { fill: theme.colors.onSurface, fontSize: 10 },
                  grid: { stroke: theme.colors.outlineVariant, strokeDasharray: '4,4' },
                }}
              />
              <VictoryBar
                data={monthlyData.slice(-3).map(m => ({ month: m.month, amount: m.despesas, type: 'Despesas' }))}
                x="month"
                y="amount"
                style={{
                  data: { fill: theme.colors.primary },
                }}
              />
              <VictoryBar
                data={monthlyData.slice(-3).map(m => ({ month: m.month, amount: m.cartoes, type: 'Cartões' }))}
                x="month"
                y="amount"
                style={{
                  data: { fill: theme.colors.secondary },
                }}
              />
            </VictoryChart>
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
