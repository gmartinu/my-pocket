import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  Text,
  IconButton,
  FAB,
  Badge,
  Portal,
  Dialog,
  TextInput,
  Button,
  useTheme,
  Chip,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { WorkspaceScreenNavigationProp } from "../../types/navigation";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import CreateWorkspaceModal from "../../components/CreateWorkspaceModal";
import { Workspace } from "../../types/workspace";

export default function WorkspacesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<WorkspaceScreenNavigationProp>();
  const { user } = useAuth();
  const {
    workspaces,
    activeWorkspace,
    selectWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refreshWorkspaces,
  } = useWorkspace();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleSelectWorkspace = async (workspaceId: string) => {
    try {
      setLoading(true);
      await selectWorkspace(workspaceId);
    } catch (error) {
      console.error("Error selecting workspace:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setEditName(workspace.name);
    setEditDialogVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedWorkspace) return;

    if (!editName.trim() || editName.trim().length < 3) {
      return;
    }

    try {
      setLoading(true);
      await updateWorkspace(selectedWorkspace.id, { name: editName.trim() });
      setEditDialogVisible(false);
      setSelectedWorkspace(null);
      setEditName("");
    } catch (error) {
      console.error("Error updating workspace:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedWorkspace) return;

    try {
      setLoading(true);
      await deleteWorkspace(selectedWorkspace.id);
      setDeleteDialogVisible(false);
      setSelectedWorkspace(null);
    } catch (error) {
      console.error("Error deleting workspace:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWorkspaces();
    setRefreshing(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text variant="headlineMedium" style={styles.title}>
          Meus Workspaces
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Gerencie seus contextos financeiros
        </Text>

        {workspaces.map((workspace) => {
          const isActive = activeWorkspace?.id === workspace.id;
          const isOwner = workspace.owner === user?.id;
          const userMember = workspace.members.find((m) => m.userId === user?.id);
          const userRole = userMember?.role || "viewer";

          return (
            <Card
              key={workspace.id}
              style={[
                styles.card,
                isActive && {
                  borderColor: theme.colors.primary,
                  borderWidth: 2,
                },
              ]}
              onPress={() => !isActive && handleSelectWorkspace(workspace.id)}
            >
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitle}>
                    <Text variant="titleMedium">{workspace.name}</Text>
                    {isActive && (
                      <Badge
                        style={[
                          styles.badge,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        Ativo
                      </Badge>
                    )}
                  </View>
                  <View style={styles.cardActions}>
                    {isOwner && (
                      <>
                        <IconButton
                          icon="pencil"
                          size={20}
                          onPress={() => handleEditWorkspace(workspace)}
                        />
                        <IconButton
                          icon="delete"
                          size={20}
                          onPress={() => handleDeleteWorkspace(workspace)}
                        />
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Chip
                    icon="account-group"
                    onPress={() =>
                      navigation.navigate("MembersList", {
                        workspaceId: workspace.id,
                      })
                    }
                    style={styles.membersChip}
                    mode="outlined"
                  >
                    {workspace.members.length}{" "}
                    {workspace.members.length === 1 ? "membro" : "membros"}
                  </Chip>

                  <Chip
                    icon={
                      userRole === "owner"
                        ? "crown"
                        : userRole === "editor"
                        ? "pencil"
                        : "eye"
                    }
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor:
                          userRole === "owner"
                            ? "#FFC107"
                            : userRole === "editor"
                            ? "#2196F3"
                            : "#757575",
                      },
                    ]}
                    textStyle={{ color: "#fff" }}
                  >
                    {userRole === "owner"
                      ? "Owner"
                      : userRole === "editor"
                      ? "Editor"
                      : "Viewer"}
                  </Chip>
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setCreateModalVisible(true)}
      />

      <CreateWorkspaceModal
        visible={createModalVisible}
        onDismiss={() => setCreateModalVisible(false)}
      />

      {/* Edit Dialog */}
      <Portal>
        <Dialog
          visible={editDialogVisible}
          onDismiss={() => setEditDialogVisible(false)}
        >
          <Dialog.Title>Editar Workspace</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nome"
              value={editName}
              onChangeText={setEditName}
              mode="outlined"
              maxLength={30}
              disabled={loading}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setEditDialogVisible(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveEdit}
              loading={loading}
              disabled={loading}
            >
              Salvar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Deletar Workspace</Dialog.Title>
          <Dialog.Content>
            <Text>
              Tem certeza que deseja deletar "{selectedWorkspace?.name}"? Todos
              os dados serão perdidos.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDeleteDialogVisible(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmDelete}
              loading={loading}
              disabled={loading}
              buttonColor={theme.colors.error}
            >
              Deletar
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
  scrollContent: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
    fontWeight: "bold",
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
  },
  badge: {
    alignSelf: "flex-start",
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  membersChip: {
    flex: 1,
  },
  roleChip: {
    alignSelf: "flex-start",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
