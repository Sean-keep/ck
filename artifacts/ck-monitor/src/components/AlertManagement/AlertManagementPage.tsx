import { useState, useEffect } from 'react';
import {
  RefreshCw, X, Check, AlertCircle, AlertTriangle, Book, History,
  Lightbulb, Clock, ChevronDown, ChevronRight, ChevronLeft, ChevronUp
} from 'lucide-react';
import { Alert, Severity, AlertStatus, ResolutionMethod } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { getSeverityColor, getSeverityText, getStatusColor, getStatusText, formatDateTime } from '../../utils/helpers';
import { generateMockAlerts } from '../../data/mockData';

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string }> = [
  { value: 'critical', label: '紧急' }, { value: 'high', label: '高' },
  { value: 'medium', label: '中' }, { value: 'low', label: '低' }, { value: 'info', label: '信息' },
];
const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const GROUP_PAGE_SIZE = 8;
const INNER_PAGE_SIZE = 8;

type SortKey = 'severity' | 'triggered_at' | 'status';

interface AlertGroup {
  alert_type: string;
  alerts: Alert[];
  maxSeverity: Severity;
  activeCount: number;
  resolvedCount: number;
  latestAt: string;
}

function groupAlerts(alerts: Alert[]): AlertGroup[] {
  const map = new Map<string, Alert[]>();
  for (const a of alerts) {
    const list = map.get(a.alert_type) || [];
    list.push(a);
    map.set(a.alert_type, list);
  }
  const rank = (s: Severity) => SEVERITY_ORDER.indexOf(s);
  return Array.from(map.entries()).map(([alert_type, list]) => ({
    alert_type,
    alerts: [...list].sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()),
    maxSeverity: list.reduce<Severity>((m, a) => rank(a.severity) < rank(m) ? a.severity : m, 'info'),
    activeCount: list.filter(a => a.status === 'active').length,
    resolvedCount: list.filter(a => a.status === 'resolved').length,
    latestAt: list.reduce((m, a) => a.triggered_at > m ? a.triggered_at : m, ''),
  })).sort((a, b) => {
    const dr = rank(a.maxSeverity) - rank(b.maxSeverity);
    return dr !== 0 ? dr : new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
  });
}

export default function AlertManagementPage() {
  const { alerts, updateAlert, addAlerts, resolutionMethods, rules, settings } = useApp();
  const { canWrite } = useAuth();

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [isDetecting, setIsDetecting] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupPage, setGroupPage] = useState(1);
  const [innerPages, setInnerPages] = useState<Record<string, number>>({});
  const [innerSort, setInnerSort] = useState<Record<string, { key: SortKey; dir: 'asc' | 'desc' }>>({});

  useEffect(() => {
    if (!settings.autoDetect) return;
    const id = setInterval(handleDetectAlerts, settings.checkIntervalMinutes * 60 * 1000);
    return () => clearInterval(id);
  }, [settings.autoDetect, settings.checkIntervalMinutes]);

  const filteredAlerts = alerts.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  const groups = groupAlerts(filteredAlerts);
  const totalGroupPages = Math.max(1, Math.ceil(groups.length / GROUP_PAGE_SIZE));
  const gPage = Math.min(groupPage, totalGroupPages);
  const pagedGroups = groups.slice((gPage - 1) * GROUP_PAGE_SIZE, gPage * GROUP_PAGE_SIZE);

  const handleDetectAlerts = async () => {
    setIsDetecting(true);
    await new Promise(r => setTimeout(r, 1500));
    const newAlerts = generateMockAlerts(Math.floor(Math.random() * 5) + 2);
    await addAlerts(newAlerts);
    setIsDetecting(false);
  };

  const handleAlertAction = async (alertId: string, action: 'acknowledged' | 'resolved' | 'suppressed', methodId?: string) => {
    const patch = {
      status: action,
      resolved_at: action === 'resolved' ? new Date().toISOString() : undefined,
      ...(methodId ? { resolution_method_id: methodId } : {}),
    };
    await updateAlert(alertId, patch);
    if (selectedAlert?.id === alertId) setSelectedAlert(prev => prev ? { ...prev, ...patch } : null);
  };

  const handleUpdateSuggestion = async (alertId: string, suggestion: string) => {
    await updateAlert(alertId, { resolution_suggestion: suggestion });
    if (selectedAlert?.id === alertId) setSelectedAlert(prev => prev ? { ...prev, resolution_suggestion: suggestion } : null);
  };

  const getRecommendedMethod = (alert: Alert): ResolutionMethod | null => {
    const rule = rules.find(r => r.id === alert.rule_id);
    if (!rule?.recommended_method_id) return null;
    return resolutionMethods.find(m => m.id === rule.recommended_method_id) || null;
  };

  const findSimilarHistory = (alert: Alert): Alert[] =>
    alerts.filter(a => a.id !== alert.id && a.status === 'resolved' && a.alert_type === alert.alert_type).slice(0, 5);

  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => { const n = new Set(prev); n.has(type) ? n.delete(type) : n.add(type); return n; });
  };

  const getInnerPage = (type: string) => innerPages[type] || 1;
  const setInnerPage = (type: string, p: number) => setInnerPages(prev => ({ ...prev, [type]: p }));
  const getInnerSort = (type: string) => innerSort[type] || { key: 'triggered_at' as SortKey, dir: 'desc' as const };
  const handleInnerSort = (type: string, key: SortKey) => {
    const cur = getInnerSort(type);
    setInnerSort(prev => ({
      ...prev,
      [type]: { key, dir: cur.key === key && cur.dir === 'asc' ? 'desc' : 'asc' }
    }));
    setInnerPage(type, 1);
  };

  const getSortedInnerAlerts = (group: AlertGroup): Alert[] => {
    const { key, dir } = getInnerSort(group.alert_type);
    return [...group.alerts].sort((a, b) => {
      let cmp = 0;
      if (key === 'severity') cmp = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
      else if (key === 'triggered_at') cmp = new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime();
      else if (key === 'status') cmp = a.status.localeCompare(b.status);
      return dir === 'asc' ? -cmp : cmp;
    });
  };

  const resetFilters = () => { setStatusFilter('all'); setSeverityFilter('all'); setGroupPage(1); setExpandedGroups(new Set()); };

  const SortBtn = ({ type, k, label }: { type: string; k: SortKey; label: string }) => {
    const cur = getInnerSort(type);
    const active = cur.key === k;
    return (
      <button onClick={() => handleInnerSort(type, k)} className={`flex items-center gap-0.5 text-xs font-semibold ${active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
        {label}
        {active ? (cur.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronUp className="w-3 h-3 opacity-30" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">告警管理</h1>
          <p className="text-gray-500 mt-1 text-sm">按类型聚合，支持分页排序，点击分组展开告警列表</p>
        </div>
        <div className="flex items-center gap-3">
          {settings.autoDetect && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4" /><span>每 {settings.checkIntervalMinutes} 分钟自动检测</span>
            </div>
          )}
          <button onClick={handleDetectAlerts} disabled={isDetecting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60">
            {isDetecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            {isDetecting ? '检测中...' : '手动检测'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-600">筛选：</span>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); resetFilters(); setStatusFilter(e.target.value as typeof statusFilter); }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">全部状态</option>
          <option value="active">活跃</option><option value="acknowledged">已确认</option>
          <option value="resolved">已解决</option><option value="suppressed">已抑制</option>
        </select>
        <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value as typeof severityFilter); setGroupPage(1); setExpandedGroups(new Set()); }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">全部级别</option>
          {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filteredAlerts.length} 条告警 · {groups.length} 个类型 · 第 {gPage}/{totalGroupPages} 页</span>
      </div>

      {/* Group list */}
      <div className="space-y-2 mb-4">
        {pagedGroups.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">暂无匹配的告警</p>
          </div>
        )}

        {pagedGroups.map((group, gi) => {
          const isOpen = expandedGroups.has(group.alert_type);
          const ip = getInnerPage(group.alert_type);
          const sorted = getSortedInnerAlerts(group);
          const totalInnerPages = Math.max(1, Math.ceil(sorted.length / INNER_PAGE_SIZE));
          const safePage = Math.min(ip, totalInnerPages);
          const paged = sorted.slice((safePage - 1) * INNER_PAGE_SIZE, safePage * INNER_PAGE_SIZE);
          const startNum = (gPage - 1) * GROUP_PAGE_SIZE + gi + 1;
          const innerStartNum = (safePage - 1) * INNER_PAGE_SIZE + 1;

          return (
            <div key={group.alert_type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => toggleGroup(group.alert_type)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left">
                <span className="w-7 h-7 rounded bg-gray-100 text-gray-500 text-xs font-mono flex items-center justify-center flex-shrink-0 select-none">
                  {startNum}
                </span>
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: getSeverityColor(group.maxSeverity) + '20', color: getSeverityColor(group.maxSeverity) }}>
                  {getSeverityText(group.maxSeverity)}
                </span>
                <span className="font-semibold text-gray-900 flex-1 truncate">{group.alert_type}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {group.activeCount > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />{group.activeCount} 活跃
                    </span>
                  )}
                  {group.resolvedCount > 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{group.resolvedCount} 已解决</span>
                  )}
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">共 {group.alerts.length} 条</span>
                  <span className="text-xs text-gray-400">{formatDateTime(group.latestAt)}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-2.5 px-5 text-center text-xs font-semibold text-gray-400 w-12">#</th>
                        <th className="py-2.5 px-4 text-left">
                          <SortBtn type={group.alert_type} k="severity" label="级别" />
                        </th>
                        <th className="py-2.5 px-4 text-left">
                          <SortBtn type={group.alert_type} k="status" label="状态" />
                        </th>
                        <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400">告警内容</th>
                        <th className="py-2.5 px-4 text-left">
                          <SortBtn type={group.alert_type} k="triggered_at" label="触发时间" />
                        </th>
                        <th className="py-2.5 px-5 text-right text-xs font-semibold text-gray-400">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((alert, ai) => (
                        <tr key={alert.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-5 text-center text-xs font-mono text-gray-300 select-none">{innerStartNum + ai}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: getSeverityColor(alert.severity) + '20', color: getSeverityColor(alert.severity) }}>
                              {getSeverityText(alert.severity)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                              {getStatusText(alert.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate">{alert.content}</td>
                          <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(alert.triggered_at)}</td>
                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {alert.status === 'active' && canWrite && (
                                <button onClick={() => handleAlertAction(alert.id, 'acknowledged')} title="确认"
                                  className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600 transition"><Check className="w-3.5 h-3.5" /></button>
                              )}
                              <button onClick={() => { setSelectedAlert(alert); setEditingSuggestion(alert.resolution_suggestion); }}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">详情</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {totalInnerPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50 border-t border-gray-100">
                      <span className="text-xs text-gray-400">第 {safePage}/{totalInnerPages} 页，共 {group.alerts.length} 条</span>
                      <div className="flex items-center gap-1">
                        <button disabled={safePage === 1} onClick={() => setInnerPage(group.alert_type, safePage - 1)}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 text-gray-500 transition"><ChevronLeft className="w-4 h-4" /></button>
                        {Array.from({ length: totalInnerPages }, (_, i) => i + 1).map(p => (
                          <button key={p} onClick={() => setInnerPage(group.alert_type, p)}
                            className={`w-7 h-7 rounded text-xs font-medium transition ${p === safePage ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-600'}`}>{p}</button>
                        ))}
                        <button disabled={safePage === totalInnerPages} onClick={() => setInnerPage(group.alert_type, safePage + 1)}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 text-gray-500 transition"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Group-level pagination */}
      {totalGroupPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
          <span className="text-sm text-gray-500">
            显示 {(gPage - 1) * GROUP_PAGE_SIZE + 1}–{Math.min(gPage * GROUP_PAGE_SIZE, groups.length)} 个类型，共 {groups.length} 个
          </span>
          <div className="flex items-center gap-1">
            <button disabled={gPage === 1} onClick={() => setGroupPage(p => p - 1)}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-600 transition"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: totalGroupPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setGroupPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition ${p === gPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>{p}</button>
            ))}
            <button disabled={gPage === totalGroupPages} onClick={() => setGroupPage(p => p + 1)}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-600 transition"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between rounded-t-xl z-10">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-bold text-gray-900">告警详情</h2>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: getSeverityColor(selectedAlert.severity) + '20', color: getSeverityColor(selectedAlert.severity) }}>
                  {getSeverityText(selectedAlert.severity)}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAlert.status)}`}>
                  {getStatusText(selectedAlert.status)}
                </span>
                <span className="text-sm text-gray-600 font-medium">{selectedAlert.alert_type}</span>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">告警内容</p>
                  <p className="text-sm text-gray-900 leading-relaxed">{selectedAlert.content}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">触发时间</p>
                    <p className="text-sm text-gray-900">{formatDateTime(selectedAlert.triggered_at)}</p>
                  </div>
                  {selectedAlert.resolved_at && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">解决时间</p>
                      <p className="text-sm text-gray-900">{formatDateTime(selectedAlert.resolved_at)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-900">处置建议</h3>
                </div>
                {canWrite ? (
                  <>
                    <textarea value={editingSuggestion} onChange={e => setEditingSuggestion(e.target.value)}
                      onBlur={() => handleUpdateSuggestion(selectedAlert.id, editingSuggestion)}
                      rows={3} placeholder="输入处置建议..."
                      className="w-full p-3 border border-blue-200 rounded-lg text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white" />
                    <p className="text-xs text-blue-400 mt-1">点击其他区域自动保存</p>
                  </>
                ) : (
                  <p className="text-sm text-blue-900 whitespace-pre-line">{selectedAlert.resolution_suggestion || '暂无建议'}</p>
                )}
              </div>

              {(() => {
                const m = getRecommendedMethod(selectedAlert);
                if (!m) return null;
                return (
                  <div className="bg-white rounded-xl border border-green-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Book className="w-4 h-4 text-green-600" />
                      <h3 className="text-sm font-semibold text-gray-900">推荐处置方法</h3>
                      <span className="text-xs text-gray-400">来自规则配置</span>
                    </div>
                    <div className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{m.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                        </div>
                        {canWrite && selectedAlert.status === 'active' && (
                          <button onClick={() => handleAlertAction(selectedAlert.id, 'resolved', m.id)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition flex-shrink-0 ml-3">
                            应用并解决
                          </button>
                        )}
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5">
                        {m.steps.map((step, i) => <li key={i} className="text-sm text-gray-700">{step}</li>)}
                      </ol>
                    </div>
                  </div>
                );
              })()}

              {findSimilarHistory(selectedAlert).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-900">历史相似告警</h3>
                    <span className="text-xs text-gray-400">同类型已解决，含处置记录</span>
                  </div>
                  <div className="space-y-3">
                    {findSimilarHistory(selectedAlert).map(h => {
                      const usedMethod = resolutionMethods.find(m => m.id === h.resolution_method_id);
                      return (
                        <div key={h.id} className="border border-purple-100 rounded-lg p-3 bg-purple-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: getSeverityColor(h.severity) + '20', color: getSeverityColor(h.severity) }}>
                                {getSeverityText(h.severity)}
                              </span>
                              <span className="text-xs text-gray-500">{formatDateTime(h.triggered_at)}</span>
                            </div>
                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">已解决</span>
                          </div>
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-400 mb-0.5">告警内容</p>
                            <p className="text-xs text-gray-800">{h.content}</p>
                          </div>
                          {h.resolution_suggestion && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-400 mb-0.5">处置建议</p>
                              <p className="text-xs text-gray-700 bg-white rounded p-2 border border-purple-100 whitespace-pre-line">{h.resolution_suggestion}</p>
                            </div>
                          )}
                          {usedMethod && (
                            <div>
                              <p className="text-xs font-medium text-gray-400 mb-1">处置方法：<span className="text-purple-700">{usedMethod.name}</span></p>
                              <ol className="list-decimal list-inside space-y-0.5">
                                {usedMethod.steps.map((s, i) => <li key={i} className="text-xs text-gray-700">{s}</li>)}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedAlert.status === 'active' && canWrite && (
                <div className="pt-1">
                  <p className="text-sm font-medium text-gray-700 mb-2">快速操作</p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => handleAlertAction(selectedAlert.id, 'acknowledged')}
                      className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition">确认告警</button>
                    <button onClick={() => handleAlertAction(selectedAlert.id, 'resolved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">解决告警</button>
                    <button onClick={() => handleAlertAction(selectedAlert.id, 'suppressed')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">抑制告警</button>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-3.5 border-t border-gray-200 rounded-b-xl">
              <button onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
