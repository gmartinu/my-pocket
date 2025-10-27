import { Timestamp } from 'firebase/firestore';

// Workspace member role
export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

// Workspace member
export interface WorkspaceMember {
  userId: string;
  email: string;
  displayName: string;
  role: WorkspaceRole;
  addedAt: Date | Timestamp;
}

// Workspace document
export interface Workspace {
  id: string;
  name: string;
  owner: string;
  members: WorkspaceMember[];
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// Workspace Context data
export interface WorkspaceContextData {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  createWorkspace: (name: string) => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  updateWorkspace: (workspaceId: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  addMember: (workspaceId: string, userId: string, email: string, displayName: string, role: WorkspaceRole) => Promise<void>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
  changeMemberRole: (workspaceId: string, userId: string, role: WorkspaceRole) => Promise<void>;
  findUserByEmail: (email: string) => Promise<{ id: string; email: string; displayName: string } | null>;
}
