import { useState, useEffect } from 'react';
import { jobWorkAPI, stonesAPI, inventoryAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function JobWorkPage() {
  const [challans, setChallans] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try {
      const [c, b, w] = await Promise.all([jobWorkAPI.getChallans(), stonesAPI.getBlocks({}), inventoryAPI.getWarehouses()]);
      setChallans(c.data || []);
      setBlocks(b.data || []);
      setWarehouses(w.data || []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      await jobWorkAPI.createChallan({ ...form, stone_block_id: Number(form.stone_block_id), from_warehouse_id: Number(form.from_warehouse_id) });
      toast.success('Delivery challan created');
      setModal(false); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🏭 Job Work Management</div>
          <div className="page-sub">GST-compliant delivery challans, outward processing & return validation</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({}); setModal(true); }}>+ Create Challan</button>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Challan No.</th><th>Block</th><th>Vendor</th><th>Issue Date</th><th>Expected Return</th><th>Status</th></tr></thead>
          <tbody>
            {challans.length === 0 ? <tr><td colSpan={7} className="no-data">No challans yet</td></tr>
              : challans.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.challan_no}</span></td>
                  <td>{c.block_serial || '—'}</td>
                  <td><strong>{c.vendor_name}</strong></td>
                  <td style={{ fontSize: 12 }}>{c.issue_date}</td>
                  <td style={{ fontSize: 12, color: '#d97706' }}>{c.expected_return_date || '—'}</td>
                  <td><span className={`badge badge-${c.status === 'RETURNED' ? 'completed' : c.status === 'PENDING' ? 'pending' : 'wip'}`}>{c.status}</span></td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Create Delivery Challan</div><button className="modal-close" onClick={() => setModal(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#15803d', marginBottom: 16 }}>
                ✅ GST-compliant delivery challan will be generated. Block will be transferred to Job Work warehouse.
              </div>
              <div className="form-grid">
                <div className="field"><label>Stone Block</label>
                  <select value={form.stone_block_id||''} onChange={f('stone_block_id')}>
                    <option value="">Select block</option>
                    {blocks.filter(b => b.status === 'available').map(b => <option key={b.id} value={b.id}>{b.serial_no}</option>)}
                  </select>
                </div>
                <div className="field"><label>From Warehouse</label>
                  <select value={form.from_warehouse_id||''} onChange={f('from_warehouse_id')}>
                    <option value="">Select warehouse</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>Vendor Name *</label><input value={form.vendor_name||''} onChange={f('vendor_name')} /></div>
                <div className="field"><label>Vendor GSTIN</label><input value={form.vendor_gstin||''} onChange={f('vendor_gstin')} /></div>
                <div className="field"><label>Issue Date</label><input type="date" value={form.issue_date||''} onChange={f('issue_date')} /></div>
                <div className="field"><label>Expected Return Date</label><input type="date" value={form.expected_return_date||''} onChange={f('expected_return_date')} /></div>
                <div className="field" style={{ gridColumn: '1/-1' }}><label>Work Description</label><textarea value={form.description||''} onChange={f('description')} rows={2} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={submit}>Create Challan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
