import { useState, useEffect } from 'react';
import { stonesAPI, inventoryAPI } from '../services/api';

const FIELD_CONFIG = {
  length: { label: 'Length (ft)', type: 'number', required: true, defaultValue: '' },
  width: { label: 'Width (ft)', type: 'number', required: true, defaultValue: '' },
  height: { label: 'Height (ft)', type: 'number', required: true, defaultValue: '' },
  stone_type: { label: 'Stone Type', type: 'text', required: false, defaultValue: '' },
  quarry_source: { label: 'Quarry Source', type: 'text', required: false, defaultValue: '' },
  rate_per_cft: { label: 'Rate per CFT', type: 'number', required: false, defaultValue: 0 }
};

// API: stonesAPI.list(), stonesAPI.split(id, payload), stonesAPI.delete(id), stonesAPI.genealogy(id)
// Table: Serial No, Dimensions (L??W??H), Volume, Stone Type, Status, Actions
// Icon: ????, Title: "Stone Blocks"


export default function Stones({ embedded = false }) {
  const [stones, setStones] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedStone, setSelectedStone] = useState(null);
  const [genealogy, setGenealogy] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [splitForm, setSplitForm] = useState({ children: [{ length: '', width: '', height: '', serial_number: '' }] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [expandedParents, setExpandedParents] = useState(new Set());

  const load = () => {
    setLoading(true);
    Promise.allSettled([stonesAPI.list(), inventoryAPI.items(), inventoryAPI.categories(), inventoryAPI.warehouses()]).then(([s, i, c, w]) => {
      setStones(s.value?.data || []);
      setItems(i.value?.data || []);
      setCategories(c.value?.data || []);
      setWarehouses(w.value?.data || []);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this stone block?')) return;
    try { await stonesAPI.delete(id); load(); } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const handleSplit = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const children = splitForm.children.map(c => ({ ...c, length: Number(c.length), width: Number(c.width), height: Number(c.height) }));
      await stonesAPI.split(selectedStone.id, { children });
      setShowModal(null); load();
    } catch (e) { setError(e.response?.data?.detail || 'Failed'); } finally { setSaving(false); }
  };

  const loadGenealogy = async (stone) => {
    setSelectedStone(stone);
    const r = await stonesAPI.genealogy(stone.id).catch(() => null);
    setGenealogy(r?.data);
    setShowModal('genealogy');
  };

  const addChild = () => setSplitForm(p => ({ children: [...p.children, { length: '', width: '', height: '', serial_number: '' }] }));
  const updateChild = (idx, field, val) => setSplitForm(p => ({ children: p.children.map((c, i) => i === idx ? { ...c, [field]: val } : c) }));

  const filteredStones = stones.filter(s => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const item = items.find(i => i.id === s.item_id);
    const category = categories.find(c => c.id === item?.category_id);
    return (
      String(s.serial_no || '').toLowerCase().includes(q) ||
      String(item?.name || '').toLowerCase().includes(q) ||
      String(category?.name || '').toLowerCase().includes(q) ||
      String(s.status || '').toLowerCase().includes(q)
    );
  });

  const isChild = (s) => !!s.parent_id;
  const parents = filteredStones.filter(s => !isChild(s));
  const childrenByParent = new Map();
  filteredStones.filter(isChild).forEach(child => {
    const pid = child.parent_id;
    if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
    childrenByParent.get(pid).push(child);
  });

  const totalPages = Math.max(1, Math.ceil(parents.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedParents = parents.slice(startIndex, startIndex + pageSize);

  useEffect(() => { setPage(1); }, [search, pageSize]);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const toggleParent = (id) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      {!embedded && (
        <div className="page-header">
          <div><div className="page-title">Stone Block Engine</div><div className="page-subtitle">Track and split stone blocks with genealogy</div></div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search serial, item, category, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '280px' }}
            />
          </div>
        </div>
      )}

      {embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search serial, item, category, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '280px' }}
          />
        </div>
      )}


      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <div className="table-scroll"><div className="table-wrap"><table>
            <thead><tr><th>Serial No</th><th>Qty</th><th>Item</th><th>Category</th><th>Warehouse</th><th>Dimensions (L×W×H ft)</th><th>Volume (cft)</th><th>Available Vol</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {pagedParents.map(s => {
                const children = childrenByParent.get(s.id) || [];
                const expanded = expandedParents.has(s.id);
                return (
                  <>
                    <tr key={s.id}>
                      <td>
                        {children.length > 0 && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggleParent(s.id)}
                            title={expanded ? 'Collapse' : 'Expand'}
                            style={{ marginRight: '6px' }}
                          >
                            {expanded ? '▾' : '▸'}
                          </button>
                        )}
                        <strong style={{ fontFamily: 'monospace', color: '#1e40af', fontSize: '13px' }}>{s.serial_no}</strong>
                      </td>
                      <td>{s.qty ?? 1}</td>
                      <td>{items.find(i => i.id === s.item_id)?.name || ''}</td>
                      <td>{categories.find(c => c.id === items.find(i => i.id === s.item_id)?.category_id)?.name || ''}</td>
                      <td>{warehouses.find(w => w.id === s.warehouse_id)?.name || ""}</td>
                      <td>{s.length} × {s.width} × {s.height}</td>
                      <td><strong>{s.total_volume?.toFixed(3)}</strong></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '60px', height: '5px', background: '#e2e8f0', borderRadius: '3px' }}>
                            <div style={{ width: `${Math.min(100, (s.available_volume / s.total_volume) * 100)}%`, height: '100%', background: '#7c3aed', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '11px' }}>{s.available_volume?.toFixed(3)}</span>
                        </div>
                      </td>
                      <td><span className={`badge badge-${s.status === 'available' ? 'green' : s.status === 'split' ? 'purple' : s.status === 'allocated' ? 'blue' : 'gray'}`}>{s.status}</span></td>
                      <td style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => loadGenealogy(s)}>🌳 Tree</button>
                        {(s.status === 'available' || s.status === 'split') && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => { setSelectedStone(s); setSplitForm({ children: [{ length: '', width: '', height: '', serial_number: '' }] }); setError(null); setShowModal('split'); }}>✂️ Split</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                    {expanded && children.map(child => (
                      <tr key={`child-${child.id}`}>
                        <td style={{ paddingLeft: '28px', color: '#475569' }}>
                          <span style={{ marginRight: '6px', color: '#94a3b8' }}>↳</span>
                          <strong style={{ fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>{child.serial_no}</strong>
                        </td>
                        <td>{child.qty ?? 1}</td>
                        <td>{items.find(i => i.id === child.item_id)?.name || ''}</td>
                        <td>{categories.find(c => c.id === items.find(i => i.id === child.item_id)?.category_id)?.name || ''}</td>
                        <td>{warehouses.find(w => w.id === child.warehouse_id)?.name || ""}</td>
                        <td>{child.length} × {child.width} × {child.height}</td>
                        <td><strong>{child.total_volume?.toFixed(3)}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '60px', height: '5px', background: '#e2e8f0', borderRadius: '3px' }}>
                              <div style={{ width: `${Math.min(100, (child.available_volume / child.total_volume) * 100)}%`, height: '100%', background: '#94a3b8', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '11px' }}>{child.available_volume?.toFixed(3)}</span>
                          </div>
                        </td>
                        <td><span className={`badge badge-${child.status === 'available' ? 'green' : child.status === 'split' ? 'purple' : child.status === 'allocated' ? 'blue' : 'gray'}`}>{child.status}</span></td>
                        <td></td>
                      </tr>
                    ))}
                  </>
                );
              })}
              {stones.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No stone blocks registered yet</td></tr>}
            </tbody>
          </table></div></div>
        )}
        {!loading && (
          <div className="report-pagination" style={{ marginTop: '12px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(1)} disabled={safePage === 1}>First</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>Prev</button>
            <span className="report-page-meta">Page {safePage} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>Last</button>
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ width: '110px' }}
            >
              {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size} / page</option>)}
            </select>
          </div>
        )}
      </div>

      {showModal === 'split' && selectedStone && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">✂️ Split Block: <code style={{ fontSize: '14px', color: '#7c3aed' }}>{selectedStone.serial_no}</code></div>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#0369a1', marginBottom: '16px' }}>
              Available volume: <strong>{selectedStone.available_volume?.toFixed(3)} cft</strong>
            </div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <form onSubmit={handleSplit}>
              {splitForm.children.map((child, idx) => (
                <div key={idx} style={{ border: '1px solid #dce8f5', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '10px' }}>Child Block {idx + 1}</div>
                  <div className="grid-3">
                    <div className="form-group"><label className="form-label">Length *</label><input className="form-input" type="number" step="0.001" required value={child.length} onChange={e => updateChild(idx, 'length', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Width *</label><input className="form-input" type="number" step="0.001" required value={child.width} onChange={e => updateChild(idx, 'width', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Height *</label><input className="form-input" type="number" step="0.001" required value={child.height} onChange={e => updateChild(idx, 'height', e.target.value)} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Serial (auto if blank)</label><input className="form-input" value={child.serial_number} onChange={e => updateChild(idx, 'serial_number', e.target.value)} /></div>
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={addChild} style={{ marginBottom: '16px' }}>+ Add Child Block</button>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Splitting...' : 'Split Block'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal === 'genealogy' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🌳 Block Genealogy</div>
            {genealogy ? (
              <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                <div style={{ padding: '10px 14px', background: '#f5f3ff', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e9d5ff' }}>
                  <strong style={{ color: '#7c3aed' }}>{genealogy.serial_no}</strong> &nbsp;—&nbsp;
                  <span style={{ color: '#64748b' }}>{genealogy.total_volume?.toFixed(3)} cft</span> &nbsp;
                  <span className={`badge badge-${genealogy.status === 'available' ? 'green' : 'gray'}`}>{genealogy.status}</span>
                </div>
                {genealogy.children?.map(c => (
                  <div key={c.id} style={{ marginLeft: '20px', padding: '8px 14px', background: '#eff6ff', borderRadius: '8px', marginBottom: '6px', borderLeft: '3px solid #93c5fd' }}>
                    ↳ <strong style={{ color: '#1e40af' }}>{c.serial_no}</strong> &nbsp;—&nbsp;
                    <span style={{ color: '#64748b' }}>{c.total_volume?.toFixed(3)} cft</span> &nbsp;
                    <span className="badge badge-blue" style={{ fontSize: '10px' }}>{c.status}</span>
                  </div>
                ))}
                {(!genealogy.children || genealogy.children.length === 0) && (
                  <div style={{ color: '#94a3b8', fontSize: '12px', padding: '8px' }}>No child blocks — this is a leaf block</div>
                )}
              </div>
            ) : <div className="loading">Loading genealogy...</div>}
            <div className="modal-actions"><button className="btn btn-ghost" onClick={() => setShowModal(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
