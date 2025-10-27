import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  FAB,
  Card,
  Portal,
  Dialog,
  Button,
  useTheme,
  Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CartaoCard from '../../components/CartaoCard';
import CartaoFormModal from './CartaoFormModal';
import CompraFormModal from './CompraFormModal';
import { useMonth } from '../../hooks/useMonth';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Cartao, Compra } from '../../types/month';
import { formatCurrency } from '../../utils/calculations';
import { formatMonthName } from '../../utils/dateUtils';

export default function CartoesScreen() {
  const theme = useTheme();
  const { activeWorkspace } = useWorkspace();
  const { canEdit, isViewOnly } = usePermissions(activeWorkspace);
  const {
    month,
    loading,
    currentMonthId,
    addCartao,
    updateCartao,
    deleteCartao,
    addCompra,
    updateCompra,
    deleteCompra,
    recalculateTotals,
  } = useMonth();

  const [cartaoModalVisible, setCartaoModalVisible] = useState(false);
  const [compraModalVisible, setCompraModalVisible] = useState(false);
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null);
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null);
  const [selectedCartaoId, setSelectedCartaoId] = useState<string | null>(null);
  const [deleteCartaoDialogVisible, setDeleteCartaoDialogVisible] = useState(false);
  const [deleteCompraDialogVisible, setDeleteCompraDialogVisible] = useState(false);
  const [deletingCartaoId, setDeletingCartaoId] = useState<string | null>(null);
  const [deletingCompraData, setDeletingCompraData] = useState<{
    cartaoId: string;
    compraId: string;
  } | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const totalLimite = month?.cartoes.reduce((sum, c) => sum + c.limiteTotal, 0) || 0;
  const totalUtilizado = month?.totalCartoes || 0;
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

  const handleEditCartao = (cartao: Cartao) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setEditingCartao(cartao);
    setCartaoModalVisible(true);
  };

  const handleSaveCartao = async (data: {
    nome: string;
    limiteTotal: number;
    compras: any[];
  }) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    if (editingCartao) {
      await updateCartao(editingCartao.id, data);
    } else {
      await addCartao(data);
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
      await deleteCartao(deletingCartaoId);
      setDeleteCartaoDialogVisible(false);
      setDeletingCartaoId(null);
    }
  };

  const handleDeleteCartaoFromModal = async (id: string) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await deleteCartao(id);
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

  const handleEditCompra = (cartaoId: string, compra: Compra) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    setSelectedCartaoId(cartaoId);
    setEditingCompra(compra);
    setCompraModalVisible(true);
  };

  const handleSaveCompra = async (data: {
    descricao: string;
    valorTotal: number;
    parcelaAtual: number;
    parcelasTotal: number;
    marcado: boolean;
  }) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    if (!selectedCartaoId) return;

    if (editingCompra) {
      await updateCompra(selectedCartaoId, editingCompra.id, data);
    } else {
      await addCompra(selectedCartaoId, data);
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
      await deleteCompra(deletingCompraData.cartaoId, deletingCompraData.compraId);
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
    await deleteCompra(selectedCartaoId, id);
    setCompraModalVisible(false);
  };

  const handleToggleMarcado = async (
    cartaoId: string,
    compraId: string,
    marcado: boolean
  ) => {
    if (!canEdit) {
      setSnackbarVisible(true);
      return;
    }
    await updateCompra(cartaoId, compraId, { marcado });
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
      <Card style={styles.summaryCard} elevation={2}>
        <Card.Content>
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
              style={[styles.totalUtilizado, { color: '#FF9800' }]}
            >
              {formatCurrency(totalUtilizado)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium">Limite disponível</Text>
            <Text
              variant="titleMedium"
              style={[styles.totalDisponivel, { color: '#4CAF50' }]}
            >
              {formatCurrency(totalDisponivel)}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.legend}>
            {month?.cartoes.length || 0} cartões cadastrados
          </Text>
        </Card.Content>
      </Card>

      {/* Cards List */}
      {!month || month.cartoes.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="credit-card-outline"
            size={64}
            color="#BDBDBD"
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
            <RefreshControl refreshing={loading} onRefresh={recalculateTotals} />
          }
        >
          {month.cartoes.map((cartao) => (
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
      )}

      {/* FAB - Only show for editors and owners */}
      {canEdit && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={handleAddCartao}
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
