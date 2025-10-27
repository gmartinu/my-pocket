import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, List, IconButton, Chip, useTheme, Badge } from 'react-native-paper';
// @ts-ignore
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CardWithPurchases, Purchase } from '../types/supabase';
import { formatCurrency } from '../utils/calculations';

interface CartaoCardProps {
  cartao: CardWithPurchases;
  onEdit: (cartao: CardWithPurchases) => void;
  onDelete: (id: string) => void;
  onAddCompra: (cartaoId: string) => void;
  onEditCompra: (cartaoId: string, compra: Purchase) => void;
  onDeleteCompra: (cartaoId: string, compraId: string) => void;
  onToggleMarcado: (cartaoId: string, compraId: string, is_marked: boolean) => void;
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

  // Calculate total fatura from purchases
  const limiteUtilizado = (cartao.purchases || []).reduce((sum, p) => {
    return p.is_marked ? sum + ((p.total_value || 0) / (p.total_installments || 1)) : sum;
  }, 0);
  const limiteDisponivel = (cartao.total_limit || 0) - limiteUtilizado;
  const percentageUsed = (cartao.total_limit || 0) > 0 ? (limiteUtilizado / (cartao.total_limit || 1)) * 100 : 0;

  const getUsageColor = () => {
    if (percentageUsed >= 90) return theme.colors.error;
    if (percentageUsed >= 70) return theme.colors.tertiary;
    return theme.colors.primary;
  };

  return (
    <Card style={[styles.card, { overflow: 'hidden' }]} elevation={2}>
      <List.Accordion
        title={cartao.name}
        description={`Fatura: ${formatCurrency(limiteUtilizado)}`}
        expanded={expanded}
        onPress={() => setExpanded(!expanded)}
        left={(props) => <List.Icon {...props} icon="credit-card" />}
        style={{
          backgroundColor: theme.colors.elevation.level1,
          borderRadius: expanded ? 0 : 12,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
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
        <Card.Content style={[styles.summary, { borderBottomColor: theme.colors.outlineVariant }]}>
          <View style={styles.summaryRow}>
            <Text variant="bodySmall">Limite total</Text>
            <Text variant="bodyMedium" style={styles.bold}>
              {formatCurrency(cartao.total_limit || 0)}
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
        <Card.Content style={[
          styles.comprasSection,
          {
            borderTopColor: theme.colors.outlineVariant,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          }
        ]}>
          <View style={styles.comprasHeader}>
            <Text variant="titleSmall">Compras ({(cartao.purchases || []).length})</Text>
            {!readonly && (
              <IconButton
                icon="plus-circle"
                size={24}
                iconColor={theme.colors.primary}
                onPress={() => onAddCompra(cartao.id)}
              />
            )}
          </View>

          {(cartao.purchases || []).length === 0 ? (
            <Text variant="bodySmall" style={styles.emptyText}>
              Nenhuma compra cadastrada
            </Text>
          ) : (
            (cartao.purchases || []).map((compra) => {
              const valorParcela = (compra.total_value || 0) / (compra.total_installments || 1);
              return (
                <Card
                  key={compra.id}
                  style={[
                    styles.compraCard,
                    { backgroundColor: theme.colors.elevation.level1 }
                  ]}
                  mode="outlined"
                >
                  <Card.Content>
                    <View style={styles.compraHeader}>
                      <View style={styles.compraInfo}>
                        <View style={styles.descricaoRow}>
                          <Text variant="bodyMedium" style={styles.bold}>
                            {compra.description}
                          </Text>
                          {compra.purchase_group_id && (
                            <MaterialCommunityIcons
                              name="link-variant"
                              size={16}
                              color={theme.colors.primary}
                              style={styles.linkIcon}
                            />
                          )}
                        </View>
                        <Text variant="bodySmall" style={styles.parcelas}>
                          {compra.current_installment}/{compra.total_installments}x de {formatCurrency(valorParcela)}
                          {compra.purchase_group_id && (
                            <Text style={[styles.linkedBadge, { color: theme.colors.primary }]}>
                              {' '}• Sincronizado
                            </Text>
                          )}
                        </Text>
                        <Text variant="bodySmall" style={styles.total}>
                          Total: {formatCurrency(compra.total_value || 0)}
                        </Text>
                        {compra.purchase_date && (
                          <Text variant="bodySmall" style={styles.dataCompra}>
                            Data: {new Date(compra.purchase_date).toLocaleDateString('pt-BR')}
                          </Text>
                        )}
                      </View>
                      <View style={styles.compraActions}>
                        <Chip
                          selected={compra.is_marked || false}
                          onPress={
                            !readonly
                              ? () => onToggleMarcado(cartao.id, compra.id, !(compra.is_marked || false))
                              : undefined
                          }
                          style={styles.chip}
                          disabled={readonly}
                        >
                          {compra.is_marked ? 'Marcado' : 'Não marcado'}
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
    borderRadius: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -8,
  },
  summary: {
    paddingTop: 8,
    borderBottomWidth: 1,
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
    borderTopColor: 'transparent', // Will be set via theme in component
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
    backgroundColor: 'transparent', // Will be set via theme in component
  },
  compraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compraInfo: {
    flex: 1,
  },
  descricaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkIcon: {
    marginLeft: 6,
  },
  parcelas: {
    marginTop: 4,
    opacity: 0.7,
  },
  linkedBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  total: {
    marginTop: 2,
    opacity: 0.6,
    fontSize: 12,
  },
  dataCompra: {
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
