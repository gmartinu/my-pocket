// User types
export interface User {
  uid: string;
  email: string;
  displayName: string;
}

// Auth Context types
export interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Firestore user document
export interface UserDocument {
  name: string;
  displayName: string;
  email: string;
  workspaces: string[];
  activeWorkspace: string | null;
  createdAt: Date;
}
