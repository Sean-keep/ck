import { useState } from 'react';
import { Plug, CheckCircle, XCircle, RefreshCw, Save } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

export default function ConnectionConfigPage() {
  const { connection, setConnection, demoMode, setDemoMode } = useApp();
  const { canWrite } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [localConn, setLocalConn] = useState(connection);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionMessage('');
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (demoMode) {
      setIsConnected(true);
      setConnectionMessage('Demo模式连接成功（使用模拟数据）');
    } else {
      const success = Math.random() > 0.3;
      setIsConnected(success);
      setConnectionMessage(success
        ? '数据库连接成功'
        : '连接失败：无法连接到 ClickHouse 服务器，请检查配置'
      );
    }
    setIsTesting(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setConnection(localConn);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  const handleReset = () => {
    setLocalConn({ host: 'localhost', port: 8123, database: 'default', username: 'default', password: '' });
    setIsConnected(null);
    setConnectionMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">连接配置</h1>
          <p className="text-gray-600 mt-2">配置 ClickHouse 连接信息并验证可用性</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Plug className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">演示模式</h2>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => canWrite && setDemoMode(!demoMode)}
              className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${demoMode ? 'bg-blue-600' : 'bg-gray-200'} ${!canWrite ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${demoMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">启用 Demo Mode</p>
              <p className="text-xs text-gray-500">开启后使用模拟数据，无需真实数据库即可演示所有功能</p>
            </div>
          </label>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">连接参数</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: '服务地址 (Host)', key: 'host', placeholder: 'localhost', type: 'text' },
              { label: '端口 (Port)', key: 'port', placeholder: '8123', type: 'number' },
              { label: '数据库名', key: 'database', placeholder: 'default', type: 'text' },
              { label: '用户名', key: 'username', placeholder: 'default', type: 'text' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={localConn[key as keyof typeof localConn]}
                  onChange={e => setLocalConn({ ...localConn, [key]: type === 'number' ? parseInt(e.target.value) || 8123 : e.target.value })}
                  disabled={demoMode || !canWrite}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={localConn.password}
                onChange={e => setLocalConn({ ...localConn, password: e.target.value })}
                disabled={demoMode || !canWrite}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </div>
        </div>

        {isConnected !== null && (
          <div className={`rounded-xl border-2 p-4 mb-6 ${isConnected ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <div className="flex items-center gap-3">
              {isConnected
                ? <CheckCircle className="w-6 h-6 text-green-600" />
                : <XCircle className="w-6 h-6 text-red-600" />
              }
              <div>
                <p className={`font-semibold ${isConnected ? 'text-green-900' : 'text-red-900'}`}>
                  {isConnected ? '连接成功' : '连接失败'}
                </p>
                <p className={`text-sm ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                  {connectionMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
            {isTesting ? '测试中...' : '测试连接'}
          </button>

          {canWrite && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-60"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? '保存中...' : '保存配置'}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                重置配置
              </button>
            </>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>提示：</strong>配置信息将保存在浏览器本地存储中，刷新后自动加载。
            {demoMode && ' Demo模式已启用，无需真实数据库即可体验所有功能。'}
          </p>
        </div>
      </div>
    </div>
  );
}
