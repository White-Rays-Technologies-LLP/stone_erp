import { useState, useEffect } from 'react';
import { projectsAPI, inventoryAPI, stonesAPI } from '../services/api';

const FIELD_CONFIG = {
  name: { label: 'Project Name', type: 'text', required: true, defaultValue: '' },
  code: { label: 'Project Code', type: 'text', required: true, defaultValue: '' },
  location: { label: 'Location', type: 'text', required: false, defaultValue: '' },
  state: { label: 'State', type: 'text', required: false, defaultValue: '' },
  state_code: { label: 'State Code', type: 'text', required: false, defaultValue: '' },
  client_name: { label: 'Client Name', type: 'text', required: false, defaultValue: '' },
  client_gstin: { label: 'Client GSTIN', type: 'text', required: false, defaultValue: '' },
  start_date: { label: 'Start Date', type: 'date', required: false, defaultValue: '' },
  expected_end_date: { label: 'Expected End Date', type: 'date', required: false, defaultValue: '' },
  total_value: { label: 'Total Value', type: 'number', required: false, defaultValue: 0 }
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', location: '', start_date: '', expected_end_date: '', total_value: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);

  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [allBlocks, setAllBlocks] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveStatus, setReserveStatus] = useState(null);
  const [reserveStatusLoading, setReserveStatusLoading] = useState(false);
  const [reserveStatusError, setReserveStatusError] = useState(null);

  const load = () => { setLoading(true); projectsAPI.list().then(r => { setProjects(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  const loadBlocks = () => {
    stonesAPI.list({ status: 'available' }).then(r => setAvailableBlocks(r.data));
    stonesAPI.list().then(r => setAllBlocks(r.data));
  };
  useEffect(() => {
    load();
    inventoryAPI.categories().then(r => setCategories(r.data));
    inventoryAPI.items().then(r => setAvailableItems(r.data));
    inventoryAPI.warehouses().then(r => setWarehouses(r.data));
    loadBlocks();
  }, []);

  const mapProjectMaterials = (rawMaterials, itemsData, blocksData) => {
    const result = [];
    const stoneGroups = new Map();

    (rawMaterials || []).forEach(m => {
      let itemId = m.item_id || '';
      let categoryId = '';
      if (m.stone_block_id) {
        const block = (blocksData || []).find(b => b.id === m.stone_block_id);
        if (block?.item_id) itemId = block.item_id;
      }
      if (itemId) {
        const item = (itemsData || []).find(i => i.id === itemId);
        if (item?.category_id) categoryId = item.category_id;
      }
      const categoryName = (categories.find(c => c.id == categoryId)?.name || '').toLowerCase();
      const isStone = categoryName.includes('stone');

      if (isStone && m.stone_block_id) {
        const key = `${categoryId}|${itemId}`;
        if (!stoneGroups.has(key)) {
          stoneGroups.set(key, {
            item_id: itemId || '',
            category_id: categoryId || m.category_id || '',
            stone_block_id: '',
            required_qty: 0,
            serial_ids: [],
          });
        }
        const g = stoneGroups.get(key);
        g.serial_ids.push(m.stone_block_id);
        g.required_qty = g.serial_ids.length;
        return;
      }

      const serials = (m.serials || []).map(s => s.item_serial_id);
      const serialIds = (serials.length === 0 && m.stone_block_id) ? [m.stone_block_id] : serials;
      result.push({
        ...m,
        item_id: itemId || '',
        category_id: categoryId || m.category_id || '',
        required_qty: Number(m.required_qty || 0),
        serial_ids: serialIds,
      });
    });

    stoneGroups.forEach(g => result.push(g));
    return result;
  };

  const selectedBlockIds = new Set((materials || []).map(m => m.stone_block_id).filter(Boolean));
  const extraBlocks = allBlocks.filter(b => selectedBlockIds.has(b.id));
  const blockOptions = [...availableBlocks, ...extraBlocks].filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);

  const addMaterial = () => {
    setMaterials([...materials, { category_id: '', item_id: '', stone_block_id: '', required_qty: 0, serial_ids: [] }]);
  };

  const updateMaterial = (index, field, value) => {
    const updated = [...materials];
    if (field === 'category_id') {
      updated[index].category_id = value;
      updated[index].item_id = '';
      updated[index].stone_block_id = '';
      updated[index].serial_ids = [];
      updated[index].required_qty = 0;
    } else if (field === 'item_id') {
      updated[index].item_id = value;
      updated[index].stone_block_id = '';
      updated[index].serial_ids = [];
      updated[index].required_qty = 0;
    } else if (field === 'serial_ids') {
      updated[index].serial_ids = value || [];
      updated[index].required_qty = (value || []).length;
    } else if (field === 'stone_block_id') {
      updated[index].stone_block_id = value;
      // When selecting a stone block, set serial_ids from the block
      if (value) {
        const selectedBlock = allBlocks.find(b => b.id == value);
        if (selectedBlock) {
          updated[index].serial_ids = [Number(value)]; // Store block ID as serial
          updated[index].required_qty = 1;
        }
      } else {
        updated[index].serial_ids = [];
        updated[index].required_qty = 0;
      }
    } else {
      updated[index][field] = value;
    }
    setMaterials(updated);
  };

  const removeMaterial = (index) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const isStoneCategoryId = (cid) =>
        categories.find(c => c.id == cid)?.name?.toLowerCase().includes('stone');

      const expandedMaterials = [];
      materials.forEach((m) => {
        const isStone = isStoneCategoryId(m.category_id);
        if ((m.item_id || m.stone_block_id) && Number(m.required_qty) > 0) {
          expandedMaterials.push({
            item_id: m.item_id ? Number(m.item_id) : null,
            stone_block_id: isStone ? null : (m.stone_block_id ? Number(m.stone_block_id) : null),
            required_qty: Number(m.required_qty),
            serial_ids: [],
          });
        }
      });

      const payload = {
        name: form.name,
        code: form.code || form.name.toUpperCase().replace(/\s+/g, '-').slice(0, 20),
        location: form.location || null,
        state: form.state || null,
        state_code: form.state_code || null,
        client_name: form.client_name || null,
        client_gstin: form.client_gstin || null,
        start_date: form.start_date || null,
        expected_end_date: form.expected_end_date || null,
        total_value: form.total_value ? Number(form.total_value) : 0,
        materials: expandedMaterials,
      };
      let saved;
      if (editMode) {
        const res = await projectsAPI.update(editId, payload);
        saved = res?.data;
      } else {
        const res = await projectsAPI.create(payload);
        saved = res?.data;
      }
      // Auto-reserve materials after save when materials exist
      if (saved?.id && expandedMaterials.length > 0) {
        try {
          await projectsAPI.reserveMaterials(saved.id, { items: [] });
        } catch (e) {
          // ignore reserve failure here; user can see details in project view
        }
      }
      setShowModal(false); setEditMode(false); setEditId(null); 
      setForm({ name: '', code: '', location: '', start_date: '', expected_end_date: '', total_value: '' }); 
      setMaterials([]);
      load();
    } catch (e) { setError(e.response?.data?.detail || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    await projectsAPI.delete(id).catch(() => {}); load();
  };

  const openEdit = async (p) => {
    setForm({ name: p.name, code: p.code || '', location: p.location || '', state: p.state || '', state_code: p.state_code || '', client_name: p.client_name || '', client_gstin: p.client_gstin || '', start_date: p.start_date || '', expected_end_date: p.expected_end_date || '', total_value: p.total_value || '' });
    setEditMode(true); setEditId(p.id); setError(null); setShowModal(true);
    try {
      const refs = await Promise.allSettled([
        inventoryAPI.items(),
        inventoryAPI.categories(),
        stonesAPI.list(),
      ]);
      const itemsRes = refs[0];
      const catsRes = refs[1];
      const blocksRes = refs[2];
      if (itemsRes.status === 'fulfilled') setAvailableItems(itemsRes.value?.data || []);
      if (catsRes.status === 'fulfilled') setCategories(catsRes.value?.data || []);
      if (blocksRes.status === 'fulfilled') setAllBlocks(blocksRes.value?.data || []);
      const res = await projectsAPI.get(p.id);
      const itemsData = itemsRes.status === 'fulfilled' ? (itemsRes.value?.data || []) : availableItems;
      const blocksData = blocksRes.status === 'fulfilled' ? (blocksRes.value?.data || []) : allBlocks;
      setMaterials(mapProjectMaterials(res.data.materials || [], itemsData, blocksData));
    } catch {
      setMaterials([]);
    }
  };
  const openCreate = () => { setForm({ name: '', code: '', location: '', state: '', state_code: '', client_name: '', client_gstin: '', start_date: '', expected_end_date: '', total_value: '' }); setEditMode(false); setEditId(null); setError(null); setShowModal(true); };

  const openDetails = async (p) => {
    setShowDetails(true);
    setDetailsLoading(true);
    setSelectedProject(null);
    setReserveStatus(null);
    setReserveStatusError(null);
    try {
      const refs = await Promise.allSettled([
        inventoryAPI.items(),
        inventoryAPI.categories(),
        stonesAPI.list(),
      ]);
      const itemsRes = refs[0];
      const catsRes = refs[1];
      const blocksRes = refs[2];
      if (itemsRes.status === 'fulfilled') setAvailableItems(itemsRes.value?.data || []);
      if (catsRes.status === 'fulfilled') setCategories(catsRes.value?.data || []);
      if (blocksRes.status === 'fulfilled') setAllBlocks(blocksRes.value?.data || []);
      const res = await projectsAPI.get(p.id);
      setSelectedProject(res.data);
      loadReserveStatus(p.id);
    } catch {
      setSelectedProject(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadReserveStatus = async (projectId) => {
    setReserveStatusLoading(true);
    setReserveStatusError(null);
    try {
      const res = await projectsAPI.reserveStatus(projectId);
      setReserveStatus(res.data);
    } catch (e) {
      setReserveStatusError(e.response?.data?.detail || 'Failed to load reserve status');
    } finally {
      setReserveStatusLoading(false);
    }
  };

  const reserveMaterials = async (p) => {
    setReserveLoading(true);
    try {
      await projectsAPI.reserveMaterials(p.id, { items: [] });
      load();
      loadBlocks();
      if (selectedProject?.id === p.id) loadReserveStatus(p.id);
    } catch (e) {
      alert(e.response?.data?.detail || 'Reserve failed');
    } finally {
      setReserveLoading(false);
    }
  };

  const releaseMaterials = async (p) => {
    setReserveLoading(true);
    try {
      await projectsAPI.releaseMaterials(p.id);
      load();
      loadBlocks();
      if (selectedProject?.id === p.id) loadReserveStatus(p.id);
    } catch (e) {
      alert(e.response?.data?.detail || 'Release failed');
    } finally {
      setReserveLoading(false);
    }
  };

  const statusColor = { active: 'green', completed: 'blue', on_hold: 'orange', cancelled: 'red', planning: 'gray' };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">🏗️ Projects</div><div className="page-subtitle">Manage all construction projects</div></div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Project</button>
      </div>
      <div className="card">
        {loading ? <div className="loading">Loading projects...</div> : projects.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏗️</div><p>No projects found. Create your first project.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Location</th><th>Status</th><th>Completion</th><th>Budget</th><th>Actions</th></tr></thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong><br/><span style={{ fontSize: '11px', color: '#64748b' }}>{p.description}</span></td>
                    <td>{p.location || '—'}</td>
                    <td><span className={`badge badge-${statusColor[p.status] || 'gray'}`}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                          <div style={{ width: `${p.completion_pct || 0}%`, height: '100%', background: '#1e40af', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{p.completion_pct || 0}%</span>
                      </div>
                    </td>
                    <td>{p.total_value ? `Rs.${Number(p.total_value).toLocaleString('en-IN')}` : '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openDetails(p)} style={{ marginRight: '4px' }}>View</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} style={{ marginRight: '4px' }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
  <div className="modal-overlay" onClick={() => setShowModal(false)}>
    <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95%' }}>
      <div className="modal-header">
        <h2 className="modal-title">
          {editMode ? '✏️ Edit Project' : '🏗️ Create New Project'}
        </h2>
        <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
      </div>
      
      {error && (
        <div className="alert alert-error" style={{ margin: '0 24px 16px' }}>
          <span style={{ marginRight: '8px' }}>⚠️</span>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSave}>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '24px' }}>
          {/* Project Basic Information Section */}
          <div className="form-section">
            <h3 className="section-title">📋 Basic Information</h3>
            <div className="section-divider"></div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  Project Name <span className="required-star">*</span>
                </label>
                <input 
                  className="form-input" 
                  value={form.name} 
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
                  required 
                  placeholder="e.g. Diamond Tower Construction"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Project Code <span className="required-star">*</span>
                </label>
                <input 
                  className="form-input" 
                  value={form.code} 
                  placeholder="e.g. DTC-2024-001" 
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))} 
                  required 
                />
                <small className="form-hint">Unique identifier for the project</small>
              </div>
            </div>
          </div>

          {/* Client Information Section */}
          <div className="form-section">
            <h3 className="section-title">👥 Client Information</h3>
            <div className="section-divider"></div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input 
                  className="form-input" 
                  value={form.client_name} 
                  onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} 
                  placeholder="e.g. ABC Developers"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Client GSTIN</label>
                <input 
                  className="form-input" 
                  value={form.client_gstin} 
                  onChange={e => setForm(p => ({ ...p, client_gstin: e.target.value }))} 
                  placeholder="e.g. 22AAAAA0000A1Z5"
                />
              </div>
            </div>
          </div>

          {/* Location Details Section */}
          <div className="form-section">
            <h3 className="section-title">📍 Location Details</h3>
            <div className="section-divider"></div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Location</label>
                <input 
                  className="form-input" 
                  value={form.location} 
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))} 
                  placeholder="e.g. Sector 62, Noida"
                />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input 
                  className="form-input" 
                  value={form.state} 
                  onChange={e => setForm(p => ({ ...p, state: e.target.value }))} 
                  placeholder="e.g. Uttar Pradesh"
                />
              </div>
              <div className="form-group">
                <label className="form-label">State Code</label>
                <input 
                  className="form-input" 
                  value={form.state_code} 
                  placeholder="e.g. 09" 
                  onChange={e => setForm(p => ({ ...p, state_code: e.target.value }))} 
                />
              </div>
            </div>
          </div>

          {/* Project Timeline Section */}
          <div className="form-section">
            <h3 className="section-title">📅 Timeline & Budget</h3>
            <div className="section-divider"></div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input 
                  className="form-input" 
                  type="date" 
                  value={form.start_date} 
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Expected End Date</label>
                <input 
                  className="form-input" 
                  type="date" 
                  value={form.expected_end_date} 
                  onChange={e => setForm(p => ({ ...p, expected_end_date: e.target.value }))} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Total Value (Rs.)</label>
                <input 
                  className="form-input" 
                  type="number" 
                  value={form.total_value} 
                  onChange={e => setForm(p => ({ ...p, total_value: e.target.value }))} 
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Required Materials Section */}
          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>🛠️ Required Materials</h3>
              <button 
                type="button" 
                className="btn btn-outline-primary btn-sm" 
                onClick={addMaterial}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span style={{ fontSize: '18px' }}>+</span> Add Material
              </button>
            </div>
            <div className="section-divider"></div>
            
            {materials.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
                <p style={{ color: '#64748b', marginBottom: '8px' }}>No materials added yet</p>
                <small style={{ color: '#94a3b8' }}>Click "Add Material" to start adding required items</small>
              </div>
            ) : (
              <div className="materials-table">
                {/* Table Header */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '140px 240px 80px 80px 40px', 
                  gap: '8px', 
                  marginBottom: '12px',
                  padding: '8px 0',
                  fontWeight: 600,
                  color: '#1e293b',
                  fontSize: '13px',
                  borderBottom: '2px solid #e2e8f0'
                }}>
                  <div>Category</div>
                  <div>Item</div>
                  <div>UOM</div>
                  <div>Quantity</div>
                  <div></div>
                </div>

                {/* Material Rows */}
                <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                  {materials.map((material, index) => {
                    const isStone = categories.find(c => c.id == material.category_id)?.name?.toLowerCase().includes('stone');
                    const selectedItem = availableItems.find(i => i.id == material.item_id);
                    const hasSerials = false;
                    
                    return (
                      <div key={index} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '140px 240px 80px 80px 40px', 
                        gap: '8px', 
                        marginBottom: '12px',
                        alignItems: 'start',
                        background: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                        padding: '8px',
                        borderRadius: '6px'
                      }}>
                        {/* Category Select */}
                        <select 
                          className="form-input form-input-sm"
                          value={material.category_id} 
                          onChange={e => updateMaterial(index, 'category_id', e.target.value)}
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>

                        {/* Item Select */}
                        <select 
                          className="form-input form-input-sm" 
                          value={material.item_id} 
                          onChange={e => updateMaterial(index, 'item_id', e.target.value)}
                          disabled={!material.category_id}
                        >
                          <option value="">Select Item</option>
                          {availableItems
                            .filter(item => item.category_id == material.category_id)
                            .map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} {item.has_serial_no ? '(Serialized)' : ''}
                              </option>
                            ))
                          }
                        </select>

                        {/* UOM Display */}
                        <input
                          className="form-input form-input-sm"
                          value={selectedItem?.uom || ''}
                          readOnly
                          placeholder="UOM"
                          style={{ background: '#f1f5f9' }}
                        />

                        {/* Quantity Input */}
                        <input 
                          className="form-input form-input-sm" 
                          type="number" 
                          placeholder="Qty" 
                          value={material.required_qty} 
                          onChange={e => updateMaterial(index, 'required_qty', Number(e.target.value))}
                          min="1"
                        />

                        {/* Remove Button */}
                        <button
                          type="button"
                          className="btn btn-icon btn-danger btn-sm"
                          onClick={() => removeMaterial(index)}
                          style={{ 
                            width: '32px', 
                            height: '32px', 
                            padding: 0,
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Remove material"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ 
          padding: '16px 24px', 
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: '#f8fafc'
        }}>
          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={() => setShowModal(false)}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving}
            style={{ minWidth: '100px' }}
          >
            {saving ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner-small"></span>
                Saving...
              </span>
            ) : (
              editMode ? 'Update Project' : 'Create Project'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
      {showDetails && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
            <div className="modal-title">🏗️ Project Details</div>
            <div style={{flex: 1, overflowY: 'auto', padding: '12px 4px'}}>
              {detailsLoading && <div className="loading">Loading...</div>}
              {!detailsLoading && selectedProject && (
                <>
                  <div className="grid-2" style={{marginBottom: '16px'}}>
                    <div><strong>Name:</strong> {selectedProject.name}</div>
                    <div><strong>Code:</strong> {selectedProject.code}</div>
                    <div><strong>Location:</strong> {selectedProject.location || ''}</div>
                    <div><strong>Client:</strong> {selectedProject.client_name || ''}</div>
                    <div><strong>Start:</strong> {selectedProject.start_date || ''}</div>
                    <div><strong>End:</strong> {selectedProject.expected_end_date || ''}</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Required Materials</label>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Item</th>
                            <th>UOM</th>
                            <th>Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const rows = [];
                            const stoneGroups = new Map();
                            (selectedProject.materials || []).forEach((m) => {
                              const item = availableItems.find(i => i.id === m.item_id);
                              const category = categories.find(c => c.id === item?.category_id);
                              const categoryName = (category?.name || '').toLowerCase();
                              const isStone = categoryName.includes('stone');
                              if (isStone && m.stone_block_id) {
                                const key = `${category?.id || 'stone'}|${item?.id || m.item_id || ''}`;
                                if (!stoneGroups.has(key)) {
                                  stoneGroups.set(key, { item, category, serials: [] });
                                }
                                const block = allBlocks.find(b => b.id === m.stone_block_id);
                                const dims = block && [block.length, block.width, block.height].every(v => v !== undefined && v !== null)
                                  ? `L:${block.length} W:${block.width} H:${block.height}`
                                  : '';
                                const label = block?.serial_no || `#${m.stone_block_id}`;
                                stoneGroups.get(key).serials.push(dims ? `${label} • ${dims}` : label);
                                return;
                              }

                            let serialDisplay = '—';
                              if (m.serials && m.serials.length > 0) {
                                serialDisplay = '—';
                              } else if (m.stone_block_id) {
                                const block = allBlocks.find(b => b.id === m.stone_block_id);
                                serialDisplay = block?.serial_no || m.stone_block_id;
                              }

                              rows.push(
                                <tr key={m.id}>
                                  <td>{category?.name || (item ? '—' : (m.item_id ? 'Item' : 'Stone'))}</td>
                                  <td>{item?.name || (m.item_id ? m.item_id : '')}</td>
                                  <td>{item?.uom || ''}</td>
                                  <td>{m.required_qty}</td>
                                </tr>
                              );
                            });

                            stoneGroups.forEach((g, key) => {
                              rows.push(
                                <tr key={`stone-${key}`}>
                                  <td>{g.category?.name || 'Stone'}</td>
                                  <td>{g.item?.name || 'Stone Block'}</td>
                                  <td>{g.item?.uom || ''}</td>
                                  <td>{g.serials.length}</td>
                                </tr>
                              );
                            });

                            return rows;
                          })()}
                          {(selectedProject.materials || []).length === 0 && (
                            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>No materials</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowDetails(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
