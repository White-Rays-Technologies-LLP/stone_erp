import { useState, useEffect } from 'react';
import { manufacturingAPI, stonesAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ManufacturingPage() {
  const [tab, setTab] = useState(0);
  const [idols, setIdols] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try {
      const [i, b] = await Promise.all([manufacturingAPI.getIdols(), stonesAPI.getBlocks({})]);
      setIdols(i.data || []);
      setBlocks(b.data || []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submitIdol = async () => {
    try {
      await manufacturingAPI.createIdol({ ...form, stone_block_id: Number(form.stone_block_id) });
      toast.success('Idol created');
      setModal(null); setForm({}); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Manufacturing Module</div>
          <div className="page-sub">Idol & structural component manufacturing workflow with stage tracking</div>
        </div>
        {tab === 0 && <button className="btn btn-primary" onClick={() => { setForm({}); setModal('idol'); }}>+ New Idol</button>}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #dce8f5' }}>
        {['Idol Manufacturing', 'Structural Components'].map((t, i) => (
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
              <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Assigned Block</th><th>Total Cost</th><th>Status</th></tr></thead>
            <tbody>
              {idols.length === 0 ? <tr><td colSpan={6} className="no-data">No idols in manufacturing</td></tr>
                : idols.map((id, i) => (
                  <tr key={id.id}>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                    <td><strong>{id.name}</strong></td>
                    <td><span className="badge badge-ui">{id.idol_type}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{id.block_serial || '—'}</td>
                    <td>₹{(id.total_cost || 0).toLocaleString('en-IN')}</td>
                    <td><span className={`badge badge-${id.status === 'COMPLETED' ? 'completed' : 'wip'}`}>{id.status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Structural Components</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>Assign stone blocks to blueprint positions with dimensional compliance validation</div>
          </div>
        )
      )}

      {modal === 'idol' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Create Idol Manufacturing Record</div><button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Idol Name *</label><input value={form.name||''} onChange={f('name')} /></div>
                <div className="field"><label>Idol Type</label>
                  <select value={form.idol_type||''} onChange={f('idol_type')}>
                    <option value="">Select type</option>
                    <option>MAIN_DEITY</option><option>SUB_DEITY</option><option>DECORATIVE</option><option>PILLAR</option>
                  </select>
                </div>
                <div className="field"><label>Assigned Stone Block</label>
                  <select value={form.stone_block_id||''} onChange={f('stone_block_id')}>
                    <option value="">Select block</option>
                    {blocks.filter(b => b.status === 'available').map(b => <option key={b.id} value={b.id}>{b.serial_no}</option>)}
                  </select>
                </div>
                <div className="field"><label>Artisan Name</label><input value={form.artisan||''} onChange={f('artisan')} /></div>
                <div className="field" style={{ gridColumn: '1/-1' }}><label>Description</label><textarea value={form.description||''} onChange={f('description')} rows={2} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitIdol}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
