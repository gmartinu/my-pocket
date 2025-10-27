import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Menu, Text, useTheme } from 'react-native-paper';
import { useWorkspace } from '../contexts/WorkspaceContext';

export default function WorkspaceSelector() {
  const { workspaces, activeWorkspace, selectWorkspace, loading } = useWorkspace();
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleSelectWorkspace = async (workspaceId: string) => {
    try {
      await selectWorkspace(workspaceId);
      closeMenu();
    } catch (error) {
      console.error('Error selecting workspace:', error);
    }
  };

  if (loading || !activeWorkspace) {
    return (
      <Chip
        mode="outlined"
        disabled
        style={styles.chip}
      >
        Carregando...
      </Chip>
    );
  }

  return (
    <View style={styles.container}>
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={
          <Chip
            mode="outlined"
            icon="chevron-down"
            onPress={openMenu}
            style={[styles.chip, { borderColor: theme.colors.primary }]}
          >
            {activeWorkspace.name}
          </Chip>
        }
      >
        {workspaces.map((workspace) => (
          <Menu.Item
            key={workspace.id}
            onPress={() => handleSelectWorkspace(workspace.id)}
            title={workspace.name}
            leadingIcon={workspace.id === activeWorkspace.id ? 'check' : undefined}
            style={
              workspace.id === activeWorkspace.id
                ? { backgroundColor: theme.colors.primaryContainer }
                : undefined
            }
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    marginHorizontal: 8,
  },
});
