import { useState, useEffect } from 'react';
import { siteAPI, projectsAPI, inventoryAPI, blueprintsAPI, manufacturingAPI, stonesAPI } from '../services/api';

export default function Site() {
  const [dispatches, setDispatches] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dispatches');
  const [showModal, setShowModal] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [blueprintPositions, setBlueprintPositions] = useState([]);
  const [blueprintStructures, setBlueprintStructures] = useState([]);
  const [componentRows, setComponentRows] = useState([]);
  const [stoneBlocks, setStoneBlocks] = useState([]);
  const [dispatchFGRows, setDispatchFGRows] = useState([]);
  const [dispatchFgLoading, setDispatchFgLoading] = useState(false);
  const [installSourceLoading, setInstallSourceLoading] = useState(false);
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [challanData, setChallanData] = useState(null);
  const [challanLoading, setChallanLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.allSettled([siteAPI.dispatches(), siteAPI.installations(), projectsAPI.list(), inventoryAPI.warehouses(), blueprintsAPI.structures()]).then(([d, i, p, w, s]) => {
      setDispatches(d.value?.data || []);
      setInstallations(i.value?.data || []);
      setProjects(p.value?.data || []);
      setWarehouses(w.value?.data || []);
      setBlueprintStructures(s.value?.data || []);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (showModal === 'dispatch') {
        const normalized = (form.items || []).map((it) => ({
          row_type: it.row_type || '',
          ref_id: Number(it.ref_id || 0),
          qty: Number(it.qty || 0),
          rate: Number(it.rate || 0),
        }));
        if (!normalized.length) throw new Error('Add at least one dispatch item');
        const payloadItems = normalized.map((it) => {
          const inv = dispatchFGRows.find((r) => Number(r._key) === Number(it.ref_id));
          if (!inv) throw new Error('Selected item/block is not available');
          if (it.qty <= 0) throw new Error('Qty must be greater than 0');
          if (it.qty > Number(inv.available_qty || 0)) throw new Error(`Qty exceeds available for ${inv.item_name || inv.serial_no}`);
          return {
            stone_block_id: inv.row_type === 'stone_block' ? Number(inv.stone_block_id) : null,
            item_id: inv.row_type === 'item' || inv.row_type === 'item_serial' ? Number(inv.item_id) : Number(inv.item_id || 0),
            qty: Number(it.qty),
            rate: Number(it.rate || 0),
            hsn_code: null,
            serial_ids: inv.row_type === 'item_serial' ? [Number(inv.serial_id)] : null,
          };
        });
        const payload = { ...form, items: payloadItems };
        if (editMode) await siteAPI.updateDispatch(editId, payload);
        else await siteAPI.createDispatch(payload);
      } else {
        if (!form.project_id) {
          throw new Error('Selected structure is not linked to any project');
        }
        if (editMode) await siteAPI.updateInstallation(editId, form);
        else await siteAPI.createInstallation(form);
      }
      setShowModal(null); setEditMode(false); setEditId(null); setForm({}); load();
    } catch (e) { setError(e.response?.data?.detail || e.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      if (type === 'dispatch') await siteAPI.deleteDispatch(id);
      else await siteAPI.deleteInstallation(id);
      load();
    } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const handleVerify = async (id) => {
    try { await siteAPI.verifyInstallation(id); load(); } catch (e) { alert('Verify failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const handleConfirmDispatch = async (dispatchId) => {
    if (!window.confirm('Mark this dispatch as Dispatched? Stock will be deducted and record will be locked.')) return;
    try {
      await siteAPI.confirmDispatch(dispatchId);
      load();
    } catch (e) {
      alert('Confirm failed: ' + (e.response?.data?.detail || 'Error'));
    }
  };

  const handleViewChallan = async (dispatchId) => {
    setChallanLoading(true);
    try {
      const res = await siteAPI.challan(dispatchId);
      setChallanData(res.data || null);
      setShowChallanModal(true);
    } catch (e) {
      alert('Unable to load challan: ' + (e.response?.data?.detail || 'Error'));
    } finally {
      setChallanLoading(false);
    }
  };

  const printChallan = () => {
    if (!challanData) return;
    const rows = (challanData.items || [])
      .map((r, idx) => `<tr>
        <td>${idx + 1}</td>
        <td>${r.item_name || '-'}</td>
        <td>${r.stone_serial_no || r.serial_no || '-'}</td>
        <td>${r.length ?? '-'}</td>
        <td>${r.width ?? '-'}</td>
        <td>${r.height ?? '-'}</td>
        <td>${r.cft ?? '-'}</td>
        <td>${Number(r.qty || 0)}</td>
        <td>${Number(r.rate || 0).toFixed(2)}</td>
        <td>${Number(r.value || 0).toFixed(2)}</td>
      </tr>`)
      .join('');
    const html = `<!doctype html><html><head><title>Delivery Challan ${challanData.challan_no || ''}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        h2 { margin: 0 0 8px; }
      </style></head><body>
      <h2>Delivery Challan: ${challanData.challan_no || '-'}</h2>
      <div>Date: ${challanData.dispatch_date || '-'}</div>
      <div>Transporter: ${challanData.transporter_name || '-'}</div>
      <div>Vehicle: ${challanData.vehicle_no || '-'}</div>
      <table><thead><tr><th>#</th><th>Item</th><th>Stone Serial</th><th>L</th><th>W</th><th>H</th><th>CFT</th><th>Qty</th><th>Rate</th><th>Value</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div style="margin-top:12px;">Total Value: ${Number(challanData.total_value || 0).toFixed(2)}</div>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const downloadChallan = () => {
    if (!challanData) return;
    const payload = JSON.stringify(challanData, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${challanData.challan_no || 'delivery-challan'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = (type, record) => {
    setForm(type === 'dispatch' ? { ...record, items: record.items || [{ ref_id: '', row_type: '', qty: 0, rate: 0 }] } : record);
    setEditMode(true);
    setEditId(record.id);
    setError(null);
    if (type === 'installation') {
      const fallback = (blueprintStructures || []).find(s => Number(s.project_id) === Number(record.project_id));
      setSelectedStructureId(fallback ? String(fallback.id) : '');
    }
    setShowModal(type);
  };
  const openCreate = (type) => {
    setForm(type === 'dispatch' ? { items: [{ ref_id: '', row_type: '', qty: 0, rate: 0 }] } : {});
    setEditMode(false);
    setEditId(null);
    setError(null);
    if (type === 'installation') setSelectedStructureId('');
    setShowModal(type);
  };

  const loadDispatchFG = async (projectId, fromWarehouseId) => {
    if (!projectId || !fromWarehouseId) {
      setDispatchFGRows([]);
      return;
    }
    setDispatchFgLoading(true);
    try {
      const res = await siteAPI.dispatchFGInventory({ project_id: Number(projectId), from_warehouse_id: Number(fromWarehouseId) });
      setDispatchFGRows((res.data || []).map((r, idx) => ({ ...r, _key: idx + 1 })));
    } catch {
      setDispatchFGRows([]);
    } finally {
      setDispatchFgLoading(false);
    }
  };

  const loadInstallSources = async (structureId) => {
    if (!structureId) {
      setBlueprintPositions([]);
      setComponentRows([]);
      setStoneBlocks([]);
      return;
    }
    setInstallSourceLoading(true);
    try {
      const selectedStructure = (blueprintStructures || []).find(s => Number(s.id) === Number(structureId));
      const projectId = selectedStructure?.project_id;
      if (projectId) {
        setForm(prev => ({ ...prev, project_id: Number(projectId) }));
      }
      const [componentsRes, blocksRes, layersRes] = await Promise.all([
        manufacturingAPI.components(projectId ? { project_id: Number(projectId) } : {}),
        stonesAPI.list(projectId ? { project_id: Number(projectId) } : {}),
        blueprintsAPI.layers(Number(structureId)),
      ]);
      const components = componentsRes.data || [];
      const blocks = blocksRes.data || [];
      const layers = layersRes.data || [];
      const positions = [];
      for (const l of layers) {
        try {
          const posRes = await blueprintsAPI.positions(l.id);
          const rows = posRes.data || [];
          rows.forEach((p) => positions.push({ ...p, structure_id: Number(structureId), structure_name: selectedStructure?.name, layer_name: l.name }));
        } catch {
          // ignore per-layer fetch errors
        }
      }
      setBlueprintPositions(positions);
      setComponentRows(components);
      setStoneBlocks(blocks);
    } finally {
      setInstallSourceLoading(false);
    }
  };

  useEffect(() => {
    if (showModal !== 'installation') return;
    if (!selectedStructureId) {
      setBlueprintPositions([]);
      setComponentRows([]);
      setStoneBlocks([]);
      return;
    }
    loadInstallSources(selectedStructureId);
  }, [showModal, selectedStructureId, blueprintStructures.length]);

  useEffect(() => {
    if (showModal !== 'dispatch') return;
    loadDispatchFG(form.project_id, form.from_warehouse_id);
  }, [showModal, form.project_id, form.from_warehouse_id]);

  const dispatchLines = form.items || [];
  const dispatchLineErrors = dispatchLines.map((line) => {
    const inv = dispatchFGRows.find((r) => Number(r._key) === Number(line.ref_id));
    if (!inv) return 'Select item/block';
    const qty = Number(line.qty || 0);
    if (qty <= 0) return 'Qty must be > 0';
    if (qty > Number(inv.available_qty || 0)) return `Max ${inv.available_qty}`;
    if (inv.row_type === 'stone_block') {
      const l = Number(inv.length || 0);
      const w = Number(inv.width || 0);
      const h = Number(inv.height || 0);
      const c = Number(inv.cft || 0);
      if (l <= 0 || w <= 0 || h <= 0 || c <= 0) return 'Stone requires L/W/H/CFT';
    }
    return '';
  });
  const dispatchHasErrors = dispatchLineErrors.some(Boolean);
  const dispatchTotalQty = dispatchLines.reduce((sum, l) => sum + Number(l.qty || 0), 0);
  const dispatchTotalValue = dispatchLines.reduce((sum, l) => sum + (Number(l.qty || 0) * Number(l.rate || 0)), 0);

  const selectedPosition = blueprintPositions.find(p => Number(p.id) === Number(form.position_id));
  const positionBlockIds = Array.from(new Set(
    [
      selectedPosition?.stone_block_id,
      ...componentRows
        .filter(c => Number(c.position_id) === Number(form.position_id))
        .map(c => c.stone_block_id),
    ].filter(Boolean).map(Number),
  ));
  const positionBlocks = stoneBlocks.filter(b => positionBlockIds.includes(Number(b.id)));

  useEffect(() => {
    if (showModal !== 'installation') return;
    if (!form.position_id) return;
    if (!positionBlockIds.length) return;
    if (positionBlockIds.length === 1 && Number(form.stone_block_id) !== Number(positionBlockIds[0])) {
      setForm(prev => ({ ...prev, stone_block_id: Number(positionBlockIds[0]) }));
    }
  }, [showModal, form.position_id, positionBlockIds.join(',')]);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">🚛 Site Execution</div><div className="page-subtitle">Dispatch notes, installation tracking and e-way bill generation</div></div>
        <button className="btn btn-primary" onClick={() => openCreate(tab === 'dispatches' ? 'dispatch' : 'installation')}>+ New {tab === 'dispatches' ? 'Dispatch' : 'Installation'}</button>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        <button onClick={() => setTab('dispatches')} className="btn" style={{ background: tab === 'dispatches' ? '#1e40af' : '#fff', color: tab === 'dispatches' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>🚛 Dispatches ({dispatches.length})</button>
        <button onClick={() => setTab('installations')} className="btn" style={{ background: tab === 'installations' ? '#1e40af' : '#fff', color: tab === 'installations' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>🏛️ Installations ({installations.length})</button>
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <>
            {tab === 'dispatches' && (
              <div className="table-wrap"><table>
                <thead><tr><th>Dispatch #</th><th>Status</th><th>Date</th><th>Transporter</th><th>Project</th><th>E-Way Bill</th><th>Actions</th></tr></thead>
                <tbody>
                  {dispatches.map(d => (<tr key={d.id}>
                    <td><strong>{d.challan_no || d.dispatch_note_no}</strong></td>
                    <td><span className={`badge badge-${d.status === 'dispatched' ? 'green' : 'orange'}`}>{d.status || 'draft'}</span></td>
                    <td>{d.dispatch_date || '—'}</td>
                    <td>{d.transporter_name || '—'}</td>
                    <td>{projects.find(p => p.id === d.project_id)?.name || `Project #${d.project_id}`}</td>
                    <td><code style={{ fontSize: '11px' }}>{d.eway_bill_no || '—'}</code></td>
                    <td>
                      {d.status !== 'dispatched' && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => handleConfirmDispatch(d.id)} style={{ marginRight: '4px' }}>Mark Dispatched</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit('dispatch', d)} style={{ marginRight: '4px' }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete('dispatch', d.id)}>Delete</button>
                        </>
                      )}
                      {d.status === 'dispatched' && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleViewChallan(d.id)} style={{ marginRight: '6px' }} disabled={challanLoading}>
                            {challanLoading ? 'Loading...' : 'Challan'}
                          </button>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Locked</span>
                        </>
                      )}
                    </td>
                  </tr>))}
                  {dispatches.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No dispatches yet</td></tr>}
                </tbody>
              </table></div>
            )}
            {tab === 'installations' && (
              <div className="table-wrap"><table>
                <thead><tr><th>Project</th><th>Stone Block</th><th>Position</th><th>Date</th><th>Verified</th><th>Actions</th></tr></thead>
                <tbody>
                  {installations.map(inst => (<tr key={inst.id}>
                    <td>{projects.find(p => p.id === inst.project_id)?.name || `Project #${inst.project_id}`}</td>
                    <td>{stoneBlocks.find(b => Number(b.id) === Number(inst.stone_block_id))?.serial_no || `#${inst.stone_block_id}`}</td>
                    <td>
                      {(() => {
                        const pos = blueprintPositions.find(p => Number(p.id) === Number(inst.position_id));
                        if (!pos) return `#${inst.position_id}`;
                        return `${pos.structure_name} / ${pos.layer_name} / ${pos.position_code}`;
                      })()}
                    </td>
                    <td>{inst.installation_date || '?'}</td>
                    <td><span className={`badge badge-${inst.status === 'verified' ? 'green' : inst.status === 'installed' ? 'blue' : 'orange'}`}>{inst.status}</span></td>
                    <td>
                      {inst.status !== 'verified' && <button className="btn btn-primary btn-sm" onClick={() => handleVerify(inst.id)} style={{ marginRight: '4px' }}>Verify</button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit('installation', inst)} style={{ marginRight: '4px' }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete('installation', inst.id)}>Delete</button>
                    </td>
                  </tr>))}
                  {installations.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No installations yet</td></tr>}
                </tbody>
              </table></div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              width: showModal === 'dispatch' ? 'min(1180px, 96vw)' : 'min(920px, 94vw)',
              maxHeight: '92vh',
              overflow: 'auto',
            }}
          >
            <div className="modal-title">{editMode ? '✏️ Edit' : '➕ New'} {showModal === 'dispatch' ? 'Dispatch' : 'Installation'}</div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <form onSubmit={handleSave}>
              {showModal === 'dispatch' ? (<>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '10px', background: '#f8fafc' }}>
                <div className="form-group"><label className="form-label">Project *</label>
                  <select className="form-select" value={form.project_id || ''} required onChange={e => setForm(p => ({ ...p, project_id: Number(e.target.value) }))}>
                    <option value="">Select project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">From Warehouse *</label>
                    <select className="form-select" value={form.from_warehouse_id || ''} required onChange={e => setForm(p => ({ ...p, from_warehouse_id: Number(e.target.value) }))}>
                      <option value="">Select...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">To Warehouse *</label>
                    <select className="form-select" value={form.to_warehouse_id || ''} required onChange={e => setForm(p => ({ ...p, to_warehouse_id: Number(e.target.value) }))}>
                      <option value="">Select...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Dispatch Date *</label><input className="form-input" type="date" value={form.dispatch_date || ''} required onChange={e => setForm(p => ({ ...p, dispatch_date: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Transporter</label><input className="form-input" value={form.transporter_name || ''} onChange={e => setForm(p => ({ ...p, transporter_name: e.target.value }))} /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Vehicle No</label><input className="form-input" value={form.vehicle_no || ''} onChange={e => setForm(p => ({ ...p, vehicle_no: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">E-Way Bill</label><input className="form-input" value={form.eway_bill_no || ''} onChange={e => setForm(p => ({ ...p, eway_bill_no: e.target.value }))} /></div>
                </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Items *</label>
                  {dispatchFgLoading && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Loading FG inventory...</div>}
                  <div className="table-wrap" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' }}>
                    <table>
                      <thead><tr><th>Item / Block</th><th>L</th><th>W</th><th>H</th><th>CFT</th><th>Qty</th><th>Rate</th><th>Line Value</th><th>Action</th></tr></thead>
                      <tbody>
                  {(form.items || []).map((line, idx) => {
                    const selected = dispatchFGRows.find((r) => Number(r._key) === Number(line.ref_id));
                    return (
                      <tr key={idx}>
                        <td>
                        <select
                          className="form-select"
                          value={line.ref_id || ''}
                          onChange={e => {
                            const refId = Number(e.target.value);
                            const inv = dispatchFGRows.find((r) => Number(r._key) === refId);
                            setForm(p => {
                              const next = [...(p.items || [])];
                              next[idx] = { ...next[idx], ref_id: refId, row_type: inv?.row_type || '', qty: (inv?.row_type === 'stone_block' || inv?.row_type === 'item_serial') ? 1 : (next[idx]?.qty || 0) };
                              return { ...p, items: next };
                            });
                          }}
                        >
                          <option value="">Select item/block...</option>
                          {dispatchFGRows.map(r => (
                            <option key={r._key} value={r._key}>
                              {r.row_type === 'stone_block' ? `Block ${r.serial_no}` : r.row_type === 'item_serial' ? `Serial ${r.serial_no} (${r.item_name})` : `Item ${r.item_name}`} (Available {r.available_qty})
                            </option>
                          ))}
                        </select>
                        {dispatchLineErrors[idx] && <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>{dispatchLineErrors[idx]}</div>}
                        </td>
                        <td>{selected?.row_type === 'stone_block' ? Number(selected?.length || 0).toFixed(3) : '-'}</td>
                        <td>{selected?.row_type === 'stone_block' ? Number(selected?.width || 0).toFixed(3) : '-'}</td>
                        <td>{selected?.row_type === 'stone_block' ? Number(selected?.height || 0).toFixed(3) : '-'}</td>
                        <td>{selected?.row_type === 'stone_block' ? Number(selected?.cft || 0).toFixed(3) : '-'}</td>
                        <td>
                        <input
                          className="form-input"
                          type="number"
                          step="0.001"
                          min="0"
                          disabled={selected?.row_type === 'stone_block' || selected?.row_type === 'item_serial'}
                          value={line.qty || ''}
                          onChange={e => setForm(p => {
                            const next = [...(p.items || [])];
                            next[idx] = { ...next[idx], qty: Number(e.target.value || 0) };
                            return { ...p, items: next };
                          })}
                          placeholder="Qty"
                        />
                        </td>
                        <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            className="form-input"
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.rate || ''}
                            onChange={e => setForm(p => {
                              const next = [...(p.items || [])];
                              next[idx] = { ...next[idx], rate: Number(e.target.value || 0) };
                              return { ...p, items: next };
                            })}
                            placeholder="Rate"
                          />
                        </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>₹{(Number(line.qty || 0) * Number(line.rate || 0)).toFixed(2)}</td>
                        <td><button type="button" className="btn btn-danger btn-sm" onClick={() => setForm(p => ({ ...p, items: (p.items || []).filter((_, i) => i !== idx) }))}>Remove</button></td>
                      </tr>
                    );
                  })}
                      {(form.items || []).length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: '#64748b' }}>No items added</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(p => ({ ...p, items: [...(p.items || []), { ref_id: '', row_type: '', qty: 0, rate: 0 }] }))}>+ Add Item</button>
                    <div style={{ fontSize: '12px', color: '#334155' }}>
                      Total Qty: <b>{dispatchTotalQty.toFixed(3)}</b> | Total Value: <b>₹{dispatchTotalValue.toFixed(2)}</b>
                    </div>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Remarks</label><textarea className="form-textarea" value={form.remarks || ''} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} /></div>
              </>) : (<>
                <div className="form-group"><label className="form-label">Structure *</label>
                  <select
                    className="form-select"
                    value={selectedStructureId}
                    required
                    onChange={e => {
                      const sid = e.target.value;
                      setSelectedStructureId(sid);
                      const selectedStructure = (blueprintStructures || []).find(s => Number(s.id) === Number(sid));
                      setForm(p => ({
                        ...p,
                        project_id: selectedStructure?.project_id ? Number(selectedStructure.project_id) : undefined,
                        position_id: '',
                        stone_block_id: '',
                      }));
                    }}
                  >
                    <option value="">Select structure...</option>
                    {blueprintStructures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {form.project_id && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    Project: {projects.find(p => Number(p.id) === Number(form.project_id))?.name || `#${form.project_id}`}
                  </div>
                )}
                {installSourceLoading && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>Loading blueprint positions...</div>
                )}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Position (From Blueprint) *</label>
                    <select
                      className="form-select"
                      value={form.position_id || ''}
                      required
                      onChange={e => setForm(p => ({ ...p, position_id: Number(e.target.value), stone_block_id: '' }))}
                      disabled={!selectedStructureId}
                    >
                      <option value="">Select position...</option>
                      {blueprintPositions.map(pos => (
                        <option key={pos.id} value={pos.id}>
                          {pos.structure_name} / {pos.layer_name} / {pos.position_code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stone Block (Mapped) *</label>
                    <select
                      className="form-select"
                      value={form.stone_block_id || ''}
                      required
                      onChange={e => setForm(p => ({ ...p, stone_block_id: Number(e.target.value) }))}
                      disabled={!form.position_id}
                    >
                      <option value="">Select block...</option>
                      {positionBlocks.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.serial_no || `#${b.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {form.position_id && positionBlocks.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#b45309', marginBottom: '8px' }}>
                    No mapped stone block found for selected position. Assign stone block in Blueprint Position or Structural Component.
                  </div>
                )}
                <div className="form-group"><label className="form-label">Installation Date</label><input className="form-input" type="date" value={form.installation_date || ''} onChange={e => setForm(p => ({ ...p, installation_date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Remarks</label><textarea className="form-textarea" value={form.remarks || ''} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} /></div>
              </>)}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || (showModal === 'dispatch' && dispatchHasErrors)}>
                  {saving ? 'Saving...' : (editMode ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChallanModal && (
        <div className="modal-overlay" onClick={() => setShowChallanModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(980px, 96vw)' }}>
            <div className="modal-title">Delivery Challan</div>
            {!challanData ? (
              <div className="loading">Loading...</div>
            ) : (
              <>
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                  <div><strong>Challan No:</strong> {challanData.challan_no || '-'}</div>
                  <div><strong>Date:</strong> {challanData.dispatch_date || '-'}</div>
                  <div><strong>Transporter:</strong> {challanData.transporter_name || '-'}</div>
                  <div><strong>Vehicle:</strong> {challanData.vehicle_no || '-'}</div>
                  <div><strong>E-Way Bill:</strong> {challanData.eway_bill_no || '-'}</div>
                  <div><strong>Total Value:</strong> {Number(challanData.total_value || 0).toFixed(2)}</div>
                </div>
                <div className="table-wrap" style={{ marginBottom: '12px' }}>
                  <table>
                    <thead>
                      <tr><th>#</th><th>Item</th><th>Stone Serial</th><th>L</th><th>W</th><th>H</th><th>CFT</th><th>Qty</th><th>Rate</th><th>Value</th></tr>
                    </thead>
                    <tbody>
                      {(challanData.items || []).map((r, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{r.item_name || '-'}</td>
                          <td>{r.stone_serial_no || r.serial_no || '-'}</td>
                          <td>{r.length ?? '-'}</td>
                          <td>{r.width ?? '-'}</td>
                          <td>{r.height ?? '-'}</td>
                          <td>{r.cft ?? '-'}</td>
                          <td>{Number(r.qty || 0)}</td>
                          <td>{Number(r.rate || 0).toFixed(2)}</td>
                          <td>{Number(r.value || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {(challanData.items || []).length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center' }}>No items</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowChallanModal(false)}>Close</button>
                  <button type="button" className="btn btn-ghost" onClick={downloadChallan}>Download</button>
                  <button type="button" className="btn btn-primary" onClick={printChallan}>Print</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
