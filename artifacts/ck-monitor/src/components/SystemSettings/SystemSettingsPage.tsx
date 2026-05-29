import { useState } from 'react';
import { Save, RefreshCw, Settings } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

export default function SystemSettingsPage() {
  const { settings, setSettings } = useApp();
  const { canAdmin } = useAuth();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSettings(localSettings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggle = (key: keyof typeof localSettings) => {
    setLocalSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">系统设置</h1>
            <p className="text-gray-600 mt-2">管理系统运行参数和通知偏好</p>
          </div>
          {canAdmin && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? '保存中...' : saved ? '已保存' : '保存设置'}
            </button>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">自动检测设置</h2>
            </div>

            <div className="space-y-4">
              <label className={`flex items-center justify-between py-3 border-b border-gray-100 ${canAdmin ? 'cursor-pointer' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-gray-900">自动检测告警</p>
                  <p className="text-xs text-gray-500 mt-0.5">按设定时间间隔自动触发告警检测</p>
                </div>
                <div
                  onClick={() => canAdmin && toggle('autoDetect')}
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${localSettings.autoDetect ? 'bg-blue-600' : 'bg-gray-200'} ${!canAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${localSettings.autoDetect ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              <div className="pt-1">
                <label className="block text-sm font-medium text-gray-900 mb-1">检测时间间隔</label>
                <p className="text-xs text-gray-500 mb-3">设置自动检测告警的执行频率（默认：每1分钟）</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={localSettings.checkIntervalMinutes}
                    onChange={e => setLocalSettings(prev => ({ ...prev, checkIntervalMinutes: Math.max(1, parseInt(e.target.value) || 1) }))}
                    disabled={!canAdmin}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  <span className="text-sm text-gray-700">分钟</span>
                  <div className="flex gap-2">
                    {[1, 5, 10, 30].map(min => (
                      <button
                        key={min}
                        onClick={() => canAdmin && setLocalSettings(prev => ({ ...prev, checkIntervalMinutes: min }))}
                        disabled={!canAdmin}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          localSettings.checkIntervalMinutes === min
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                        } disabled:opacity-50`}
                      >
                        {min}分钟
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  当前设置：每 {localSettings.checkIntervalMinutes} 分钟执行一次检测
                  {localSettings.checkIntervalMinutes === 1 && '（最高频率）'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">通知设置</h2>
            <div className="space-y-3">
              {[
                { key: 'notifications' as const, label: '浏览器通知', desc: '当有新告警时发送浏览器通知' },
                { key: 'soundAlerts' as const, label: '声音提示', desc: '告警时播放提示音' },
              ].map(({ key, label, desc }) => (
                <label key={key} className={`flex items-center justify-between py-3 border-b border-gray-100 last:border-0 ${canAdmin ? 'cursor-pointer' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <div
                    onClick={() => canAdmin && toggle(key)}
                    className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${localSettings[key] ? 'bg-blue-600' : 'bg-gray-200'} ${!canAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${localSettings[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">关于系统</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium text-gray-800">系统名称：</span>ClickHouse Monitor</p>
              <p><span className="font-medium text-gray-800">版本：</span>2.0.0</p>
              <p><span className="font-medium text-gray-800">描述：</span>ClickHouse 数据库监控与告警系统，支持多用户角色管理</p>
              <p><span className="font-medium text-gray-800">存储方式：</span>浏览器本地存储（localStorage）</p>
            </div>
          </div>

          {!canAdmin && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <span className="font-medium">提示：</span>仅管理员可修改系统设置，当前账户为只读模式。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
