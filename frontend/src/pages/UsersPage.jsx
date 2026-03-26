import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ROLES = ['ADMIN','PROJECT_MANAGER','STRUCTURAL_ENGINEER','PRODUCTION_SUPERVISOR','STORE_MANAGER','ACCOUNTS_MANAGER','SITE_SUPERVISOR','CONTRACTOR'];

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ role: 'STORE_MANAGER' });
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try { const r = await authAPI.getUsers(); setUsers(r.data || []); }
    catch { toast.error('Failed to load users'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      await authAPI.createUser(form);
      toast.success('User created');
      setModal(false); setForm({ role: 'STORE_MANAGER' }); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const deactivate = async (id) => {
    try {
      await authAPI.updateUser(id, { is_active: false });
      toast.success('User deactivated');
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const ROLE_COLORS = { ADMIN: '#dc2626', PROJECT_MANAGER: '#d97706', STRUCTURAL_ENGINEER: '#0891b2', PRODUCTION_SUPERVISOR: '#7c3aed', STORE_MANAGER: '#16a34a', ACCOUNTS_MANAGER: '#ca8a04', SITE_SUPERVISOR: '#f97316', CONTRACTOR: '#64748b' };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">👤 Users & Role Management</div>
          <div className="page-sub">8 role-based access profiles with JWT authentication</div>
        </div>
        {me?.role === 'ADMIN' && <button className="btn btn-primary" onClick={() => { setForm({ role: 'STORE_MANAGER' }); setModal(true); }}>+ Add User</button>}
      </div>

      {/* Role overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
        {ROLES.map(r => (
          <div key={r} style={{ padding: '12px 14px', background: '#fff', border: '1px solid #dce8f5', borderRadius: 10, borderLeft: `3px solid ${ROLE_COLORS[r]}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLORS[r] }}>{r.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{users.filter(u => u.role === r).length} user(s)</div>
          </div>
        ))}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.length === 0 ? <tr><td colSpan={6} className="no-data">No users found</td></tr>
              : users.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{i+1}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 28, height: 28, background: ROLE_COLORS[u.role] || '#64748b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{u.name?.charAt(0) || '?'}</div><strong>{u.name}</strong></div></td>
                  <td style={{ color: '#64748b' }}>{u.email}</td>
                  <td><span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${ROLE_COLORS[u.role]}18`, color: ROLE_COLORS[u.role] }}>{u.role?.replace(/_/g,' ')}</span></td>
                  <td><span className={`badge badge-${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>{me?.role === 'ADMIN' && u.id !== me?.id && u.is_active && <button className="btn btn-danger btn-sm" onClick={() => deactivate(u.id)}>Deactivate</button>}</td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Create User</div><button className="modal-close" onClick={() => setModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Full Name *</label><input value={form.name||''} onChange={f('name')} /></div>
                <div className="field"><label>Email *</label><input type="email" value={form.email||''} onChange={f('email')} /></div>
                <div className="field"><label>Password *</label><input type="password" value={form.password||''} onChange={f('password')} /></div>
                <div className="field"><label>Role</label>
                  <select value={form.role} onChange={f('role')}>
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={submit}>Create User</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
