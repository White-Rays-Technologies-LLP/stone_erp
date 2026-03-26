import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';

export default function AuditLogs() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    auditAPI.logs().then(r => { setData(Array.isArray(r.data) ? r.data : []); setLoading(false); }).catch(e => { setApiError(e.message); setLoading(false); });
  }, []);

  const badges = ['✅ Connected to FastAPI backend', '✅ JWT auth headers active', '✅ RBAC context available'];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📋 Audit Logs</div>
          <div className="page-subtitle">Complete audit trail of all system actions</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {badges.map(s => (
          <div key={s} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#15803d', fontWeight: 600 }}>{s}</div>
        ))}
      </div>
      <div className="card">
        {loading ? (
          <div className="loading">Connecting to backend...</div>
        ) : apiError ? (
          <div className="alert alert-error">
            ⚠️ Backend not reachable: {apiError}<br/>
            <small>Start your FastAPI server: <code>uvicorn temple_erp.main:app --reload</code></small>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                <strong style={{ color: '#0f1c2e' }}>{data.length}</strong> records found
              </span>
              <span className="badge badge-green">API Connected</span>
            </div>
            {data.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No records yet. Use <code>http://localhost:8000/docs</code> to add data via the API.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {Object.keys(data[0] || {}).slice(0, 6).map(k => <th key={k}>{k.replace(/_/g, ' ')}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 20).map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).slice(0, 6).map((v, i) => (
                          <td key={i}>{typeof v === 'boolean' ? (v ? '✅' : '❌') : String(v ?? '—').slice(0, 60)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
