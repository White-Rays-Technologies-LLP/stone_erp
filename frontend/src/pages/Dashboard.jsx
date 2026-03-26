import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, inventoryAPI, stonesAPI, contractorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MODULES = [
  { path: '/projects', icon: '🏗️', label: 'Projects', color: '#1e40af', desc: 'Track all construction projects' },
  { path: '/inventory', icon: '📦', label: 'Inventory', color: '#0891b2', desc: 'Stock & warehouse management' },
  { path: '/stones', icon: '🪨', label: 'Stone Blocks', color: '#7c3aed', desc: 'Block registration & splitting' },
  { path: '/blueprints', icon: '📐', label: 'Blueprints', color: '#d97706', desc: 'DAG-based structural modeling' },
  { path: '/manufacturing', icon: '🔨', label: 'Manufacturing', color: '#059669', desc: 'Idol & component production' },
  { path: '/job-work', icon: '🏭', label: 'Job Work', color: '#9333ea', desc: 'Outward processing & return' },
  { path: '/site', icon: '🚛', label: 'Site Execution', color: '#ea580c', desc: 'Dispatch & installation' },
  { path: '/contractors', icon: '👷', label: 'Contractors', color: '#0d9488', desc: 'Contracts & payments' },
  { path: '/billing', icon: '💰', label: 'Billing', color: '#b45309', desc: 'Milestone-based invoicing' },
  { path: '/gst', icon: '🧾', label: 'GST & Finance', color: '#16a34a', desc: 'CGST/SGST/IGST engine' },
  { path: '/users', icon: '👤', label: 'Users', color: '#4338ca', desc: 'Role-based access control' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([projectsAPI.list(), inventoryAPI.items(), stonesAPI.list(), contractorsAPI.list()])
      .then(([proj, items, stones, contractors]) => {
        setProjects(proj.value?.data?.slice(0, 5) || []);
        setStats({ projects: proj.value?.data?.length || 0, items: items.value?.data?.length || 0, stones: stones.value?.data?.length || 0, contractors: contractors.value?.data?.length || 0 });
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #0f2d5a, #1a3a6e)', borderRadius: '16px', padding: '28px 32px', marginBottom: '28px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 24px rgba(15,45,90,.3)' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Welcome back</div>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>{user?.full_name || user?.username}</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ fontSize: '56px', opacity: .7 }}>🏛️</div>
      </div>

      <div className="grid-4" style={{ marginBottom: '28px' }}>
        {[
          { label: 'Active Projects', value: stats.projects, icon: '🏗️', color: '#1e40af' },
          { label: 'Inventory Items', value: stats.items, icon: '📦', color: '#0891b2' },
          { label: 'Stone Blocks', value: stats.stones, icon: '🪨', color: '#7c3aed' },
          { label: 'Contractors', value: stats.contractors, icon: '👷', color: '#0d9488' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f1c2e' }}>{loading ? '...' : s.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '28px' }}>
        <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', fontWeight: '700', marginBottom: '18px', color: '#0f1c2e' }}>Quick Access</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
          {MODULES.map(m => (
            <Link key={m.path} to={m.path} style={{ textDecoration: 'none' }}>
              <div style={{ border: '1.5px solid #dce8f5', borderRadius: '10px', padding: '14px 16px', transition: 'all .2s', background: '#f8faff', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = `0 4px 16px ${m.color}22`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#dce8f5'; e.currentTarget.style.background = '#f8faff'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>{m.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f1c2e', marginBottom: '3px' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{m.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', fontWeight: '700', color: '#0f1c2e' }}>Active Projects</h3>
          <Link to="/projects" style={{ fontSize: '12px', color: '#1e40af', textDecoration: 'none' }}>View all →</Link>
        </div>
        {loading ? <div className="loading">Loading...</div> : projects.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏗️</div><p>No projects yet. <Link to="/projects">Create your first project</Link></p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Status</th><th>Completion</th><th>Start Date</th></tr></thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong><br/><span style={{ fontSize: '11px', color: '#64748b' }}>{p.location}</span></td>
                    <td><span className={`badge badge-${p.status === 'active' ? 'green' : p.status === 'completed' ? 'blue' : 'gray'}`}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                          <div style={{ width: `${p.completion_percentage || 0}%`, height: '100%', background: '#1e40af', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{p.completion_percentage || 0}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{p.start_date ? new Date(p.start_date).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
