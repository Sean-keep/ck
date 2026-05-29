import { Severity, Alert, AlertRule, ResolutionMethod, AppUser } from '../types';

export const MOCK_TABLES = [
  'events',
  'logs',
  'metrics',
  'user_actions',
  'api_requests',
  'errors',
];

export const MOCK_FIELDS: { [key: string]: string[] } = {
  events: ['event_type', 'user_id', 'timestamp', 'ip_address', 'status'],
  logs: ['level', 'message', 'source', 'timestamp', 'service'],
  metrics: ['metric_name', 'value', 'host', 'timestamp', 'tags'],
  user_actions: ['action', 'user_id', 'session_id', 'timestamp', 'result'],
  api_requests: ['endpoint', 'method', 'status_code', 'response_time', 'timestamp'],
  errors: ['error_type', 'error_message', 'stack_trace', 'timestamp', 'service'],
};

export const DEFAULT_RULES: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: '暴力破解登录检测',
    description: '检测短时间内大量失败的登录尝试',
    rule_type: 'threshold',
    table_name: 'user_actions',
    group_by_field: 'ip_address',
    aggregation_type: 'COUNT',
    operator: '>',
    threshold_value: 10,
    time_window_minutes: 5,
    severity: 'critical',
    alert_template: '检测到来自 IP {ip_address} 的 {count} 次失败登录尝试',
    enabled: true,
    recommended_method_id: 'method-1',
  },
  {
    name: '应用错误监控',
    description: '监控应用错误数量，超过阈值时触发告警',
    rule_type: 'threshold',
    table_name: 'errors',
    group_by_field: 'service',
    aggregation_type: 'COUNT',
    operator: '>',
    threshold_value: 100,
    time_window_minutes: 10,
    severity: 'high',
    alert_template: '服务 {service} 在过去 {time_window} 分钟内产生 {count} 个错误',
    enabled: true,
    recommended_method_id: 'method-2',
  },
  {
    name: '异常登录行为检测',
    description: '检测地理位置异常的登录行为',
    rule_type: 'scenario',
    table_name: 'events',
    group_by_field: 'user_id',
    aggregation_type: 'COUNT',
    operator: '>',
    threshold_value: 3,
    time_window_minutes: 10,
    severity: 'high',
    alert_template: '用户 {user_id} 从多个异常位置登录',
    enabled: true,
    recommended_method_id: 'method-3',
  },
  {
    name: '密码验证失败聚合',
    description: '聚合密码验证失败事件',
    rule_type: 'aggregation',
    table_name: 'events',
    group_by_field: 'user_id',
    aggregation_type: 'COUNT',
    operator: '>',
    threshold_value: 5,
    time_window_minutes: 15,
    severity: 'medium',
    alert_template: '用户 {user_id} 密码验证失败 {count} 次',
    enabled: true,
    recommended_method_id: 'method-5',
  },
  {
    name: 'API 响应时间监控',
    description: '监控API响应时间，超过阈值时触发告警',
    rule_type: 'threshold',
    table_name: 'api_requests',
    group_by_field: 'endpoint',
    aggregation_type: 'AVG',
    operator: '>',
    threshold_value: 2000,
    time_window_minutes: 5,
    severity: 'medium',
    alert_template: '端点 {endpoint} 平均响应时间 {value}ms 超过阈值',
    enabled: true,
    recommended_method_id: 'method-4',
  },
];

const SEVERITY_WEIGHTS: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export function generateMockAlerts(count: number): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const severity = SEVERITY_WEIGHTS[Math.floor(Math.random() * SEVERITY_WEIGHTS.length)];
    const status: Alert['status'] = Math.random() > 0.3 ? 'active' :
      Math.random() > 0.5 ? 'acknowledged' : 'resolved';

    const triggeredAt = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
    const alertType = DEFAULT_RULES[Math.floor(Math.random() * DEFAULT_RULES.length)].name;

    alerts.push({
      id: `alert-${i + 1}`,
      rule_id: `rule-${Math.floor(Math.random() * 5) + 1}`,
      severity,
      alert_type: alertType,
      status,
      content: `告警消息 #${i + 1}: 检测到异常行为，请及时处理。详情：${alertType}触发，需要立即关注。`,
      triggered_at: triggeredAt.toISOString(),
      resolved_at: status === 'resolved' ? new Date(triggeredAt.getTime() + Math.random() * 3600000).toISOString() : null,
      created_at: triggeredAt.toISOString(),
      resolution_method_id: status === 'resolved' ? `method-${Math.floor(Math.random() * 5) + 1}` : null,
      resolution_suggestion: generateResolutionSuggestion(alertType, severity),
    });
  }

  return alerts.sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
}

function generateResolutionSuggestion(alertType: string, _severity: Severity): string {
  const suggestions: { [key: string]: string[] } = {
    '暴力破解登录检测': [
      '1. 立即封禁攻击源IP地址\n2. 通知安全团队进行溯源分析\n3. 强制相关账号修改密码\n4. 检查是否有多账号被锁定',
    ],
    '应用错误监控': [
      '1. 检查应用日志定位错误原因\n2. 查看最近的代码部署记录\n3. 评估是否需要回滚版本\n4. 通知开发团队修复',
    ],
    '异常登录行为检测': [
      '1. 联系账户所有者确认登录行为\n2. 检查登录位置是否异常\n3. 启用额外的身份验证\n4. 记录事件以供后续审计',
    ],
  };

  const specificSuggestions = suggestions[alertType] || [
    '1. 检查相关数据和日志\n2. 评估影响范围\n3. 采取适当的处置措施\n4. 记录处理过程',
  ];

  return specificSuggestions[0];
}

export const DEFAULT_RESOLUTION_METHODS: Omit<ResolutionMethod, 'created_at' | 'updated_at'>[] = [
  {
    id: 'method-1',
    name: '暴力破解应急处置',
    description: '针对暴力破解攻击的标准处置流程',
    alert_type: '暴力破解登录检测',
    severity_range: ['critical', 'high'],
    steps: [
      '立即封禁攻击源IP地址',
      '检查受影响账户列表',
      '通知安全团队进行溯源分析',
      '强制相关账号修改密码',
      '评估账户安全状态',
      '记录事件详情和处理过程',
    ],
    tags: ['安全', '登录', '暴力破解', 'IP封禁'],
  },
  {
    id: 'method-2',
    name: '应用错误排查',
    description: '应用错误快速定位和修复流程',
    alert_type: '应用错误监控',
    severity_range: ['high', 'medium'],
    steps: [
      '收集错误日志和堆栈信息',
      '检查最近的代码变更记录',
      '评估系统资源使用情况',
      '确认依赖服务状态',
      '决定是否需要回滚',
      '通知开发团队修复',
    ],
    tags: ['应用', '错误', '日志', '回滚'],
  },
  {
    id: 'method-3',
    name: '账户异常处理',
    description: '异常登录行为的处理标准',
    alert_type: '异常登录行为检测',
    severity_range: ['critical', 'high'],
    steps: [
      '联系账户所有者确认',
      '查看登录历史和位置',
      '验证设备信息',
      '如有必要冻结账户',
      '重置认证凭证',
      '启用多因素认证',
    ],
    tags: ['账户', '登录', '身份验证', '安全'],
  },
  {
    id: 'method-4',
    name: 'API故障处理',
    description: 'API响应异常的标准处理流程',
    alert_type: 'API 响应时间监控',
    severity_range: ['medium', 'low'],
    steps: [
      '检查API服务器负载',
      '分析慢查询日志',
      '检查数据库连接池',
      '评估是否需要扩容',
      '优化慢查询',
      '重启服务（如有必要）',
    ],
    tags: ['API', '性能', '数据库', '优化'],
  },
  {
    id: 'method-5',
    name: '密码安全处理',
    description: '密码相关安全事件处置',
    alert_type: '密码验证失败聚合',
    severity_range: ['medium', 'low'],
    steps: [
      '检查失败验证模式',
      '联系用户确认操作',
      '强制密码重置',
      '更新密码策略',
      '启用账户锁定机制',
      '教育用户密码安全',
    ],
    tags: ['密码', '安全', '验证', '账户'],
  },
];

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-1',
    username: 'admin',
    displayName: '系统管理员',
    role: 'admin',
    email: 'admin@example.com',
    enabled: true,
    createdAt: new Date('2024-01-01').toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'user-2',
    username: 'operator',
    displayName: '运维工程师',
    role: 'operator',
    email: 'operator@example.com',
    enabled: true,
    createdAt: new Date('2024-01-15').toISOString(),
    lastLogin: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'user-3',
    username: 'viewer',
    displayName: '只读用户',
    role: 'viewer',
    email: 'viewer@example.com',
    enabled: true,
    createdAt: new Date('2024-02-01').toISOString(),
    lastLogin: null,
  },
];

export function generateMockQueryResult(config: {
  groupByField: string;
  aggregationType: string;
  limit: number;
}): Array<{ [key: string]: string | number }> {
  const results: Array<{ [key: string]: string | number }> = [];

  for (let i = 0; i < config.limit; i++) {
    results.push({
      [config.groupByField]: `group_${i + 1}`,
      value: Math.floor(Math.random() * 1000) + 10,
    });
  }

  return results;
}

export function generateAlertTrendData(): Array<{ time: string; count: number }> {
  const data: Array<{ time: string; count: number }> = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      time: `${hour.getHours()}:00`,
      count: Math.floor(Math.random() * 50) + 5,
    });
  }

  return data;
}

export function generateSeverityDistribution(): { [key in Severity]: number } {
  return {
    critical: Math.floor(Math.random() * 10) + 2,
    high: Math.floor(Math.random() * 20) + 5,
    medium: Math.floor(Math.random() * 30) + 10,
    low: Math.floor(Math.random() * 25) + 5,
    info: Math.floor(Math.random() * 15) + 3,
  };
}
