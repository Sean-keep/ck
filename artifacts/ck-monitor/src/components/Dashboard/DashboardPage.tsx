import { useEffect, useState } from 'react';
import { AlertTriangle, Activity, CheckCircle, Bell, FileText, Book, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Severity, Alert } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { generateAlertTrendData, generateSeverityDistribution } from '../../data/mockData';
import { getSeverityText, getSeverityColor, getStatusColor, getStatusText, formatTime } from '../../utils/helpers';

export default function DashboardPage() {
  const { alerts, rules, resolutionMethods } = useApp();
  const [trendData, setTrendData] = useState<{ time: string; count: number }[]>([]);
  const [severityDist, setSeverityDist] = useState<{ [key in Severity]: number } | null>(null);

  useEffect(() => {
    setTrendData(generateAlertTrendData());
    setSeverityDist(generateSeverityDistribution());
  }, []);

  const stats = {
    active: alerts.filter(a => a.status === 'active').length,
    total: alerts.length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
    info: alerts.filter(a => a.severity === 'info').length,
  };

  const pieData = severityDist
    ? Object.entries(severityDist).map(([severity, count]) => ({
        name: getSeverityText(severity as Severity),
        value: count,
        severity: severity as Severity,
      }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">监控概览</h1>
        <p className="text-gray-600 mt-2">ClickHouse 告警监控系统实时仪表盘</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: '活跃告警', value: stats.active, color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle },
          { label: '总告警数', value: stats.total, color: 'text-gray-900', bg: 'bg-gray-100', icon: Bell },
          { label: '已确认', value: stats.acknowledged, color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Activity },
          { label: '已解决', value: stats.resolved, color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
          { label: '告警规则', value: rules.length, color: 'text-blue-600', bg: 'bg-blue-100', icon: FileText },
          { label: '处置方法', value: resolutionMethods.length, color: 'text-purple-600', bg: 'bg-purple-100', icon: Book },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
              <div className={`w-10 h-10 ${bg} rounded-full flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {(['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((severity) => (
          <div key={severity} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-2"
                style={{ backgroundColor: getSeverityColor(severity) + '20' }}
              >
                <span className="text-xl font-bold" style={{ color: getSeverityColor(severity) }}>
                  {stats[severity]}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-700">{getSeverityText(severity)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">24小时告警趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">告警严重程度分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getSeverityColor(entry.severity)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">告警状态分布</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: '活跃', value: stats.active },
              { name: '已确认', value: stats.acknowledged },
              { name: '已解决', value: stats.resolved },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#10b981" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近告警</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">严重程度</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">告警类型</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">状态</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">内容</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">触发时间</th>
              </tr>
            </thead>
            <tbody>
              {alerts.slice(0, 10).map((alert: Alert) => (
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
                  <td className="py-3 px-4 text-sm text-gray-600">{formatTime(alert.triggered_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
