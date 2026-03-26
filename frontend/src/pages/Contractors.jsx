import { useState, useEffect } from 'react';
import { contractorsAPI } from '../services/api';

export default function Contractors() {
  const [contractors, setContractors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('contractors');

  const load = () => {
    setLoading(true);
    Promise.allSettled([contractorsAPI.list(), contractorsAPI.invoices(), contractorsAPI.allAgreements()]).then(([c, i, a]) => {
      setContractors(c.value?.data || []); setInvoices(i.value?.data || []); setAgreements(a.value?.data || []); setLoading(false);
    });
  };
  useEffect(load, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (showModal === 'contractor') {
        if (editMode) await contractorsAPI.update(editId, form);
        else await contractorsAPI.create(form);
      } else {
        await contractorsAPI.createInvoice({ ...form, gross_amount: Number(form.gross_amount), agreement_id: Number(form.agreement_id) });
      }
      setShowModal(null); setEditMode(false); setEditId(null); load();
    } catch (e) { setError(e.response?.data?.detail || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contractor?')) return;
    try { await contractorsAPI.delete(id); load(); } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const handleDeleteAgreement = async (id) => {
    if (!window.confirm('Delete this agreement?')) return;
    try { await contractorsAPI.deleteAgreement(id); load(); } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try { await contractorsAPI.deleteInvoice(id); load(); } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const openEdit = (c) => { setForm(c); setEditMode(true); setEditId(c.id); setError(null); setShowModal('contractor'); };
  const openCreate = () => { setForm({}); setEditMode(false); setEditId(null); setError(null); setShowModal('contractor'); };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">👷 Contractor Management</div><div className="page-subtitle">Agreements, invoices and payment tracking with GST/TDS</div></div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setForm({}); setError(null); setShowModal('invoice'); }}>+ Invoice</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Contractor</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        <button onClick={() => setTab('contractors')} className="btn" style={{ background: tab === 'contractors' ? '#1e40af' : '#fff', color: tab === 'contractors' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>👷 Contractors ({contractors.length})</button>
        <button onClick={() => setTab('agreements')} className="btn" style={{ background: tab === 'agreements' ? '#1e40af' : '#fff', color: tab === 'agreements' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>📄 Agreements ({agreements.length})</button>
        <button onClick={() => setTab('invoices')} className="btn" style={{ background: tab === 'invoices' ? '#1e40af' : '#fff', color: tab === 'invoices' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>📄 Invoices ({invoices.length})</button>
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <>
            {tab === 'contractors' && (
              <div className="table-wrap"><table>
                <thead><tr><th>Name</th><th>GSTIN</th><th>PAN</th><th>Phone</th><th>State</th><th>Actions</th></tr></thead>
                <tbody>
                  {contractors.map(c => (<tr key={c.id}>
                    <td><strong>{c.name}</strong><br/><span style={{ fontSize: '11px', color: '#64748b' }}>{c.email}</span></td>
                    <td><code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{c.gstin || '—'}</code></td>
                    <td>{c.pan || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.state || '—'} {c.state_code ? `(${c.state_code})` : ''}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} style={{ marginRight: '4px' }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                    </td>
                  </tr>))}
                  {contractors.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No contractors yet</td></tr>}
                </tbody>
              </table></div>
            )}
            {tab === 'agreements' && (
              <div className="table-wrap"><table>
                <thead><tr><th>Agreement #</th><th>Contractor</th><th>Project</th><th>Contract Value</th><th>GST %</th><th>TDS %</th><th>Retention %</th><th>Actions</th></tr></thead>
                <tbody>
                  {agreements.map(a => {
                    const contractorName = contractors.find(c => c.id === a.contractor_id)?.name || `Contractor #${a.contractor_id}`;
                    return (
                      <tr key={a.id}>
                        <td><strong>{a.agreement_no}</strong></td>
                        <td>{contractorName}</td>
                        <td>{a.project_id}</td>
                        <td>₹{Number(a.contract_value || 0).toLocaleString('en-IN')}</td>
                        <td>{a.gst_pct}%</td>
                        <td>{a.tds_pct}%</td>
                        <td>{a.retention_pct}%</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAgreement(a.id)}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                  {agreements.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No agreements yet</td></tr>}
                </tbody>
              </table></div>
            )}
            {tab === 'invoices' && (
              <div className="table-wrap"><table>
                <thead><tr><th>Invoice #</th><th>Contractor</th><th>Amount</th><th>GST</th><th>TDS Deducted</th><th>Net Payable</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {invoices.map(inv => (<tr key={inv.id}>
                    <td><strong>{inv.invoice_no}</strong></td>
                    <td>{agreements.find(a => a.id === inv.agreement_id)?.contractor_id
                      ? contractors.find(c => c.id === agreements.find(a => a.id === inv.agreement_id)?.contractor_id)?.name
                      : `Agreement #${inv.agreement_id}`}</td>
                    <td>Rs.{Number(inv.gross_amount || 0).toLocaleString('en-IN')}</td>
                    <td>Rs.{Number(inv.gst_amount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#dc2626' }}>-Rs.{Number(inv.tds_amount || 0).toLocaleString('en-IN')}</td>
                    <td><strong>Rs.{Number(inv.net_payable || 0).toLocaleString('en-IN')}</strong></td>
                    <td><span className={`badge badge-${inv.payment_status === 'paid' ? 'green' : inv.payment_status === 'partial' ? 'orange' : 'gray'}`}>{inv.payment_status}</span></td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => handleDeleteInvoice(inv.id)}>Delete</button></td>
                  </tr>))}
                  {invoices.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No invoices yet</td></tr>}
                </tbody>
              </table></div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{showModal === 'contractor' ? (editMode ? '✏️ Edit Contractor' : '👷 Add Contractor') : '📄 Create Invoice'}</div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <form onSubmit={handleSave}>
              {showModal === 'contractor' && (<>
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name || ''} required onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">GSTIN</label><input className="form-input" value={form.gstin || ''} onChange={e => setForm(p => ({ ...p, gstin: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">PAN</label><input className="form-input" value={form.pan || ''} onChange={e => setForm(p => ({ ...p, pan: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">State</label><input className="form-input" value={form.state || ''} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">State Code</label><input className="form-input" value={form.state_code || ''} placeholder="e.g. 27" onChange={e => setForm(p => ({ ...p, state_code: e.target.value }))} /></div>
                </div>
              </>)}
              {showModal === 'invoice' && (<>
                <div className="form-group"><label className="form-label">Agreement *</label>
                  <select className="form-select" value={form.agreement_id || ''} required onChange={e => setForm(p => ({ ...p, agreement_id: Number(e.target.value) }))}>
                    <option value="">Select agreement...</option>
                    {agreements.map(a => {
                      const cname = contractors.find(c => c.id === a.contractor_id)?.name || `Contractor #${a.contractor_id}`;
                      return <option key={a.id} value={a.id}>{a.agreement_no} — {cname}</option>;
                    })}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Invoice Date *</label><input className="form-input" type="date" value={form.invoice_date || ''} required onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Gross Amount (Rs.) *</label><input className="form-input" type="number" step="0.01" value={form.gross_amount || ''} required onChange={e => setForm(p => ({ ...p, gross_amount: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Remarks</label><textarea className="form-textarea" value={form.remarks || ''} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} /></div>
              </>)}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
