import { useState, useEffect } from 'react';
import { jobworkAPI } from '../services/api';

export default function JobWork() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => { setLoading(true); jobworkAPI.list().then(r => { setChallans(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (showModal === 'return') {
        await jobworkAPI.processReturn(editId, form);
      } else {
        if (editMode) await jobworkAPI.update(editId, form);
        else await jobworkAPI.create(form);
      }
      setShowModal(null); setEditMode(false); setEditId(null); setForm({}); load();
    } catch (e) { setError(e.response?.data?.detail || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this challan?')) return;
    try { await jobworkAPI.delete(id); load(); } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const openEdit = (c) => { setForm(c); setEditMode(true); setEditId(c.id); setError(null); setShowModal('challan'); };
  const openCreate = () => { setForm({}); setEditMode(false); setEditId(null); setError(null); setShowModal('challan'); };
  const openReturn = (c) => { setForm({}); setEditId(c.id); setError(null); setShowModal('return'); };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">🏭 Job Work Management</div><div className="page-subtitle">GST-compliant delivery challans and return processing</div></div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Challan</button>
      </div>
      <div className="card">
        {loading ? <div className="loading">Loading...</div> : challans.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏭</div><p>No challans yet</p></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Challan #</th><th>Vendor</th><th>Stone Block</th><th>Dispatch Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {challans.map(c => (<tr key={c.id}>
                <td><strong>{c.challan_no}</strong></td>
                <td>{c.vendor_name}</td>
                <td>{c.stone_block_id || '—'}</td>
                <td>{c.dispatch_date || '—'}</td>
                <td><span className={`badge badge-${c.status === 'returned' ? 'green' : 'orange'}`}>{c.status}</span></td>
                <td>
                  {c.status !== 'returned' && <button className="btn btn-primary btn-sm" onClick={() => openReturn(c)} style={{ marginRight: '4px' }}>Return</button>}
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} style={{ marginRight: '4px' }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                </td>
              </tr>))}
            </tbody>
          </table></div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{showModal === 'return' ? '↩️ Process Return' : (editMode ? '✏️ Edit Challan' : '🏭 New Challan')}</div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <form onSubmit={handleSave}>
              {showModal === 'challan' ? (<>
                <div className="form-group"><label className="form-label">Vendor Name *</label><input className="form-input" value={form.vendor_name || ''} required onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} /></div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Stone Block ID</label><input className="form-input" type="number" value={form.stone_block_id || ''} onChange={e => setForm(p => ({ ...p, stone_block_id: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Dispatch Date</label><input className="form-input" type="date" value={form.dispatch_date || ''} onChange={e => setForm(p => ({ ...p, dispatch_date: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Job Description</label><textarea className="form-textarea" value={form.job_description || ''} onChange={e => setForm(p => ({ ...p, job_description: e.target.value }))} /></div>
              </>) : (<>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Actual Return Date *</label><input className="form-input" type="date" value={form.actual_return_date || ''} required onChange={e => setForm(p => ({ ...p, actual_return_date: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Job Cost (Rs.) *</label><input className="form-input" type="number" step="0.01" value={form.job_cost || ''} required onChange={e => setForm(p => ({ ...p, job_cost: Number(e.target.value) }))} /></div>
                </div>
                <div className="grid-3">
                  <div className="form-group"><label className="form-label">Return Length *</label><input className="form-input" type="number" step="0.01" value={form.return_length || ''} required onChange={e => setForm(p => ({ ...p, return_length: Number(e.target.value) }))} /></div>
                  <div className="form-group"><label className="form-label">Return Width *</label><input className="form-input" type="number" step="0.01" value={form.return_width || ''} required onChange={e => setForm(p => ({ ...p, return_width: Number(e.target.value) }))} /></div>
                  <div className="form-group"><label className="form-label">Return Height *</label><input className="form-input" type="number" step="0.01" value={form.return_height || ''} required onChange={e => setForm(p => ({ ...p, return_height: Number(e.target.value) }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Remarks</label><textarea className="form-textarea" value={form.remarks || ''} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} /></div>
              </>)}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (showModal === 'return' ? 'Process Return' : (editMode ? 'Update' : 'Create'))}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
