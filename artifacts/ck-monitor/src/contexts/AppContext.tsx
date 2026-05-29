import { createContext, useContext, useState, ReactNode } from 'react';
import { AlertRule, Alert, ResolutionMethod, ClickHouseConnection, SystemSettings } from '../types';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/helpers';
import { DEFAULT_RULES, generateMockAlerts, DEFAULT_RESOLUTION_METHODS } from '../data/mockData';

interface AppContextType {
  rules: AlertRule[];
  setRules: (rules: AlertRule[]) => void;
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  resolutionMethods: ResolutionMethod[];
  setResolutionMethods: (methods: ResolutionMethod[]) => void;
  connection: ClickHouseConnection;
  setConnection: (conn: ClickHouseConnection) => void;
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  settings: SystemSettings;
  setSettings: (s: SystemSettings) => void;
}

const DEFAULT_CONNECTION: ClickHouseConnection = {
  host: 'localhost',
  port: 8123,
  database: 'default',
  username: 'default',
  password: '',
};

const DEFAULT_SETTINGS: SystemSettings = {
  checkIntervalMinutes: 1,
  notifications: true,
  soundAlerts: false,
  autoDetect: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [rules, setRulesState] = useState<AlertRule[]>(() =>
    loadFromLocalStorage<AlertRule[]>('ck_rules', DEFAULT_RULES.map((r, i) => ({
      ...r,
      id: `rule-${i + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })))
  );

  const [alerts, setAlertsState] = useState<Alert[]>(() =>
    loadFromLocalStorage<Alert[]>('ck_alerts', generateMockAlerts(50))
  );

  const [resolutionMethods, setMethodsState] = useState<ResolutionMethod[]>(() =>
    loadFromLocalStorage<ResolutionMethod[]>('ck_methods', DEFAULT_RESOLUTION_METHODS.map(m => ({
      ...m,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })))
  );

  const [connection, setConnectionState] = useState<ClickHouseConnection>(() =>
    loadFromLocalStorage<ClickHouseConnection>('ck_connection', DEFAULT_CONNECTION)
  );

  const [demoMode, setDemoModeState] = useState<boolean>(() =>
    loadFromLocalStorage<boolean>('ck_demo_mode', false)
  );

  const [settings, setSettingsState] = useState<SystemSettings>(() =>
    loadFromLocalStorage<SystemSettings>('ck_settings', DEFAULT_SETTINGS)
  );

  const setRules = (rules: AlertRule[]) => {
    setRulesState(rules);
    saveToLocalStorage('ck_rules', rules);
  };

  const setAlerts = (alerts: Alert[]) => {
    setAlertsState(alerts);
    saveToLocalStorage('ck_alerts', alerts);
  };

  const setResolutionMethods = (methods: ResolutionMethod[]) => {
    setMethodsState(methods);
    saveToLocalStorage('ck_methods', methods);
  };

  const setConnection = (conn: ClickHouseConnection) => {
    setConnectionState(conn);
    saveToLocalStorage('ck_connection', conn);
  };

  const setDemoMode = (v: boolean) => {
    setDemoModeState(v);
    saveToLocalStorage('ck_demo_mode', v);
  };

  const setSettings = (s: SystemSettings) => {
    setSettingsState(s);
    saveToLocalStorage('ck_settings', s);
  };

  return (
    <AppContext.Provider value={{
      rules, setRules,
      alerts, setAlerts,
      resolutionMethods, setResolutionMethods,
      connection, setConnection,
      demoMode, setDemoMode,
      settings, setSettings,
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
