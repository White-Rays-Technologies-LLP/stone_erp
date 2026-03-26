import { useState, useEffect } from 'react';
import { billingAPI, projectsAPI } from '../services/api';

const FIELD_CONFIG = {
  project_id: { label: 'Project', type: 'select', required: true, defaultValue: '', options: [] },
  name: { label: 'Milestone Name', type: 'text', required: true, defaultValue: '' },
  description: { label: 'Description', type: 'textarea', required: false, defaultValue: '' },
  milestone_value: { label: 'Milestone Value', type: 'number', required: false, defaultValue: 0 },
  due_date: { label: 'Due Date', type: 'date', required: false, defaultValue: '' }
};

const getInitialForm = () => Object.keys(FIELD_CONFIG).reduce((acc, key) => ({ ...acc, [key]: FIELD_CONFIG[key].defaultValue }), {});

export default function BillingMilestones() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(getInitialForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    projectsAPI.list().then(r => {
      FIELD_CONFIG.project_id.options = r.data.map(p => ({ value: p.id, label: p.name }));
    });
  }, []);

  const loadData = () => {
    setLoading(true);
    billingAPI.milestones().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(loadData, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {};
      Object.keys(form).forEach(key => {
        if (FIELD_CONFIG[key].required || form[key]) payload[key] = form[key] || null;
      });
      await billingAPI.createMilestone(payload);
      setShowModal(false);
      setForm(getInitialForm());
      loadData();
    } catch (e) {
      setError(e.response?.data?.detail || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (key) => {
    const config = FIELD_CONFIG[key];
    const value = form[key];
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
        <div><div className="page-title">💰 Billing Milestones</div><div className="page-subtitle">Manage project milestones and billing</div></div>
        <button className="btn btn-primary" onClick={() => { setForm(getInitialForm()); setError(null); setShowModal(true); }}>+ New Milestone</button>
      </div>
      <div className="card">
        {loading ? <div className="loading">Loading...</div> : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">💰</div><p>No milestones found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Milestone Name</th><th>Project</th><th>Value</th><th>Status</th><th>Due Date</th></tr></thead>
              <tbody>
                {data.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.project_id}</td>
                    <td>₹{Number(m.milestone_value || 0).toLocaleString('en-IN')}</td>
                    <td><span className="badge badge-blue">{m.status}</span></td>
                    <td>{m.due_date || '—'}</td>
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
            <div className="modal-title">➕ New Milestone</div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <form onSubmit={handleSubmit}>
              {Object.keys(FIELD_CONFIG).map(key => renderField(key))}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
