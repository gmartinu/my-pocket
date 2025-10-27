import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip, Portal, Modal, Text, Button, useTheme, IconButton } from 'react-native-paper';
import { CATEGORIES, Category, ExpenseCategory } from '../types/categories';

interface CategorySelectorProps {
  selectedCategory?: ExpenseCategory;
  onCategoryChange: (category: ExpenseCategory) => void;
  compact?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange,
  compact = false,
}) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedCat = CATEGORIES.find((cat) => cat.id === selectedCategory);

  if (compact) {
    return (
      <>
        <Chip
          icon={selectedCat?.icone || 'tag'}
          onPress={() => setModalVisible(true)}
          style={[styles.compactChip, { backgroundColor: selectedCat?.cor || theme.colors.surfaceVariant }]}
          textStyle={{ color: '#FFFFFF' }}
        >
          {selectedCat?.nome || 'Categoria'}
        </Chip>

        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="titleLarge" style={styles.modalTitle}>
              Selecione uma Categoria
            </Text>

            <ScrollView style={styles.categoriesScroll}>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((category) => (
                  <CategoryItem
                    key={category.id}
                    category={category}
                    isSelected={selectedCategory === category.id}
                    onSelect={() => {
                      onCategoryChange(category.id);
                      setModalVisible(false);
                    }}
                  />
                ))}
              </View>
            </ScrollView>

            <Button onPress={() => setModalVisible(false)} style={styles.closeButton}>
              Fechar
            </Button>
          </Modal>
        </Portal>
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={styles.label}>
        Categoria
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map((category) => (
          <Chip
            key={category.id}
            icon={category.icone}
            selected={selectedCategory === category.id}
            onPress={() => onCategoryChange(category.id)}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && {
                backgroundColor: category.cor,
              },
            ]}
            textStyle={selectedCategory === category.id ? { color: '#FFFFFF' } : undefined}
          >
            {category.nome}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
};

interface CategoryItemProps {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, isSelected, onSelect }) => {
  return (
    <View style={styles.categoryItem}>
      <IconButton
        icon={category.icone}
        size={32}
        iconColor="#FFFFFF"
        containerColor={category.cor}
        onPress={onSelect}
        style={[
          styles.categoryButton,
          isSelected && styles.categoryButtonSelected,
        ]}
      />
      <Text variant="bodySmall" style={styles.categoryName}>
        {category.nome}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  categoriesContainer: {
    gap: 8,
  },
  categoryChip: {
    marginRight: 0,
  },
  compactChip: {
    alignSelf: 'flex-start',
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-around',
  },
  categoryItem: {
    alignItems: 'center',
    width: 80,
  },
  categoryButton: {
    marginBottom: 4,
  },
  categoryButtonSelected: {
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  categoryName: {
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 8,
  },
});
