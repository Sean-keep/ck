import { useState } from 'react';
import { Play, RefreshCw, Table, Database, Clock, Download, Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
import { MOCK_TABLES, MOCK_FIELDS } from '../../data/mockData';
import { useApp } from '../../contexts/AppContext';

type SortDir = 'ASC' | 'DESC';

interface Condition {
  id: number;
  field: string;
  op: string;
  value: string;
}

const OPS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'];

function generateRows(fields: string[], count: number): Array<Record<string, string | number>> {
  const samples: Record<string, string[]> = {
    event_type: ['login', 'logout', 'purchase', 'view', 'click'],
    user_id: ['u_1001', 'u_1002', 'u_1003', 'u_1004', 'u_1005'],
    ip_address: ['192.168.1.1', '10.0.0.5', '172.16.0.2', '203.0.113.1', '198.51.100.7'],
    status: ['success', 'failure', 'pending', 'error', 'timeout'],
    level: ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL'],
    message: ['User logged in', 'Request failed', 'Cache miss', 'Timeout', 'Retry succeeded'],
    source: ['app', 'gateway', 'worker', 'cron', 'webhook'],
    service: ['auth', 'payment', 'search', 'cdn', 'db'],
    metric_name: ['cpu_usage', 'mem_usage', 'disk_io', 'net_in', 'net_out'],
    host: ['host-01', 'host-02', 'host-03', 'host-04'],
    action: ['click', 'scroll', 'submit', 'navigate', 'hover'],
    session_id: ['sess_aaa', 'sess_bbb', 'sess_ccc', 'sess_ddd'],
    result: ['ok', 'error', 'timeout', 'canceled'],
    endpoint: ['/api/login', '/api/data', '/api/health', '/api/user', '/api/order'],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    status_code: ['200', '201', '400', '401', '500'],
    response_time: ['45', '120', '300', '800', '2500'],
    error_type: ['NullPointer', 'Timeout', 'Auth', 'NotFound', 'RateLimit'],
    error_message: ['Connection refused', 'Invalid token', 'Resource not found', 'Rate limit exceeded'],
    stack_trace: ['at main()', 'at handler()', 'at service()'],
    timestamp: ['2026-05-29 10:00:00', '2026-05-29 10:05:00', '2026-05-29 10:10:00'],
    value: [12, 45, 78, 100, 256],
    tags: ['env:prod', 'env:staging', 'region:us', 'region:eu'],
  };

  return Array.from({ length: count }, (_, i) => {
    const row: Record<string, string | number> = { _row: i + 1 };
    for (const f of fields) {
      const opts = samples[f];
      if (!opts) {
        row[f] = `val_${i + 1}`;
      } else if (typeof opts[0] === 'number') {
        row[f] = (opts as number[])[i % opts.length];
      } else {
        row[f] = (opts as string[])[i % opts.length];
      }
    }
    return row;
  });
}

export default function QueryAnalysisPage() {
  const { demoMode } = useApp();

  const [tableName, setTableName] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [orderByField, setOrderByField] = useState('');
  const [orderDir, setOrderDir] = useState<SortDir>('ASC');
  const [limit, setLimit] = useState(50);

  const [results, setResults] = useState<Array<Record<string, string | number>> | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [queryDuration, setQueryDuration] = useState<number | null>(null);
  const [hasQueried, setHasQueried] = useState(false);

  const allFields = MOCK_FIELDS[tableName] || [];

  const handleTableChange = (t: string) => {
    setTableName(t);
    setSelectedFields([]);
    setConditions([]);
    setOrderByField('');
    setResults(null);
    setQueryError('');
  };

  const toggleField = (f: string) => {
    setSelectedFields(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const addCondition = () => {
    setConditions(prev => [...prev, { id: Date.now(), field: allFields[0] || '', op: '=', value: '' }]);
  };

  const updateCondition = (id: number, key: keyof Condition, val: string) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, [key]: val } : c));
  };

  const removeCondition = (id: number) => {
    setConditions(prev => prev.filter(c => c.id !== id));
  };

  const displayFields = selectedFields.length > 0 ? selectedFields : allFields;

  const generatedSQL = tableName
    ? [
        `SELECT ${displayFields.length > 0 ? displayFields.join(', ') : '*'}`,
        `FROM ${tableName}`,
        ...(conditions.filter(c => c.field && c.op).length > 0
          ? [`WHERE ${conditions.filter(c => c.field && c.op).map(c =>
              c.op === 'IS NULL' || c.op === 'IS NOT NULL'
                ? `${c.field} ${c.op}`
                : `${c.field} ${c.op} '${c.value}'`
            ).join('\n  AND ')}`]
          : []),
        ...(orderByField ? [`ORDER BY ${orderByField} ${orderDir}`] : []),
        `LIMIT ${limit}`,
      ].join('\n')
    : '';

  const handleQuery = async () => {
    if (!tableName) { setQueryError('请先选择数据表'); return; }
    setQueryError('');
    setIsQuerying(true);
    setHasQueried(true);
    const t0 = Date.now();
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    if (!demoMode && Math.random() < 0.08) {
      setQueryError('查询失败：连接超时，请检查连接配置');
      setIsQuerying(false);
      setResults(null);
      return;
    }

    const rows = generateRows(displayFields.length > 0 ? displayFields : allFields, Math.min(limit, 200));
    setResults(rows);
    setQueryDuration(Date.now() - t0);
    setIsQuerying(false);
  };

  const handleExport = () => {
    if (!results?.length) return;
    const cols = Object.keys(results[0]).filter(k => k !== '_row');
    const header = cols.join(',');
    const body = results.map(r => cols.map(c => String(r[c])).join(','));
    const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${tableName}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Database className="w-7 h-7 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">数据查询</h1>
        </div>
        <p className="text-gray-500 ml-10 text-sm">选择表、字段和过滤条件，查询 ClickHouse 原始数据</p>
      </div>

      <div className="flex flex-col gap-5 px-8 pb-8">
        {/* ── 查询配置 ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Table className="w-4 h-4 text-blue-500" />
              查询配置
            </h2>
            <button
              onClick={handleQuery}
              disabled={isQuerying || !tableName}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isQuerying
                ? <><RefreshCw className="w-4 h-4 animate-spin" />查询中...</>
                : <><Play className="w-4 h-4" />执行查询</>}
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Row 1: table + limit + order */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">数据表 *</label>
                <select
                  value={tableName}
                  onChange={e => handleTableChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择数据表</option>
                  {MOCK_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">返回行数 (LIMIT)</label>
                <input
                  type="number"
                  value={limit}
                  onChange={e => setLimit(Math.max(1, Math.min(1000, parseInt(e.target.value) || 50)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ORDER BY</label>
                <div className="flex gap-1.5">
                  <select
                    value={orderByField}
                    onChange={e => setOrderByField(e.target.value)}
                    disabled={!tableName}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">默认排序</option>
                    {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <button
                    onClick={() => setOrderDir(d => d === 'ASC' ? 'DESC' : 'ASC')}
                    disabled={!orderByField}
                    className="px-2.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition flex items-center gap-1"
                    title={orderDir}
                  >
                    {orderDir === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span className="text-xs font-mono">{orderDir}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: field selector */}
            {tableName && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  SELECT 字段 <span className="font-normal text-gray-400">（不选则返回所有字段）</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedFields([])}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${selectedFields.length === 0 ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    * 全部字段
                  </button>
                  {allFields.map(f => (
                    <button
                      key={f}
                      onClick={() => toggleField(f)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition ${selectedFields.includes(f) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Row 3: WHERE conditions */}
            {tableName && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">WHERE 条件</label>
                  <button
                    onClick={addCondition}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加条件
                  </button>
                </div>
                {conditions.length === 0 && (
                  <p className="text-xs text-gray-400 italic">无过滤条件，返回所有数据</p>
                )}
                <div className="space-y-2">
                  {conditions.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-2">
                      {i > 0 && <span className="text-xs font-semibold text-blue-600 w-8 text-right flex-shrink-0">AND</span>}
                      {i === 0 && <span className="w-8 flex-shrink-0" />}
                      <select
                        value={c.field}
                        onChange={e => updateCondition(c.id, 'field', e.target.value)}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <select
                        value={c.op}
                        onChange={e => updateCondition(c.id, 'op', e.target.value)}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {OPS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      {c.op !== 'IS NULL' && c.op !== 'IS NOT NULL' && (
                        <input
                          value={c.value}
                          onChange={e => updateCondition(c.id, 'value', e.target.value)}
                          placeholder="值"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                      <button onClick={() => removeCondition(c.id)} className="p-1 text-gray-400 hover:text-red-500 transition">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SQL preview */}
            {generatedSQL && (
              <div className="bg-slate-900 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1.5 font-medium">生成 SQL</p>
                <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap leading-relaxed">{generatedSQL}</pre>
              </div>
            )}
          </div>
        </div>

        {/* ── 查询结果 ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm" style={{ minHeight: 320 }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">查询结果</h2>
              {results !== null && (
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  — {results.length} 行
                  {queryDuration !== null && (
                    <><Clock className="w-3.5 h-3.5 ml-1" />{queryDuration}ms</>
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

          <div className="overflow-auto" style={{ maxHeight: 480 }}>
            {isQuerying && (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                <p className="text-sm text-gray-400">正在查询数据库...</p>
              </div>
            )}

            {!isQuerying && queryError && (
              <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">查询失败</p>
                <p className="text-sm text-red-500 mt-1">{queryError}</p>
              </div>
            )}

            {!isQuerying && !queryError && results === null && (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-300">
                <Database className="w-12 h-12" />
                <p className="text-sm text-gray-400">{hasQueried ? '暂无数据' : '配置查询后点击"执行查询"'}</p>
              </div>
            )}

            {!isQuerying && results && results.length > 0 && (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 w-12">#</th>
                    {Object.keys(results[0]).filter(k => k !== '_row').map(col => (
                      <th key={col} className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-50 hover:bg-blue-50/40 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="py-2.5 px-4 text-xs text-gray-300 font-mono select-none">{i + 1}</td>
                      {Object.entries(row).filter(([k]) => k !== '_row').map(([k, v]) => (
                        <td key={k} className="py-2.5 px-4 text-gray-800 font-mono whitespace-nowrap">{String(v)}</td>
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
