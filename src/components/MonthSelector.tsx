import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { formatMonthName } from '../utils/dateUtils';

interface MonthSelectorProps {
  monthId: string;
  onPrevious: () => void;
  onNext: () => void;
  loading?: boolean;
}

export default function MonthSelector({
  monthId,
  onPrevious,
  onNext,
  loading = false,
}: MonthSelectorProps) {
  const theme = useTheme();
  const monthName = formatMonthName(monthId);

  return (
    <View style={styles.container}>
      <IconButton
        icon="chevron-left"
        size={24}
        onPress={onPrevious}
        disabled={loading}
      />
      <Text
        variant="titleMedium"
        style={[styles.monthText, { color: theme.colors.onSurface }]}
      >
        {monthName}
      </Text>
      <IconButton
        icon="chevron-right"
        size={24}
        onPress={onNext}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
    minWidth: 150,
    textAlign: 'center',
  },
});
