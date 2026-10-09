// ─── Authentication Context & Session Provider ───
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser, UserRole } from '@/types';

interface LoginCredentials {
  role: UserRole;
  name?: string;
  phone?: string;
  registrationNumber?: string;
  key?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserRegistration: (registrationNumber: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('mediroute_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // Sync admin token with existing moderator key storage
  useEffect(() => {
    try {
      if (user && user.role === 'admin' && user.token) {
        localStorage.setItem('mediroute_mod_key', user.token);
      } else if (!user) {
        localStorage.removeItem('mediroute_user');
      }
    } catch {
      // Ignore localStorage issues in private windows
    }
  }, [user]);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        return { success: false, error: data.error || 'Authentication failed' };
      }

      const authenticatedUser: AuthUser = {
        role: data.user.role,
        name: data.user.name,
        phone: data.user.phone,
        registrationNumber: data.user.registrationNumber,
        token: data.token,
      };

      setUser(authenticatedUser);
      localStorage.setItem('mediroute_user', JSON.stringify(authenticatedUser));
      if (authenticatedUser.role === 'admin' && authenticatedUser.token) {
        localStorage.setItem('mediroute_mod_key', authenticatedUser.token);
      }
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Network connection failed' };
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('mediroute_user');
      localStorage.removeItem('mediroute_mod_key');
    } catch {
      // Ignore
    }
  };

  const updateUserRegistration = (registrationNumber: string) => {
    if (user && user.role === 'driver') {
      const updated = { ...user, registrationNumber };
      setUser(updated);
      try {
        localStorage.setItem('mediroute_user', JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUserRegistration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
