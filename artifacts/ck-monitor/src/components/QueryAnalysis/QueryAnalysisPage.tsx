import { useState } from 'react';
import { Play, RefreshCw, BarChart3 } from 'lucide-react';
import { AggregationType } from '../../types';
import { MOCK_TABLES, MOCK_FIELDS, generateMockQueryResult } from '../../data/mockData';
import { useApp } from '../../contexts/AppContext';

export default function QueryAnalysisPage() {
  const { demoMode } = useApp();
  const [config, setConfig] = useState({
    tableName: '',
    groupByField: '',
    aggregationType: 'COUNT' as AggregationType,
    timeWindowMinutes: 60,
    filterCondition: '',
    limit: 20,
  });
  const [results, setResults] = useState<Array<{ [key: string]: string | number }>>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [queryDuration, setQueryDuration] = useState<number | null>(null);

  const handleQuery = async () => {
    if (!config.tableName || !config.groupByField) {
      setQueryError('请选择数据表和分组字段');
      return;
    }
    setQueryError('');
    setIsQuerying(true);
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!demoMode && Math.random() < 0.1) {
      setQueryError('查询失败：数据库连接超时');
      setIsQuerying(false);
      return;
    }

    const data = generateMockQueryResult({ groupByField: config.groupByField, aggregationType: config.aggregationType, limit: config.limit });
    setResults(data);
    setQueryDuration(Date.now() - startTime);
    setIsQuerying(false);
  };

  const AGGREGATION_OPTIONS = [
    { value: 'COUNT', label: 'COUNT - 计数' },
    { value: 'SUM', label: 'SUM - 求和' },
    { value: 'AVG', label: 'AVG - 平均值' },
    { value: 'MIN', label: 'MIN - 最小值' },
    { value: 'MAX', label: 'MAX - 最大值' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">数据查询</h1>
        <p className="text-gray-600 mt-2">查询和分析 ClickHouse 数据</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">查询配置</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">数据表</label>
            <select
              value={config.tableName}
              onChange={e => setConfig({ ...config, tableName: e.target.value, groupByField: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择数据表</option>
              {MOCK_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分组字段</label>
            <select
              value={config.groupByField}
              onChange={e => setConfig({ ...config, groupByField: e.target.value })}
              disabled={!config.tableName}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">选择字段</option>
              {(MOCK_FIELDS[config.tableName] || []).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">聚合类型</label>
            <select
              value={config.aggregationType}
              onChange={e => setConfig({ ...config, aggregationType: e.target.value as AggregationType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AGGREGATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">时间窗口（分钟）</label>
            <input
              type="number"
              value={config.timeWindowMinutes}
              onChange={e => setConfig({ ...config, timeWindowMinutes: parseInt(e.target.value) || 60 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">过滤条件（可选）</label>
            <input
              type="text"
              value={config.filterCondition}
              onChange={e => setConfig({ ...config, filterCondition: e.target.value })}
              placeholder="如: status = 'failed'"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">返回行数限制</label>
            <input
              type="number"
              value={config.limit}
              onChange={e => setConfig({ ...config, limit: parseInt(e.target.value) || 20 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {queryError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">{queryError}</div>
        )}

        <button
          onClick={handleQuery}
          disabled={isQuerying}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60"
        >
          {isQuerying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {isQuerying ? '查询中...' : '执行查询'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">查询结果</h2>
            {queryDuration !== null && (
              <span className="text-sm text-gray-500">
                {results.length} 行 · 耗时 {queryDuration}ms
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {Object.keys(results[0]).map(key => (
                    <th key={key} className="text-left py-3 px-4 text-sm font-semibold text-gray-600">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="py-3 px-4 text-sm text-gray-900 font-mono">{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
