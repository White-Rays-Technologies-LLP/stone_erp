import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(form.username, form.password);
    if (ok) navigate('/');
  };

  const S = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg, #0a1f3f 0%, #0f2d5a 50%, #1a3a6e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" },
    card: { background: '#fff', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 80px rgba(10,31,63,.45)' },
    logo: { width: '64px', height: '64px', background: 'linear-gradient(135deg, #f97316, #c2410c)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px' },
    title: { fontFamily: "'Cinzel', serif", fontSize: '22px', fontWeight: '700', color: '#0f1c2e', letterSpacing: '.04em', marginBottom: '6px', textAlign: 'center' },
    sub: { fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '32px' },
    label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f1c2e', marginBottom: '5px' },
    input: { width: '100%', padding: '10px 14px', border: '1.5px solid #dce8f5', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', marginBottom: '16px' },
    btn: { width: '100%', padding: '12px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
    err: { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>🏛️</div>
        <div style={S.title}>Temple Construction ERP</div>
        <div style={S.sub}>Sign in to your account</div>
        {error && <div style={S.err}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={S.label}>Username</label>
          <input style={S.input} type="text" value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))} placeholder="Enter username" required />
          <label style={S.label}>Password</label>
          <input style={{...S.input, marginBottom: '24px'}} type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} placeholder="Enter password" required />
          <button type="submit" style={{...S.btn, background: loading ? '#93c5fd' : '#1e40af'}} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#94a3b8' }}>Temple Construction ERP Platform v1.0</p>
      </div>
    </div>
  );
}