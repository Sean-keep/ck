import { useState } from 'react';
import { Play, RefreshCw, BarChart3, Table, Database, Clock, Download } from 'lucide-react';
import { AggregationType } from '../../types';
import { MOCK_TABLES, MOCK_FIELDS, generateMockQueryResult } from '../../data/mockData';
import { useApp } from '../../contexts/AppContext';

const AGGREGATION_OPTIONS = [
  { value: 'COUNT', label: 'COUNT - 计数' },
  { value: 'SUM', label: 'SUM - 求和' },
  { value: 'AVG', label: 'AVG - 平均值' },
  { value: 'MIN', label: 'MIN - 最小值' },
  { value: 'MAX', label: 'MAX - 最大值' },
];

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
  const [results, setResults] = useState<Array<{ [key: string]: string | number }> | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [queryDuration, setQueryDuration] = useState<number | null>(null);
  const [hasQueried, setHasQueried] = useState(false);

  const generatedSQL = config.tableName && config.groupByField
    ? `SELECT ${config.groupByField}, ${config.aggregationType}(*) AS value\nFROM ${config.tableName}\n${config.filterCondition ? `WHERE ${config.filterCondition}\n` : ''}GROUP BY ${config.groupByField}\nORDER BY value DESC\nLIMIT ${config.limit}`
    : '';

  const handleQuery = async () => {
    if (!config.tableName || !config.groupByField) {
      setQueryError('请选择数据表和分组字段');
      return;
    }
    setQueryError('');
    setIsQuerying(true);
    setHasQueried(true);
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

    if (!demoMode && Math.random() < 0.1) {
      setQueryError('查询失败：数据库连接超时，请检查连接配置');
      setIsQuerying(false);
      setResults(null);
      return;
    }

    const data = generateMockQueryResult({
      groupByField: config.groupByField,
      aggregationType: config.aggregationType,
      limit: config.limit,
    });
    setResults(data);
    setQueryDuration(Date.now() - startTime);
    setIsQuerying(false);
  };

  const handleExport = () => {
    if (!results || results.length === 0) return;
    const headers = Object.keys(results[0]).join(',');
    const rows = results.map(r => Object.values(r).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Database className="w-7 h-7 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">数据查询</h1>
        </div>
        <p className="text-gray-600 ml-10">查询和分析 ClickHouse 数据库中的数据</p>
      </div>

      <div className="flex flex-col flex-1 px-8 gap-6 pb-8">
        {/* ── 上部：查询配置 ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">查询配置</h2>
            </div>
            <button
              onClick={handleQuery}
              disabled={isQuerying}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60 shadow-sm"
            >
              {isQuerying
                ? <><RefreshCw className="w-4 h-4 animate-spin" />查询中...</>
                : <><Play className="w-4 h-4" />执行查询</>
              }
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">数据表</label>
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
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">分组字段 (GROUP BY)</label>
                <select
                  value={config.groupByField}
                  onChange={e => setConfig({ ...config, groupByField: e.target.value })}
                  disabled={!config.tableName}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">选择字段</option>
                  {(MOCK_FIELDS[config.tableName] || []).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">聚合函数</label>
                <select
                  value={config.aggregationType}
                  onChange={e => setConfig({ ...config, aggregationType: e.target.value as AggregationType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {AGGREGATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">时间窗口（分钟）</label>
                <input
                  type="number"
                  value={config.timeWindowMinutes}
                  onChange={e => setConfig({ ...config, timeWindowMinutes: parseInt(e.target.value) || 60 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">WHERE 过滤条件</label>
                <input
                  type="text"
                  value={config.filterCondition}
                  onChange={e => setConfig({ ...config, filterCondition: e.target.value })}
                  placeholder="如: status = 'failed'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">LIMIT 行数</label>
                <input
                  type="number"
                  value={config.limit}
                  onChange={e => setConfig({ ...config, limit: Math.max(1, parseInt(e.target.value) || 20) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {generatedSQL && (
              <div className="bg-slate-900 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-2 font-medium">生成 SQL</p>
                <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap leading-relaxed">{generatedSQL}</pre>
              </div>
            )}
          </div>
        </div>

        {/* ── 下部：查询结果 ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-900">查询结果</h2>
              {results !== null && (
                <span className="text-sm text-gray-400">
                  — {results.length} 行
                  {queryDuration !== null && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {queryDuration}ms
                    </span>
                  )}
                </span>
              )}
            </div>
            {results && results.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                导出 CSV
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {queryError && (
              <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">查询失败</p>
                <p className="text-sm text-red-600 mt-1">{queryError}</p>
              </div>
            )}

            {isQuerying && (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-500">正在查询数据库...</p>
              </div>
            )}

            {!isQuerying && !queryError && results === null && (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                <Database className="w-12 h-12 text-gray-200" />
                <p className="text-sm">{hasQueried ? '没有返回数据' : '配置查询参数后点击"执行查询"'}</p>
              </div>
            )}

            {!isQuerying && results && results.length > 0 && (
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                    {Object.keys(results[0]).map(key => (
                      <th key={key} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    <tr key={idx} className={`border-b border-gray-50 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="py-3 px-4 text-xs text-gray-400 font-mono">{idx + 1}</td>
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="py-3 px-4 text-sm text-gray-900 font-mono">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
