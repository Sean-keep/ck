import { useState } from 'react';
import { Plus, Settings, X, ToggleLeft, ToggleRight, Trash2, Edit, Star } from 'lucide-react';
import { AlertRule, RuleType, AggregationType, Operator, Severity } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { getSeverityColor, getSeverityText, formatDateTime } from '../../utils/helpers';
import { MOCK_TABLES, MOCK_FIELDS } from '../../data/mockData';

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string }> = [
  { value: 'critical', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
  { value: 'info', label: '信息' },
];

const RULE_TYPE_OPTIONS: Array<{ value: RuleType; label: string }> = [
  { value: 'threshold', label: '阈值规则' },
  { value: 'aggregation', label: '聚合规则' },
  { value: 'scenario', label: '场景规则' },
];

const AGGREGATION_OPTIONS: Array<{ value: AggregationType; label: string }> = [
  { value: 'COUNT', label: 'COUNT - 计数' },
  { value: 'SUM', label: 'SUM - 求和' },
  { value: 'AVG', label: 'AVG - 平均值' },
  { value: 'MIN', label: 'MIN - 最小值' },
  { value: 'MAX', label: 'MAX - 最大值' },
];

const OPERATOR_OPTIONS: Array<{ value: Operator; label: string }> = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '==', label: '==' },
  { value: '!=', label: '!=' },
];

const defaultRuleForm: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  description: '',
  rule_type: 'threshold',
  table_name: '',
  group_by_field: '',
  aggregation_type: 'COUNT',
  operator: '>',
  threshold_value: 10,
  time_window_minutes: 5,
  severity: 'medium',
  alert_template: '',
  enabled: true,
  recommended_method_id: null,
};

export default function AlertRulesPage() {
  const { rules, setRules, resolutionMethods } = useApp();
  const { canWrite } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [ruleForm, setRuleForm] = useState(defaultRuleForm);

  const handleSaveRule = () => {
    if (!ruleForm.name || !ruleForm.table_name || !ruleForm.group_by_field) {
      alert('请填写必要字段：规则名称、数据表、分组字段');
      return;
    }

    if (editingRule) {
      setRules(rules.map(r =>
        r.id === editingRule.id
          ? { ...r, ...ruleForm, updated_at: new Date().toISOString() }
          : r
      ));
    } else {
      const newRule: AlertRule = {
        ...ruleForm,
        id: `rule-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setRules([...rules, newRule]);
    }

    setShowModal(false);
    setEditingRule(null);
    setRuleForm(defaultRuleForm);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除该规则吗？')) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  const handleToggle = (id: string) => {
    setRules(rules.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled, updated_at: new Date().toISOString() } : r
    ));
  };

  const openEditModal = (rule: AlertRule) => {
    setEditingRule(rule);
    setRuleForm(rule);
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingRule(null);
    setRuleForm(defaultRuleForm);
    setShowModal(true);
  };

  const activeRules = rules.filter(r => r.enabled).length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">告警规则</h1>
          <p className="text-gray-600 mt-2">管理系统中的所有告警检测规则</p>
        </div>
        {canWrite && (
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            <Plus className="w-4 h-4" />
            新建规则
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: '总规则数', value: rules.length, color: 'text-blue-600', bg: 'bg-blue-100', icon: Settings },
          { label: '已启用', value: activeRules, color: 'text-green-600', bg: 'bg-green-100', icon: ToggleRight },
          { label: '已禁用', value: rules.length - activeRules, color: 'text-gray-600', bg: 'bg-gray-100', icon: ToggleLeft },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
              <div className={`w-12 h-12 ${bg} rounded-full flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">规则列表</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">规则名称</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">类型</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">数据表</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">条件</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">严重程度</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">推荐处置</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">状态</th>
                {canWrite && <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">操作</th>}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const recommendedMethod = resolutionMethods.find(m => m.id === rule.recommended_method_id);
                return (
                  <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{rule.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        rule.rule_type === 'threshold' ? 'bg-blue-100 text-blue-700' :
                        rule.rule_type === 'aggregation' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {rule.rule_type === 'threshold' ? '阈值' : rule.rule_type === 'aggregation' ? '聚合' : '场景'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900 font-mono">{rule.table_name}</td>
                    <td className="py-4 px-4 text-sm">
                      <p className="font-mono text-gray-700">{rule.aggregation_type}({rule.group_by_field}) {rule.operator} {rule.threshold_value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">时间窗口: {rule.time_window_minutes}分钟</p>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: getSeverityColor(rule.severity) + '20', color: getSeverityColor(rule.severity) }}
                      >
                        {getSeverityText(rule.severity)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {recommendedMethod ? (
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs text-gray-700">{recommendedMethod.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">未设置</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => canWrite && handleToggle(rule.id)}
                        disabled={!canWrite}
                        className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${rule.enabled ? 'bg-green-500' : 'bg-gray-300'} ${!canWrite ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    {canWrite && (
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(rule)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRule ? '编辑告警规则' : '新建告警规则'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">规则名称 <span className="text-red-500">*</span></label>
                  <input
                    value={ruleForm.name}
                    onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                    placeholder="如：暴力破解登录检测"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                  <input
                    value={ruleForm.description}
                    onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                    placeholder="规则用途说明"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">规则类型</label>
                  <select
                    value={ruleForm.rule_type}
                    onChange={e => setRuleForm({ ...ruleForm, rule_type: e.target.value as RuleType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {RULE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">严重程度</label>
                  <select
                    value={ruleForm.severity}
                    onChange={e => setRuleForm({ ...ruleForm, severity: e.target.value as Severity })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">数据表 <span className="text-red-500">*</span></label>
                  <select
                    value={ruleForm.table_name}
                    onChange={e => setRuleForm({ ...ruleForm, table_name: e.target.value, group_by_field: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">选择数据表</option>
                    {MOCK_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分组字段 <span className="text-red-500">*</span></label>
                  <select
                    value={ruleForm.group_by_field}
                    onChange={e => setRuleForm({ ...ruleForm, group_by_field: e.target.value })}
                    disabled={!ruleForm.table_name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">选择字段</option>
                    {(MOCK_FIELDS[ruleForm.table_name] || []).map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">聚合类型</label>
                  <select
                    value={ruleForm.aggregation_type}
                    onChange={e => setRuleForm({ ...ruleForm, aggregation_type: e.target.value as AggregationType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {AGGREGATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">运算符</label>
                  <select
                    value={ruleForm.operator}
                    onChange={e => setRuleForm({ ...ruleForm, operator: e.target.value as Operator })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">阈值</label>
                  <input
                    type="number"
                    value={ruleForm.threshold_value}
                    onChange={e => setRuleForm({ ...ruleForm, threshold_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时间窗口（分钟）</label>
                  <input
                    type="number"
                    value={ruleForm.time_window_minutes}
                    onChange={e => setRuleForm({ ...ruleForm, time_window_minutes: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">告警内容模板</label>
                  <input
                    value={ruleForm.alert_template}
                    onChange={e => setRuleForm({ ...ruleForm, alert_template: e.target.value })}
                    placeholder="如：检测到来自 IP {ip_address} 的 {count} 次失败登录"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">支持变量：{'{count}'}, {'{value}'}, {'{time_window}'}, {'{table}'}, {'{group_by_field}'}</p>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <label className="text-sm font-medium text-gray-700">推荐处置方法</label>
                    <span className="text-xs text-gray-400">（每条规则只能设置一个推荐方法）</span>
                  </div>
                  <select
                    value={ruleForm.recommended_method_id || ''}
                    onChange={e => setRuleForm({ ...ruleForm, recommended_method_id: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">不设置推荐方法</option>
                    {resolutionMethods.map(m => (
                      <option key={m.id} value={m.id}>{m.name} — {m.alert_type}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setRuleForm({ ...ruleForm, enabled: !ruleForm.enabled })}
                      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors cursor-pointer ${ruleForm.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${ruleForm.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">启用规则</p>
                      <p className="text-xs text-gray-500">规则启用后将自动检测告警</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                取消
              </button>
              <button
                onClick={handleSaveRule}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
              >
                {editingRule ? '保存更改' : '创建规则'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
