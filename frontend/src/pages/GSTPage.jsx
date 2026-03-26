import { useState, useEffect } from 'react';
import { gstAPI, projectsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function GSTPage() {
  const [tab, setTab] = useState(0);
  const [projects, setProjects] = useState([]);
  const [calcForm, setCalcForm] = useState({ amount: '', gst_rate: '18', from_state: '27', to_state: '27' });
  const [calcResult, setCalcResult] = useState(null);
  const [gstr1, setGstr1] = useState([]);
  const [costs, setCosts] = useState(null);
  const [margins, setMargins] = useState([]);
  const [gstr1Period, setGstr1Period] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [selProject, setSelProject] = useState('');

  useEffect(() => { projectsAPI.getProjects().then(r => setProjects(r.data || [])).catch(() => {}); }, []);

  const calcGST = async () => {
    try {
      const res = await gstAPI.calculate({ amount: Number(calcForm.amount), gst_rate: Number(calcForm.gst_rate), from_state_code: calcForm.from_state, to_state_code: calcForm.to_state });
      setCalcResult(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const loadGSTR1 = async () => {
    try {
      const res = await gstAPI.getGSTR1({ month: gstr1Period.month, year: gstr1Period.year });
      setGstr1(res.data || []);
    } catch { toast.error('Failed to load GSTR-1'); }
  };

  const loadCosts = async (pid) => {
    setSelProject(pid);
    if (!pid) return;
    try { const res = await gstAPI.getProjectCosts(pid); setCosts(res.data); }
    catch { toast.error('Failed to load project costs'); }
  };

  const loadMargins = async () => {
    try { const res = await gstAPI.getMarginReport(); setMargins(res.data || []); }
    catch { toast.error('Failed to load margin report'); }
  };

  const TABS = ['GST Calculator', 'GSTR-1 Export', 'Project Costs', 'Margin Report'];

  const intraState = calcForm.from_state === calcForm.to_state;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🧾 GST & Finance Module</div>
          <div className="page-sub">CGST/SGST/IGST engine, GSTR-1 export and project costing</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #dce8f5' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => { setTab(i); if (i === 3) loadMargins(); }}
            style={{ padding: '8px 16px', border: 'none', borderBottom: tab === i ? '2px solid #f97316' : '2px solid transparent', background: 'none', cursor: 'pointer', fontWeight: tab === i ? 700 : 500, color: tab === i ? '#f97316' : '#64748b', fontSize: 13, fontFamily: 'inherit', marginBottom: -1 }}>
            {t}
          </button>
        ))}
      </div>

      {/* GST Calculator */}
      {tab === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>GST Calculator</div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Base Amount (₹) *</label>
                <input type="number" value={calcForm.amount} onChange={e => setCalcForm(p => ({ ...p, amount: e.target.value }))} placeholder="Enter amount" style={{ fontSize: 18, fontWeight: 700 }} />
              </div>
              <div className="field">
                <label>GST Rate %</label>
                <select value={calcForm.gst_rate} onChange={e => setCalcForm(p => ({ ...p, gst_rate: e.target.value }))}>
                  <option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                </select>
              </div>
              <div className="field">
                <label>Transaction Type</label>
                <div style={{ padding: '9px 12px', border: '1px solid #dce8f5', borderRadius: 8, fontSize: 13, background: intraState ? '#f0fdf4' : '#eff6ff', color: intraState ? '#15803d' : '#1e40af', fontWeight: 600 }}>
                  {intraState ? '🔵 Intra-State (CGST + SGST)' : '🟠 Inter-State (IGST)'}
                </div>
              </div>
              <div className="field">
                <label>From State Code</label>
                <input value={calcForm.from_state} onChange={e => setCalcForm(p => ({ ...p, from_state: e.target.value }))} placeholder="27 = Maharashtra" />
              </div>
              <div className="field">
                <label>To State Code</label>
                <input value={calcForm.to_state} onChange={e => setCalcForm(p => ({ ...p, to_state: e.target.value }))} placeholder="27 = Maharashtra" />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={calcGST} disabled={!calcForm.amount}>Calculate GST</button>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Calculation Result</div>
            {!calcResult ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🧮</div>
                Enter values and click Calculate
              </div>
            ) : (
              <div>
                <div style={{ padding: 16, background: '#f8faff', borderRadius: 10, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ color: '#64748b' }}>Base Amount</span>
                    <span style={{ fontWeight: 700 }}>₹{(calcResult.base_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {calcResult.cgst_amount != null && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#16a34a' }}>CGST ({calcResult.cgst_rate}%)</span>
                        <span style={{ fontWeight: 600, color: '#16a34a' }}>+ ₹{(calcResult.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#16a34a' }}>SGST ({calcResult.sgst_rate}%)</span>
                        <span style={{ fontWeight: 600, color: '#16a34a' }}>+ ₹{(calcResult.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  {calcResult.igst_amount != null && calcResult.igst_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#1e40af' }}>IGST ({calcResult.igst_rate}%)</span>
                      <span style={{ fontWeight: 600, color: '#1e40af' }}>+ ₹{(calcResult.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #dce8f5', paddingTop: 10, marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>Total Amount</span>
                    <span style={{ fontWeight: 800, fontSize: 18, color: '#f97316' }}>₹{(calcResult.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div style={{ padding: 10, background: intraState ? '#f0fdf4' : '#eff6ff', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center', color: intraState ? '#15803d' : '#1e40af' }}>
                  {intraState ? '✅ Intra-State Transaction — CGST + SGST Applied' : '✅ Inter-State Transaction — IGST Applied'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GSTR-1 */}
      {tab === 1 && (
        <div>
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Month / Year:</label>
              <select style={{ border: '1px solid #dce8f5', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontFamily: 'inherit' }}
                value={gstr1Period.month} onChange={e => setGstr1Period(p => ({ ...p, month: Number(e.target.value) }))}>
                {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{new Date(2024, i, 1).toLocaleDateString('en-IN', { month: 'long' })}</option>)}
              </select>
              <input type="number" value={gstr1Period.year} onChange={e => setGstr1Period(p => ({ ...p, year: Number(e.target.value) }))}
                style={{ border: '1px solid #dce8f5', borderRadius: 8, padding: '7px 12px', fontSize: 13, width: 90 }} />
              <button className="btn btn-primary" onClick={loadGSTR1}>Load GSTR-1</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice No.</th><th>Date</th><th>Customer</th><th>GSTIN</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th></tr></thead>
            <tbody>
              {gstr1.length === 0 ? <tr><td colSpan={9} className="no-data">No GSTR-1 data for the selected period</td></tr>
                : gstr1.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.invoice_no}</td>
                    <td style={{ fontSize: 12 }}>{r.invoice_date}</td>
                    <td>{r.customer_name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.customer_gstin || '—'}</td>
                    <td>₹{(r.taxable_value || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#16a34a' }}>₹{(r.cgst || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#16a34a' }}>₹{(r.sgst || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#1e40af' }}>₹{(r.igst || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 700 }}>₹{(r.total || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Project Costs */}
      {tab === 2 && (
        <div>
          <div className="toolbar">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Project:</label>
            <select style={{ border: '1px solid #dce8f5', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontFamily: 'inherit' }} value={selProject} onChange={e => loadCosts(e.target.value)}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {costs && (
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-label">Material Cost</div><div className="stat-value" style={{ fontSize: 20 }}>₹{(costs.material_cost || 0).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Labor Cost</div><div className="stat-value" style={{ fontSize: 20 }}>₹{(costs.labor_cost || 0).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Contractor Cost</div><div className="stat-value" style={{ fontSize: 20 }}>₹{(costs.contractor_cost || 0).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Site Expenses</div><div className="stat-value" style={{ fontSize: 20 }}>₹{(costs.site_expenses || 0).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Total Cost</div><div className="stat-value" style={{ fontSize: 20, color: '#dc2626' }}>₹{(costs.total_cost || 0).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Revenue Billed</div><div className="stat-value" style={{ fontSize: 20, color: '#16a34a' }}>₹{(costs.revenue || 0).toLocaleString('en-IN')}</div></div>
            </div>
          )}
        </div>
      )}

      {/* Margin Report */}
      {tab === 3 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Project</th><th>Revenue</th><th>Total Cost</th><th>Gross Profit</th><th>Margin %</th></tr></thead>
            <tbody>
              {margins.length === 0 ? <tr><td colSpan={5} className="no-data">No margin data available</td></tr>
                : margins.map((m, i) => (
                  <tr key={i}>
                    <td><strong>{m.project_name}</strong></td>
                    <td>₹{(m.revenue || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(m.total_cost || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: (m.gross_profit || 0) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>₹{(m.gross_profit || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className="progress-fill" style={{ width: `${Math.min(m.margin_pct || 0, 100)}%` }} />
                        </div>
                        <span style={{ fontWeight: 700, color: (m.margin_pct || 0) >= 20 ? '#16a34a' : '#d97706' }}>{(m.margin_pct || 0).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
