import { NavLink } from 'react-router-dom';
const NAV = [
  {label:'Dashboard',icon:'📊',path:'/'},
  {label:'Inventory',icon:'📦',path:'/inventory'},
  {label:'Material Stock In',icon:'🪨',path:'/stones'},
  {label:'Blueprints',icon:'📐',path:'/blueprints'},
  {label:'Projects',icon:'🏗️',path:'/projects'},
  {label:'Manufacturing',icon:'⚙️',path:'/manufacturing'},
  {label:'Job Work',icon:'🔧',path:'/job-work'},
  {label:'Site Execution',icon:'🏛️',path:'/site'},
  {label:'Contractors',icon:'👷',path:'/contractors'},
  {label:'Billing',icon:'🧾',path:'/billing'},
  {label:'GST & Finance',icon:'💰',path:'/gst'},
  {label:'Reports',icon:'📈',path:'/reports'},
  {label:'Users',icon:'👤',path:'/users'},
  {label:'Audit Logs',icon:'📋',path:'/audit'},
];
export default function Sidebar({ open }) {
  return (
    <aside style={{ position:'fixed', top:58, left:0, bottom:0, width:open?260:0, background:'#0f2d5a', overflowX:'hidden', overflowY:'auto', transition:'width .25s ease', zIndex:50, borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'12px 0', minWidth:260 }}>
        {NAV.map(item=>(
          <NavLink key={item.path} to={item.path} end={item.path==='/'} style={({isActive})=>({ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', textDecoration:'none', color:isActive?'#f97316':'#cbd5e1', background:isActive?'rgba(249,115,22,.12)':'transparent', borderLeft:isActive?'3px solid #f97316':'3px solid transparent', fontSize:13.5, fontWeight:isActive?600:400, fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all .15s', whiteSpace:'nowrap' })}>
            <span style={{ fontSize:16, width:22, textAlign:'center' }}>{item.icon}</span>{item.label}
          </NavLink>
        ))}
      </div>
      <div style={{ marginTop:'auto', padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,.07)', fontSize:11, color:'rgba(255,255,255,.25)', minWidth:260 }}>Temple ERP v1.0 · FastAPI Backend</div>
    </aside>
  );
}
