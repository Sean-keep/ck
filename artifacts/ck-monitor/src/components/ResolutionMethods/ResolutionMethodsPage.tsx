import { useState } from 'react';
import { Plus, Book, X, Trash2, Edit, Search } from 'lucide-react';
import { ResolutionMethod, Severity } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { getSeverityColor, getSeverityText } from '../../utils/helpers';

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string }> = [
  { value: 'critical', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
  { value: 'info', label: '信息' },
];

export default function ResolutionMethodsPage() {
  const { resolutionMethods, setResolutionMethods } = useApp();
  const { canWrite } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ResolutionMethod | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    alert_type: '',
    severity_range: [] as Severity[],
    steps: [''],
    tags: [] as string[],
  });

  const filteredMethods = resolutionMethods.filter(method =>
    method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    method.alert_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    method.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSave = () => {
    if (!form.name || !form.alert_type || form.steps.filter(s => s.trim()).length === 0) {
      alert('请填写必要字段');
      return;
    }
    const validSteps = form.steps.filter(s => s.trim() !== '');

    if (editingMethod) {
      setResolutionMethods(resolutionMethods.map(m =>
        m.id === editingMethod.id
          ? { ...m, ...form, steps: validSteps, updated_at: new Date().toISOString() }
          : m
      ));
    } else {
      const newMethod: ResolutionMethod = {
        ...form,
        steps: validSteps,
        id: `method-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setResolutionMethods([...resolutionMethods, newMethod]);
    }

    setShowModal(false);
    setEditingMethod(null);
    resetForm();
  };

  const resetForm = () => setForm({ name: '', description: '', alert_type: '', severity_range: [], steps: [''], tags: [] });

  const handleDelete = (id: string) => {
    if (confirm('确定删除该处置方法吗？')) {
      setResolutionMethods(resolutionMethods.filter(m => m.id !== id));
    }
  };

  const openEdit = (method: ResolutionMethod) => {
    setEditingMethod(method);
    setForm({
      name: method.name,
      description: method.description,
      alert_type: method.alert_type,
      severity_range: method.severity_range,
      steps: method.steps.length > 0 ? method.steps : [''],
      tags: method.tags,
    });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingMethod(null);
    resetForm();
    setShowModal(true);
  };

  const toggleSeverity = (severity: Severity) => {
    setForm(prev => ({
      ...prev,
      severity_range: prev.severity_range.includes(severity)
        ? prev.severity_range.filter(s => s !== severity)
        : [...prev.severity_range, severity],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">处置方法</h1>
          <p className="text-gray-600 mt-2">管理告警处置的标准方法和流程</p>
        </div>
        {canWrite && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            <Plus className="w-4 h-4" />
            新建处置方法
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="搜索处置方法名称、告警类型或标签..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMethods.map(method => (
          <div key={method.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Book className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{method.name}</h3>
                </div>
                <p className="text-sm text-gray-500">{method.description}</p>
              </div>
              {canWrite && (
                <div className="flex items-center gap-1.5 ml-3">
                  <button onClick={() => openEdit(method)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(method.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">适用告警类型</p>
                <p className="text-sm text-gray-900">{method.alert_type}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">适用严重程度</p>
                <div className="flex flex-wrap gap-1.5">
                  {method.severity_range.map(severity => (
                    <span
                      key={severity}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: getSeverityColor(severity) + '20', color: getSeverityColor(severity) }}
                    >
                      {getSeverityText(severity)}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">处置步骤</p>
                <ol className="list-decimal list-inside space-y-1">
                  {method.steps.map((step, idx) => (
                    <li key={idx} className="text-sm text-gray-700">{step}</li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">标签</p>
                <div className="flex flex-wrap gap-1.5">
                  {method.tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMethods.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">没有找到匹配的处置方法</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">
                {editingMethod ? '编辑处置方法' : '新建处置方法'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">方法名称 <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="如：暴力破解应急处置"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">方法描述</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="简要描述该处置方法的用途"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">适用告警类型 <span className="text-red-500">*</span></label>
                <input
                  value={form.alert_type}
                  onChange={e => setForm({ ...form, alert_type: e.target.value })}
                  placeholder="如：暴力破解登录检测"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">适用严重程度</label>
                <div className="flex flex-wrap gap-2">
                  {SEVERITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleSeverity(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        form.severity_range.includes(opt.value)
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                          : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">处置步骤 <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  {form.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded text-xs font-medium text-gray-600 flex-shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        value={step}
                        onChange={e => {
                          const steps = [...form.steps];
                          steps[idx] = e.target.value;
                          setForm({ ...form, steps });
                        }}
                        placeholder={`步骤 ${idx + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {form.steps.length > 1 && (
                        <button
                          onClick={() => setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) })}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setForm({ ...form, steps: [...form.steps, ''] })}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    添加步骤
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签（用逗号分隔）</label>
                <input
                  value={form.tags.join(', ')}
                  onChange={e => setForm({ ...form, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                  placeholder="如：安全, 登录, 暴力破解, IP封禁"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                取消
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
                {editingMethod ? '保存更改' : '创建方法'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
