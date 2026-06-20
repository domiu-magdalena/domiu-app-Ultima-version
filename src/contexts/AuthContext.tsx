// src/contexts/AuthContext.tsx
// Contexto de autenticación

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import {
  AuthSession,
  UserProfile,
  LoginCredentials,
  RegisterCredentials,
} from '@/types/auth';
import { SupabaseAuthService } from '@/lib/auth/supabase';

interface AuthContextType extends AuthSession {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authSession, setAuthSession] = useState<AuthSession>({
    user: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  /**
   * Cargar perfil del usuario via API route (bypasses RLS con service_role)
   */
  const loadUserProfile = useCallback(async () => {
    try {
      const sessionRes = await SupabaseAuthService.getSession();
      const token = sessionRes.session?.access_token;
      if (!token) return null;
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status !== 401) {
          console.warn('[Auth] loadUserProfile HTTP', res.status);
        }
        return null;
      }
      const { profile } = await res.json();
      return profile;
    } catch {
      return null;
    }
  }, []);

  /**
   * Inicializar sesión
   */
  useEffect(() => {
    const dpl = document.querySelector('html')?.getAttribute('data-dpl-id') || 'unknown';
    console.log(`[DomiU] Deploy: ${dpl}`);
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      setAuthSession((prev) => ({ ...prev, isLoading: true }));

      // Obtener sesión actual
      const { session, error } = await SupabaseAuthService.getSession();

      if (error) {
        throw error;
      }

      if (session && session.user) {
        const profile = await loadUserProfile();

        if (profile) {
          setAuthSession({
            user: session.user,
            profile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else if (session.user.email_confirmed_at) {
          // Solo cerrar sesión si el email ya fue confirmado (usuario existente sin perfil = problema real)
          await SupabaseAuthService.logout();
          setAuthSession({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Sesión inválida: perfil no encontrado',
          });
        } else {
          // Email no confirmado aún - registro en proceso, no hacer nada
          setAuthSession({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } else {
        setAuthSession({
          user: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Error inicializando sesión:', error);
      setAuthSession({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }, [loadUserProfile]);

  /**
   * Login
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        setAuthSession((prev) => ({ ...prev, isLoading: true, error: null }));

        const { session, user, error } = await SupabaseAuthService.login(credentials);

        if (error) {
          throw error;
        }

        if (user && session) {
          const profile = await loadUserProfile();

          if (!profile) {
            throw new Error('No se pudo cargar tu perfil. Contacta a soporte.');
          }

          setAuthSession({
            user,
            profile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error en login';
        setAuthSession((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [loadUserProfile]
  );

  /**
   * Register
   */
  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      try {
        setAuthSession((prev) => ({ ...prev, isLoading: true, error: null }));

        const { user, profile, error } = await SupabaseAuthService.register(credentials);

        if (error) {
          const msg = error instanceof Error ? error.message : String(error);
          throw new Error(msg);
        }

        if (user && profile) {
          // No establecer como autenticado hasta que se verifique el email
          setAuthSession({
            user,
            profile,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error('Registro incompleto: no se recibieron datos del usuario');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error en registro';
        console.error('[AuthContext] register error:', errorMessage);
        setAuthSession((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    []
  );

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      const currentProfile = authSession.profile;
      setAuthSession((prev) => ({ ...prev, isLoading: true }));

      if (currentProfile) {
        try {
          const name = `${currentProfile.first_name || ''} ${currentProfile.last_name || ''}`.trim() || 'Admin';
          const { auditService } = await import('@/services/audit');
          const { adminAuthService } = await import('@/services/admin-auth');
          await Promise.all([
            auditService.log(currentProfile.id, name, 'logout', 'session', null, 'Cierre de sesión del panel'),
            adminAuthService.addHistory(currentProfile.id, 'logout', 'Cierre de sesión del panel'),
          ]);
        } catch {}
      }

      const { error } = await SupabaseAuthService.logout();

      if (error) {
        throw error;
      }

      setAuthSession({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error en logout:', error);
      setAuthSession((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error en logout',
      }));
    }
  }, [authSession.profile]);

  /**
   * Reset password
   */
  const resetPassword = useCallback(async (email: string) => {
    try {
      setAuthSession((prev) => ({ ...prev, error: null }));

      const { error } = await SupabaseAuthService.resetPassword({ email });

      if (error) {
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al resetear contraseña';
      setAuthSession((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  /**
   * Update profile
   */
  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        if (!authSession.user) {
          throw new Error('No hay usuario autenticado');
        }

        setAuthSession((prev) => ({ ...prev, isLoading: true, error: null }));

        const sessionRes = await SupabaseAuthService.getSession();
        const token = sessionRes.session?.access_token;
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const { profile } = await res.json();

        setAuthSession({
          user: authSession.user,
          profile,
          isAuthenticated: authSession.isAuthenticated,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error actualizando perfil';
        setAuthSession((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [authSession.user, authSession.isAuthenticated]
  );

  /**
   * Reenviar email de verificación
   */
  const resendVerificationEmail = useCallback(async () => {
    try {
      if (!authSession.user?.email) {
        throw new Error('Email no disponible');
      }

      const { error } = await SupabaseAuthService.resendVerificationEmail(
        authSession.user.email
      );

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }, [authSession.user]);

  /**
   * Suscribirse a cambios de autenticación
   */
  useEffect(() => {
    // Inicializar sesión
    initializeSession();

    // Suscribirse a cambios
    const unsubscribe = SupabaseAuthService.onAuthStateChange(
      async (session, user) => {
        if (session && user) {
          const profile = await loadUserProfile();
          if (profile) {
            setAuthSession({
              user,
              profile,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } else {
          setAuthSession({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      }
    );

    return () => {
      unsubscribe?.data?.subscription?.unsubscribe();
    };
  }, [initializeSession, loadUserProfile]);

  const value: AuthContextType = {
    ...authSession,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para usar el contexto de autenticación
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}
