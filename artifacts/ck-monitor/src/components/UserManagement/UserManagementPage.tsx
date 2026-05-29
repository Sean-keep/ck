import { useState } from 'react';
import { Plus, X, Edit, Trash2, Users, Shield, Eye, Wrench } from 'lucide-react';
import { AppUser, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils/helpers';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string; color: string; icon: React.ElementType }> = [
  { value: 'admin', label: '管理员', description: '拥有所有权限，可管理用户、规则、告警和系统配置', color: 'text-red-700 bg-red-100', icon: Shield },
  { value: 'operator', label: '运维工程师', description: '可处理告警、管理规则和处置方法，不可管理用户', color: 'text-blue-700 bg-blue-100', icon: Wrench },
  { value: 'viewer', label: '只读用户', description: '仅可查看所有数据，不可进行任何修改操作', color: 'text-gray-700 bg-gray-100', icon: Eye },
];

const PERMISSIONS: Record<UserRole, { label: string; allowed: boolean }[]> = {
  admin: [
    { label: '查看监控数据', allowed: true }, { label: '处理告警', allowed: true },
    { label: '管理告警规则', allowed: true }, { label: '管理处置方法', allowed: true },
    { label: '配置连接参数', allowed: true }, { label: '修改系统设置', allowed: true },
    { label: '管理用户账户', allowed: true },
  ],
  operator: [
    { label: '查看监控数据', allowed: true }, { label: '处理告警', allowed: true },
    { label: '管理告警规则', allowed: true }, { label: '管理处置方法', allowed: true },
    { label: '配置连接参数', allowed: true }, { label: '修改系统设置', allowed: false },
    { label: '管理用户账户', allowed: false },
  ],
  viewer: [
    { label: '查看监控数据', allowed: true }, { label: '处理告警', allowed: false },
    { label: '管理告警规则', allowed: false }, { label: '管理处置方法', allowed: false },
    { label: '配置连接参数', allowed: false }, { label: '修改系统设置', allowed: false },
    { label: '管理用户账户', allowed: false },
  ],
};

const defaultForm = { username: '', displayName: '', role: 'viewer' as UserRole, email: '', password: '', enabled: true };

export default function UserManagementPage() {
  const { users, createUser, updateUser, deleteUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showPermsFor, setShowPermsFor] = useState<UserRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.username || !form.displayName || !form.email) {
      setError('请填写用户名、显示名称和邮箱');
      return;
    }
    if (!editingUser && !form.password) {
      setError('请填写初始密码');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          displayName: form.displayName, role: form.role,
          email: form.email, enabled: form.enabled,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await createUser({ username: form.username, displayName: form.displayName, role: form.role, email: form.email, password: form.password });
      }
      setShowModal(false);
      setEditingUser(null);
      setForm(defaultForm);
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (users.find(u => u.id === id)?.username === 'admin') { alert('不能删除 admin 账户'); return; }
    if (!confirm('确定删除该用户吗？')) return;
    await deleteUser(id);
  };

  const handleToggleEnabled = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (user?.username === 'admin') { alert('不能禁用 admin 账户'); return; }
    if (user) await updateUser(id, { enabled: !user.enabled });
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setForm({ username: user.username, displayName: user.displayName, role: user.role, email: user.email, password: '', enabled: user.enabled });
    setError('');
    setShowModal(true);
  };

  const getRoleInfo = (role: UserRole) => ROLE_OPTIONS.find(r => r.value === role)!;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-600 mt-2">管理系统用户账户和访问权限</p>
        </div>
        <button onClick={() => { setEditingUser(null); setForm(defaultForm); setError(''); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" />新建用户
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {ROLE_OPTIONS.map(role => {
          const count = users.filter(u => u.role === role.value && u.enabled).length;
          const Icon = role.icon;
          return (
            <div key={role.value} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full ${role.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{role.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{role.description}</p>
              <button onClick={() => setShowPermsFor(showPermsFor === role.value ? null : role.value)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800">
                {showPermsFor === role.value ? '收起权限' : '查看权限'}
              </button>
              {showPermsFor === role.value && (
                <div className="mt-2 space-y-1">
                  {PERMISSIONS[role.value].map(perm => (
                    <div key={perm.label} className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${perm.allowed ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={`text-xs ${perm.allowed ? 'text-gray-700' : 'text-gray-400'}`}>{perm.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">用户列表 ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">用户</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">角色</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">邮箱</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">最后登录</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">状态</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const roleInfo = getRoleInfo(user.role);
                const RoleIcon = roleInfo.icon;
                return (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 flex items-center justify-center text-white text-sm font-semibold">
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.displayName}</p>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                        <RoleIcon className="w-3.5 h-3.5" />{roleInfo.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{user.email}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{user.lastLogin ? formatDateTime(user.lastLogin) : '从未登录'}</td>
                    <td className="py-4 px-4">
                      <button onClick={() => handleToggleEnabled(user.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${user.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {user.enabled ? '启用' : '禁用'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.username !== 'admin' && (
                          <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingUser ? '编辑用户' : '新建用户'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户名 <span className="text-red-500">*</span></label>
                  <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                    disabled={!!editingUser} placeholder="login_name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">显示名称 <span className="text-red-500">*</span></label>
                  <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })}
                    placeholder="张三" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="user@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? '新密码（留空不修改）' : '初始密码 *'}
                </label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">角色 <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map(role => {
                    const Icon = role.icon;
                    return (
                      <label key={role.value} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${form.role === role.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" value={role.value} checked={form.role === role.value}
                          onChange={() => setForm({ ...form, role: role.value })} className="mt-0.5" />
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${role.color}`}>
                            <Icon className="w-3.5 h-3.5" />{role.label}
                          </span>
                          <span className="text-xs text-gray-500">{role.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center justify-between py-2 border-t border-gray-100 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-900">启用账户</p>
                  <p className="text-xs text-gray-500">禁用后该用户无法登录系统</p>
                </div>
                <div onClick={() => setForm({ ...form, enabled: !form.enabled })}
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors cursor-pointer ${form.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">取消</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">
                {saving ? '保存中...' : editingUser ? '保存更改' : '创建用户'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
