import { useState } from 'react';
import { Plus, Settings, X, Trash2, Edit, Star, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { AlertRule, RuleType, AggregationType, Operator, Severity } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { getSeverityColor, getSeverityText } from '../../utils/helpers';
import { MOCK_TABLES, MOCK_FIELDS } from '../../data/mockData';

const PAGE_SIZE = 10;

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string }> = [
  { value: 'critical', label: '紧急' }, { value: 'high', label: '高' },
  { value: 'medium', label: '中' }, { value: 'low', label: '低' }, { value: 'info', label: '信息' },
];
const RULE_TYPE_OPTIONS: Array<{ value: RuleType; label: string }> = [
  { value: 'threshold', label: '阈值规则' }, { value: 'aggregation', label: '聚合规则' }, { value: 'scenario', label: '场景规则' },
];
const AGGREGATION_OPTIONS: Array<{ value: AggregationType; label: string }> = [
  { value: 'COUNT', label: 'COUNT' }, { value: 'SUM', label: 'SUM' },
  { value: 'AVG', label: 'AVG' }, { value: 'MIN', label: 'MIN' }, { value: 'MAX', label: 'MAX' },
];
const OPERATOR_OPTIONS: Array<{ value: Operator; label: string }> = [
  { value: '>', label: '>' }, { value: '<', label: '<' }, { value: '>=', label: '>=' },
  { value: '<=', label: '<=' }, { value: '==', label: '==' }, { value: '!=', label: '!=' },
];

type SortKey = 'name' | 'severity' | 'enabled' | 'created_at';
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const defaultForm: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'> = {
  name: '', description: '', rule_type: 'threshold', table_name: '', group_by_field: '',
  aggregation_type: 'COUNT', operator: '>', threshold_value: 10, time_window_minutes: 5,
  severity: 'medium', alert_template: '', enabled: true, recommended_method_id: null,
};

export default function AlertRulesPage() {
  const { rules, setRules, resolutionMethods } = useApp();
  const { canWrite } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [ruleForm, setRuleForm] = useState(defaultForm);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | Severity>('all');

  const filteredRules = rules.filter(r => {
    if (filterEnabled === 'enabled' && !r.enabled) return false;
    if (filterEnabled === 'disabled' && r.enabled) return false;
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    return true;
  });

  const sortedRules = [...filteredRules].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortKey === 'severity') cmp = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    else if (sortKey === 'enabled') cmp = Number(b.enabled) - Number(a.enabled);
    else cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedRules.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pagedRules = sortedRules.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startRow = (page - 1) * PAGE_SIZE + 1;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  const handleSaveRule = () => {
    if (!ruleForm.name || !ruleForm.table_name || !ruleForm.group_by_field) {
      alert('请填写规则名称、数据表和分组字段');
      return;
    }
    if (editingRule) {
      setRules(rules.map(r => r.id === editingRule.id ? { ...r, ...ruleForm, updated_at: new Date().toISOString() } : r));
    } else {
      setRules([...rules, { ...ruleForm, id: `rule-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
    }
    setShowModal(false);
    setEditingRule(null);
    setRuleForm(defaultForm);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除该规则吗？')) setRules(rules.filter(r => r.id !== id));
  };

  const handleToggle = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled, updated_at: new Date().toISOString() } : r));
  };

  const openEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setRuleForm(rule);
    setShowModal(true);
  };

  const activeCount = rules.filter(r => r.enabled).length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">告警规则</h1>
          <p className="text-gray-500 mt-1 text-sm">管理系统告警检测规则</p>
        </div>
        {canWrite && (
          <button onClick={() => { setEditingRule(null); setRuleForm(defaultForm); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
            <Plus className="w-4 h-4" />新建规则
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: '总规则数', value: rules.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { label: '已启用', value: activeCount, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
          { label: '已禁用', value: rules.length - activeCount, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-100' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters & table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 flex-wrap">
          <Settings className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">筛选：</span>
          <select value={filterEnabled} onChange={e => { setFilterEnabled(e.target.value as typeof filterEnabled); setCurrentPage(1); }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">全部状态</option>
            <option value="enabled">已启用</option>
            <option value="disabled">已禁用</option>
          </select>
          <select value={filterSeverity} onChange={e => { setFilterSeverity(e.target.value as typeof filterSeverity); setCurrentPage(1); }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">全部级别</option>
            {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="ml-auto text-xs text-gray-400">共 {filteredRules.length} 条，第 {page}/{totalPages} 页</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 w-10">#</th>
                <th className="text-left py-3 px-4">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-blue-600">
                    规则名称 <SortIcon k="name" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">类型</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">数据表</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">检测条件</th>
                <th className="text-left py-3 px-4">
                  <button onClick={() => handleSort('severity')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-blue-600">
                    级别 <SortIcon k="severity" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">推荐处置</th>
                <th className="text-left py-3 px-4">
                  <button onClick={() => handleSort('enabled')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-blue-600">
                    状态 <SortIcon k="enabled" />
                  </button>
                </th>
                {canWrite && <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">操作</th>}
              </tr>
            </thead>
            <tbody>
              {pagedRules.length === 0 && (
                <tr><td colSpan={9} className="py-16 text-center text-gray-400">暂无匹配的告警规则</td></tr>
              )}
              {pagedRules.map((rule, i) => {
                const recMethod = resolutionMethods.find(m => m.id === rule.recommended_method_id);
                return (
                  <tr key={rule.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 text-center text-xs font-mono text-gray-400 select-none">{startRow + i}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-900">{rule.name}</p>
                      {rule.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{rule.description}</p>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        rule.rule_type === 'threshold' ? 'bg-blue-100 text-blue-700' :
                        rule.rule_type === 'aggregation' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {rule.rule_type === 'threshold' ? '阈值' : rule.rule_type === 'aggregation' ? '聚合' : '场景'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-700">{rule.table_name}</td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-mono text-gray-700">{rule.aggregation_type}({rule.group_by_field}) {rule.operator} {rule.threshold_value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">窗口: {rule.time_window_minutes}分钟</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: getSeverityColor(rule.severity) + '20', color: getSeverityColor(rule.severity) }}>
                        {getSeverityText(rule.severity)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {recMethod ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400 flex-shrink-0" />
                          <span className="text-xs text-gray-700 truncate max-w-[120px]">{recMethod.name}</span>
                        </div>
                      ) : <span className="text-xs text-gray-300">未设置</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => canWrite && handleToggle(rule.id)}
                        disabled={!canWrite}
                        className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${rule.enabled ? 'bg-green-500' : 'bg-gray-300'} ${!canWrite ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    {canWrite && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEdit(rule)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              显示 {startRow}–{Math.min(page * PAGE_SIZE, filteredRules.length)} 条，共 {filteredRules.length} 条
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setCurrentPage(p => p - 1)}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 text-gray-600 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded text-xs font-medium transition ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-600'}`}>
                  {p}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 text-gray-600 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-gray-900">{editingRule ? '编辑告警规则' : '新建告警规则'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">规则名称 *</label>
                <input value={ruleForm.name} onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="如：暴力破解登录检测"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">描述</label>
                <input value={ruleForm.description} onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                  placeholder="规则用途说明"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">规则类型</label>
                  <select value={ruleForm.rule_type} onChange={e => setRuleForm({ ...ruleForm, rule_type: e.target.value as RuleType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {RULE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">严重程度</label>
                  <select value={ruleForm.severity} onChange={e => setRuleForm({ ...ruleForm, severity: e.target.value as Severity })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">数据表 *</label>
                  <select value={ruleForm.table_name} onChange={e => setRuleForm({ ...ruleForm, table_name: e.target.value, group_by_field: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">选择数据表</option>
                    {MOCK_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">分组字段 *</label>
                  <select value={ruleForm.group_by_field} onChange={e => setRuleForm({ ...ruleForm, group_by_field: e.target.value })}
                    disabled={!ruleForm.table_name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                    <option value="">选择字段</option>
                    {(MOCK_FIELDS[ruleForm.table_name] || []).map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">聚合函数</label>
                  <select value={ruleForm.aggregation_type} onChange={e => setRuleForm({ ...ruleForm, aggregation_type: e.target.value as AggregationType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {AGGREGATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">运算符</label>
                  <select value={ruleForm.operator} onChange={e => setRuleForm({ ...ruleForm, operator: e.target.value as Operator })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">阈值</label>
                  <input type="number" value={ruleForm.threshold_value} onChange={e => setRuleForm({ ...ruleForm, threshold_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">时间窗口（分钟）</label>
                  <input type="number" value={ruleForm.time_window_minutes} onChange={e => setRuleForm({ ...ruleForm, time_window_minutes: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">告警内容模板</label>
                <input value={ruleForm.alert_template} onChange={e => setRuleForm({ ...ruleForm, alert_template: e.target.value })}
                  placeholder="如：检测到来自 {group_by_field} 的 {count} 次失败登录"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">推荐处置方法</label>
                  <span className="text-xs text-gray-400 font-normal">（每条规则只能设置一个）</span>
                </div>
                <select value={ruleForm.recommended_method_id || ''} onChange={e => setRuleForm({ ...ruleForm, recommended_method_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">不设置推荐方法</option>
                  {resolutionMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setRuleForm({ ...ruleForm, enabled: !ruleForm.enabled })}
                    className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors cursor-pointer ${ruleForm.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${ruleForm.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm text-gray-700">启用规则</span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition">取消</button>
              <button onClick={handleSaveRule} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
                {editingRule ? '保存更改' : '创建规则'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
