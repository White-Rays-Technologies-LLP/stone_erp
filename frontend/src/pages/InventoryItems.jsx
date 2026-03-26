/**
 * REUSABLE CRUD FORM TEMPLATE
 * 
 * This template provides a complete CRUD pattern with:
 * - Create, Read, Update, Delete operations
 * - Mandatory field validation with red asterisk
 * - Error handling
 * - Loading states
 * - Modal forms
 * 
 * HOW TO USE:
 * 1. Copy this entire file
 * 2. Rename to your module (e.g., Users.jsx, Contractors.jsx)
 * 3. Replace all PLACEHOLDERS marked with // TODO:
 * 4. Update field definitions in FIELD_CONFIG
 * 5. Customize table columns
 */

import { useState, useEffect } from 'react';
// TODO: Import your API module
// import { yourAPI } from '../services/api';

// ============================================================================
// FIELD CONFIGURATION - Define all form fields here
// ============================================================================
// File: frontend/src/pages/InventoryItems.jsx
const FIELD_CONFIG = {
  name: { label: 'Item Name', type: 'text', required: true, defaultValue: '' },
  code: { label: 'Item Code', type: 'text', required: true, defaultValue: '' },
  category_id: { label: 'Category', type: 'select', required: true, defaultValue: '', options: [] }, // Load from categories API
  uom: { label: 'Unit of Measure', type: 'text', required: false, defaultValue: 'pcs' },
  reorder_level: { label: 'Reorder Level', type: 'number', required: false, defaultValue: 0 }
};

// API: inventoryAPI.items(), inventoryAPI.createItem(data), inventoryAPI.updateItem(id, data)
// Table columns: Item Name, Code, Category, UOM, Reorder Level, Actions


// ============================================================================
// HELPER: Generate initial form state from FIELD_CONFIG
// ============================================================================
const getInitialForm = () => {
  const form = {};
  Object.keys(FIELD_CONFIG).forEach(key => {
    form[key] = FIELD_CONFIG[key].defaultValue;
  });
  return form;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function YourModuleName() {
  // TODO: Replace 'YourModuleName' with actual name (e.g., Users, Contractors)
  
  // State management
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(getInitialForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================================
  // API CALLS
  // ============================================================================
  
  // Load data
  const loadData = () => {
    setLoading(true);
    // TODO: Replace with your API call
    // yourAPI.list()
    //   .then(r => { setData(r.data); setLoading(false); })
    //   .catch(() => setLoading(false));
    
    // MOCK DATA for testing:
    setTimeout(() => {
      setData([
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'project_manager' }
      ]);
      setLoading(false);
    }, 500);
  };

  useEffect(loadData, []);

  // Create or Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // TODO: Prepare payload - remove empty optional fields
      const payload = {};
      Object.keys(form).forEach(key => {
        const config = FIELD_CONFIG[key];
        const value = form[key];
        
        // Include if required OR has value
        if (config.required || value) {
          payload[key] = value || null;
        }
      });

      if (editMode) {
        // TODO: Replace with your update API call
        // await yourAPI.update(editId, payload);
        console.log('Update:', editId, payload);
      } else {
        // TODO: Replace with your create API call
        // await yourAPI.create(payload);
        console.log('Create:', payload);
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

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    
    try {
      // TODO: Replace with your delete API call
      // await yourAPI.delete(id);
      console.log('Delete:', id);
      loadData();
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.detail || 'Error'));
    }
  };

  // Open modal for create
  const openCreateModal = () => {
    setForm(getInitialForm());
    setEditMode(false);
    setEditId(null);
    setError(null);
    setShowModal(true);
  };

  // Open modal for edit
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

  // Update form field
  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // ============================================================================
  // RENDER FORM FIELD
  // ============================================================================
  const renderField = (key) => {
    const config = FIELD_CONFIG[key];
    const value = form[key];

    return (
      <div className="form-group" key={key}>
        <label className={`form-label ${config.required ? 'required' : ''}`}>
          {config.label}
        </label>
        
        {config.type === 'select' ? (
          <select
            className="form-select"
            value={value}
            onChange={e => updateField(key, e.target.value)}
            required={config.required}
          >
            <option value="">Select {config.label}</option>
            {config.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : config.type === 'textarea' ? (
          <textarea
            className="form-textarea"
            value={value}
            onChange={e => updateField(key, e.target.value)}
            required={config.required}
          />
        ) : (
          <input
            className="form-input"
            type={config.type}
            value={value}
            onChange={e => updateField(key, e.target.value)}
            required={config.required}
          />
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          {/* TODO: Update icon and title */}
          <div className="page-title">👤 Your Module Name</div>
          <div className="page-subtitle">Manage your records</div>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + New Record
        </button>
      </div>

      {/* Data Table */}
      <div className="card">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            {/* TODO: Update icon */}
            <div className="empty-icon">📋</div>
            <p>No records found. Create your first record.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {/* TODO: Update table columns */}
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(record => (
                  <tr key={record.id}>
                    {/* TODO: Update table cells to match your data */}
                    <td><strong>{record.name}</strong></td>
                    <td>{record.email}</td>
                    <td>
                      <span className="badge badge-blue">{record.role}</span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => openEditModal(record)}
                        style={{ marginRight: '8px' }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => handleDelete(record.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {/* TODO: Update modal title and icon */}
            <div className="modal-title">
              {editMode ? '✏️ Edit Record' : '➕ New Record'}
            </div>
            
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            
            <form onSubmit={handleSubmit}>
              {/* Render all fields from FIELD_CONFIG */}
              {Object.keys(FIELD_CONFIG).map(key => renderField(key))}
              
              {/* Form Actions */}
              <div className="modal-actions">
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
                >
                  {saving ? 'Saving...' : (editMode ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ============================================================================
 * CUSTOMIZATION CHECKLIST
 * ============================================================================
 * 
 * □ 1. Update FIELD_CONFIG with your actual fields
 * □ 2. Replace API calls (list, create, update, delete)
 * □ 3. Update component name
 * □ 4. Update page title and icon
 * □ 5. Update table columns (thead and tbody)
 * □ 6. Update modal title and icon
 * □ 7. Test Create operation
 * □ 8. Test Update operation
 * □ 9. Test Delete operation
 * □ 10. Add any custom validation logic
 * 
 * ============================================================================
 * FIELD TYPE OPTIONS
 * ============================================================================
 * 
 * - text: Regular text input
 * - email: Email input with validation
 * - number: Number input
 * - date: Date picker
 * - select: Dropdown (requires options array)
 * - textarea: Multi-line text
 * 
 * ============================================================================
 * ADVANCED CUSTOMIZATION
 * ============================================================================
 * 
 * 1. Add dependent fields (e.g., show field B only if field A has value):
 *    {config.dependsOn && form[config.dependsOn] && renderField(key)}
 * 
 * 2. Add custom validation:
 *    if (form.email && !form.email.includes('@')) {
 *      setError('Invalid email');
 *      return;
 *    }
 * 
 * 3. Add grid layout for fields:
 *    <div className="grid-2">
 *      {renderField('field1')}
 *      {renderField('field2')}
 *    </div>
 * 
 * 4. Add search/filter:
 *    const [search, setSearch] = useState('');
 *    const filtered = data.filter(d => d.name.includes(search));
 * 
 * ============================================================================
 */
