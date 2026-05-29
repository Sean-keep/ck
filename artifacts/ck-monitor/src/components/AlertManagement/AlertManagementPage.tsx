import { useState, useEffect } from 'react';
import { RefreshCw, X, Check, AlertCircle, AlertTriangle, Book, History, Lightbulb, Clock } from 'lucide-react';
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

export default function AlertManagementPage() {
  const { alerts, setAlerts, resolutionMethods, settings } = useApp();
  const { canWrite } = useAuth();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertFilter, setAlertFilter] = useState<'all' | AlertStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [isDetecting, setIsDetecting] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState('');

  const filteredAlerts = alerts.filter(a => {
    if (alertFilter !== 'all' && a.status !== alertFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  useEffect(() => {
    if (!settings.autoDetect) return;
    const interval = setInterval(() => {
      handleDetectAlerts();
    }, settings.checkIntervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.autoDetect, settings.checkIntervalMinutes]);

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

  const findSimilarHistory = (alert: Alert): Alert[] => {
    return alerts.filter(a =>
      a.id !== alert.id &&
      a.status === 'resolved' &&
      a.alert_type === alert.alert_type
    ).slice(0, 5);
  };

  const findMatchingMethods = (alert: Alert): ResolutionMethod[] => {
    return resolutionMethods.filter(method =>
      method.alert_type === alert.alert_type ||
      method.severity_range.includes(alert.severity)
    );
  };

  const handleViewAlert = (alert: Alert) => {
    setSelectedAlert(alert);
    setEditingSuggestion(alert.resolution_suggestion);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">告警管理</h1>
          <p className="text-gray-600 mt-2">查看和处理系统告警</p>
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

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">告警列表 ({filteredAlerts.length})</h2>
          <div className="flex items-center gap-3">
            <select
              value={alertFilter}
              onChange={e => setAlertFilter(e.target.value as 'all' | AlertStatus)}
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
              onChange={e => setSeverityFilter(e.target.value as 'all' | Severity)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部级别</option>
              {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">严重程度</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">告警类型</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">状态</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">内容</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">触发时间</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.slice(0, 30).map((alert) => (
                <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: getSeverityColor(alert.severity) + '20', color: getSeverityColor(alert.severity) }}
                    >
                      {getSeverityText(alert.severity)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">{alert.alert_type}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                      {getStatusText(alert.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{alert.content}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{formatDateTime(alert.triggered_at)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {alert.status === 'active' && canWrite && (
                        <button
                          onClick={() => handleAlertAction(alert.id, 'acknowledged')}
                          title="确认"
                          className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition"
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
        </div>
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-bold text-gray-900">告警详情</h2>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: getSeverityColor(selectedAlert.severity) + '20', color: getSeverityColor(selectedAlert.severity) }}
                >
                  {getSeverityText(selectedAlert.severity)}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAlert.status)}`}>
                  {getStatusText(selectedAlert.status)}
                </span>
                <span className="text-sm font-medium text-gray-700">{selectedAlert.alert_type}</span>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">告警内容</p>
                  <p className="text-gray-900 mt-1">{selectedAlert.content}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">触发时间</p>
                    <p className="text-gray-900 mt-1 text-sm">{formatDateTime(selectedAlert.triggered_at)}</p>
                  </div>
                  {selectedAlert.resolved_at && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">解决时间</p>
                      <p className="text-gray-900 mt-1 text-sm">{formatDateTime(selectedAlert.resolved_at)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">处置建议</h3>
                </div>
                {canWrite ? (
                  <>
                    <textarea
                      value={editingSuggestion}
                      onChange={e => setEditingSuggestion(e.target.value)}
                      onBlur={() => handleUpdateSuggestion(selectedAlert.id, editingSuggestion)}
                      className="w-full p-3 border border-blue-300 rounded-lg text-sm text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                      rows={4}
                      placeholder="输入处置建议..."
                    />
                    <p className="text-xs text-blue-600 mt-1">可编辑此处置建议，点击其他区域自动保存</p>
                  </>
                ) : (
                  <p className="text-sm text-blue-900 whitespace-pre-line">{selectedAlert.resolution_suggestion || '暂无处置建议'}</p>
                )}
              </div>

              {selectedAlert.status === 'active' && findMatchingMethods(selectedAlert).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Book className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">推荐处置方法</h3>
                  </div>
                  <div className="space-y-3">
                    {findMatchingMethods(selectedAlert).map(method => (
                      <div key={method.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{method.name}</h4>
                            <p className="text-xs text-gray-500">{method.description}</p>
                          </div>
                          {canWrite && (
                            <button
                              onClick={() => handleAlertAction(selectedAlert.id, 'resolved', method.id)}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition flex-shrink-0 ml-3"
                            >
                              应用此方法
                            </button>
                          )}
                        </div>
                        <ol className="list-decimal list-inside space-y-1">
                          {method.steps.slice(0, 4).map((step, idx) => (
                            <li key={idx} className="text-sm text-gray-700">{step}</li>
                          ))}
                          {method.steps.length > 4 && (
                            <li className="text-xs text-gray-400">...还有 {method.steps.length - 4} 步</li>
                          )}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {findSimilarHistory(selectedAlert).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">历史相似告警</h3>
                    <span className="text-xs text-gray-400">（同类型已解决告警，包含处置信息）</span>
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
                              <span className="text-xs text-gray-600">{formatDateTime(histAlert.triggered_at)}</span>
                            </div>
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">已解决</span>
                          </div>

                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">告警内容</p>
                            <p className="text-sm text-gray-800">{histAlert.content}</p>
                          </div>

                          {histAlert.resolution_suggestion && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-500 mb-1">处置建议</p>
                              <p className="text-xs text-gray-700 bg-white rounded p-2 border border-purple-100 whitespace-pre-line">
                                {histAlert.resolution_suggestion}
                              </p>
                            </div>
                          )}

                          {usedMethod && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">使用处置方法：{usedMethod.name}</p>
                              <ol className="list-decimal list-inside space-y-0.5">
                                {usedMethod.steps.slice(0, 4).map((step, idx) => (
                                  <li key={idx} className="text-xs text-gray-700">{step}</li>
                                ))}
                                {usedMethod.steps.length > 4 && (
                                  <li className="text-xs text-gray-400">...还有 {usedMethod.steps.length - 4} 步</li>
                                )}
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
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">快速操作</p>
                  <div className="flex gap-3 flex-wrap">
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
