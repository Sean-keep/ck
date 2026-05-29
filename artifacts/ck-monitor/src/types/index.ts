export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';
export type RuleType = 'threshold' | 'aggregation' | 'scenario';
export type AggregationType = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
export type Operator = '>' | '<' | '>=' | '<=' | '==' | '!=';
export type UserRole = 'admin' | 'operator' | 'viewer';

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  email: string;
  enabled: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  rule_type: RuleType;
  table_name: string;
  group_by_field: string;
  aggregation_type: AggregationType;
  operator: Operator;
  threshold_value: number;
  time_window_minutes: number;
  severity: Severity;
  alert_template: string;
  enabled: boolean;
  recommended_method_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  rule_id: string | null;
  severity: Severity;
  alert_type: string;
  status: AlertStatus;
  content: string;
  triggered_at: string;
  resolved_at: string | null;
  created_at: string;
  resolution_method_id: string | null;
  resolution_suggestion: string;
}

export interface AlertHandlingHistory {
  id: string;
  alert_id: string;
  action: 'acknowledged' | 'resolved' | 'suppressed' | 'reopened' | 'note';
  note: string;
  solution: string;
  created_at: string;
  resolution_method_id: string | null;
}

export interface ResolutionMethod {
  id: string;
  name: string;
  description: string;
  alert_type: string;
  severity_range: Severity[];
  steps: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ClickHouseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface SystemSettings {
  checkIntervalMinutes: number;
  notifications: boolean;
  soundAlerts: boolean;
  autoDetect: boolean;
}

export interface QueryConfig {
  tableName: string;
  groupByField: string;
  aggregationType: AggregationType;
  timeWindowMinutes: number;
  filterCondition: string;
  orderBy: 'asc' | 'desc';
  limit: number;
}

export interface QueryResult {
  data: Array<{ [key: string]: string | number }>;
  duration: number;
  rowCount: number;
  error?: string;
}
