import { pgTable, text, boolean, integer, real, jsonb } from 'drizzle-orm/pg-core';

// ── Users ───────────────────────────────────────────────────────────────────
export const ckUsers = pgTable('ck_users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  display_name: text('display_name').notNull(),
  role: text('role').notNull().default('viewer'),
  email: text('email').notNull().default(''),
  password: text('password').notNull().default(''),
  enabled: boolean('enabled').notNull().default(true),
  created_at: text('created_at').notNull(),
  last_login: text('last_login'),
});

export type CkUser = typeof ckUsers.$inferSelect;

// ── Alert Rules ─────────────────────────────────────────────────────────────
export const ckAlertRules = pgTable('ck_alert_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  rule_type: text('rule_type').notNull(),
  table_name: text('table_name').notNull(),
  group_by_field: text('group_by_field').notNull(),
  aggregation_type: text('aggregation_type').notNull().default('COUNT'),
  operator: text('operator').notNull().default('>'),
  threshold_value: real('threshold_value').notNull().default(0),
  time_window_minutes: integer('time_window_minutes').notNull().default(5),
  severity: text('severity').notNull().default('medium'),
  alert_template: text('alert_template').notNull().default(''),
  enabled: boolean('enabled').notNull().default(true),
  recommended_method_id: text('recommended_method_id'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export type CkAlertRule = typeof ckAlertRules.$inferSelect;

// ── Alerts ───────────────────────────────────────────────────────────────────
export const ckAlerts = pgTable('ck_alerts', {
  id: text('id').primaryKey(),
  rule_id: text('rule_id'),
  severity: text('severity').notNull().default('medium'),
  alert_type: text('alert_type').notNull(),
  status: text('status').notNull().default('active'),
  content: text('content').notNull().default(''),
  triggered_at: text('triggered_at').notNull(),
  resolved_at: text('resolved_at'),
  created_at: text('created_at').notNull(),
  resolution_method_id: text('resolution_method_id'),
  resolution_suggestion: text('resolution_suggestion').notNull().default(''),
});

export type CkAlert = typeof ckAlerts.$inferSelect;

// ── Resolution Methods ───────────────────────────────────────────────────────
export const ckResolutionMethods = pgTable('ck_resolution_methods', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  alert_type: text('alert_type').notNull().default(''),
  severity_range: jsonb('severity_range').notNull().default([]),
  steps: jsonb('steps').notNull().default([]),
  tags: jsonb('tags').notNull().default([]),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export type CkResolutionMethod = typeof ckResolutionMethods.$inferSelect;

// ── Settings (single row, id = 1) ────────────────────────────────────────────
export const ckSettings = pgTable('ck_settings', {
  id: integer('id').primaryKey().default(1),
  check_interval_minutes: integer('check_interval_minutes').notNull().default(1),
  notifications: boolean('notifications').notNull().default(true),
  sound_alerts: boolean('sound_alerts').notNull().default(false),
  auto_detect: boolean('auto_detect').notNull().default(false),
  updated_at: text('updated_at').notNull(),
});

export type CkSettings = typeof ckSettings.$inferSelect;

// ── ClickHouse Connection (single row, id = 1) ──────────────────────────────
export const ckConnection = pgTable('ck_connection', {
  id: integer('id').primaryKey().default(1),
  host: text('host').notNull().default('localhost'),
  port: integer('port').notNull().default(8123),
  database: text('database').notNull().default('default'),
  username: text('username').notNull().default('default'),
  password: text('password').notNull().default(''),
  updated_at: text('updated_at').notNull(),
});

export type CkConnection = typeof ckConnection.$inferSelect;
