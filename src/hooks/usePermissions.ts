import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Workspace, WorkspaceRole } from '../types/workspace';

export interface PermissionsResult {
  role: WorkspaceRole | null;
  isOwner: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  canDeleteWorkspace: boolean;
  isViewOnly: boolean;
}

/**
 * Hook to check user permissions in a workspace
 * @param workspace - The workspace to check permissions for
 * @returns Object with permission flags
 */
export function usePermissions(workspace: Workspace | null): PermissionsResult {
  const { user } = useAuth();

  return useMemo(() => {
    if (!workspace || !user) {
      return {
        role: null,
        isOwner: false,
        canEdit: false,
        canManageMembers: false,
        canDeleteWorkspace: false,
        isViewOnly: false,
      };
    }

    // Find current user in members array
    const currentMember = workspace.members?.find((m) => m.userId === user.id);
    const role = currentMember?.role || null;

    // Check if user is owner
    const isOwner = workspace.owner === user.id || role === 'owner';

    // Owner and Editor can edit
    const canEdit = isOwner || role === 'editor';

    // Only owner can manage members
    const canManageMembers = isOwner;

    // Only owner can delete workspace
    const canDeleteWorkspace = isOwner;

    // Viewer can only view
    const isViewOnly = role === 'viewer';

    return {
      role,
      isOwner,
      canEdit,
      canManageMembers,
      canDeleteWorkspace,
      isViewOnly,
    };
  }, [workspace, user]);
}
