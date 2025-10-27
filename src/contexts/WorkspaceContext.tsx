import React, { createContext, useState, useEffect, useContext } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { useAuth } from "./AuthContext";
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInsert,
  WorkspaceRole,
} from "../types/supabase";

// Helper function to normalize workspace from Supabase to expected format
function normalizeWorkspace(workspace: any): any {
  return {
    ...workspace,
    owner: workspace.owner_id,
    createdAt: workspace.created_at,
    updatedAt: workspace.updated_at,
    members: workspace.members || [],
  };
}

// Workspace Context Data
export interface WorkspaceContextData {
  workspaces: any[];
  activeWorkspace: any | null;
  loading: boolean;
  createWorkspace: (name: string) => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  updateWorkspace: (workspaceId: string, data: Partial<any>) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  addMember: (
    workspaceId: string,
    userId: string,
    email: string,
    displayName: string,
    role: WorkspaceRole
  ) => Promise<void>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
  changeMemberRole: (
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ) => Promise<void>;
  findUserByEmail: (
    email: string
  ) => Promise<{ id: string; email: string; displayName: string } | null>;
}

// Create context
const WorkspaceContext = createContext<WorkspaceContextData>(
  {} as WorkspaceContextData
);

// Provider component
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] =
    useState<RealtimeChannel | null>(null);

  // Load workspaces when user changes
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setLoading(false);
      return;
    }

    loadWorkspaces();
  }, [user]);

  // Setup real-time subscriptions for workspace changes
  useEffect(() => {
    if (!user) {
      // Cleanup subscription if user logs out
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        setRealtimeChannel(null);
      }
      return;
    }

    // Subscribe to workspace changes
    const channel = supabase
      .channel("workspace-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspaces",
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🔄 Workspace changed:", payload);
          loadWorkspaces();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_members",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🔄 Membership changed:", payload);
          loadWorkspaces();
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  /**
   * Load all workspaces for the current user
   */
  async function loadWorkspaces() {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Query workspaces where user is owner or member
      const { data: ownedWorkspaces, error: ownedError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id);

      if (ownedError) throw ownedError;

      // Query workspaces where user is a member
      const { data: memberWorkspaces, error: memberError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      // Get full workspace data for member workspaces
      const memberWorkspaceIds =
        memberWorkspaces?.map((m: any) => m.workspace_id) || [];
      let memberWorkspacesData: any[] = [];

      if (memberWorkspaceIds.length > 0) {
        const { data, error } = await supabase
          .from("workspaces")
          .select("*")
          .in("id", memberWorkspaceIds);

        if (error) throw error;
        memberWorkspacesData = data || [];
      }

      // Combine and deduplicate
      const allWorkspaces = [
        ...(ownedWorkspaces || []),
        ...memberWorkspacesData,
      ];
      const uniqueWorkspaces: any[] = Array.from(
        new Map(allWorkspaces.map((w: any) => [w.id, w])).values()
      );

      // Normalize workspaces
      const normalizedWorkspaces = uniqueWorkspaces.map(normalizeWorkspace);
      setWorkspaces(normalizedWorkspaces);

      // Get user's active workspace
      const { data: activeWorkspaceData, error: activeError } = await supabase
        .from("user_active_workspace")
        .select("workspace_id")
        .eq("user_id", user.id)
        .single();

      if (activeError && activeError.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw activeError;
      }

      if (activeWorkspaceData?.workspace_id) {
        const active = normalizedWorkspaces.find(
          (w: any) => w.id === activeWorkspaceData.workspace_id
        );
        setActiveWorkspace(active || null);
      } else if (normalizedWorkspaces.length > 0) {
        // Set first workspace as active if none is set
        setActiveWorkspace(normalizedWorkspaces[0]);
        await selectWorkspace(normalizedWorkspaces[0].id);
      } else {
        setActiveWorkspace(null);
      }
    } catch (error: any) {
      console.error("❌ Error loading workspaces:", error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Create a new workspace
   */
  async function createWorkspace(name: string): Promise<void> {
    if (!user) throw new Error("User not authenticated");

    try {
      // Create workspace
      const { data: newWorkspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name: name.trim(),
          owner_id: user.id,
        } as any)
        .select()
        .single();

      if (workspaceError) throw workspaceError;
      if (!newWorkspace) throw new Error("Failed to create workspace");

      console.log("✅ Workspace created:", newWorkspace.id);

      // Add owner as member
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: newWorkspace.id,
          user_id: user.id,
          email: user.email || "",
          display_name:
            user.user_metadata?.display_name || user.email || "User",
          role: "owner",
        } as any);

      if (memberError) {
        console.warn("⚠️  Could not add owner as member:", memberError);
      }

      // If this is the first workspace, set it as active
      if (workspaces.length === 0) {
        await selectWorkspace(newWorkspace.id);
      }

      // Reload workspaces
      await loadWorkspaces();
    } catch (error: any) {
      console.error("❌ Error creating workspace:", error);
      throw new Error(error.message || "Erro ao criar workspace");
    }
  }

  /**
   * Select a workspace as active
   */
  async function selectWorkspace(workspaceId: string): Promise<void> {
    if (!user) throw new Error("User not authenticated");

    try {
      // Update user's active workspace
      const { error } = await supabase.from("user_active_workspace").upsert({
        user_id: user.id,
        workspace_id: workspaceId,
      } as any);

      if (error) throw error;

      console.log("✅ Active workspace set:", workspaceId);

      // Update local state
      const selected = workspaces.find((w) => w.id === workspaceId);
      if (selected) {
        setActiveWorkspace(selected as any);
      }
    } catch (error: any) {
      console.error("❌ Error selecting workspace:", error);
      throw new Error(error.message || "Erro ao selecionar workspace");
    }
  }

  /**
   * Update workspace data
   */
  async function updateWorkspace(
    workspaceId: string,
    data: Partial<Workspace>
  ): Promise<void> {
    if (!user) throw new Error("User not authenticated");

    try {
      const { error } = await supabase
        .from("workspaces")
        .update({
          name: data.name,
          // updated_at is set automatically by trigger
        } as any)
        .eq("id", workspaceId)
        .eq("owner_id", user.id); // Only owner can update

      if (error) throw error;

      console.log("✅ Workspace updated:", workspaceId);

      // Reload workspaces
      await loadWorkspaces();
    } catch (error: any) {
      console.error("❌ Error updating workspace:", error);
      throw new Error(error.message || "Erro ao atualizar workspace");
    }
  }

  /**
   * Delete a workspace
   */
  async function deleteWorkspace(workspaceId: string): Promise<void> {
    if (!user) throw new Error("User not authenticated");

    try {
      // Check if user is owner
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace || workspace.owner_id !== user.id) {
        throw new Error("Only the owner can delete this workspace");
      }

      // Delete workspace (cascade will handle members, months, etc.)
      const { error } = await supabase
        .from("workspaces")
        .delete()
        .eq("id", workspaceId)
        .eq("owner_id", user.id);

      if (error) throw error;

      console.log("✅ Workspace deleted:", workspaceId);

      // If deleting active workspace, clear it
      if (activeWorkspace?.id === workspaceId) {
        setActiveWorkspace(null);
      }

      // Reload workspaces
      await loadWorkspaces();
    } catch (error: any) {
      console.error("❌ Error deleting workspace:", error);
      throw new Error(error.message || "Erro ao deletar workspace");
    }
  }

  /**
   * Refresh workspaces from Supabase
   */
  async function refreshWorkspaces(): Promise<void> {
    await loadWorkspaces();
  }

  /**
   * Find user by email
   */
  async function findUserByEmail(
    email: string
  ): Promise<{ id: string; email: string; displayName: string } | null> {
    if (!user) throw new Error("User not authenticated");

    try {
      // In Supabase, we need to use the service_role key to query auth.users
      // For now, we'll search in workspace_members table
      const { data, error } = await supabase
        .from("workspace_members")
        .select("user_id, email, display_name")
        .eq("email", email.toLowerCase().trim())
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data) return null;

      const typedData = data as any;
      return {
        id: typedData.user_id,
        email: typedData.email,
        displayName: typedData.display_name,
      };
    } catch (error: any) {
      console.error("❌ Error finding user:", error);
      return null;
    }
  }

  /**
   * Add member to workspace
   */
  async function addMember(
    workspaceId: string,
    userId: string,
    email: string,
    displayName: string,
    role: WorkspaceRole
  ): Promise<void> {
    if (!user) throw new Error("User not authenticated");

    try {
      // Add to workspace_members
      const { error } = await supabase.from("workspace_members").insert({
        workspace_id: workspaceId,
        user_id: userId,
        email,
        display_name: displayName,
        role,
      });

      if (error) throw error;

      console.log("✅ Member added:", email);

      // Reload workspaces
      await loadWorkspaces();
    } catch (error: any) {
      console.error("❌ Error adding member:", error);
      throw new Error(error.message || "Erro ao adicionar membro");
    }
  }

  /**
   * Remove member from workspace
   */
  async function removeMember(
    workspaceId: string,
    userId: string
  ): Promise<void> {
    if (!user) throw new Error("User not authenticated");

    try {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);

      if (error) throw error;

      console.log("✅ Member removed");

      // Reload workspaces
      await loadWorkspaces();
    } catch (error: any) {
      console.error("❌ Error removing member:", error);
      throw new Error(error.message || "Erro ao remover membro");
    }
  }

  /**
   * Change member role
   */
  async function changeMemberRole(
    workspaceId: string,
    userId: string,
    newRole: WorkspaceRole
  ): Promise<void> {
    if (!user) throw new Error("User not authenticated");

    try {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);

      if (error) throw error;

      console.log("✅ Member role changed");

      // Reload workspaces
      await loadWorkspaces();
    } catch (error: any) {
      console.error("❌ Error changing member role:", error);
      throw new Error(error.message || "Erro ao alterar papel do membro");
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loading,
        createWorkspace,
        selectWorkspace,
        updateWorkspace,
        deleteWorkspace,
        refreshWorkspaces,
        addMember,
        removeMember,
        changeMemberRole,
        findUserByEmail,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

// Hook to use workspace context
export function useWorkspace(): WorkspaceContextData {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return context;
}
