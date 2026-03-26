import { useState, useEffect } from 'react';
import { siteAPI, inventoryAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function SitePage() {
  const [tab, setTab] = useState(0);
  const [dispatches, setDispatches] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try {
      const [d, i, w] = await Promise.all([siteAPI.getDispatches(), siteAPI.getInstallations(), inventoryAPI.getWarehouses()]);
      setDispatches(d.data || []);
      setInstallations(i.data || []);
      setWarehouses(w.data || []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submitDispatch = async () => {
    try {
      await siteAPI.createDispatch({ ...form, from_warehouse_id: Number(form.from_warehouse_id), to_warehouse_id: Number(form.to_warehouse_id) });
      toast.success('Dispatch created with e-way bill data');
      setModal(null); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const submitInstallation = async () => {
    try {
      await siteAPI.recordInstallation({ ...form, position_id: Number(form.position_id), block_id: Number(form.block_id) });
      toast.success('Installation recorded — completion % updated');
      setModal(null); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🚛 Site Execution Module</div>
          <div className="page-sub">Dispatch management, installation tracking & e-way bill generation</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 0 && <button className="btn btn-primary" onClick={() => { setForm({}); setModal('dispatch'); }}>+ Create Dispatch</button>}
          {tab === 1 && <button className="btn btn-orange" onClick={() => { setForm({}); setModal('install'); }}>+ Record Installation</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #dce8f5' }}>
        {['Dispatches', 'Installations'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding: '8px 16px', border: 'none', borderBottom: tab === i ? '2px solid #f97316' : '2px solid transparent', background: 'none', cursor: 'pointer', fontWeight: tab === i ? 700 : 500, color: tab === i ? '#f97316' : '#64748b', fontSize: 13, fontFamily: 'inherit', marginBottom: -1 }}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        tab === 0 ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Dispatch No.</th><th>Date</th><th>From → To</th><th>Transporter</th><th>E-Way Bill</th><th>Status</th></tr></thead>
            <tbody>
              {dispatches.length === 0 ? <tr><td colSpan={7} className="no-data">No dispatches yet</td></tr>
                : dispatches.map((d, i) => (
                  <tr key={d.id}>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.dispatch_no}</span></td>
                    <td style={{ fontSize: 12 }}>{d.dispatch_date}</td>
                    <td style={{ fontSize: 12 }}>{d.from_warehouse} → {d.to_warehouse}</td>
                    <td>{d.transporter_name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#1e40af' }}>{d.eway_bill_no || '—'}</td>
                    <td><span className={`badge badge-${d.status === 'DELIVERED' ? 'completed' : 'dispatched'}`}>{d.status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Block</th><th>Position</th><th>Installation Date</th><th>Installed By</th><th>Verified</th></tr></thead>
            <tbody>
              {installations.length === 0 ? <tr><td colSpan={6} className="no-data">No installations recorded</td></tr>
                : installations.map((inst, i) => (
                  <tr key={inst.id}>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{inst.block_serial || '—'}</td>
                    <td>{inst.position_code || '—'}</td>
                    <td style={{ fontSize: 12 }}>{inst.installation_date}</td>
                    <td>{inst.installed_by || '—'}</td>
                    <td>{inst.is_verified ? <span className="badge badge-completed">✓ Verified</span> : <span className="badge badge-pending">Pending</span>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        )
      )}

      {modal === 'dispatch' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Create Dispatch Note</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>From Warehouse</label>
                  <select value={form.from_warehouse_id||''} onChange={f('from_warehouse_id')}>
                    <option value="">Select</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>To Warehouse (Site)</label>
                  <select value={form.to_warehouse_id||''} onChange={f('to_warehouse_id')}>
                    <option value="">Select</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>Dispatch Date</label><input type="date" value={form.dispatch_date||''} onChange={f('dispatch_date')} /></div>
                <div className="field"><label>Transporter Name</label><input value={form.transporter_name||''} onChange={f('transporter_name')} /></div>
                <div className="field"><label>Vehicle No.</label><input value={form.vehicle_no||''} onChange={f('vehicle_no')} placeholder="MH12AB1234" /></div>
                <div className="field"><label>E-Way Bill No.</label><input value={form.eway_bill_no||''} onChange={f('eway_bill_no')} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitDispatch}>Create Dispatch</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'install' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Record Installation</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{ padding: 12, background: '#fff4ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 12, color: '#92400e', marginBottom: 16 }}>
                ⚠️ Dependency check: Installation will fail if predecessor blueprint positions are not completed.
              </div>
              <div className="form-grid">
                <div className="field"><label>Block ID</label><input type="number" value={form.block_id||''} onChange={f('block_id')} placeholder="Stone block ID" /></div>
                <div className="field"><label>Blueprint Position ID</label><input type="number" value={form.position_id||''} onChange={f('position_id')} /></div>
                <div className="field"><label>Installation Date</label><input type="date" value={form.installation_date||''} onChange={f('installation_date')} /></div>
                <div className="field"><label>Installed By</label><input value={form.installed_by||''} onChange={f('installed_by')} /></div>
                <div className="field" style={{ gridColumn: '1/-1' }}><label>Notes</label><textarea value={form.notes||''} onChange={f('notes')} rows={2} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-orange" onClick={submitInstallation}>Record Installation</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
