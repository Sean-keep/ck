import { ReactNode, useState } from 'react';
import {
  Database, AlertTriangle, BarChart3, Settings, Activity, Book, FileText,
  ChevronLeft, ChevronRight, LogOut, User, Users, Plug
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin': return '管理员';
    case 'operator': return '运维工程师';
    case 'viewer': return '只读用户';
    default: return role;
  }
};

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout, canAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: '监控概览', icon: Activity },
    { id: 'connection', label: '连接配置', icon: Plug },
    { id: 'query', label: '数据查询', icon: BarChart3 },
    { id: 'alerts', label: '告警管理', icon: AlertTriangle },
    { id: 'rules', label: '告警规则', icon: FileText },
    { id: 'methods', label: '处置方法', icon: Book },
    ...(canAdmin ? [{ id: 'users', label: '用户管理', icon: Users }] : []),
    { id: 'settings', label: '系统设置', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        <div className={`${isCollapsed ? 'px-3' : 'px-6'} py-6 border-b border-slate-700`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-bold">ClickHouse</h1>
                <p className="text-xs text-slate-400">Monitor System</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <li key={item.id} className="relative">
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mx-3 mb-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-all"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>

        <div className="px-3 py-4 border-t border-slate-700">
          <div className={`px-4 py-3 bg-slate-800 rounded-lg ${isCollapsed ? 'flex justify-center' : ''}`}>
            {isCollapsed ? (
              <User className="w-5 h-5" />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{user?.displayName}</p>
                    <p className="text-xs text-slate-400">{getRoleLabel(user?.role || '')}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                  title="退出登录"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {!isCollapsed && (
          <div className="px-3 pb-4">
            <div className="px-4 py-3 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">系统状态</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-white">运行正常</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
