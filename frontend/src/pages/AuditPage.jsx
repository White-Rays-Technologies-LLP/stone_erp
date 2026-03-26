import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import toast from 'react-hot-toast';

const ACTION_COLORS = { CREATE: 'badge-completed', UPDATE: 'badge-wip', DELETE: 'badge-sec', LOGIN: 'badge-core' };

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const r = await auditAPI.getLogs({ page: p, limit: 50 });
      setLogs(r.data || []);
    } catch { toast.error('Failed to load audit logs'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.table_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🔐 Audit Log</div>
          <div className="page-sub">Complete system activity trail with JWT-authenticated user tracking</div>
        </div>
        <button className="btn btn-ghost" onClick={() => load()}>↻ Refresh</button>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Search by action, table, user…" value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ fontSize: 12, color: '#64748b' }}>{filtered.length} entries</span>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Table</th><th>Record ID</th><th>Description</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={6} className="no-data">No audit logs found</td></tr>
              : filtered.map((log, i) => (
                <tr key={log.id || i}>
                  <td style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : '—'}</td>
                  <td style={{ fontSize: 12 }}>{log.user_name || `User #${log.user_id}`}</td>
                  <td><span className={`badge ${ACTION_COLORS[log.action] || 'badge-ui'}`}>{log.action}</span></td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8faff', padding: '1px 8px', borderRadius: 5, border: '1px solid #e2e8f0' }}>{log.table_name}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>#{log.record_id}</td>
                  <td style={{ fontSize: 12, color: '#374151', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
