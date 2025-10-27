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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DespesaCard from '../../components/DespesaCard';
import DespesaFormModal from './DespesaFormModal';
import { useMonth } from '../../hooks/useMonth';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Despesa } from '../../types/month';
import { formatCurrency } from '../../utils/calculations';
import { formatMonthName } from '../../utils/dateUtils';

type FilterType = 'all' | 'paid' | 'unpaid';

export default function DespesasScreen() {
  const theme = useTheme();
  const { activeWorkspace } = useWorkspace();
  const { canEdit, isViewOnly } = usePermissions(activeWorkspace);
  const {
    month,
    loading,
    currentMonthId,
    addDespesa,
    updateDespesa,
    deleteDespesa,
    recalculateTotals,
  } = useMonth();

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Filter and search despesas
  const filteredDespesas = useMemo(() => {
    if (!month) return [];

    let filtered = [...month.despesas];

    // Apply filter
    if (filter === 'paid') {
      filtered = filtered.filter((d) => d.pago);
    } else if (filter === 'unpaid') {
      filtered = filtered.filter((d) => !d.pago);
    }

    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter((d) =>
        d.nome.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort: unpaid first, then paid
    filtered.sort((a, b) => {
      if (a.pago === b.pago) return 0;
      return a.pago ? 1 : -1;
    });

    return filtered;
  }, [month?.despesas, filter, searchQuery]);

  // Calculate summary
  const totalPlanejado = month?.despesas.reduce(
    (sum, d) => sum + d.valorCalculado,
    0
  ) || 0;

  const totalPago = month?.despesas
    .filter((d) => d.pago)
    .reduce((sum, d) => sum + d.valorCalculado, 0) || 0;

  const pagoCount = month?.despesas.filter((d) => d.pago).length || 0;
  const totalCount = month?.despesas.length || 0;

  const progress = totalPlanejado > 0 ? totalPago / totalPlanejado : 0;

  const handleAddDespesa = () => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingDespesa(null);
    setModalVisible(true);
  };

  const handleEditDespesa = (despesa: Despesa) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingDespesa(despesa);
    setModalVisible(true);
  };

  const handleSaveDespesa = async (data: {
    nome: string;
    valorPlanejado: string;
    pago: boolean;
  }) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    if (editingDespesa) {
      await updateDespesa(editingDespesa.id, data);
    } else {
      await addDespesa(data);
    }
  };

  const handleTogglePago = async (id: string, pago: boolean) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await updateDespesa(id, { pago });
  };

  const handleDeletePress = (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setDeletingId(id);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingId) {
      await deleteDespesa(deletingId);
      setDeleteDialogVisible(false);
      setDeletingId(null);
    }
  };

  const handleDeleteFromModal = async (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await deleteDespesa(id);
    setModalVisible(false);
  };

  const monthName = formatMonthName(currentMonthId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Despesas
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {monthName}
        </Text>
      </View>

      {/* Summary Card */}
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
              style={[styles.totalPago, { color: '#4CAF50' }]}
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

      {/* Search */}
      <Searchbar
        placeholder="Buscar despesa"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Filters */}
      <SegmentedButtons
        value={filter}
        onValueChange={(value) => setFilter(value as FilterType)}
        buttons={[
          { value: 'all', label: 'Todas' },
          { value: 'paid', label: 'Pagas' },
          { value: 'unpaid', label: 'Não Pagas' },
        ]}
        style={styles.filters}
      />

      {/* List */}
      {filteredDespesas.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="receipt-text-outline" size={64} color="#BDBDBD" />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {searchQuery ? 'Nenhuma despesa encontrada' : 'Nenhuma despesa cadastrada'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>
            {searchQuery ? 'Tente outra busca' : 'Toque no + para adicionar'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDespesas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DespesaCard
              despesa={item}
              onTogglePago={handleTogglePago}
              onPress={handleEditDespesa}
              onDelete={handleDeletePress}
              readonly={isViewOnly}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={recalculateTotals}
            />
          }
        />
      )}

      {/* FAB - Only show for editors and owners */}
      {canEdit && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={handleAddDespesa}
        />
      )}

      {/* Form Modal */}
      <DespesaFormModal
        visible={modalVisible}
        despesa={editingDespesa}
        onDismiss={() => setModalVisible(false)}
        onSave={handleSaveDespesa}
        onDelete={handleDeleteFromModal}
      />

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Confirmar exclusão</Dialog.Title>
          <Dialog.Content>
            <Text>Deseja realmente excluir esta despesa?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>
              Cancelar
            </Button>
            <Button onPress={handleConfirmDelete} textColor={theme.colors.error}>
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Permission Denied Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.error }}
      >
        Você não tem permissão para editar este workspace
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
    opacity: 0.7,
    textTransform: 'capitalize',
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
    marginVertical: 12,
  },
  legend: {
    opacity: 0.7,
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filters: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 80,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    opacity: 0.6,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
