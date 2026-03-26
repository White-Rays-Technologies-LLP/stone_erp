import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
export default function LoginPage() {
  const [form, setForm] = useState({ username:'', password:'' });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const nav = useNavigate();
  const submit = async e => { e.preventDefault(); setError(''); const r = await login(form.username, form.password); if (r.ok) nav('/'); else setError(r.error); };
  const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'.04em' };
  const inp = { width:'100%', padding:'10px 14px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:14, color:'#0f1c2e', outline:'none', fontFamily:"'Plus Jakarta Sans',sans-serif", boxSizing:'border-box' };
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0a1f3f 0%,#0f2d5a 50%,#1a3d6e 100%)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ width:400, background:'#fff', borderRadius:16, boxShadow:'0 24px 80px rgba(0,0,0,.4)', overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,#0a1f3f,#0f2d5a)', padding:'36px 40px 28px', textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🏛️</div>
          <h1 style={{ fontFamily:"'Cinzel',serif", color:'#fff', fontSize:20, fontWeight:700, letterSpacing:'.06em', margin:0 }}>Temple Construction ERP</h1>
          <p style={{ color:'rgba(255,255,255,.5)', fontSize:12, marginTop:6 }}>Enterprise Resource Planning Platform</p>
        </div>
        <div style={{ padding:'32px 40px' }}>
          <h2 style={{ fontSize:16, fontWeight:600, color:'#0f1c2e', marginBottom:24 }}>Sign in to your account</h2>
          {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:'#dc2626', fontSize:13, marginBottom:16 }}>{error}</div>}
          <form onSubmit={submit}>
            <div style={{ marginBottom:16 }}><label style={lbl}>Username</label><input style={inp} type="text" required value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="Enter username"/></div>
            <div style={{ marginBottom:24 }}><label style={lbl}>Password</label><input style={inp} type="password" required value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Enter password"/></div>
            <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px', background:loading?'#94a3b8':'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:loading?'default':'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{loading?'Signing in…':'Sign In'}</button>
          </form>
          <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:20 }}>Default: admin / admin123</p>
        </div>
      </div>
    </div>
  );
}
