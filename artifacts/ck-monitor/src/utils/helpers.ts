import { Severity, AlertStatus } from '../types';

export function getSeverityColor(severity: Severity): string {
  const colors = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
    info: '#6b7280',
  };
  return colors[severity];
}

export function getStatusColor(status: AlertStatus): string {
  const colors = {
    active: 'bg-red-100 text-red-800',
    acknowledged: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    suppressed: 'bg-gray-100 text-gray-800',
  };
  return colors[status];
}

export function getStatusText(status: AlertStatus): string {
  const texts = {
    active: '活跃',
    acknowledged: '已确认',
    resolved: '已解决',
    suppressed: '已抑制',
  };
  return texts[status];
}

export function getSeverityText(severity: Severity): string {
  const texts = {
    critical: '紧急',
    high: '高',
    medium: '中',
    low: '低',
    info: '信息',
  };
  return texts[severity];
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    return defaultValue;
  }
}
