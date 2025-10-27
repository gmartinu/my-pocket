import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, List, IconButton, Chip, useTheme } from 'react-native-paper';
import { Cartao, Compra } from '../types/month';
import { formatCurrency } from '../utils/calculations';

interface CartaoCardProps {
  cartao: Cartao;
  onEdit: (cartao: Cartao) => void;
  onDelete: (id: string) => void;
  onAddCompra: (cartaoId: string) => void;
  onEditCompra: (cartaoId: string, compra: Compra) => void;
  onDeleteCompra: (cartaoId: string, compraId: string) => void;
  onToggleMarcado: (cartaoId: string, compraId: string, marcado: boolean) => void;
  readonly?: boolean;
}

export default function CartaoCard({
  cartao,
  onEdit,
  onDelete,
  onAddCompra,
  onEditCompra,
  onDeleteCompra,
  onToggleMarcado,
  readonly = false,
}: CartaoCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const limiteUtilizado = cartao.totalFatura;
  const limiteDisponivel = cartao.limiteTotal - limiteUtilizado;
  const percentageUsed = cartao.limiteTotal > 0 ? (limiteUtilizado / cartao.limiteTotal) * 100 : 0;

  const getUsageColor = () => {
    if (percentageUsed >= 90) return '#F44336';
    if (percentageUsed >= 70) return '#FF9800';
    return '#4CAF50';
  };

  return (
    <Card style={styles.card}>
      <List.Accordion
        title={cartao.nome}
        description={`Fatura: ${formatCurrency(cartao.totalFatura)}`}
        expanded={expanded}
        onPress={() => setExpanded(!expanded)}
        left={(props) => <List.Icon {...props} icon="credit-card" />}
        right={(props) =>
          !readonly ? (
            <View style={styles.headerRight}>
              <IconButton
                icon="pencil"
                size={20}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit(cartao);
                }}
              />
              <IconButton
                icon="delete"
                size={20}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(cartao.id);
                }}
              />
            </View>
          ) : null
        }
      >
        {/* Card Summary */}
        <Card.Content style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text variant="bodySmall">Limite total</Text>
            <Text variant="bodyMedium" style={styles.bold}>
              {formatCurrency(cartao.limiteTotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodySmall">Utilizado</Text>
            <Text variant="bodyMedium" style={[styles.bold, { color: getUsageColor() }]}>
              {formatCurrency(limiteUtilizado)} ({percentageUsed.toFixed(0)}%)
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodySmall">Disponível</Text>
            <Text variant="bodyMedium" style={styles.bold}>
              {formatCurrency(limiteDisponivel)}
            </Text>
          </View>
        </Card.Content>

        {/* Purchases List */}
        <Card.Content style={styles.comprasSection}>
          <View style={styles.comprasHeader}>
            <Text variant="titleSmall">Compras ({cartao.compras.length})</Text>
            {!readonly && (
              <IconButton
                icon="plus-circle"
                size={24}
                iconColor={theme.colors.primary}
                onPress={() => onAddCompra(cartao.id)}
              />
            )}
          </View>

          {cartao.compras.length === 0 ? (
            <Text variant="bodySmall" style={styles.emptyText}>
              Nenhuma compra cadastrada
            </Text>
          ) : (
            cartao.compras.map((compra) => {
              const valorParcela = compra.valorTotal / compra.parcelasTotal;
              return (
                <Card key={compra.id} style={styles.compraCard} mode="outlined">
                  <Card.Content>
                    <View style={styles.compraHeader}>
                      <View style={styles.compraInfo}>
                        <Text variant="bodyMedium" style={styles.bold}>
                          {compra.descricao}
                        </Text>
                        <Text variant="bodySmall" style={styles.parcelas}>
                          {compra.parcelaAtual}/{compra.parcelasTotal}x de {formatCurrency(valorParcela)}
                        </Text>
                        <Text variant="bodySmall" style={styles.total}>
                          Total: {formatCurrency(compra.valorTotal)}
                        </Text>
                      </View>
                      <View style={styles.compraActions}>
                        <Chip
                          selected={compra.marcado}
                          onPress={
                            !readonly
                              ? () => onToggleMarcado(cartao.id, compra.id, !compra.marcado)
                              : undefined
                          }
                          style={styles.chip}
                          disabled={readonly}
                        >
                          {compra.marcado ? 'Marcado' : 'Não marcado'}
                        </Chip>
                        {!readonly && (
                          <View style={styles.iconRow}>
                            <IconButton
                              icon="pencil"
                              size={18}
                              onPress={() => onEditCompra(cartao.id, compra)}
                            />
                            <IconButton
                              icon="delete"
                              size={18}
                              onPress={() => onDeleteCompra(cartao.id, compra.id)}
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              );
            })
          )}
        </Card.Content>
      </List.Accordion>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    marginHorizontal: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -8,
  },
  summary: {
    paddingTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bold: {
    fontWeight: '600',
  },
  comprasSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  comprasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 16,
  },
  compraCard: {
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  compraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compraInfo: {
    flex: 1,
  },
  parcelas: {
    marginTop: 4,
    opacity: 0.7,
  },
  total: {
    marginTop: 2,
    opacity: 0.6,
    fontSize: 12,
  },
  compraActions: {
    alignItems: 'flex-end',
  },
  chip: {
    marginBottom: 4,
  },
  iconRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
});
