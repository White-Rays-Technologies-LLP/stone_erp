export function Card({ children, style }) {
  return <div style={{ background:'#fff', borderRadius:12, border:'1px solid #dce8f5', boxShadow:'0 1px 4px rgba(15,28,46,.06)', ...style }}>{children}</div>;
}
export function PageTitle({ icon, title, subtitle, action }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#0f2d5a,#1a3d6e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{icon}</div>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#0f1c2e', margin:0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize:13, color:'#64748b', margin:'3px 0 0' }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
export function Btn({ children, onClick, variant='primary', size='md', disabled, style }) {
  const s = { sm:{padding:'5px 12px',fontSize:12}, md:{padding:'8px 18px',fontSize:13}, lg:{padding:'11px 24px',fontSize:14} };
  const v = { primary:{background:'linear-gradient(135deg,#f97316,#ea580c)',color:'#fff',border:'none'}, secondary:{background:'#f0f4fa',color:'#0f1c2e',border:'1px solid #dce8f5'}, danger:{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}, ghost:{background:'transparent',color:'#64748b',border:'1px solid #e5e7eb'} };
  return <button onClick={onClick} disabled={disabled} style={{ border:'none', borderRadius:8, cursor:disabled?'default':'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, display:'inline-flex', alignItems:'center', gap:6, opacity:disabled?.5:1, ...s[size], ...v[variant], ...style }}>{children}</button>;
}
export function Badge({ label, color='blue' }) {
  const c = { blue:{bg:'#eff6ff',text:'#1e40af',border:'#bfdbfe'}, green:{bg:'#f0fdf4',text:'#16a34a',border:'#bbf7d0'}, orange:{bg:'#fff7ed',text:'#c2410c',border:'#fed7aa'}, red:{bg:'#fef2f2',text:'#dc2626',border:'#fecaca'}, gray:{bg:'#f9fafb',text:'#6b7280',border:'#e5e7eb'}, purple:{bg:'#faf5ff',text:'#7c3aed',border:'#ddd6fe'} }[color]||{bg:'#f9fafb',text:'#6b7280',border:'#e5e7eb'};
  return <span style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}`, borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:600 }}>{label}</span>;
}
export function Table({ columns, data, loading, emptyMsg='No records found' }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr style={{ borderBottom:'2px solid #e8f0fe' }}>{columns.map(c=><th key={c.key} style={{ padding:'10px 14px', textAlign:'left', color:'#374151', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'.04em', whiteSpace:'nowrap', background:'#f8faff' }}>{c.label}</th>)}</tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={columns.length} style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>Loading…</td></tr>
          : data.length===0 ? <tr><td colSpan={columns.length} style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>{emptyMsg}</td></tr>
          : data.map((row,i)=>(
            <tr key={i} style={{ borderBottom:'1px solid #f0f4fa' }} onMouseEnter={e=>e.currentTarget.style.background='#f8faff'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {columns.map(c=><td key={c.key} style={{ padding:'10px 14px', color:'#0f1c2e' }}>{c.render?c.render(row[c.key],row):row[c.key]??'—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Modal({ open, onClose, title, children, width=480 }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:14, width, maxWidth:'100%', maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 80px rgba(0,0,0,.3)' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f0f4fa', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'#0f1c2e' }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:20, lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}
export function FormField({ label, children, required, style }) {
  return <div style={{ marginBottom:16, ...style }}><label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:5, textTransform:'uppercase', letterSpacing:'.04em' }}>{label}{required&&<span style={{color:'#ef4444'}}> *</span>}</label>{children}</div>;
}
export function Input({ value, onChange, placeholder, type='text', required, step }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} step={step} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:13, color:'#0f1c2e', outline:'none', fontFamily:"'Plus Jakarta Sans',sans-serif", boxSizing:'border-box' }}/>;
}
export function Select({ value, onChange, children, required }) {
  return <select value={value} onChange={onChange} required={required} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:13, color:'#0f1c2e', outline:'none', background:'#fff', fontFamily:"'Plus Jakarta Sans',sans-serif", boxSizing:'border-box' }}>{children}</select>;
}
export function StatCard({ icon, label, value, color='#1e40af', style }) {
  return <Card style={{ padding:'20px 24px', display:'flex', alignItems:'center', gap:16, ...style }}><div style={{ width:48, height:48, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{icon}</div><div><div style={{ fontSize:24, fontWeight:700, color:'#0f1c2e', lineHeight:1 }}>{value}</div><div style={{ fontSize:12, color:'#64748b', marginTop:3 }}>{label}</div></div></Card>;
}
export function AlertBox({ type='error', msg }) {
  if (!msg) return null;
  const s = { error:{bg:'#fef2f2',border:'#fecaca',color:'#dc2626'}, success:{bg:'#f0fdf4',border:'#bbf7d0',color:'#16a34a'}, info:{bg:'#eff6ff',border:'#bfdbfe',color:'#1e40af'} }[type];
  return <div style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:8, padding:'10px 14px', color:s.color, fontSize:13, marginBottom:16 }}>{msg}</div>;
}
