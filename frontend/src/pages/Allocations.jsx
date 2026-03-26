import { useState, useEffect } from 'react';
import { allocationsAPI, projectsAPI } from '../services/api';

export default function Allocations() {
  const [data, setData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.allSettled([allocationsAPI.list(), projectsAPI.list()]).then(([a, p]) => {
      setData(a.value?.data || []); setProjects(p.value?.data || []); setLoading(false);
    });
  };
  useEffect(load, []);

  const handleTransfer = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      await allocationsAPI.transfer({ stone_block_id: Number(form.stone_block_id), from_project_id: Number(form.from_project_id), to_project_id: Number(form.to_project_id) });
      setShowModal(false); setForm({}); load();
    } catch (e) { setError(e.response?.data?.detail || 'Transfer failed'); } finally { setSaving(false); }
  };

  const handleRelease = async (id) => {
    if (!window.confirm('Release this allocation?')) return;
    try { await allocationsAPI.release(id); load(); } catch (e) { alert('Release failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">🔀 Multi-Project Allocations</div><div className="page-subtitle">Block assignment with double-allocation prevention</div></div>
        <button className="btn btn-primary" onClick={() => { setForm({}); setError(null); setShowModal(true); }}>↔️ Transfer Block</button>
      </div>
      <div className="card">
        {loading ? <div className="loading">Loading...</div> : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔀</div><p>No allocations yet</p></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Stone Block</th><th>Project</th><th>Allocated Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {data.map(a => (<tr key={a.id}>
                <td><strong>{a.stone_block_id}</strong></td>
                <td>{projects.find(p => p.id === a.project_id)?.name || a.project_id}</td>
                <td>{a.allocation_date || '—'}</td>
                <td><span className="badge badge-blue">allocated</span></td>
                <td><button className="btn btn-danger btn-sm" onClick={() => handleRelease(a.id)}>Release</button></td>
              </tr>))}
            </tbody>
          </table></div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">↔️ Transfer Block Between Projects</div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <form onSubmit={handleTransfer}>
              <div className="form-group"><label className="form-label">Stone Block ID *</label><input className="form-input" type="number" required onChange={e => setForm(p => ({ ...p, stone_block_id: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">From Project *</label>
                <select className="form-select" required onChange={e => setForm(p => ({ ...p, from_project_id: e.target.value }))}>
                  <option value="">Select...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">To Project *</label>
                <select className="form-select" required onChange={e => setForm(p => ({ ...p, to_project_id: e.target.value }))}>
                  <option value="">Select...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Transferring...' : 'Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
