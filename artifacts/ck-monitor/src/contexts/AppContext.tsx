import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AlertRule, Alert, ResolutionMethod, ClickHouseConnection, SystemSettings } from '../types';

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

interface AppContextType {
  rules: AlertRule[];
  setRules: (rules: AlertRule[]) => void;
  updateRule: (id: string, patch: Partial<AlertRule>) => Promise<void>;
  createRule: (rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;

  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  updateAlert: (id: string, patch: Partial<Alert>) => Promise<void>;
  addAlerts: (newAlerts: Alert[]) => Promise<void>;

  resolutionMethods: ResolutionMethod[];
  setResolutionMethods: (methods: ResolutionMethod[]) => void;
  createMethod: (m: Omit<ResolutionMethod, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => Promise<void>;
  updateMethod: (id: string, patch: Partial<ResolutionMethod>) => Promise<void>;
  deleteMethod: (id: string) => Promise<void>;

  connection: ClickHouseConnection;
  setConnection: (conn: ClickHouseConnection) => void;

  demoMode: boolean;
  setDemoMode: (v: boolean) => void;

  settings: SystemSettings;
  setSettings: (s: SystemSettings) => void;

  loading: boolean;
  reload: () => void;
}

const DEFAULT_CONNECTION: ClickHouseConnection = {
  host: 'localhost', port: 8123, database: 'default', username: 'default', password: '',
};
const DEFAULT_SETTINGS: SystemSettings = {
  checkIntervalMinutes: 1, notifications: true, soundAlerts: false, autoDetect: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [rules, setRulesState] = useState<AlertRule[]>([]);
  const [alerts, setAlertsState] = useState<Alert[]>([]);
  const [resolutionMethods, setMethodsState] = useState<ResolutionMethod[]>([]);
  const [connection, setConnectionState] = useState<ClickHouseConnection>(DEFAULT_CONNECTION);
  const [settings, setSettingsState] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [demoMode, setDemoModeState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<AlertRule[]>('/rules'),
      apiFetch<Alert[]>('/alerts'),
      apiFetch<ResolutionMethod[]>('/methods'),
      apiFetch<ClickHouseConnection>('/connection'),
      apiFetch<SystemSettings>('/settings'),
    ]).then(([r, a, m, c, s]) => {
      setRulesState(r);
      setAlertsState([...a].sort((x, y) => new Date(y.triggered_at).getTime() - new Date(x.triggered_at).getTime()));
      setMethodsState(m);
      setConnectionState(c);
      setSettingsState(s);
    }).catch(console.error).finally(() => setLoading(false));
  }, [tick]);

  // Rules
  const setRules = async (newRules: AlertRule[]) => {
    setRulesState(newRules);
  };

  const createRule = async (rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>) => {
    const { id } = await apiFetch<{ id: string }>('/rules', {
      method: 'POST', body: JSON.stringify(rule),
    });
    const now = new Date().toISOString();
    setRulesState(prev => [...prev, { ...rule, id, created_at: now, updated_at: now }]);
  };

  const updateRule = async (id: string, patch: Partial<AlertRule>) => {
    await apiFetch(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    setRulesState(prev => prev.map(r => r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r));
  };

  const deleteRule = async (id: string) => {
    await apiFetch(`/rules/${id}`, { method: 'DELETE' });
    setRulesState(prev => prev.filter(r => r.id !== id));
  };

  // Alerts
  const setAlerts = async (newAlerts: Alert[]) => {
    setAlertsState(newAlerts);
    // Persist any changed alerts
    for (const a of newAlerts) {
      const old = alerts.find(x => x.id === a.id);
      if (old && JSON.stringify(old) !== JSON.stringify(a)) {
        await apiFetch(`/alerts/${a.id}`, { method: 'PUT', body: JSON.stringify(a) }).catch(() => {});
      }
    }
  };

  const updateAlert = async (id: string, patch: Partial<Alert>) => {
    await apiFetch(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    setAlertsState(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  const addAlerts = async (newAlerts: Alert[]) => {
    await apiFetch('/alerts/bulk', { method: 'POST', body: JSON.stringify({ alerts: newAlerts }) });
    setAlertsState(prev => [...newAlerts, ...prev]);
  };

  // Resolution Methods
  const setResolutionMethods = (methods: ResolutionMethod[]) => setMethodsState(methods);

  const createMethod = async (m: Omit<ResolutionMethod, 'created_at' | 'updated_at'> & { id?: string }) => {
    const { id } = await apiFetch<{ id: string }>('/methods', {
      method: 'POST', body: JSON.stringify(m),
    });
    const now = new Date().toISOString();
    setMethodsState(prev => [...prev, { ...m, id, created_at: now, updated_at: now }]);
  };

  const updateMethod = async (id: string, patch: Partial<ResolutionMethod>) => {
    await apiFetch(`/methods/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    setMethodsState(prev => prev.map(m => m.id === id ? { ...m, ...patch, updated_at: new Date().toISOString() } : m));
  };

  const deleteMethod = async (id: string) => {
    await apiFetch(`/methods/${id}`, { method: 'DELETE' });
    setMethodsState(prev => prev.filter(m => m.id !== id));
  };

  // Connection
  const setConnection = async (conn: ClickHouseConnection) => {
    setConnectionState(conn);
    await apiFetch('/connection', { method: 'PUT', body: JSON.stringify(conn) }).catch(() => {});
  };

  // Settings
  const setSettings = async (s: SystemSettings) => {
    setSettingsState(s);
    await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(s) }).catch(() => {});
  };

  // Demo mode stays client-side only
  const setDemoMode = (v: boolean) => setDemoModeState(v);

  return (
    <AppContext.Provider value={{
      rules, setRules, updateRule, createRule, deleteRule,
      alerts, setAlerts, updateAlert, addAlerts,
      resolutionMethods, setResolutionMethods, createMethod, updateMethod, deleteMethod,
      connection, setConnection,
      demoMode, setDemoMode,
      settings, setSettings,
      loading, reload,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
