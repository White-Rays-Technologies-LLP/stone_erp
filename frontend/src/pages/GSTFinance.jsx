import { useState, useEffect } from 'react';
import { gstAPI, projectsAPI } from '../services/api';

export default function GSTFinance() {
  const [tab, setTab] = useState('calculator');
  const [projects, setProjects] = useState([]);
  const [calcForm, setCalcForm] = useState({ taxable_amount: '', gst_rate: 18, from_state_code: '', to_state_code: '' });
  const [calcResult, setCalcResult] = useState(null);
  const [costs, setCosts] = useState([]);
  const [margins, setMargins] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { projectsAPI.list().then(r => setProjects(r.data || [])); }, []);

  const calculate = async () => {
    try {
      const r = await gstAPI.calculate({ taxable_amount: Number(calcForm.taxable_amount), gst_rate: Number(calcForm.gst_rate), from_state_code: calcForm.from_state_code, to_state_code: calcForm.to_state_code, is_interstate: calcForm.from_state_code !== calcForm.to_state_code });
      setCalcResult(r.data);
    } catch (e) { alert('Calculation failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const loadCosts = async () => {
    setLoading(true);
    try { const r = await gstAPI.allProjectCosts(); setCosts(r.data || []); } catch { } finally { setLoading(false); }
  };

  const loadMargins = async () => {
    setLoading(true);
    try { const r = await gstAPI.allMarginReports(); setMargins(r.data || []); } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'costs') loadCosts(); else if (tab === 'margins') loadMargins(); }, [tab]);

  const intraState = calcForm.from_state_code && calcForm.to_state_code && calcForm.from_state_code === calcForm.to_state_code;

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">🧾 GST & Finance Module</div><div className="page-subtitle">CGST/SGST/IGST engine with GSTR-1 export and project costing</div></div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        <button onClick={() => setTab('calculator')} className="btn" style={{ background: tab === 'calculator' ? '#1e40af' : '#fff', color: tab === 'calculator' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>🧮 Calculator</button>
        <button onClick={() => setTab('costs')} className="btn" style={{ background: tab === 'costs' ? '#1e40af' : '#fff', color: tab === 'costs' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>📊 Project Costs</button>
        <button onClick={() => setTab('margins')} className="btn" style={{ background: tab === 'margins' ? '#1e40af' : '#fff', color: tab === 'margins' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>📈 Margin Report</button>
      </div>

      {tab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '20px' }}>GST Calculator</div>
            <div className="form-group"><label className="form-label">Taxable Amount (₹) *</label><input className="form-input" type="number" value={calcForm.taxable_amount} onChange={e => setCalcForm(p => ({ ...p, taxable_amount: e.target.value }))} /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">GST Rate %</label>
                <select className="form-select" value={calcForm.gst_rate} onChange={e => setCalcForm(p => ({ ...p, gst_rate: e.target.value }))}>
                  <option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Transaction Type</label>
                <div style={{ padding: '9px 12px', border: '1px solid #dce8f5', borderRadius: '8px', fontSize: '13px', background: intraState ? '#f0fdf4' : '#eff6ff', color: intraState ? '#15803d' : '#1e40af', fontWeight: 600 }}>
                  {intraState ? '🔵 Intra-State (CGST+SGST)' : '🟠 Inter-State (IGST)'}
                </div>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">From State Code</label><input className="form-input" value={calcForm.from_state_code} onChange={e => setCalcForm(p => ({ ...p, from_state_code: e.target.value }))} placeholder="27" /></div>
              <div className="form-group"><label className="form-label">To State Code</label><input className="form-input" value={calcForm.to_state_code} onChange={e => setCalcForm(p => ({ ...p, to_state_code: e.target.value }))} placeholder="27" /></div>
            </div>
            <button className="btn btn-primary" onClick={calculate} disabled={!calcForm.taxable_amount}>Calculate GST</button>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '20px' }}>Result</div>
            {!calcResult ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}><div style={{ fontSize: '40px', marginBottom: '10px' }}>🧮</div>Enter values and calculate</div>
            ) : (
              <div>
                <div style={{ padding: '16px', background: '#f8faff', borderRadius: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#64748b' }}>Base Amount</span><span style={{ fontWeight: 700 }}>₹{Number(calcResult.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  {calcResult.cgst_amount != null && (<>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ color: '#16a34a' }}>CGST ({calcResult.cgst_rate}%)</span><span style={{ fontWeight: 600, color: '#16a34a' }}>+ ₹{Number(calcResult.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ color: '#16a34a' }}>SGST ({calcResult.sgst_rate}%)</span><span style={{ fontWeight: 600, color: '#16a34a' }}>+ ₹{Number(calcResult.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  </>)}
                  {calcResult.igst_amount != null && calcResult.igst_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ color: '#1e40af' }}>IGST ({calcResult.igst_rate}%)</span><span style={{ fontWeight: 600, color: '#1e40af' }}>+ ₹{Number(calcResult.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  )}
                  <div style={{ borderTop: '1px solid #dce8f5', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700 }}>Total Amount</span><span style={{ fontWeight: 800, fontSize: '18px', color: '#f97316' }}>₹{Number(calcResult.gross_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'costs' && (
        <div className="card">
          {loading ? <div className="loading">Loading...</div> : costs.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📊</div><p>No project costs data</p></div>
          ) : (
            <div className="table-wrap"><table>
              <thead><tr><th>Project</th><th>Type</th><th>Description</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{projects.find(p => p.id === c.project_id)?.name || c.project_id}</strong></td>
                    <td>{c.cost_type}</td>
                    <td>{c.description || '—'}</td>
                    <td>₹{Number(c.amount || 0).toLocaleString('en-IN')}</td>
                    <td>{c.date || '—'}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={async () => {
                          if (!window.confirm('Delete this project cost?')) return;
                          try { await gstAPI.deleteProjectCost(c.id); loadCosts(); } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === 'margins' && (
        <div className="card">
          {loading ? <div className="loading">Loading...</div> : margins.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📈</div><p>No margin data</p></div>
          ) : (
            <div className="table-wrap"><table>
              <thead><tr><th>Project</th><th>Revenue</th><th>Total Cost</th><th>Gross Profit</th><th>Margin %</th></tr></thead>
              <tbody>
                {margins.map((m, i) => (<tr key={i}>
                  <td><strong>{projects.find(p => p.id === m.project_id)?.name || m.project_id}</strong></td>
                  <td>₹{Number(m.revenue || 0).toLocaleString('en-IN')}</td>
                  <td>₹{Number(m.total_cost || 0).toLocaleString('en-IN')}</td>
                  <td style={{ color: (m.gross_profit || 0) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>₹{Number(m.gross_profit || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                        <div style={{ width: `${Math.min(Math.abs(m.margin_pct || 0), 100)}%`, height: '100%', background: (m.margin_pct || 0) >= 0 ? '#16a34a' : '#dc2626', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontWeight: 700, color: (m.margin_pct || 0) >= 20 ? '#16a34a' : '#d97706' }}>{(m.margin_pct || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>))}
              </tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  );
}
