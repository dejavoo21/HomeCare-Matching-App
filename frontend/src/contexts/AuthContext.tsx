import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole, AuthToken } from '../types/index';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
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
  setAuthData: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user from localStorage if available
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );
  const [isLoading, setIsLoading] = useState(false);

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
        const response = await api.register(name, email, password, role, location) as any;
        setUser(response?.data);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = (await api.login(email, password)) as any;
      const authToken: AuthToken = response?.data;
      api.setToken(authToken.token);
      setToken(authToken.token);

      // Fetch user details
      const userResponse = (await api.getMe()) as any;
      setUser(userResponse?.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.clearTokens();
    setToken(null);
    setUser(null);
  }, []);

  const setAuthData = useCallback((token: string, user: User) => {
    api.setToken(token);
    setToken(token);
    setUser(user);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    register,
    login,
    setAuthData,
    logout,
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
