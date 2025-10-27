import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

// Auth Context Data
export interface AuthContextData {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    console.log('🔐 [SupabaseAuth] Initializing auth context...');

    // Set up async storage for session persistence
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [SupabaseAuth] Auth state changed:', event);
      console.log('🔐 [SupabaseAuth] Session:', session ? 'Exists' : 'Null');

      setSession(session);
      setUser(session?.user ?? null);

      if (session) {
        console.log('🔐 [SupabaseAuth] User logged in:', session.user.email);
        await AsyncStorage.setItem('supabase.session', JSON.stringify(session));
      } else {
        console.log('🔐 [SupabaseAuth] User logged out');
        await AsyncStorage.removeItem('supabase.session');
      }
    });

    // Try to restore session from storage
    restoreSession();

    // Cleanup
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  /**
   * Restore session from AsyncStorage
   */
  async function restoreSession() {
    console.log('🔐 [SupabaseAuth] Restoring session...');
    try {
      setLoading(true);

      // Try to get existing session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ [SupabaseAuth] Error restoring session:', error);
        setUser(null);
        setSession(null);
        return;
      }

      if (session) {
        console.log('✅ [SupabaseAuth] Session restored for user:', session.user.email);
        setSession(session);
        setUser(session.user);
      } else {
        console.log('ℹ️  [SupabaseAuth] No session found');
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('❌ [SupabaseAuth] Error in restoreSession:', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Sign in with email and password
   */
  async function signIn(email: string, password: string): Promise<void> {
    console.log('🔐 [SupabaseAuth] Attempting sign in for:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        console.error('❌ [SupabaseAuth] Sign in error:', error);
        throw error;
      }

      console.log('✅ [SupabaseAuth] Signed in successfully:', data.user?.email);
      console.log('✅ [SupabaseAuth] Session created:', !!data.session);

      // Session will be set by onAuthStateChange
    } catch (error: any) {
      console.error('❌ [SupabaseAuth] Sign in failed:', error);

      // Translate common errors to Portuguese
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Email ou senha incorretos');
      } else if (error.message?.includes('Email not confirmed')) {
        throw new Error('Email não confirmado. Verifique sua caixa de entrada.');
      }

      throw new Error(error.message || 'Erro ao fazer login');
    }
  }

  /**
   * Sign up with email and password
   */
  async function signUp(email: string, password: string, displayName?: string): Promise<void> {
    console.log('🔐 [SupabaseAuth] Attempting sign up for:', email);
    console.log('🔐 [SupabaseAuth] Password length:', password.length);
    console.log('🔐 [SupabaseAuth] Display name:', displayName || email.split('@')[0]);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      console.log('🔐 [SupabaseAuth] Sign up response:', {
        hasUser: !!data.user,
        hasSession: !!data.session,
        error: error?.message,
      });

      if (error) {
        console.error('❌ [SupabaseAuth] Sign up error:', error);
        throw error;
      }

      if (data.user) {
        console.log('✅ [SupabaseAuth] User created:', data.user.email);
        console.log('✅ [SupabaseAuth] User ID:', data.user.id);

        // Supabase pode requerer confirmação de email
        // dependendo das configurações do projeto
        if (data.session) {
          console.log('✅ [SupabaseAuth] Auto-signed in after signup');
        } else {
          console.log('⚠️  [SupabaseAuth] Email confirmation required');
          throw new Error('Verifique seu email para confirmar a conta');
        }
      } else {
        console.error('❌ [SupabaseAuth] No user returned from signUp');
        throw new Error('Erro ao criar usuário - nenhum usuário retornado');
      }
    } catch (error: any) {
      console.error('❌ [SupabaseAuth] Sign up failed:', error);
      console.error('❌ [SupabaseAuth] Error details:', JSON.stringify(error, null, 2));

      // Translate common errors to Portuguese
      if (error.message?.includes('already registered')) {
        throw new Error('Este email já está cadastrado');
      } else if (error.message?.includes('Password should be at least')) {
        throw new Error('Senha deve ter no mínimo 6 caracteres');
      } else if (error.message?.includes('Unable to validate email')) {
        throw new Error('Email inválido');
      }

      throw new Error(error.message || 'Erro ao criar conta');
    }
  }

  /**
   * Sign out
   */
  async function signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      console.log('✅ Signed out');

      setUser(null);
      setSession(null);
      await AsyncStorage.removeItem('supabase.session');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Erro ao sair');
    }
  }

  /**
   * Reset password
   */
  async function resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: 'mypocket://reset-password',
        }
      );

      if (error) throw error;

      console.log('✅ Password reset email sent to:', email);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Erro ao enviar email de recuperação');
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
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
