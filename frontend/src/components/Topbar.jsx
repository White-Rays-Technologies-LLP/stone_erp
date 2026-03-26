import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
export default function Topbar({ onToggle }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header style={{ position:'fixed', top:0, left:0, right:0, height:58, background:'#0a1f3f', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', padding:'0 20px', gap:16, zIndex:100, boxShadow:'0 2px 12px rgba(10,31,63,.4)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <button onClick={onToggle} style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', color:'#fff', width:36, height:36, borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div style={{ fontFamily:"'Cinzel',serif", fontSize:17, fontWeight:700, color:'#fff', letterSpacing:'.04em', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:'#f97316', display:'inline-block' }}/>Temple Construction ERP
      </div>
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ background:'rgba(249,115,22,.18)', border:'1px solid rgba(249,115,22,.3)', borderRadius:20, padding:'4px 14px', color:'#fb923c', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>{user?.role||'Admin'}</span>
        <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#f97316,#ea580c)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700 }}>{(user?.full_name||user?.username||'U')[0].toUpperCase()}</div>
        <span style={{ color:'rgba(255,255,255,.7)', fontSize:13 }}>{user?.full_name||user?.username}</span>
        <button onClick={()=>{logout();nav('/login');}} style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)', padding:'5px 14px', borderRadius:6, cursor:'pointer', fontSize:12, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Logout</button>
      </div>
    </header>
  );
}
