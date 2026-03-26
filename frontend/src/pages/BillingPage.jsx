import { useState, useEffect } from 'react';
import { billingAPI, projectsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const [tab, setTab] = useState(0);
  const [milestones, setMilestones] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selProject, setSelProject] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    Promise.all([projectsAPI.getProjects(), billingAPI.getInvoices()])
      .then(([p, i]) => { setProjects(p.data || []); setInvoices(i.data || []); })
      .catch(() => {});
  }, []);

  const loadMilestones = async (pid) => {
    setSelProject(pid);
    if (!pid) return;
    try { const r = await billingAPI.getMilestones(pid); setMilestones(r.data || []); }
    catch { toast.error('Failed to load milestones'); }
  };

  const submitMilestone = async () => {
    try {
      await billingAPI.createMilestone({ ...form, project_id: Number(selProject), milestone_value: Number(form.milestone_value) });
      toast.success('Milestone created');
      setModal(null); setForm({}); loadMilestones(selProject);
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const submitInvoice = async () => {
    try {
      await billingAPI.createInvoice({ ...form, milestone_id: Number(form.milestone_id), taxable_value: Number(form.taxable_value) });
      toast.success('GST invoice created');
      setModal(null); setForm({});
      const r = await billingAPI.getInvoices(); setInvoices(r.data || []);
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">💰 Milestone-Based Billing</div>
          <div className="page-sub">GST-compliant invoicing tied to project milestone completion</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 0 && selProject && <button className="btn btn-primary" onClick={() => { setForm({}); setModal('milestone'); }}>+ Add Milestone</button>}
          {tab === 1 && <button className="btn btn-orange" onClick={() => { setForm({}); setModal('invoice'); }}>+ Create Invoice</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #dce8f5' }}>
        {['Milestones', 'Invoices'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding: '8px 16px', border: 'none', borderBottom: tab === i ? '2px solid #f97316' : '2px solid transparent', background: 'none', cursor: 'pointer', fontWeight: tab === i ? 700 : 500, color: tab === i ? '#f97316' : '#64748b', fontSize: 13, fontFamily: 'inherit', marginBottom: -1 }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div>
          <div className="toolbar">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Project:</label>
            <select style={{ border: '1px solid #dce8f5', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontFamily: 'inherit' }} value={selProject} onChange={e => loadMilestones(e.target.value)}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Milestone Name</th><th>Value (₹)</th><th>Due Date</th><th>Completion %</th><th>Status</th></tr></thead>
            <tbody>
              {milestones.length === 0 ? <tr><td colSpan={6} className="no-data">{selProject ? 'No milestones' : 'Select a project'}</td></tr>
                : milestones.map((m, i) => (
                  <tr key={m.id}>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                    <td><strong>{m.name}</strong></td>
                    <td style={{ fontWeight: 700 }}>₹{(m.milestone_value || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: 12 }}>{m.due_date || '—'}</td>
                    <td>{m.required_completion_pct || 0}%</td>
                    <td><span className={`badge badge-${m.is_completed ? 'completed' : 'pending'}`}>{m.is_completed ? 'Completed' : 'Pending'}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Invoice No.</th><th>Date</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.length === 0 ? <tr><td colSpan={9} className="no-data">No invoices yet</td></tr>
              : invoices.map((inv, i) => (
                <tr key={inv.id}>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.invoice_no}</td>
                  <td style={{ fontSize: 12 }}>{inv.invoice_date}</td>
                  <td>₹{(inv.taxable_value || 0).toLocaleString('en-IN')}</td>
                  <td style={{ color: '#16a34a' }}>₹{(inv.cgst_amount || 0).toLocaleString('en-IN')}</td>
                  <td style={{ color: '#16a34a' }}>₹{(inv.sgst_amount || 0).toLocaleString('en-IN')}</td>
                  <td style={{ color: '#1e40af' }}>₹{(inv.igst_amount || 0).toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: 700 }}>₹{(inv.total_amount || 0).toLocaleString('en-IN')}</td>
                  <td><span className={`badge badge-${inv.status === 'PAID' ? 'completed' : 'pending'}`}>{inv.status}</span></td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
      )}

      {modal === 'milestone' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Add Milestone</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Milestone Name *</label><input value={form.name||''} onChange={f('name')} /></div>
                <div className="field"><label>Value (₹) *</label><input type="number" value={form.milestone_value||''} onChange={f('milestone_value')} /></div>
                <div className="field"><label>Due Date</label><input type="date" value={form.due_date||''} onChange={f('due_date')} /></div>
                <div className="field"><label>Required Completion %</label><input type="number" value={form.required_completion_pct||''} onChange={f('required_completion_pct')} placeholder="e.g. 50" /></div>
                <div className="field" style={{ gridColumn: '1/-1' }}><label>Description</label><textarea value={form.description||''} onChange={f('description')} rows={2} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitMilestone}>Add Milestone</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'invoice' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Create GST Invoice</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{ padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af', marginBottom: 16 }}>
                ℹ️ Invoice will only be created if the linked milestone is completed. GST auto-applied.
              </div>
              <div className="form-grid">
                <div className="field"><label>Milestone</label>
                  <select value={form.milestone_id||''} onChange={f('milestone_id')}>
                    <option value="">Select milestone</option>
                    {milestones.filter(m => m.is_completed).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>Taxable Value (₹) *</label><input type="number" value={form.taxable_value||''} onChange={f('taxable_value')} /></div>
                <div className="field"><label>GST Rate %</label>
                  <select value={form.gst_rate||'18'} onChange={f('gst_rate')}>
                    <option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                  </select>
                </div>
                <div className="field"><label>Invoice Date</label><input type="date" value={form.invoice_date||''} onChange={f('invoice_date')} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-orange" onClick={submitInvoice}>Create Invoice</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
