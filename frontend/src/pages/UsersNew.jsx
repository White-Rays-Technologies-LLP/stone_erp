import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'structural_engineer', label: 'Structural Engineer' },
  { value: 'production_supervisor', label: 'Production Supervisor' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'accounts_manager', label: 'Accounts Manager' },
  { value: 'site_supervisor', label: 'Site Supervisor' },
  { value: 'contractor', label: 'Contractor' }
];

const FIELD_CONFIG = {
  name: { label: 'Full Name', type: 'text', required: true, defaultValue: '' },
  email: { label: 'Email', type: 'email', required: true, defaultValue: '' },
  password: { label: 'Password', type: 'password', required: true, defaultValue: '', editHide: true },
  role: { label: 'Role', type: 'select', required: true, defaultValue: 'admin', options: ROLES }
};

const getInitialForm = () => Object.keys(FIELD_CONFIG).reduce((acc, key) => ({ ...acc, [key]: FIELD_CONFIG[key].defaultValue }), {});

export default function UsersManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(getInitialForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    authAPI.users()
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(loadData, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {};
      Object.keys(form).forEach(key => {
        const config = FIELD_CONFIG[key];
        if (editMode && config.editHide) return;
        if (config.required || form[key]) payload[key] = form[key] || null;
      });
      if (editMode) {
        await authAPI.updateUser(editId, payload);
      } else {
        await authAPI.createUser(payload);
      }
      setShowModal(false);
      setForm(getInitialForm());
      setEditMode(false);
      setEditId(null);
      loadData();
    } catch (e) {
      setError(e.response?.data?.detail || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await authAPI.deleteUser(id);
      loadData();
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.detail || 'Error'));
    }
  };

  const openCreateModal = () => {
    setForm(getInitialForm());
    setEditMode(false);
    setEditId(null);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (record) => {
    const editForm = {};
    Object.keys(FIELD_CONFIG).forEach(key => {
      editForm[key] = record[key] ?? FIELD_CONFIG[key].defaultValue;
    });
    setForm(editForm);
    setEditMode(true);
    setEditId(record.id);
    setError(null);
    setShowModal(true);
  };

  const renderField = (key) => {
    const config = FIELD_CONFIG[key];
    if (editMode && config.editHide) return null;
    const value = form[key];
    return (
      <div className="form-group" key={key}>
        <label className={`form-label ${config.required ? 'required' : ''}`}>{config.label}</label>
        {config.type === 'select' ? (
          <select className="form-select" value={value} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={config.required}>
            <option value="">Select {config.label}</option>
            {config.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        ) : (
          <input className="form-input" type={config.type} value={value} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={config.required} />
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">👤 Users & Roles</div><div className="page-subtitle">Manage system users and access control</div></div>
        <button className="btn btn-primary" onClick={openCreateModal}>+ New User</button>
      </div>
      <div className="card">
        {loading ? <div className="loading">Loading users...</div> : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👤</div><p>No users found. Create your first user.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-blue">{u.role.replace(/_/g, ' ')}</span></td>
                    <td><span className={`badge badge-${u.is_active ? 'green' : 'gray'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(u)} style={{ marginRight: '8px' }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Delete</button>
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
            <div className="modal-title">{editMode ? '✏️ Edit User' : '➕ New User'}</div>
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
