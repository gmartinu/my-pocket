import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  query,
  where,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { Workspace, WorkspaceContextData, WorkspaceRole } from '../types/workspace';

// Create context
const WorkspaceContext = createContext<WorkspaceContextData>({} as WorkspaceContextData);

// Provider component
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  // Set up real-time listener for user's workspaces
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const userRef = doc(db, 'users', user.uid);

    // Listen to user document for workspace list changes
    const unsubscribe = onSnapshot(
      userRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          const workspaceIds: string[] = userData?.workspaces || [];
          const activeWorkspaceId: string | null = userData?.activeWorkspace || null;

          if (workspaceIds.length === 0) {
            setWorkspaces([]);
            setActiveWorkspace(null);
            setLoading(false);
            return;
          }

          // Fetch all workspace documents
          const workspacePromises = workspaceIds.map((id) => getDoc(doc(db, 'workspaces', id)));
          const workspaceDocs = await Promise.all(workspacePromises);

          // Convert to Workspace objects
          const loadedWorkspaces: Workspace[] = workspaceDocs
            .filter((doc) => doc.exists())
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Workspace[];

          setWorkspaces(loadedWorkspaces);

          // Set active workspace if available
          if (activeWorkspaceId) {
            const active = loadedWorkspaces.find((w) => w.id === activeWorkspaceId);
            setActiveWorkspace(active || null);
          }

          setLoading(false);
        } else {
          setWorkspaces([]);
          setActiveWorkspace(null);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to user workspaces:', error);
        setLoading(false);
      }
    );

    // Cleanup listener
    return () => unsubscribe();
  }, [user]);

  // Set up real-time listener for active workspace details
  useEffect(() => {
    if (!activeWorkspace?.id) {
      return;
    }

    const workspaceRef = doc(db, 'workspaces', activeWorkspace.id);

    // Listen to active workspace for real-time updates
    const unsubscribe = onSnapshot(
      workspaceRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const updatedWorkspace = { id: snapshot.id, ...snapshot.data() } as Workspace;
          setActiveWorkspace(updatedWorkspace);

          // Also update in the workspaces list
          setWorkspaces((prev) =>
            prev.map((w) => (w.id === snapshot.id ? updatedWorkspace : w))
          );
        }
      },
      (error) => {
        console.error('Error listening to active workspace:', error);
      }
    );

    // Cleanup listener
    return () => unsubscribe();
  }, [activeWorkspace?.id]);

  /**
   * Load all workspaces for the current user
   */
  async function loadWorkspaces() {
    if (!user) return;

    try {
      setLoading(true);

      // Get user document to find workspace IDs
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData) {
        setLoading(false);
        return;
      }

      const workspaceIds: string[] = userData.workspaces || [];
      const activeWorkspaceId: string | null = userData.activeWorkspace || null;

      if (workspaceIds.length === 0) {
        setWorkspaces([]);
        setActiveWorkspace(null);
        setLoading(false);
        return;
      }

      // Fetch all workspace documents
      const workspacePromises = workspaceIds.map((id) => getDoc(doc(db, 'workspaces', id)));
      const workspaceDocs = await Promise.all(workspacePromises);

      // Convert to Workspace objects
      const loadedWorkspaces: Workspace[] = workspaceDocs
        .filter((doc) => doc.exists())
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Workspace[];

      setWorkspaces(loadedWorkspaces);

      // Set active workspace if available
      if (activeWorkspaceId) {
        const active = loadedWorkspaces.find((w) => w.id === activeWorkspaceId);
        setActiveWorkspace(active || null);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Create a new workspace
   */
  async function createWorkspace(name: string): Promise<void> {
    if (!user) throw new Error('User not authenticated');

    // Create workspace document
    const workspaceRef = doc(collection(db, 'workspaces'));
    const now = new Date();
    const newWorkspace: Omit<Workspace, 'id'> = {
      name: name.trim(),
      owner: user.uid,
      members: [{
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email || 'User',
        role: 'owner',
        addedAt: now,
      }],
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(workspaceRef, newWorkspace);

    // Update user document - use setDoc with merge to handle if document doesn't exist
    const userRef = doc(db, 'users', user.uid);
    const updateData: any = {
      workspaces: arrayUnion(workspaceRef.id),
    };

    // If this is the first workspace, set it as active
    if (workspaces.length === 0) {
      updateData.activeWorkspace = workspaceRef.id;
    }

    // Use setDoc with merge: true to create or update the document
    await setDoc(userRef, updateData, { merge: true });

    // Reload workspaces
    await loadWorkspaces();
  }

  /**
   * Select a workspace as active
   */
  async function selectWorkspace(workspaceId: string): Promise<void> {
    if (!user) throw new Error('User not authenticated');

    // Update user document
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      activeWorkspace: workspaceId,
    }, { merge: true });

    // Update local state
    const selected = workspaces.find((w) => w.id === workspaceId);
    if (selected) {
      setActiveWorkspace(selected);
    }
  }

  /**
   * Update workspace data
   */
  async function updateWorkspace(
    workspaceId: string,
    data: Partial<Workspace>
  ): Promise<void> {
    if (!user) throw new Error('User not authenticated');

    const workspaceRef = doc(db, 'workspaces', workspaceId);

    // Remove id from update data if present
    const { id, createdAt, ...updateData } = data as any;

    await updateDoc(workspaceRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    // Reload workspaces
    await loadWorkspaces();
  }

  /**
   * Delete a workspace
   */
  async function deleteWorkspace(workspaceId: string): Promise<void> {
    if (!user) throw new Error('User not authenticated');

    // Check if user is owner
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace || workspace.owner !== user.uid) {
      throw new Error('Only the owner can delete this workspace');
    }

    // Delete workspace document
    await deleteDoc(doc(db, 'workspaces', workspaceId));

    // Update user document
    const userRef = doc(db, 'users', user.uid);
    const updateData: any = {
      workspaces: arrayRemove(workspaceId),
    };

    // If deleting active workspace, clear it
    if (activeWorkspace?.id === workspaceId) {
      updateData.activeWorkspace = null;
    }

    await setDoc(userRef, updateData, { merge: true });

    // Reload workspaces
    await loadWorkspaces();
  }

  /**
   * Refresh workspaces from Firestore
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
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('🔍 [findUserByEmail] Buscando email:', email.toLowerCase().trim());

      const q = query(
        collection(db, 'users'),
        where('email', '==', email.toLowerCase().trim()),
        limit(1)
      );

      const snapshot = await getDocs(q);
      console.log('📊 [findUserByEmail] Documentos encontrados:', snapshot.size);

      if (snapshot.empty) {
        console.log('❌ [findUserByEmail] Nenhum usuário encontrado');
        return null;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      console.log('📄 [findUserByEmail] Dados do usuário:', {
        id: userDoc.id,
        email: userData.email,
        displayName: userData.displayName,
        name: userData.name,
      });

      // Use displayName, fallback to name, then email
      const displayName = userData.displayName || userData.name || userData.email || 'User';

      return {
        id: userDoc.id,
        email: userData.email || '',
        displayName,
      };
    } catch (error) {
      console.error('❌ [findUserByEmail] Erro:', error);
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
    if (!user) throw new Error('User not authenticated');

    const workspaceRef = doc(db, 'workspaces', workspaceId);

    // Add to members array
    await updateDoc(workspaceRef, {
      members: arrayUnion({
        userId,
        email,
        displayName,
        role,
        addedAt: new Date(),
      }),
      updatedAt: serverTimestamp(),
    });

    // Add workspace to user's workspaces array
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        workspaces: arrayUnion(workspaceId),
      },
      { merge: true }
    );

    // Reload workspaces
    await loadWorkspaces();
  }

  /**
   * Remove member from workspace
   */
  async function removeMember(workspaceId: string, userId: string): Promise<void> {
    if (!user) throw new Error('User not authenticated');

    // Get workspace to find member object
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    const workspaceData = workspaceSnap.data();

    if (!workspaceData) throw new Error('Workspace not found');

    // Filter out the member to remove
    const updatedMembers = workspaceData.members.filter((m: any) => m.userId !== userId);

    await updateDoc(workspaceRef, {
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });

    // Remove workspace from user's workspaces array
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        workspaces: arrayRemove(workspaceId),
        activeWorkspace: null, // Clear if it was active
      },
      { merge: true }
    );

    // Reload workspaces
    await loadWorkspaces();
  }

  /**
   * Change member role
   */
  async function changeMemberRole(
    workspaceId: string,
    userId: string,
    newRole: WorkspaceRole
  ): Promise<void> {
    if (!user) throw new Error('User not authenticated');

    // Get workspace to update member
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    const workspaceData = workspaceSnap.data();

    if (!workspaceData) throw new Error('Workspace not found');

    // Update role of the specific member
    const updatedMembers = workspaceData.members.map((m: any) =>
      m.userId === userId ? { ...m, role: newRole } : m
    );

    await updateDoc(workspaceRef, {
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });

    // Reload workspaces
    await loadWorkspaces();
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
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }

  return context;
}
