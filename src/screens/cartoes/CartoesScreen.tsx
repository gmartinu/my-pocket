import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  FAB,
  Card as PaperCard,
  Portal,
  Dialog,
  Button,
  useTheme,
  Snackbar,
  SegmentedButtons,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CartaoCard from '../../components/CartaoCard';
import CartaoFormModal from './CartaoFormModal';
import CompraFormModal from './CompraFormModal';
import CompraRecorrenteCard from '../../components/CompraRecorrenteCard';
import CompraRecorrenteFormModal from './CompraRecorrenteFormModal';
import { useMonth } from '../../hooks/useMonth';
import { useRecurringTemplates } from '../../hooks/useRecurringTemplates';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Card, Purchase, CardWithPurchases, RecurringTemplate, RecurrenceFrequency } from '../../types/supabase';
import { formatCurrency } from '../../utils/calculations';
import { formatMonthName } from '../../utils/dateUtils';

export default function CartoesScreen() {
  const theme = useTheme();
  const { activeWorkspace } = useWorkspace();
  const { canEdit, isViewOnly } = usePermissions(activeWorkspace);
  const {
    month,
    cards,
    loading,
    currentMonthId,
    addCard,
    updateCard,
    deleteCard,
    addPurchase,
    updatePurchase,
    deletePurchase,
    total_cards,
    backfillPurchaseInstances,
  } = useMonth();

  const {
    templates: allTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplate,
  } = useRecurringTemplates();

  const [cartaoModalVisible, setCartaoModalVisible] = useState(false);
  const [compraModalVisible, setCompraModalVisible] = useState(false);
  const [editingCartao, setEditingCartao] = useState<Card | null>(null);
  const [editingCompra, setEditingCompra] = useState<Purchase | null>(null);
  const [selectedCartaoId, setSelectedCartaoId] = useState<string | null>(null);
  const [deleteCartaoDialogVisible, setDeleteCartaoDialogVisible] = useState(false);
  const [deleteCompraDialogVisible, setDeleteCompraDialogVisible] = useState(false);
  const [deletingCartaoId, setDeletingCartaoId] = useState<string | null>(null);
  const [deletingCompraData, setDeletingCompraData] = useState<{
    cartaoId: string;
    compraId: string;
  } | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Tab state
  const [currentTab, setCurrentTab] = useState('compras');

  // Template modal state
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [deleteTemplateDialogVisible, setDeleteTemplateDialogVisible] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // Filter templates for card_purchase type only
  const purchaseTemplates = useMemo(() => {
    return allTemplates.filter((t) => t.type === 'card_purchase');
  }, [allTemplates]);

  const totalLimite = cards.reduce((sum, c) => sum + (c.total_limit || 0), 0);
  const totalUtilizado = total_cards;
  const totalDisponivel = totalLimite - totalUtilizado;

  const monthName = formatMonthName(currentMonthId);

  // Cartão handlers
  const handleAddCartao = () => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingCartao(null);
    setCartaoModalVisible(true);
  };

  const handleEditCartao = (cartao: Card) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingCartao(cartao);
    setCartaoModalVisible(true);
  };

  const handleSaveCartao = async (data: {
    name: string;
    total_limit: number;
  }) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    if (editingCartao) {
      await updateCard(editingCartao.id, data);
    } else {
      await addCard(data);
    }
  };

  const handleDeleteCartaoPress = (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setDeletingCartaoId(id);
    setDeleteCartaoDialogVisible(true);
  };

  const handleConfirmDeleteCartao = async () => {
    if (deletingCartaoId) {
      await deleteCard(deletingCartaoId);
      setDeleteCartaoDialogVisible(false);
      setDeletingCartaoId(null);
    }
  };

  const handleDeleteCartaoFromModal = async (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await deleteCard(id);
    setCartaoModalVisible(false);
  };

  // Compra handlers
  const handleAddCompra = (cartaoId: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setSelectedCartaoId(cartaoId);
    setEditingCompra(null);
    setCompraModalVisible(true);
  };

  const handleEditCompra = (cartaoId: string, compra: Purchase) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setSelectedCartaoId(cartaoId);
    setEditingCompra(compra);
    setCompraModalVisible(true);
  };

  const handleSaveCompra = async (data: {
    description: string;
    total_value: number;
    current_installment: number;
    total_installments: number;
    is_marked: boolean;
    purchase_date?: string;
  }) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    if (!selectedCartaoId) return;

    if (editingCompra) {
      await updatePurchase(editingCompra.id, data);
    } else {
      await addPurchase(selectedCartaoId, data);
    }
  };

  const handleDeleteCompraPress = (cartaoId: string, compraId: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setDeletingCompraData({ cartaoId, compraId });
    setDeleteCompraDialogVisible(true);
  };

  const handleConfirmDeleteCompra = async () => {
    if (deletingCompraData) {
      await deletePurchase(deletingCompraData.compraId);
      setDeleteCompraDialogVisible(false);
      setDeletingCompraData(null);
    }
  };

  const handleDeleteCompraFromModal = async (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    if (!selectedCartaoId) return;
    await deletePurchase(id);
    setCompraModalVisible(false);
  };

  const handleToggleMarcado = async (
    cartaoId: string,
    compraId: string,
    is_marked: boolean
  ) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await updatePurchase(compraId, { is_marked });
  };

  // Template handlers
  const handleAddTemplate = () => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingTemplate(null);
    setTemplateModalVisible(true);
  };

  const handleEditTemplate = (template: RecurringTemplate) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingTemplate(template);
    setTemplateModalVisible(true);
  };

  const handleSaveTemplate = async (data: {
    name: string;
    value_formula: string;
    frequency: RecurrenceFrequency;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    card_id?: string;
  }) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }

    const metadata = {
      card_id: data.card_id,
      card_name: cards.find((c) => c.id === data.card_id)?.name,
    };

    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, {
        name: data.name,
        value_formula: data.value_formula,
        frequency: data.frequency,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: data.is_active,
        metadata,
      });
    } else {
      const newTemplate = await createTemplate({
        name: data.name,
        value_formula: data.value_formula,
        type: 'card_purchase',
        frequency: data.frequency,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: data.is_active,
        metadata,
      });

      // Backfill purchases for all applicable months
      await backfillPurchaseInstances(newTemplate.id);
    }
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
      await deleteTemplate(deletingTemplateId);
      setDeleteTemplateDialogVisible(false);
      setDeletingTemplateId(null);
    }
  };

  const handleDeleteTemplateFromModal = async (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await deleteTemplate(id);
    setTemplateModalVisible(false);
  };

  const handleToggleTemplateAtivo = async (id: string, isActive: boolean) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await toggleTemplate(id, isActive, currentMonthId);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Cartões
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {monthName}
        </Text>
      </View>

      {/* Summary Card */}
      <PaperCard style={styles.summaryCard} elevation={2}>
        <PaperCard.Content>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium">Limite total</Text>
            <Text variant="titleMedium" style={styles.totalLimite}>
              {formatCurrency(totalLimite)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium">Total utilizado</Text>
            <Text
              variant="titleMedium"
              style={[styles.totalUtilizado, { color: theme.colors.tertiary }]}
            >
              {formatCurrency(totalUtilizado)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium">Limite disponível</Text>
            <Text
              variant="titleMedium"
              style={[styles.totalDisponivel, { color: theme.colors.primary }]}
            >
              {formatCurrency(totalDisponivel)}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.legend}>
            {cards.length} cartões cadastrados
          </Text>
        </PaperCard.Content>
      </PaperCard>

      {/* Tab Selection */}
      <SegmentedButtons
        value={currentTab}
        onValueChange={setCurrentTab}
        buttons={[
          {
            value: 'compras',
            label: 'Compras',
            icon: 'credit-card',
          },
          {
            value: 'recorrentes',
            label: 'Recorrentes',
            icon: 'autorenew',
          },
        ]}
        style={styles.segmentedButtons}
      />

      {/* Cards List */}
      {currentTab === 'compras' ? (
        cards.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="credit-card-outline"
              size={64}
              color={theme.colors.onSurfaceDisabled}
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              Nenhum cartão cadastrado
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Toque no + para adicionar
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={() => {}} />
            }
          >
            {cards.map((cartao) => (
              <CartaoCard
                key={cartao.id}
                cartao={cartao}
                onEdit={handleEditCartao}
                onDelete={handleDeleteCartaoPress}
                onAddCompra={handleAddCompra}
                onEditCompra={handleEditCompra}
                onDeleteCompra={handleDeleteCompraPress}
                onToggleMarcado={handleToggleMarcado}
                readonly={isViewOnly}
              />
            ))}
          </ScrollView>
        )
      ) : (
        // Templates List
        purchaseTemplates.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="credit-card-sync"
              size={64}
              color={theme.colors.onSurfaceDisabled}
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              Nenhuma compra recorrente
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Toque no + para adicionar assinaturas mensais
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={() => {}} />
            }
          >
            {purchaseTemplates.map((template) => {
              const metadata = (template.metadata || {}) as any;
              const cardName = cards.find((c) => c.id === metadata.card_id)?.name;
              return (
                <CompraRecorrenteCard
                  key={template.id}
                  template={template}
                  cardName={cardName}
                  onToggleAtivo={handleToggleTemplateAtivo}
                  onPress={handleEditTemplate}
                  onDelete={handleDeleteTemplatePress}
                  readonly={isViewOnly}
                />
              );
            })}
          </ScrollView>
        )
      )}

      {/* FAB - Only show for editors and owners */}
      {canEdit && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={currentTab === 'compras' ? handleAddCartao : handleAddTemplate}
        />
      )}

      {/* Cartão Form Modal */}
      <CartaoFormModal
        visible={cartaoModalVisible}
        cartao={editingCartao}
        onDismiss={() => setCartaoModalVisible(false)}
        onSave={handleSaveCartao}
        onDelete={handleDeleteCartaoFromModal}
      />

      {/* Compra Form Modal */}
      {selectedCartaoId && (
        <CompraFormModal
          visible={compraModalVisible}
          compra={editingCompra}
          cartaoId={selectedCartaoId}
          onDismiss={() => setCompraModalVisible(false)}
          onSave={handleSaveCompra}
          onDelete={handleDeleteCompraFromModal}
        />
      )}

      {/* Delete Cartão Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={deleteCartaoDialogVisible}
          onDismiss={() => setDeleteCartaoDialogVisible(false)}
        >
          <Dialog.Title>Confirmar exclusão</Dialog.Title>
          <Dialog.Content>
            <Text>
              Deseja realmente excluir este cartão? Todas as compras associadas serão
              perdidas.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteCartaoDialogVisible(false)}>
              Cancelar
            </Button>
            <Button
              onPress={handleConfirmDeleteCartao}
              textColor={theme.colors.error}
            >
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Compra Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={deleteCompraDialogVisible}
          onDismiss={() => setDeleteCompraDialogVisible(false)}
        >
          <Dialog.Title>Confirmar exclusão</Dialog.Title>
          <Dialog.Content>
            <Text>Deseja realmente excluir esta compra?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteCompraDialogVisible(false)}>
              Cancelar
            </Button>
            <Button
              onPress={handleConfirmDeleteCompra}
              textColor={theme.colors.error}
            >
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Template Form Modal */}
      <CompraRecorrenteFormModal
        visible={templateModalVisible}
        template={editingTemplate}
        cards={cards}
        onDismiss={() => setTemplateModalVisible(false)}
        onSave={handleSaveTemplate}
        onDelete={handleDeleteTemplateFromModal}
      />

      {/* Delete Template Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={deleteTemplateDialogVisible}
          onDismiss={() => setDeleteTemplateDialogVisible(false)}
        >
          <Dialog.Title>Confirmar exclusão</Dialog.Title>
          <Dialog.Content>
            <Text>Deseja excluir esta compra recorrente?</Text>
            <Text style={{ marginTop: 8, opacity: 0.7 }}>
              Compras já criadas em meses anteriores não serão afetadas.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteTemplateDialogVisible(false)}>
              Cancelar
            </Button>
            <Button
              onPress={handleConfirmDeleteTemplate}
              textColor={theme.colors.error}
            >
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
  segmentedButtons: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLimite: {
    fontWeight: 'bold',
  },
  totalUtilizado: {
    fontWeight: 'bold',
  },
  totalDisponivel: {
    fontWeight: 'bold',
  },
  legend: {
    opacity: 0.7,
    marginTop: 8,
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
