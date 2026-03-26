import { useState, useEffect } from 'react';
import { projectsAPI } from '../services/api.jsx';
import { PageTitle, Card, Table, Btn, Modal, FormField, Input, Select, Badge, AlertBox, StatCard } from '../components/UI.jsx';
const SC={active:'green',planning:'blue',completed:'gray',on_hold:'orange',cancelled:'red'};
export default function ProjectsPage() {
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({name:'',description:'',status:'planning',client_name:'',location:'',budget:'',start_date:'',end_date:''});
  const [err,setErr]=useState('');
  const [saving,setSaving]=useState(false);
  const load=()=>{setLoading(true);projectsAPI.getProjects().then(r=>{setProjects(r.data);setLoading(false);}).catch(()=>setLoading(false));};
  useEffect(load,[]);
  const openCreate=()=>{setEditing(null);setForm({name:'',description:'',status:'planning',client_name:'',location:'',budget:'',start_date:'',end_date:''});setErr('');setModal(true);};
  const openEdit=p=>{setEditing(p);setForm({name:p.name,description:p.description||'',status:p.status,client_name:p.client_name||'',location:p.location||'',budget:p.budget||'',start_date:p.start_date?.slice(0,10)||'',end_date:p.end_date?.slice(0,10)||''});setErr('');setModal(true);};
  const save=async()=>{if(!form.name)return setErr('Name required');setSaving(true);setErr('');try{if(editing)await projectsAPI.updateProject(editing.id,form);else await projectsAPI.createProject(form);setModal(false);load();}catch(e){setErr(e.response?.data?.detail||'Failed');}setSaving(false);};
  const del=async p=>{if(!confirm(`Delete "${p.name}"?`))return;await projectsAPI.deleteProject(p.id).catch(()=>{});load();};
  const f=k=>e=>setForm(x=>({...x,[k]:e.target.value}));
  const active=projects.filter(p=>p.status==='active').length;
  const avgComp=projects.length?Math.round(projects.reduce((a,p)=>a+(p.completion_pct||0),0)/projects.length):0;
  return (
    <div>
      <PageTitle icon="🏗️" title="Projects" subtitle="Manage temple construction projects" action={<Btn onClick={openCreate}>+ New Project</Btn>}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        <StatCard icon="🏗️" label="Total" value={projects.length} color="#f97316"/>
        <StatCard icon="✅" label="Active" value={active} color="#16a34a"/>
        <StatCard icon="📊" label="Avg Completion" value={`${avgComp}%`} color="#1e40af"/>
      </div>
      <Card>
        <Table loading={loading} columns={[
          {key:'name',label:'Project Name',render:v=><span style={{fontWeight:600}}>{v}</span>},
          {key:'client_name',label:'Client'},
          {key:'location',label:'Location'},
          {key:'status',label:'Status',render:v=><Badge label={v} color={SC[v]||'gray'}/>},
          {key:'completion_pct',label:'Progress',render:v=><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,height:6,background:'#f0f4fa',borderRadius:10,overflow:'hidden',minWidth:80}}><div style={{width:`${v||0}%`,height:'100%',background:'#f97316',borderRadius:10}}/></div><span style={{fontSize:11,color:'#64748b',width:32}}>{Math.round(v||0)}%</span></div>},
          {key:'budget',label:'Budget',render:v=>v?`₹${Number(v).toLocaleString('en-IN')}`:'—'},
          {key:'actions',label:'',render:(_,r)=><div style={{display:'flex',gap:6}}><Btn size="sm" variant="ghost" onClick={()=>openEdit(r)}>Edit</Btn><Btn size="sm" variant="danger" onClick={()=>del(r)}>Del</Btn></div>},
        ]} data={projects}/>
      </Card>
      <Modal open={modal} onClose={()=>setModal(false)} title={editing?'Edit Project':'New Project'} width={520}>
        <AlertBox type="error" msg={err}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FormField label="Project Name" required style={{gridColumn:'1/-1'}}><Input value={form.name} onChange={f('name')} placeholder="e.g. Shree Ram Mandir" required/></FormField>
          <FormField label="Client"><Input value={form.client_name} onChange={f('client_name')}/></FormField>
          <FormField label="Location"><Input value={form.location} onChange={f('location')}/></FormField>
          <FormField label="Status"><Select value={form.status} onChange={f('status')}><option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></Select></FormField>
          <FormField label="Budget (₹)"><Input type="number" value={form.budget} onChange={f('budget')}/></FormField>
          <FormField label="Start Date"><Input type="date" value={form.start_date} onChange={f('start_date')}/></FormField>
          <FormField label="End Date"><Input type="date" value={form.end_date} onChange={f('end_date')}/></FormField>
          <FormField label="Description" style={{gridColumn:'1/-1'}}><textarea value={form.description} onChange={f('description')} rows={3} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:13,resize:'vertical',fontFamily:"'Plus Jakarta Sans',sans-serif",boxSizing:'border-box'}}/></FormField>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
          <Btn variant="ghost" onClick={()=>setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
