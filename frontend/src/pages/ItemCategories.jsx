import { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';

const FIELD_CONFIG = {
  name: { label: 'Category Name', type: 'text', required: true, defaultValue: '' },
  item_type: { 
    label: 'Item Type', 
    type: 'select', 
    required: true, 
    defaultValue: 'serialized',
    options: [
      { value: 'serialized', label: 'Serialized' },
      { value: 'batch', label: 'Batch' },
      { value: 'dimensional', label: 'Dimensional' }
    ]
  },
  hsn_code: { label: 'HSN Code', type: 'text', required: false, defaultValue: '' },
  gst_rate: { label: 'GST Rate (%)', type: 'number', required: false, defaultValue: 18 },
  description: { label: 'Description', type: 'textarea', required: false, defaultValue: '' }
};

// API: inventoryAPI.categories(), inventoryAPI.createCategory(data)
// Table columns: Category Name, Item Type, HSN Code, GST Rate, Actions

const getInitialForm = () => Object.keys(FIELD_CONFIG).reduce((acc, key) => ({ ...acc, [key]: FIELD_CONFIG[key].defaultValue }), {});

export default function ItemCategories() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(getInitialForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadData = () => { setLoading(true); inventoryAPI.categories().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(loadData, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const payload = {}; Object.keys(form).forEach(key => { if (FIELD_CONFIG[key].required || form[key]) payload[key] = form[key] || null; });
      if (editMode) {
        await inventoryAPI.updateCategory(editId, payload);
      } else {
        await inventoryAPI.createCategory(payload);
      }
      setShowModal(false); setForm(getInitialForm()); setEditMode(false); setEditId(null); loadData();
    } catch (e) { setError(e.response?.data?.detail || 'Operation failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete this category?')) return; try { await inventoryAPI.deleteCategory(id); loadData(); } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); } };
  const openCreateModal = () => { setForm(getInitialForm()); setEditMode(false); setEditId(null); setError(null); setShowModal(true); };
  const openEditModal = (record) => { const editForm = {}; Object.keys(FIELD_CONFIG).forEach(key => { editForm[key] = record[key] ?? FIELD_CONFIG[key].defaultValue; }); setForm(editForm); setEditMode(true); setEditId(record.id); setError(null); setShowModal(true); };

  const renderField = (key) => {
    const config = FIELD_CONFIG[key]; const value = form[key];
    return (
      <div className="form-group" key={key}>
        <label className={`form-label ${config.required ? 'required' : ''}`}>{config.label}</label>
        {config.type === 'select' ? (
          <select className="form-select" value={value} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={config.required}>
            <option value="">Select {config.label}</option>
            {config.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        ) : config.type === 'textarea' ? (
          <textarea className="form-textarea" value={value} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={config.required} />
        ) : (
          <input className="form-input" type={config.type} value={value} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={config.required} />
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">📦 Item Categories</div><div className="page-subtitle">Manage inventory categories with HSN and GST</div></div>
        <button className="btn btn-primary" onClick={openCreateModal}>+ New Category</button>
      </div>
      <div className="card">
        {loading ? <div className="loading">Loading...</div> : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📦</div><p>No categories found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Category Name</th><th>Item Type</th><th>HSN Code</th><th>GST Rate</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td><span className="badge badge-blue">{c.item_type}</span></td>
                    <td>{c.hsn_code || '—'}</td>
                    <td>{c.gst_rate}%</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(c)} style={{ marginRight: '8px' }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editMode ? '✏️ Edit Category' : '➕ New Category'}</div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <form onSubmit={handleSubmit}>
              {Object.keys(FIELD_CONFIG).map(key => renderField(key))}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editMode ? 'Update' : 'Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
