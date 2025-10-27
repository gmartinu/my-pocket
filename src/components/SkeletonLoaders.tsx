import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

export const DespesaCardSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="contained">
      <Card.Content>
        <SkeletonPlaceholder
          backgroundColor={theme.dark ? '#2C2C2C' : '#E0E0E0'}
          highlightColor={theme.dark ? '#3C3C3C' : '#F5F5F5'}
        >
          <View style={styles.skeletonRow}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonContent}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonSubtitle} />
            </View>
            <View style={styles.skeletonValue} />
          </View>
        </SkeletonPlaceholder>
      </Card.Content>
    </Card>
  );
};

export const CartaoCardSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="contained">
      <Card.Content>
        <SkeletonPlaceholder
          backgroundColor={theme.dark ? '#2C2C2C' : '#E0E0E0'}
          highlightColor={theme.dark ? '#3C3C3C' : '#F5F5F5'}
        >
          <View>
            <View style={styles.skeletonRow}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonSubtitle} />
              </View>
            </View>
            <View style={styles.skeletonDivider} />
            <View style={styles.skeletonCompra} />
            <View style={styles.skeletonCompra} />
          </View>
        </SkeletonPlaceholder>
      </Card.Content>
    </Card>
  );
};

export const BalanceCardSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="contained">
      <Card.Content>
        <SkeletonPlaceholder
          backgroundColor={theme.dark ? '#2C2C2C' : '#E0E0E0'}
          highlightColor={theme.dark ? '#3C3C3C' : '#F5F5F5'}
        >
          <View>
            <View style={styles.skeletonLargeTitle} />
            <View style={styles.skeletonLargeValue} />
            <View style={styles.skeletonDivider} />
            <View style={styles.skeletonRow}>
              <View style={{ width: 80, height: 12, borderRadius: 4 }} />
              <View style={{ width: 100, height: 12, borderRadius: 4 }} />
            </View>
          </View>
        </SkeletonPlaceholder>
      </Card.Content>
    </Card>
  );
};

export const SummaryCardSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="contained">
      <Card.Content>
        <SkeletonPlaceholder
          backgroundColor={theme.dark ? '#2C2C2C' : '#E0E0E0'}
          highlightColor={theme.dark ? '#3C3C3C' : '#F5F5F5'}
        >
          <View>
            <View style={styles.skeletonTitle} />
            <View style={{ marginTop: 12 }}>
              <View style={styles.skeletonRow}>
                <View style={{ width: 100, height: 12, borderRadius: 4 }} />
                <View style={{ width: 80, height: 12, borderRadius: 4 }} />
              </View>
              <View style={[styles.skeletonRow, { marginTop: 8 }]}>
                <View style={{ width: 100, height: 12, borderRadius: 4 }} />
                <View style={{ width: 80, height: 12, borderRadius: 4 }} />
              </View>
              <View style={[styles.skeletonRow, { marginTop: 8 }]}>
                <View style={{ width: 100, height: 12, borderRadius: 4 }} />
                <View style={{ width: 80, height: 12, borderRadius: 4 }} />
              </View>
            </View>
          </View>
        </SkeletonPlaceholder>
      </Card.Content>
    </Card>
  );
};

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <DespesaCardSkeleton key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonTitle: {
    width: '60%',
    height: 16,
    borderRadius: 4,
  },
  skeletonSubtitle: {
    width: '40%',
    height: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  skeletonValue: {
    width: 80,
    height: 20,
    borderRadius: 4,
  },
  skeletonLargeTitle: {
    width: '40%',
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonLargeValue: {
    width: '60%',
    height: 32,
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonDivider: {
    width: '100%',
    height: 1,
    marginVertical: 12,
  },
  skeletonCompra: {
    width: '100%',
    height: 40,
    borderRadius: 8,
    marginBottom: 8,
  },
});
