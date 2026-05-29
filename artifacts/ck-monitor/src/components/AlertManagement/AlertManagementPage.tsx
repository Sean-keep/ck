import { useState, useEffect } from 'react';
import {
  RefreshCw, X, Check, AlertCircle, AlertTriangle, Book, History,
  Lightbulb, Clock, ChevronDown, ChevronRight, ChevronLeft
} from 'lucide-react';
import { Alert, Severity, AlertStatus, ResolutionMethod } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { getSeverityColor, getSeverityText, getStatusColor, getStatusText, formatDateTime } from '../../utils/helpers';
import { generateMockAlerts } from '../../data/mockData';

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string }> = [
  { value: 'critical', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
  { value: 'info', label: '信息' },
];

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

const PAGE_SIZE = 8;

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
  for (const alert of alerts) {
    const list = map.get(alert.alert_type) || [];
    list.push(alert);
    map.set(alert.alert_type, list);
  }
  return Array.from(map.entries()).map(([alert_type, list]) => {
    const severityRank = (s: Severity) => SEVERITY_ORDER.indexOf(s);
    const maxSeverity = list.reduce<Severity>((max, a) =>
      severityRank(a.severity) < severityRank(max) ? a.severity : max,
      'info'
    );
    return {
      alert_type,
      alerts: list.sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()),
      maxSeverity,
      activeCount: list.filter(a => a.status === 'active').length,
      resolvedCount: list.filter(a => a.status === 'resolved').length,
      latestAt: list[0]?.triggered_at || '',
    };
  }).sort((a, b) => {
    const ra = SEVERITY_ORDER.indexOf(a.maxSeverity);
    const rb = SEVERITY_ORDER.indexOf(b.maxSeverity);
    if (ra !== rb) return ra - rb;
    return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
  });
}

export default function AlertManagementPage() {
  const { alerts, setAlerts, resolutionMethods, rules, settings } = useApp();
  const { canWrite } = useAuth();

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertFilter, setAlertFilter] = useState<'all' | AlertStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [isDetecting, setIsDetecting] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!settings.autoDetect) return;
    const interval = setInterval(() => {
      handleDetectAlerts();
    }, settings.checkIntervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.autoDetect, settings.checkIntervalMinutes]);

  const filteredAlerts = alerts.filter(a => {
    if (alertFilter !== 'all' && a.status !== alertFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  const groups = groupAlerts(filteredAlerts);
  const totalPages = Math.ceil(groups.length / PAGE_SIZE);
  const pagedGroups = groups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleDetectAlerts = async () => {
    setIsDetecting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const newAlerts = generateMockAlerts(Math.floor(Math.random() * 5) + 2);
    setAlerts([...newAlerts, ...alerts]);
    setIsDetecting(false);
  };

  const handleAlertAction = (alertId: string, action: 'acknowledged' | 'resolved' | 'suppressed', methodId?: string) => {
    const updated = alerts.map(a =>
      a.id === alertId
        ? {
          ...a,
          status: action,
          resolved_at: action === 'resolved' ? new Date().toISOString() : a.resolved_at,
          resolution_method_id: methodId || a.resolution_method_id,
        }
        : a
    );
    setAlerts(updated);
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(updated.find(a => a.id === alertId) || null);
    }
  };

  const handleUpdateSuggestion = (alertId: string, suggestion: string) => {
    const updated = alerts.map(a => a.id === alertId ? { ...a, resolution_suggestion: suggestion } : a);
    setAlerts(updated);
    if (selectedAlert?.id === alertId) {
      setSelectedAlert({ ...selectedAlert, resolution_suggestion: suggestion });
    }
  };

  const toggleGroup = (alertType: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(alertType) ? next.delete(alertType) : next.add(alertType);
      return next;
    });
  };

  const getRecommendedMethod = (alert: Alert): ResolutionMethod | null => {
    const rule = rules.find(r => r.id === alert.rule_id);
    if (!rule?.recommended_method_id) return null;
    return resolutionMethods.find(m => m.id === rule.recommended_method_id) || null;
  };

  const findSimilarHistory = (alert: Alert): Alert[] =>
    alerts.filter(a => a.id !== alert.id && a.status === 'resolved' && a.alert_type === alert.alert_type).slice(0, 5);

  const handleViewAlert = (alert: Alert) => {
    setSelectedAlert(alert);
    setEditingSuggestion(alert.resolution_suggestion);
  };

  const getGroupPage = (alertType: string) => groupPages[alertType] || 1;
  const setGroupPage = (alertType: string, page: number) =>
    setGroupPages(prev => ({ ...prev, [alertType]: page }));

  const handleFilterChange = () => {
    setCurrentPage(1);
    setExpandedGroups(new Set());
    setGroupPages({});
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">告警管理</h1>
          <p className="text-gray-600 mt-1">按类型聚合展示，点击分组可展开查看详细告警</p>
        </div>
        <div className="flex items-center gap-3">
          {settings.autoDetect && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4" />
              <span>每 {settings.checkIntervalMinutes} 分钟自动检测</span>
            </div>
          )}
          <button
            onClick={handleDetectAlerts}
            disabled={isDetecting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60"
          >
            {isDetecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            {isDetecting ? '检测中...' : '手动检测'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-600">筛选：</span>
        <select
          value={alertFilter}
          onChange={e => { setAlertFilter(e.target.value as 'all' | AlertStatus); handleFilterChange(); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部状态</option>
          <option value="active">活跃</option>
          <option value="acknowledged">已确认</option>
          <option value="resolved">已解决</option>
          <option value="suppressed">已抑制</option>
        </select>
        <select
          value={severityFilter}
          onChange={e => { setSeverityFilter(e.target.value as 'all' | Severity); handleFilterChange(); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部级别</option>
          {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-500">
          共 {filteredAlerts.length} 条告警 · {groups.length} 个类型
        </span>
      </div>

      {/* Grouped list */}
      <div className="space-y-2 mb-4">
        {pagedGroups.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>暂无匹配的告警</p>
          </div>
        )}

        {pagedGroups.map(group => {
          const isExpanded = expandedGroups.has(group.alert_type);
          const gPage = getGroupPage(group.alert_type);
          const gTotalPages = Math.ceil(group.alerts.length / PAGE_SIZE);
          const gAlerts = group.alerts.slice((gPage - 1) * PAGE_SIZE, gPage * PAGE_SIZE);

          return (
            <div key={group.alert_type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Group header row */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                onClick={() => toggleGroup(group.alert_type)}
              >
                <span className="text-gray-400 flex-shrink-0">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </span>

                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: getSeverityColor(group.maxSeverity) + '20', color: getSeverityColor(group.maxSeverity) }}
                >
                  {getSeverityText(group.maxSeverity)}
                </span>

                <span className="font-semibold text-gray-900 flex-1 min-w-0 truncate">{group.alert_type}</span>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {group.activeCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      {group.activeCount} 活跃
                    </span>
                  )}
                  {group.resolvedCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {group.resolvedCount} 已解决
                    </span>
                  )}
                  <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                    共 {group.alerts.length} 条
                  </span>
                  <span className="text-xs text-gray-400">{formatDateTime(group.latestAt)}</span>
                </div>
              </button>

              {/* Expanded alert rows */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left py-2.5 px-5 text-xs font-semibold text-gray-500">严重程度</th>
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500">状态</th>
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500">告警内容</th>
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">触发时间</th>
                        <th className="text-right py-2.5 px-5 text-xs font-semibold text-gray-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gAlerts.map(alert => (
                        <tr key={alert.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-5">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: getSeverityColor(alert.severity) + '20', color: getSeverityColor(alert.severity) }}
                            >
                              {getSeverityText(alert.severity)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                              {getStatusText(alert.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 max-w-sm truncate">{alert.content}</td>
                          <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(alert.triggered_at)}</td>
                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {alert.status === 'active' && canWrite && (
                                <button
                                  onClick={() => handleAlertAction(alert.id, 'acknowledged')}
                                  title="确认告警"
                                  className="p-1.5 rounded hover:bg-yellow-100 text-yellow-600 transition"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleViewAlert(alert)}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                              >
                                详情
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Group-level pagination */}
                  {gTotalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                      <span className="text-xs text-gray-500">第 {gPage} / {gTotalPages} 页</span>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={gPage === 1}
                          onClick={() => setGroupPage(group.alert_type, gPage - 1)}
                          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 text-gray-600 transition"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: gTotalPages }, (_, i) => i + 1).map(p => (
                          <button
                            key={p}
                            onClick={() => setGroupPage(group.alert_type, p)}
                            className={`w-7 h-7 rounded text-xs font-medium transition ${p === gPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-600'}`}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          disabled={gPage === gTotalPages}
                          onClick={() => setGroupPage(group.alert_type, gPage + 1)}
                          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 text-gray-600 transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Top-level group pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3">
          <span className="text-sm text-gray-500">第 {currentPage} / {totalPages} 页，共 {groups.length} 个告警类型</span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition ${p === currentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-600 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between rounded-t-xl z-10">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-bold text-gray-900">告警详情</h2>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: getSeverityColor(selectedAlert.severity) + '20', color: getSeverityColor(selectedAlert.severity) }}
                >
                  {getSeverityText(selectedAlert.severity)}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAlert.status)}`}>
                  {getStatusText(selectedAlert.status)}
                </span>
                <span className="text-sm font-medium text-gray-700 px-2">{selectedAlert.alert_type}</span>
              </div>

              {/* Basic info */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">告警内容</p>
                  <p className="text-gray-900 text-sm leading-relaxed">{selectedAlert.content}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">触发时间</p>
                    <p className="text-gray-900 text-sm">{formatDateTime(selectedAlert.triggered_at)}</p>
                  </div>
                  {selectedAlert.resolved_at && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">解决时间</p>
                      <p className="text-gray-900 text-sm">{formatDateTime(selectedAlert.resolved_at)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution suggestion */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-900 text-sm">处置建议</h3>
                </div>
                {canWrite ? (
                  <>
                    <textarea
                      value={editingSuggestion}
                      onChange={e => setEditingSuggestion(e.target.value)}
                      onBlur={() => handleUpdateSuggestion(selectedAlert.id, editingSuggestion)}
                      className="w-full p-3 border border-blue-200 rounded-lg text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
                      rows={3}
                      placeholder="输入处置建议..."
                    />
                    <p className="text-xs text-blue-500 mt-1">点击其他区域自动保存</p>
                  </>
                ) : (
                  <p className="text-sm text-blue-900 whitespace-pre-line">{selectedAlert.resolution_suggestion || '暂无处置建议'}</p>
                )}
              </div>

              {/* Recommended method — single, from the rule */}
              {(() => {
                const method = getRecommendedMethod(selectedAlert);
                if (!method) return null;
                return (
                  <div className="bg-white rounded-xl border border-green-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Book className="w-4 h-4 text-green-600" />
                      <h3 className="font-semibold text-gray-900 text-sm">推荐处置方法</h3>
                      <span className="text-xs text-gray-400">（来自告警规则配置）</span>
                    </div>
                    <div className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{method.name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
                        </div>
                        {canWrite && selectedAlert.status === 'active' && (
                          <button
                            onClick={() => handleAlertAction(selectedAlert.id, 'resolved', method.id)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition flex-shrink-0 ml-3"
                          >
                            应用并解决
                          </button>
                        )}
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5">
                        {method.steps.map((step, idx) => (
                          <li key={idx} className="text-sm text-gray-700">{step}</li>
                        ))}
                      </ol>
                      {method.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                          {method.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Historical similar alerts */}
              {findSimilarHistory(selectedAlert).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-purple-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">历史相似告警</h3>
                    <span className="text-xs text-gray-400">同类型已解决，含处置记录</span>
                  </div>
                  <div className="space-y-3">
                    {findSimilarHistory(selectedAlert).map(histAlert => {
                      const usedMethod = resolutionMethods.find(m => m.id === histAlert.resolution_method_id);
                      return (
                        <div key={histAlert.id} className="border border-purple-100 rounded-lg p-3 bg-purple-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: getSeverityColor(histAlert.severity) + '20', color: getSeverityColor(histAlert.severity) }}
                              >
                                {getSeverityText(histAlert.severity)}
                              </span>
                              <span className="text-xs text-gray-500">{formatDateTime(histAlert.triggered_at)}</span>
                            </div>
                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">已解决</span>
                          </div>
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">告警内容</p>
                            <p className="text-xs text-gray-800">{histAlert.content}</p>
                          </div>
                          {histAlert.resolution_suggestion && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-500 mb-0.5">处置建议</p>
                              <p className="text-xs text-gray-700 bg-white rounded p-2 border border-purple-100 whitespace-pre-line">{histAlert.resolution_suggestion}</p>
                            </div>
                          )}
                          {usedMethod && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">使用处置方法：<span className="text-purple-700">{usedMethod.name}</span></p>
                              <ol className="list-decimal list-inside space-y-0.5">
                                {usedMethod.steps.map((step, idx) => (
                                  <li key={idx} className="text-xs text-gray-700">{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              {selectedAlert.status === 'active' && canWrite && (
                <div className="pt-1">
                  <p className="text-sm font-medium text-gray-700 mb-2">快速操作</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleAlertAction(selectedAlert.id, 'acknowledged')}
                      className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition"
                    >
                      确认告警
                    </button>
                    <button
                      onClick={() => handleAlertAction(selectedAlert.id, 'resolved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                    >
                      解决告警
                    </button>
                    <button
                      onClick={() => handleAlertAction(selectedAlert.id, 'suppressed')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                    >
                      抑制告警
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
