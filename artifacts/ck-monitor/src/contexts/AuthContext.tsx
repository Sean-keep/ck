import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, UserRole } from '../types';

const API = '/api';

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json();
}

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
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUser: (u: { username: string; displayName: string; role: UserRole; email: string; password: string }) => Promise<void>;
  updateUser: (id: string, patch: Partial<AppUser & { password?: string }>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  setUsers: (users: AppUser[]) => void;
  reloadUsers: () => Promise<void>;
  canWrite: boolean;
  canAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_KEY = 'ck_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [users, setUsersState] = useState<AppUser[]>([]);

  const fetchUsers = async () => {
    try {
      const list = await apiFetch<Array<{
        id: string; username: string; displayName: string; role: string;
        email: string; enabled: boolean; createdAt: string; lastLogin: string | null;
      }>>('/users');
      setUsersState(list.map(u => ({
        id: u.id, username: u.username, displayName: u.displayName,
        role: u.role as UserRole, email: u.email, enabled: u.enabled,
        createdAt: u.createdAt, lastLogin: u.lastLogin,
      })));
    } catch { /* silent – not logged in yet */ }
  };

  useEffect(() => { fetchUsers(); }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await apiFetch<{ id: string; username: string; displayName: string; role: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      const authUser: AuthUser = {
        id: data.id,
        username: data.username,
        displayName: data.displayName,
        role: data.role as UserRole,
        isAuthenticated: true,
      };
      setUser(authUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
      await fetchUsers();
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const createUser = async (u: { username: string; displayName: string; role: UserRole; email: string; password: string }) => {
    await apiFetch('/users', { method: 'POST', body: JSON.stringify(u) });
    await fetchUsers();
  };

  const updateUser = async (id: string, patch: Partial<AppUser & { password?: string }>) => {
    await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    await fetchUsers();
  };

  const deleteUser = async (id: string) => {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    await fetchUsers();
  };

  const setUsers = (newUsers: AppUser[]) => setUsersState(newUsers);

  const reloadUsers = fetchUsers;

  const canWrite = user?.role === 'admin' || user?.role === 'operator';
  const canAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, users, login, logout, createUser, updateUser, deleteUser, setUsers, reloadUsers, canWrite, canAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
