import { useState, useEffect } from 'react';
import { contractorsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ContractorsPage() {
  const [tab, setTab] = useState(0);
  const [contractors, setContractors] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try {
      const [c, a, i] = await Promise.all([
        contractorsAPI.getContractors(),
        contractorsAPI.getAgreements(),
        contractorsAPI.getInvoices(),
      ]);
      setContractors(c.data || []);
      setAgreements(a.data || []);
      setInvoices(i.data || []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submitContractor = async () => {
    try {
      await contractorsAPI.createContractor(form);
      toast.success('Contractor added');
      setModal(null); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const submitAgreement = async () => {
    try {
      await contractorsAPI.createAgreement({ ...form, contract_value: Number(form.contract_value), gst_rate: Number(form.gst_rate || 0), tds_rate: Number(form.tds_rate || 0), retention_rate: Number(form.retention_rate || 0) });
      toast.success('Agreement created');
      setModal(null); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const submitInvoice = async () => {
    try {
      await contractorsAPI.createInvoice({ ...form, invoice_amount: Number(form.invoice_amount) });
      toast.success('Invoice created with auto GST/TDS');
      setModal(null); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const TABS = ['Contractors', 'Agreements', 'Invoices'];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">👷 Contractor Management</div>
          <div className="page-sub">Agreements, GST invoicing, TDS deductions and retention management</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 0 && <button className="btn btn-primary" onClick={() => { setForm({}); setModal('contractor'); }}>+ Add Contractor</button>}
          {tab === 1 && <button className="btn btn-primary" onClick={() => { setForm({}); setModal('agreement'); }}>+ New Agreement</button>}
          {tab === 2 && <button className="btn btn-orange" onClick={() => { setForm({}); setModal('invoice'); }}>+ Create Invoice</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #dce8f5' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding: '8px 16px', border: 'none', borderBottom: tab === i ? '2px solid #f97316' : '2px solid transparent', background: 'none', cursor: 'pointer', fontWeight: tab === i ? 700 : 500, color: tab === i ? '#f97316' : '#64748b', fontSize: 13, fontFamily: 'inherit', marginBottom: -1 }}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : <>
        {tab === 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Name</th><th>GSTIN</th><th>PAN</th><th>Phone</th><th>State Code</th><th>Status</th></tr></thead>
              <tbody>
                {contractors.length === 0 ? <tr><td colSpan={7} className="no-data">No contractors yet</td></tr>
                  : contractors.map((c, i) => (
                    <tr key={c.id}>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                      <td><strong>{c.name}</strong><br /><span style={{ fontSize: 11, color: '#64748b' }}>{c.email}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.gstin || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.pan || '—'}</td>
                      <td>{c.phone || '—'}</td>
                      <td>{c.state_code || '—'}</td>
                      <td><span className={`badge badge-${c.is_active ? 'active' : 'inactive'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 1 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Contractor</th><th>Contract Value</th><th>GST%</th><th>TDS%</th><th>Retention%</th><th>Status</th></tr></thead>
              <tbody>
                {agreements.length === 0 ? <tr><td colSpan={7} className="no-data">No agreements yet</td></tr>
                  : agreements.map((a, i) => (
                    <tr key={a.id}>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                      <td><strong>{a.contractor_name || `Contractor #${a.contractor_id}`}</strong></td>
                      <td style={{ fontWeight: 700 }}>₹{(a.contract_value || 0).toLocaleString('en-IN')}</td>
                      <td>{a.gst_rate}%</td>
                      <td style={{ color: '#dc2626' }}>{a.tds_rate}%</td>
                      <td style={{ color: '#d97706' }}>{a.retention_rate}%</td>
                      <td><span className={`badge badge-${a.status === 'ACTIVE' ? 'active' : 'ui'}`}>{a.status}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 2 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Invoice No.</th><th>Base Amount</th><th>GST</th><th>TDS Deducted</th><th>Retention</th><th>Net Payable</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.length === 0 ? <tr><td colSpan={8} className="no-data">No invoices yet</td></tr>
                  : invoices.map((inv, i) => (
                    <tr key={inv.id}>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.invoice_no}</span></td>
                      <td>₹{(inv.invoice_amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#16a34a' }}>₹{(inv.gst_amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#dc2626' }}>₹{(inv.tds_deducted || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#d97706' }}>₹{(inv.retention_held || 0).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700 }}>₹{(inv.net_payable || 0).toLocaleString('en-IN')}</td>
                      <td><span className={`badge badge-${inv.payment_status === 'PAID' ? 'completed' : 'pending'}`}>{inv.payment_status}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </>}

      {/* Modals */}
      {modal === 'contractor' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Add Contractor</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Name *</label><input value={form.name||''} onChange={f('name')} /></div>
                <div className="field"><label>Email</label><input type="email" value={form.email||''} onChange={f('email')} /></div>
                <div className="field"><label>Phone</label><input value={form.phone||''} onChange={f('phone')} /></div>
                <div className="field"><label>GSTIN</label><input value={form.gstin||''} onChange={f('gstin')} /></div>
                <div className="field"><label>PAN</label><input value={form.pan||''} onChange={f('pan')} /></div>
                <div className="field"><label>State Code</label><input value={form.state_code||''} onChange={f('state_code')} placeholder="27" /></div>
                <div className="field" style={{ gridColumn: '1/-1' }}><label>Address</label><textarea value={form.address||''} onChange={f('address')} rows={2} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitContractor}>Add Contractor</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'agreement' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Create Agreement</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Contractor</label>
                  <select value={form.contractor_id||''} onChange={f('contractor_id')}>
                    <option value="">Select contractor</option>
                    {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>Contract Value (₹)</label><input type="number" value={form.contract_value||''} onChange={f('contract_value')} /></div>
                <div className="field"><label>GST Rate %</label><input type="number" value={form.gst_rate||18} onChange={f('gst_rate')} /></div>
                <div className="field"><label>TDS Rate %</label><input type="number" value={form.tds_rate||2} onChange={f('tds_rate')} /></div>
                <div className="field"><label>Retention %</label><input type="number" value={form.retention_rate||5} onChange={f('retention_rate')} /></div>
                <div className="field"><label>Start Date</label><input type="date" value={form.start_date||''} onChange={f('start_date')} /></div>
                <div className="field"><label>End Date</label><input type="date" value={form.end_date||''} onChange={f('end_date')} /></div>
                <div className="field"><label>Work Description</label><input value={form.work_description||''} onChange={f('work_description')} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitAgreement}>Create Agreement</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'invoice' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Create Contractor Invoice</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#15803d', marginBottom: 16 }}>
                ✅ GST, TDS, and retention will be auto-calculated from the agreement rates.
              </div>
              <div className="form-grid">
                <div className="field"><label>Agreement</label>
                  <select value={form.agreement_id||''} onChange={f('agreement_id')}>
                    <option value="">Select agreement</option>
                    {agreements.map(a => <option key={a.id} value={a.id}>Agreement #{a.id} — ₹{(a.contract_value||0).toLocaleString()}</option>)}
                  </select>
                </div>
                <div className="field"><label>Invoice Amount (₹) *</label><input type="number" value={form.invoice_amount||''} onChange={f('invoice_amount')} /></div>
                <div className="field"><label>Invoice Date</label><input type="date" value={form.invoice_date||''} onChange={f('invoice_date')} /></div>
                <div className="field"><label>Work Description</label><input value={form.description||''} onChange={f('description')} /></div>
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
