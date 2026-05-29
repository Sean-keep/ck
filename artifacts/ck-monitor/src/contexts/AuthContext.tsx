import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, UserRole } from '../types';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/helpers';
import { DEFAULT_USERS } from '../data/mockData';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  users: AppUser[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setUsers: (users: AppUser[]) => void;
  canWrite: boolean;
  canAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PASSWORDS: Record<string, string> = {
  admin: 'admin123',
  operator: 'oper123',
  viewer: 'view123',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsersState] = useState<AppUser[]>(() =>
    loadFromLocalStorage<AppUser[]>('ck_users', DEFAULT_USERS)
  );

  useEffect(() => {
    const savedUser = loadFromLocalStorage<AuthUser | null>('ck_current_user', null);
    if (savedUser?.isAuthenticated) {
      setUser(savedUser);
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const appUser = users.find(u => u.username === username && u.enabled);
    if (!appUser) return false;

    const expectedPassword = PASSWORDS[username] || 'admin123';
    if (password !== expectedPassword) return false;

    const authUser: AuthUser = {
      id: appUser.id,
      username: appUser.username,
      displayName: appUser.displayName,
      role: appUser.role,
      isAuthenticated: true,
    };
    setUser(authUser);
    saveToLocalStorage('ck_current_user', authUser);

    const updatedUsers = users.map(u =>
      u.id === appUser.id ? { ...u, lastLogin: new Date().toISOString() } : u
    );
    setUsersState(updatedUsers);
    saveToLocalStorage('ck_users', updatedUsers);

    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ck_current_user');
  };

  const setUsers = (newUsers: AppUser[]) => {
    setUsersState(newUsers);
    saveToLocalStorage('ck_users', newUsers);
  };

  const canWrite = user?.role === 'admin' || user?.role === 'operator';
  const canAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, users, login, logout, setUsers, canWrite, canAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
