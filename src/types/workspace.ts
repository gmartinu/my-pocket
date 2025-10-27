// Workspace member role
export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

// Workspace member
export interface WorkspaceMember {
  userId: string;
  email: string;
  displayName: string;
  role: WorkspaceRole;
  addedAt: string; // ISO string
}

// Workspace document (matches Supabase schema)
export interface Workspace {
  id: string;
  name: string;
  owner_id: string; // Supabase field
  owner?: string; // Compatibility with old code
  members?: WorkspaceMember[]; // Loaded separately
  created_at: string; // Supabase field
  updated_at: string; // Supabase field
  createdAt?: string; // Compatibility with old code
  updatedAt?: string; // Compatibility with old code
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
