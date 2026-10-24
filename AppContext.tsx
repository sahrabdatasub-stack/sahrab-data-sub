import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../utils/api.ts';

export type PositionCode = 'FOUNDER_SUPER_ADMIN' | 'ADMIN' | 'STATE_MANAGER' | 'TEAM_LEADER' | 'AGENT' | 'CUSTOMER';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  position: PositionCode;
  assignedTeam?: string | null;
  supervisorId?: string | null;
  supervisorName?: string | null;
  stateRegion?: string | null;
  appointedAt?: string | null;
  walletBalance: string;
  commissionBalance: string;
  kycStatus: string;
  status: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  canManagePositions: boolean;
  canViewGlobalDirectory: boolean;
  isCeo: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sahrab_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await authApi.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to load fresh user record:', err);
      // If token expired, log out
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('sahrab_auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setActiveTab('home');
    showToast(`Welcome back, ${newUser.fullName}! Position: ${newUser.position.replace(/_/g, ' ')}`, 'success');
  };

  const logout = () => {
    localStorage.removeItem('sahrab_auth_token');
    setToken(null);
    setUser(null);
    setActiveTab('home');
    showToast('Signed out successfully.', 'info');
  };

  // Position & Directory permission checks
  const canManagePositions = user ? ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'STATE_MANAGER'].includes(user.position) : false;
  const canViewGlobalDirectory = user ? ['FOUNDER_SUPER_ADMIN', 'ADMIN', 'STATE_MANAGER', 'TEAM_LEADER', 'AGENT'].includes(user.position) : false;
  const isCeo = user?.position === 'FOUNDER_SUPER_ADMIN';

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        activeTab,
        setActiveTab,
        toasts,
        showToast,
        removeToast,
        login,
        logout,
        refreshUser,
        canManagePositions,
        canViewGlobalDirectory,
        isCeo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
