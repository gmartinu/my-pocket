import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  List,
  Chip,
  IconButton,
  Menu,
  Portal,
  Dialog,
  Button,
  FAB,
  useTheme,
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { usePermissions } from '../../hooks/usePermissions';
import ShareWorkspaceModal from './ShareWorkspaceModal';
import { WorkspaceRole } from '../../types/workspace';

type MembersListScreenRouteProp = RouteProp<
  { MembersList: { workspaceId: string } },
  'MembersList'
>;

export default function MembersListScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<MembersListScreenRouteProp>();
  const { workspaceId } = route.params;

  const { workspaces, removeMember, changeMemberRole } = useWorkspace();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const { canManageMembers, isOwner } = usePermissions(workspace || null);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [roleDialogVisible, setRoleDialogVisible] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('editor');

  if (!workspace) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Workspace não encontrado</Text>
      </SafeAreaView>
    );
  }

  const selectedMember = workspace.members.find((m) => m.userId === selectedMemberId);

  const handleOpenMenu = (userId: string) => {
    setMenuVisible(userId);
  };

  const handleCloseMenu = () => {
    setMenuVisible(null);
  };

  const handleChangeRolePress = (userId: string, currentRole: WorkspaceRole) => {
    setSelectedMemberId(userId);
    setSelectedRole(currentRole);
    setRoleDialogVisible(true);
    handleCloseMenu();
  };

  const handleConfirmChangeRole = async () => {
    if (!selectedMemberId) return;

    try {
      await changeMemberRole(workspaceId, selectedMemberId, selectedRole);
      setRoleDialogVisible(false);
      setSelectedMemberId(null);
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleRemoveMemberPress = (userId: string) => {
    setSelectedMemberId(userId);
    setDeleteDialogVisible(true);
    handleCloseMenu();
  };

  const handleConfirmRemove = async () => {
    if (!selectedMemberId) return;

    try {
      await removeMember(workspaceId, selectedMemberId);
      setDeleteDialogVisible(false);
      setSelectedMemberId(null);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const getRoleColor = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner':
        return '#FFC107';
      case 'editor':
        return '#2196F3';
      case 'viewer':
        return '#757575';
      default:
        return theme.colors.primary;
    }
  };

  const getRoleLabel = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  // Sort members: owner first
  const sortedMembers = [...workspace.members].sort((a, b) => {
    if (a.role === 'owner') return -1;
    if (b.role === 'owner') return 1;
    return 0;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineSmall" style={styles.title}>
          Membros
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="titleMedium" style={styles.workspaceName}>
          {workspace.name}
        </Text>
        <Text variant="bodySmall" style={styles.memberCount}>
          {workspace.members.length} {workspace.members.length === 1 ? 'membro' : 'membros'}
        </Text>

        {sortedMembers.map((member) => {
          const isCurrentOwner = member.role === 'owner';
          const canModify = canManageMembers && !isCurrentOwner;

          return (
            <List.Item
              key={member.userId}
              title={member.displayName}
              description={member.email}
              left={(props) => <List.Icon {...props} icon="account" />}
              right={() => (
                <View style={styles.memberRight}>
                  <Chip
                    style={[styles.roleChip, { backgroundColor: getRoleColor(member.role) }]}
                    textStyle={{ color: '#fff' }}
                  >
                    {getRoleLabel(member.role)}
                  </Chip>
                  {canModify && (
                    <Menu
                      visible={menuVisible === member.userId}
                      onDismiss={handleCloseMenu}
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          size={20}
                          onPress={() => handleOpenMenu(member.userId)}
                        />
                      }
                    >
                      <Menu.Item
                        leadingIcon="account-convert"
                        onPress={() => handleChangeRolePress(member.userId, member.role)}
                        title="Alterar permissão"
                      />
                      <Menu.Item
                        leadingIcon="delete"
                        onPress={() => handleRemoveMemberPress(member.userId)}
                        title="Remover membro"
                      />
                    </Menu>
                  )}
                </View>
              )}
              style={styles.memberItem}
            />
          );
        })}
      </ScrollView>

      {canManageMembers && (
        <FAB
          icon="plus"
          label="Adicionar Membro"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShareModalVisible(true)}
        />
      )}

      <ShareWorkspaceModal
        visible={shareModalVisible}
        workspaceId={workspaceId}
        onDismiss={() => setShareModalVisible(false)}
      />

      {/* Change Role Dialog */}
      <Portal>
        <Dialog
          visible={roleDialogVisible}
          onDismiss={() => setRoleDialogVisible(false)}
        >
          <Dialog.Title>Alterar Permissão</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogMemberName}>{selectedMember?.displayName}</Text>
            <Text variant="bodySmall" style={styles.dialogMemberEmail}>
              {selectedMember?.email}
            </Text>

            <Text variant="titleSmall" style={styles.roleSelectionTitle}>
              Nova permissão:
            </Text>

            <View style={styles.roleSelection}>
              <Chip
                selected={selectedRole === 'owner'}
                onPress={() => setSelectedRole('owner')}
                style={styles.roleOptionChip}
                mode="outlined"
              >
                Owner
              </Chip>
              <Chip
                selected={selectedRole === 'editor'}
                onPress={() => setSelectedRole('editor')}
                style={styles.roleOptionChip}
                mode="outlined"
              >
                Editor
              </Chip>
              <Chip
                selected={selectedRole === 'viewer'}
                onPress={() => setSelectedRole('viewer')}
                style={styles.roleOptionChip}
                mode="outlined"
              >
                Viewer
              </Chip>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRoleDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleConfirmChangeRole}>Confirmar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Remove Member Dialog */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Remover Membro</Dialog.Title>
          <Dialog.Content>
            <Text>
              Tem certeza que deseja remover {selectedMember?.displayName} do workspace?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancelar</Button>
            <Button
              onPress={handleConfirmRemove}
              textColor={theme.colors.error}
            >
              Remover
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  workspaceName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberCount: {
    opacity: 0.7,
    marginBottom: 24,
  },
  memberItem: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleChip: {
    alignSelf: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  dialogMemberName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dialogMemberEmail: {
    opacity: 0.7,
    marginBottom: 16,
  },
  roleSelectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  roleSelection: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOptionChip: {
    flex: 1,
  },
});
