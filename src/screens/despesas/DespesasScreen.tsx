import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  FAB,
  Searchbar,
  SegmentedButtons,
  Card,
  ProgressBar,
  Portal,
  Dialog,
  Button,
  useTheme,
  Snackbar,
} from 'react-native-paper';
import DespesaCard from '../../components/DespesaCard';
import DespesaFormModal from './DespesaFormModal';
import RecurrenteCard from '../../components/RecurrenteCard';
import RecurrenteFormModal from './RecurrenteFormModal';
import { useMonth } from '../../hooks/useMonth';
import { useRecurringTemplates } from '../../hooks/useRecurringTemplates';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ExpenseInstance, RecurringTemplate } from '../../types/supabase';
import { formatCurrency } from '../../utils/calculations';
import { formatMonthName } from '../../utils/dateUtils';

type TabType = 'mensais' | 'recorrentes';
type FilterType = 'all' | 'paid' | 'unpaid';

export default function DespesasScreen() {
  const theme = useTheme();
  const { activeWorkspace } = useWorkspace();
  const { canEdit, isViewOnly } = usePermissions(activeWorkspace);

  // Month data (mensais tab)
  const {
    month,
    expenses,
    loading: monthLoading,
    currentMonthId,
    addExpense,
    updateExpense,
    deleteExpense,
    backfillTemplateInstances,
  } = useMonth();

  // Templates data (recorrentes tab)
  const {
    templates,
    loading: templatesLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplate,
  } = useRecurringTemplates();

  // UI State
  const [tab, setTab] = useState<TabType>('mensais');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Mensais modals
  const [despesaModalVisible, setDespesaModalVisible] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<ExpenseInstance | null>(null);
  const [deleteDespesaDialogVisible, setDeleteDespesaDialogVisible] = useState(false);
  const [deletingDespesaId, setDeletingDespesaId] = useState<string | null>(null);

  // Recorrentes modals
  const [recurrenteModalVisible, setRecurrenteModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [deleteTemplateDialogVisible, setDeleteTemplateDialogVisible] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const loading = tab === 'mensais' ? monthLoading : templatesLoading;

  // ============================================
  // MENSAIS TAB - Filtered expenses
  // ============================================
  const filteredDespesas = useMemo(() => {
    if (!expenses) return [];

    let filtered = [...expenses];

    // Apply filter
    if (filter === 'paid') {
      filtered = filtered.filter((d) => d.is_paid);
    } else if (filter === 'unpaid') {
      filtered = filtered.filter((d) => !d.is_paid);
    }

    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort: unpaid first, then paid
    filtered.sort((a, b) => {
      if (a.is_paid === b.is_paid) return 0;
      return a.is_paid ? 1 : -1;
    });

    return filtered;
  }, [expenses, filter, searchQuery]);

  // Calculate summary for mensais
  const totalPlanejado = expenses.reduce(
    (sum, d) => sum + (d.value_calculated || 0),
    0
  );

  const totalPago = expenses
    .filter((d) => d.is_paid)
    .reduce((sum, d) => sum + (d.value_calculated || 0), 0);

  const pagoCount = expenses.filter((d) => d.is_paid).length;
  const totalCount = expenses.length;
  const progress = totalPlanejado > 0 ? totalPago / totalPlanejado : 0;

  // ============================================
  // RECORRENTES TAB - Filtered templates
  // ============================================
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort: active first, then inactive
    filtered.sort((a, b) => {
      if (a.is_active === b.is_active) return 0;
      return a.is_active ? -1 : 1;
    });

    return filtered;
  }, [templates, searchQuery]);

  const activeTemplatesCount = templates.filter((t) => t.is_active).length;
  const totalTemplatesCount = templates.length;

  // ============================================
  // MENSAIS TAB - Handlers
  // ============================================
  const handleAddDespesa = () => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingDespesa(null);
    setDespesaModalVisible(true);
  };

  const handleEditDespesa = (despesa: ExpenseInstance) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingDespesa(despesa);
    setDespesaModalVisible(true);
  };

  const handleSaveDespesa = async (data: {
    name: string;
    value_planned: string;
    is_paid: boolean;
  }) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }

    if (editingDespesa) {
      await updateExpense(editingDespesa.id, data);
    } else {
      await addExpense(data);
    }
  };

  const handleTogglePago = async (id: string, is_paid: boolean) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await updateExpense(id, { is_paid });
  };

  const handleDeleteDespesaPress = (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setDeletingDespesaId(id);
    setDeleteDespesaDialogVisible(true);
  };

  const handleConfirmDeleteDespesa = async () => {
    if (deletingDespesaId) {
      await deleteExpense(deletingDespesaId);
      setDeleteDespesaDialogVisible(false);
      setDeletingDespesaId(null);
    }
  };

  const handleDeleteDespesaFromModal = async (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await deleteExpense(id);
    setDespesaModalVisible(false);
  };

  // ============================================
  // RECORRENTES TAB - Handlers
  // ============================================
  const handleAddTemplate = () => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingTemplate(null);
    setRecurrenteModalVisible(true);
  };

  const handleEditTemplate = (template: RecurringTemplate) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingTemplate(template);
    setRecurrenteModalVisible(true);
  };

  const handleSaveTemplate = async (data: {
    name: string;
    value_formula: string;
    frequency: string;
    start_date: string;
    end_date?: string;
    is_active: boolean;
  }) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }

    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, data as any);
    } else {
      // Create template
      const newTemplate = await createTemplate({
        type: 'expense',
        ...data,
      } as any);

      console.log('📝 Template criado:', newTemplate.id);
      console.log('📍 Mês atual:', currentMonthId);

      // Backfill template instances for all applicable months (including current)
      console.log('🔄 Calling backfillTemplateInstances to create instances for all applicable months...');
      await backfillTemplateInstances(newTemplate.id);
    }
  };

  const handleToggleTemplateAtivo = async (id: string, isActive: boolean) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await toggleTemplate(id, isActive);
  };

  const handleDeleteTemplatePress = (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setDeletingTemplateId(id);
    setDeleteTemplateDialogVisible(true);
  };

  const handleConfirmDeleteTemplate = async () => {
    if (deletingTemplateId) {
      await deleteTemplate(deletingTemplateId, currentMonthId);
      setDeleteTemplateDialogVisible(false);
      setDeletingTemplateId(null);
    }
  };

  const handleDeleteTemplateFromModal = async (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await deleteTemplate(id, currentMonthId);
    setRecurrenteModalVisible(false);
  };

  // ============================================
  // RENDER
  // ============================================
  const monthName = formatMonthName(currentMonthId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Despesas
        </Text>
        {tab === 'mensais' && (
          <Text variant="bodyMedium" style={styles.subtitle}>
            {monthName}
          </Text>
        )}
      </View>

      {/* Tabs */}
      <SegmentedButtons
        value={tab}
        onValueChange={(value) => setTab(value as TabType)}
        buttons={[
          { value: 'mensais', label: 'Mensais' },
          { value: 'recorrentes', label: 'Recorrentes' },
        ]}
        style={styles.tabs}
      />

      {/* Summary Card - MENSAIS */}
      {tab === 'mensais' && (
        <Card style={styles.summaryCard} elevation={2}>
          <Card.Content>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Total planejado</Text>
              <Text variant="titleMedium" style={styles.totalPlanejado}>
                {formatCurrency(totalPlanejado)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Total pago</Text>
              <Text
                variant="titleMedium"
                style={[styles.totalPago, { color: theme.colors.primary }]}
              >
                {formatCurrency(totalPago)}
              </Text>
            </View>
            <ProgressBar
              progress={progress}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text variant="bodySmall" style={styles.legend}>
              {pagoCount} de {totalCount} despesas pagas
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Summary Card - RECORRENTES */}
      {tab === 'recorrentes' && (
        <Card style={styles.summaryCard} elevation={2}>
          <Card.Content>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Templates ativos</Text>
              <Text variant="titleMedium" style={[{ color: theme.colors.primary }]}>
                {activeTemplatesCount} de {totalTemplatesCount}
              </Text>
            </View>
            <Text variant="bodySmall" style={[styles.legend, { marginTop: 8 }]}>
              Templates ativos geram despesas automaticamente nos próximos meses
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Search */}
      <Searchbar
        placeholder={tab === 'mensais' ? 'Buscar despesas...' : 'Buscar templates...'}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Filter - MENSAIS only */}
      {tab === 'mensais' && (
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as FilterType)}
          buttons={[
            { value: 'all', label: 'Todas' },
            { value: 'paid', label: 'Pagas' },
            { value: 'unpaid', label: 'Pendentes' },
          ]}
          style={styles.filter}
        />
      )}

      {/* List - MENSAIS */}
      {tab === 'mensais' && (
        <FlatList
          data={filteredDespesas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DespesaCard
              despesa={item}
              onTogglePago={handleTogglePago}
              onPress={handleEditDespesa}
              onDelete={handleDeleteDespesaPress}
              readonly={isViewOnly}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge">Nenhuma despesa neste mês</Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                Toque no + para adicionar
              </Text>
            </View>
          }
        />
      )}

      {/* List - RECORRENTES */}
      {tab === 'recorrentes' && (
        <FlatList
          data={filteredTemplates}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecurrenteCard
              template={item}
              onToggleAtivo={handleToggleTemplateAtivo}
              onPress={handleEditTemplate}
              onDelete={handleDeleteTemplatePress}
              readonly={isViewOnly}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge">Nenhum template recorrente</Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                Toque no + para criar
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={tab === 'mensais' ? handleAddDespesa : handleAddTemplate}
        disabled={isViewOnly}
      />

      {/* Modals - MENSAIS */}
      <DespesaFormModal
        visible={despesaModalVisible}
        despesa={editingDespesa}
        onDismiss={() => setDespesaModalVisible(false)}
        onSave={handleSaveDespesa}
        onDelete={handleDeleteDespesaFromModal}
      />

      {/* Modals - RECORRENTES */}
      <RecurrenteFormModal
        visible={recurrenteModalVisible}
        template={editingTemplate}
        onDismiss={() => setRecurrenteModalVisible(false)}
        onSave={handleSaveTemplate}
        onDelete={handleDeleteTemplateFromModal}
      />

      {/* Delete Dialog - MENSAIS */}
      <Portal>
        <Dialog
          visible={deleteDespesaDialogVisible}
          onDismiss={() => setDeleteDespesaDialogVisible(false)}
        >
          <Dialog.Title>Confirmar exclusão</Dialog.Title>
          <Dialog.Content>
            <Text>Deseja excluir esta despesa?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDespesaDialogVisible(false)}>
              Cancelar
            </Button>
            <Button onPress={handleConfirmDeleteDespesa} textColor={theme.colors.error}>
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Dialog - RECORRENTES */}
        <Dialog
          visible={deleteTemplateDialogVisible}
          onDismiss={() => setDeleteTemplateDialogVisible(false)}
        >
          <Dialog.Title>Confirmar exclusão</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Deseja excluir este template?</Text>
            <Text variant="bodySmall" style={{ marginTop: 8, opacity: 0.7 }}>
              Despesas já criadas em meses anteriores não serão afetadas.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteTemplateDialogVisible(false)}>
              Cancelar
            </Button>
            <Button onPress={handleConfirmDeleteTemplate} textColor={theme.colors.error}>
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        Você não tem permissão para editar
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  tabs: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalPlanejado: {
    fontWeight: 'bold',
  },
  totalPago: {
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  legend: {
    opacity: 0.6,
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filter: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
  },
  emptyHint: {
    marginTop: 8,
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
