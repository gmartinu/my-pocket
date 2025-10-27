import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, AuthContextData, UserDocument } from '../types';

// Create the context
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData = await getUserData(firebaseUser);
        setUser(userData);
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  /**
   * Convert Firebase user to our User type
   */
  async function getUserData(firebaseUser: FirebaseUser): Promise<User> {
    // Try to get user document from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (userDoc.exists()) {
      const data = userDoc.data();
      // Try displayName first, then name, then email, then Firebase displayName
      const displayName = data.displayName || data.name || data.email || firebaseUser.displayName || 'User';

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName,
      };
    }

    // Fallback if document doesn't exist
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || firebaseUser.email || 'User',
    };
  }

  /**
   * Sign in with email and password
   */
  async function signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }

  /**
   * Sign up with name, email and password
   */
  async function signUp(name: string, email: string, password: string): Promise<void> {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Create user document in Firestore
    const userDoc: UserDocument = {
      name,
      displayName: name, // Add displayName for member search
      email: email.toLowerCase().trim(), // Store email in lowercase for consistent searches
      workspaces: [],
      activeWorkspace: null,
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
  }

  /**
   * Sign out
   */
  async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
