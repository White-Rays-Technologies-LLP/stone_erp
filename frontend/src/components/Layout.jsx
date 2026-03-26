import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { path: '/', label: 'Dashboard', icon: '🏠', exact: true },
  { path: '/projects', label: 'Projects', icon: '🏗️' },
  { path: '/inventory', label: 'Inventory', icon: '📦' },
  {
    label: 'Purchase',
    icon: '🛒',
    children: [
      { path: '/purchase/orders', label: 'Orders' },
      { path: '/purchase/receipts', label: 'Receipts' },
    ],
  },
  { path: '/stones', label: 'Material Stock In', icon: '🪨' },
  { path: '/blueprints', label: 'Blueprints', icon: '📐' },
  { path: '/manufacturing', label: 'Manufacturing', icon: '🔨' },
  { path: '/job-work', label: 'Job Work', icon: '🏭' },
  { path: '/site', label: 'Site Execution', icon: '🚛' },
  { path: '/contractors', label: 'Contractors', icon: '👷' },
  { path: '/billing', label: 'Sales', icon: '💰' },
  { path: '/gst', label: 'GST & Finance', icon: '🧾' },
  { path: '/reports', label: 'Reports', icon: '📈' },
  { path: '/users-management', label: 'Users', icon: '👤' },
  { path: '/audit', label: 'Audit Logs', icon: '📋' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="erp-root">
      <header className="topbar">
        <button className="topbar-toggle" onClick={() => setSidebarOpen(v => !v)}>
          <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd"/></svg>
        </button>
        <div className="topbar-logo">
          <span className="logo-dot"></span>
          Temple Construction ERP
          <span className="logo-sub">v1.0</span>
        </div>
        <div className="topbar-right">
          <span className="role-badge">{user?.role?.replace('_', ' ')}</span>
          <div className="avatar" onClick={handleLogout} title="Click to logout">
            {user?.full_name?.[0] || user?.username?.[0] || 'U'}
          </div>
        </div>
      </header>

      <div className="layout-body">
        <nav className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-inner">
            <div className="sidebar-user">
              <div className="sidebar-avatar">{user?.full_name?.[0] || 'U'}</div>
              <div>
                <div className="sidebar-name">{user?.full_name || user?.username}</div>
                <div className="sidebar-email">{user?.email}</div>
              </div>
            </div>
            {NAV.map(item => {
              if (item.children) {
                return (
                  <div className="nav-group" key={item.label}>
                    <div className="nav-group-title">
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                    </div>
                    <div className="nav-sub">
                      {item.children.map(child => (
                        <NavLink key={child.path} to={child.path}
                          className={({ isActive }) => `nav-item nav-sub-item ${isActive ? 'active' : ''}`}>
                          <span className="nav-label">{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <NavLink key={item.path} to={item.path} end={item.exact}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              );
            })}
            <button className="logout-btn" onClick={handleLogout}>
              <span>🚪</span> Logout
            </button>
          </div>
        </nav>

        <main className="main-content" style={{ marginLeft: sidebarOpen ? 'var(--sidebar-width)' : '0' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
