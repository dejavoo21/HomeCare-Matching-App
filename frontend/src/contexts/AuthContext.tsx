import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole } from '../types/index';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null; // kept only for backward compatibility
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    location: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  setAuthData: (_token: string, user: User) => void; // compatibility only
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(raw: any): User {
  return {
    id: raw.id || raw.userId,
    name: raw.name || raw.email || 'User',
    email: raw.email,
    role: raw.role,
    location: raw.location || '',
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // token is no longer readable in cookie mode; keep null for compatibility
  const token = null;

  const persistUser = (nextUser: User | null) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem('user', JSON.stringify(nextUser));
      localStorage.setItem('user-session-active', 'true');
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('user-session-active');
    }
  };

  const refreshMe = useCallback(async () => {
    try {
      const response = (await api.getMe()) as any;
      const rawUser = response?.data?.user ?? response?.data;

      if (rawUser) {
        persistUser(normalizeUser(rawUser));
      } else {
        persistUser(null);
      }
    } catch {
      persistUser(null);
    }
  }, []);

  // On app load, restore session from cookie by asking backend
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = (await api.getMe()) as any;
        const rawUser = response?.data?.user ?? response?.data;

        if (!mounted) return;

        if (rawUser) {
          persistUser(normalizeUser(rawUser));
        } else {
          persistUser(null);
        }
      } catch {
        if (mounted) persistUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: UserRole,
      location: string
    ) => {
      setIsLoading(true);
      try {
        await api.register(name, email, password, role, location);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);

      // Check if TOTP is required
      if ((response as any)?.data?.requiresTotp) {
        throw {
          code: 'TOTP_REQUIRED',
          userId: (response as any).data.userId,
          email: (response as any).data.email,
        };
      }

      // Cookies are now set by backend; fetch current user
      const userResponse = (await api.getMe()) as any;
      const rawUser = userResponse?.data?.user ?? userResponse?.data;

      if (!rawUser) {
        throw new Error('Login succeeded but user profile could not be loaded');
      }

      persistUser(normalizeUser(rawUser));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } finally {
      persistUser(null);
      setIsLoading(false);
    }
  }, []);

  // Compatibility method only; no real token storage anymore
  const setAuthData = useCallback((_token: string, nextUser: User) => {
    persistUser(nextUser);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    register,
    login,
    setAuthData,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
