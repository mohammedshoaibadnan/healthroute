import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseConfigStatus, SupabaseConfigStatus } from '../lib/supabaseClient';
import {
  ResolvedDatabaseIdentity,
  resolveServerAuthenticatedIdentity,
  enforceSessionAuthorityBoundary,
} from '../utils/rules';
import { UserRole } from '../types';

export type AuthSessionMode = 'demo_simulation' | 'authenticated_supabase';

export interface AuthContextType {
  authMode: AuthSessionMode;
  configStatus: SupabaseConfigStatus;
  session: Session | null;
  user: User | null;
  resolvedIdentity: ResolvedDatabaseIdentity | null;
  isInitialLoading: boolean;
  isActionLoading: boolean;
  authError: string | null;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshServerIdentity: () => Promise<void>;
  enterDemoSimulationMode: () => Promise<void>;
  clearAuthError: () => void;
  canPerformDatabaseOperation: (clientSimulatedRole?: UserRole) => {
    allowed: boolean;
    effectiveRole: UserRole | null;
    storageTarget: 'local_sandbox' | 'supabase_database' | 'blocked';
    reason?: string;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const configStatus = getSupabaseConfigStatus();
  const supabase = getSupabaseClient();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [resolvedIdentity, setResolvedIdentity] = useState<ResolvedDatabaseIdentity | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(Boolean(supabase));
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(
    configStatus.violations.length > 0 ? configStatus.violations.join(' ') : null
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const fetchServerIdentityForUser = useCallback(
    async (authUser: User | null): Promise<{ identity: ResolvedDatabaseIdentity | null; error?: string }> => {
      if (!supabase || !authUser) {
        return { identity: null };
      }

      try {
        // 1. Check public.staff_users mapped to auth.uid()
        const { data: staffData, error: staffErr } = await supabase
          .from('staff_users')
          .select('id, auth_user_id, name, role, designation, department, employee_code, email, is_active')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

        if (staffErr && staffErr.code !== 'PGRST116') {
          return {
            identity: null,
            error: `Database profile lookup error (${staffErr.code || 'STAFF_QUERY'}): ${staffErr.message}`,
          };
        }

        if (staffData) {
          return resolveServerAuthenticatedIdentity(authUser.id, staffData, null);
        }

        // 2. Check public.patients mapped to auth.uid()
        const { data: patientData, error: patientErr } = await supabase
          .from('patients')
          .select('id, auth_user_id, name, permanent_mrn')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

        if (patientErr && patientErr.code !== 'PGRST116') {
          return {
            identity: null,
            error: `Patient profile lookup error (${patientErr.code || 'PATIENT_QUERY'}): ${patientErr.message}`,
          };
        }

        return resolveServerAuthenticatedIdentity(authUser.id, null, patientData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error resolving server identity.';
        return { identity: null, error: message };
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      setIsInitialLoading(false);
      return;
    }

    let isMounted = true;

    const initializeSession = async () => {
      setIsInitialLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          setAuthError(error.message);
          setSession(null);
          setUser(null);
          setResolvedIdentity(null);
          return;
        }

        const activeSession = data.session;
        setSession(activeSession);
        setUser(activeSession?.user ?? null);

        if (activeSession?.user) {
          const { identity, error: profileError } = await fetchServerIdentityForUser(activeSession.user);
          if (!isMounted) return;
          setResolvedIdentity(identity);
          if (profileError) {
            setAuthError(profileError);
          }
        } else {
          setResolvedIdentity(null);
        }
      } catch (err) {
        if (!isMounted) return;
        setAuthError(err instanceof Error ? err.message : 'Failed to initialize Supabase session.');
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        const { identity, error: profileError } = await fetchServerIdentityForUser(nextSession.user);
        if (!isMounted) return;
        setResolvedIdentity(identity);
        if (profileError) {
          setAuthError(profileError);
        } else {
          setAuthError(null);
        }
      } else {
        setResolvedIdentity(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, fetchServerIdentityForUser]);

  const authMode: AuthSessionMode =
    session && user && resolvedIdentity ? 'authenticated_supabase' : 'demo_simulation';

  const signInWithPassword = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      const msg =
        'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      const msg = 'Please enter both email address and password.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    setIsActionLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error || !data.session || !data.user) {
        const errMsg = error?.message || 'Invalid login credentials.';
        setAuthError(errMsg);
        return { success: false, error: errMsg };
      }

      setSession(data.session);
      setUser(data.user);

      const { identity, error: profileError } = await fetchServerIdentityForUser(data.user);
      setResolvedIdentity(identity);

      if (profileError || !identity) {
        const msg =
          profileError ||
          `Authenticated as ${data.user.email} (${data.user.id}), but no linked staff_users or patients profile was found.`;
        setAuthError(msg);
        return { success: false, error: msg };
      }

      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected sign-in error.';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setIsActionLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsActionLoading(true);
    setAuthError(null);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      setSession(null);
      setUser(null);
      setResolvedIdentity(null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Error signing out of Supabase session.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const refreshServerIdentity = async (): Promise<void> => {
    if (!user) return;
    setIsActionLoading(true);
    setAuthError(null);
    try {
      const { identity, error } = await fetchServerIdentityForUser(user);
      setResolvedIdentity(identity);
      if (error) {
        setAuthError(error);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const enterDemoSimulationMode = async (): Promise<void> => {
    if (session && supabase) {
      await signOut();
    } else {
      setAuthError(null);
    }
    setIsAuthModalOpen(false);
  };

  const clearAuthError = () => setAuthError(null);

  const canPerformDatabaseOperation = (clientSimulatedRole?: UserRole) => {
    return enforceSessionAuthorityBoundary({
      mode: authMode,
      hasValidSupabaseSession: Boolean(session && user),
      serverAuthenticatedRole: resolvedIdentity?.role ?? null,
      clientSimulatedRole,
      attemptedTarget: authMode === 'authenticated_supabase' ? 'supabase_database' : 'local_sandbox',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        authMode,
        configStatus,
        session,
        user,
        resolvedIdentity,
        isInitialLoading,
        isActionLoading,
        authError,
        isAuthModalOpen,
        setIsAuthModalOpen,
        signInWithPassword,
        signOut,
        refreshServerIdentity,
        enterDemoSimulationMode,
        clearAuthError,
        canPerformDatabaseOperation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
