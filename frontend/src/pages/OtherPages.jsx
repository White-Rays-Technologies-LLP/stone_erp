// Blueprints, Manufacturing, Allocations, Job Work, Site, Billing, Users, Audit pages

import { useState, useEffect } from 'react';
import { blueprintsAPI } from '../services/api';
import { PageTitle, Card, Table, Btn, Modal, FormField, Input, Select, Badge, AlertBox, StatCard } from '../components/UI';

export function BlueprintsPage() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [gapReport, setGapReport] = useState(null);
  const [selectedStructure, setSelectedStructure] = useState(null);

  useEffect(() => {
    blueprintsAPI.getStructures().then(r => { setStructures(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const f = k => e => setForm(x => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    if (!form.name) return setErr('Structure name required');
    setSaving(true);
    try { await blueprintsAPI.createStructure(form); setModal(false); blueprintsAPI.getStructures().then(r => setStructures(r.data)); }
    catch(e) { setErr(e.response?.data?.detail || 'Failed'); }
    setSaving(false);
  };

  const showGapReport = async s => {
    setSelectedStructure(s);
    const r = await blueprintsAPI.getGapReport(s.id).catch(() => null);
    setGapReport(r?.data);
  };

  return (
    <div>
      <PageTitle icon="📐" title="Blueprints & Dependencies" subtitle="Structural blueprints, layers, positions and DAG dependency engine"
        action={<Btn onClick={() => { setForm({}); setErr(''); setModal(true); }}>+ New Structure</Btn>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="🏛️" label="Structures" value={structures.length} color="#f97316"/>
        <StatCard icon="📐" label="DAG Engine" value="Active" color="#16a34a"/>
        <StatCard icon="🔗" label="Circular Dep Check" value="Enabled" color="#1e40af"/>
      </div>
      <Card>
        <Table loading={loading} data={structures} columns={[
          { key: 'name', label: 'Structure Name', render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
          { key: 'structure_type', label: 'Type', render: v => <Badge label={v||'structure'} color="blue"/> },
          { key: 'total_layers', label: 'Layers' },
          { key: 'description', label: 'Description' },
          { key: 'actions', label: '', render: (_, r) => (
            <Btn size="sm" variant="ghost" onClick={() => showGapReport(r)}>Gap Report</Btn>
          )},
        ]}/>
      </Card>
      {gapReport && (
        <Card style={{ marginTop: 20, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Gap Report: {selectedStructure?.name}</h3>
          <pre style={{ fontSize: 12, background: '#f8faff', borderRadius: 8, padding: 16, overflow: 'auto' }}>
            {JSON.stringify(gapReport, null, 2)}
          </pre>
        </Card>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="New Structure">
        <AlertBox type="error" msg={err}/>
        <FormField label="Structure Name" required><Input value={form.name||''} onChange={f('name')} placeholder="e.g. Main Temple Spire"/></FormField>
        <FormField label="Structure Type">
          <Select value={form.structure_type||''} onChange={f('structure_type')}>
            <option value="">Select…</option>
            <option value="temple">Temple</option>
            <option value="gopuram">Gopuram</option>
            <option value="mandapam">Mandapam</option>
            <option value="other">Other</option>
          </Select>
        </FormField>
        <FormField label="Total Layers"><Input type="number" value={form.total_layers||''} onChange={f('total_layers')} placeholder="e.g. 5"/></FormField>
        <FormField label="Description"><Input value={form.description||''} onChange={f('description')}/></FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── Manufacturing ──────────────────────────────────────────────────
import { mfgAPI, stonesAPI } from '../services/api';

export function ManufacturingPage() {
  const [idols, setIdols] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.allSettled([mfgAPI.getIdols(), stonesAPI.getBlocks()]).then(([i, b]) => {
      setIdols(i.value?.data || []); setBlocks(b.value?.data || []); setLoading(false);
    });
  }, []);

  const f = k => e => setForm(x => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    if (!form.name || !form.stone_block_id) return setErr('Name and stone block required');
    setSaving(true);
    try { await mfgAPI.createIdol(form); setModal(false); mfgAPI.getIdols().then(r => setIdols(r.data)); }
    catch(e) { setErr(e.response?.data?.detail || 'Failed'); }
    setSaving(false);
  };

  return (
    <div>
      <PageTitle icon="⚙️" title="Manufacturing" subtitle="Idol production and structural component manufacturing"
        action={<Btn onClick={() => { setForm({}); setErr(''); setModal(true); }}>+ New Idol</Btn>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="🗿" label="Idols" value={idols.length} color="#f97316"/>
        <StatCard icon="✅" label="Completed" value={idols.filter(i=>i.status==='completed').length} color="#16a34a"/>
        <StatCard icon="🔧" label="In Progress" value={idols.filter(i=>i.status==='in_progress').length} color="#1e40af"/>
      </div>
      <Card>
        <Table loading={loading} data={idols} columns={[
          { key: 'name', label: 'Idol Name', render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
          { key: 'idol_type', label: 'Type' },
          { key: 'stone_block_id', label: 'Stone Block', render: v => blocks.find(b=>b.id===v)?.serial_number || v },
          { key: 'status', label: 'Status', render: v => <Badge label={v} color={v==='completed'?'green':v==='in_progress'?'orange':'gray'}/> },
          { key: 'total_cost', label: 'Total Cost', render: v => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—' },
        ]}/>
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="New Idol">
        <AlertBox type="error" msg={err}/>
        <FormField label="Idol Name" required><Input value={form.name||''} onChange={f('name')} placeholder="e.g. Shri Ganesh Murti"/></FormField>
        <FormField label="Idol Type"><Input value={form.idol_type||''} onChange={f('idol_type')} placeholder="e.g. Ganesh, Shiva"/></FormField>
        <FormField label="Stone Block" required>
          <Select value={form.stone_block_id||''} onChange={f('stone_block_id')}>
            <option value="">Select block…</option>
            {blocks.filter(b=>b.status==='available').map(b => <option key={b.id} value={b.id}>{b.serial_number} ({b.stone_type})</option>)}
          </Select>
        </FormField>
        <FormField label="Dimensions (cm)"><Input value={form.dimensions||''} onChange={f('dimensions')} placeholder="H×W×D"/></FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving?'Saving…':'Create Idol'}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── Allocations ──────────────────────────────────────────────────
import { allocationsAPI } from '../services/api';

export function AllocationsPage() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    allocationsAPI.getAllocations().then(r => { setAllocations(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageTitle icon="🔗" title="Block Allocations" subtitle="Stone block project allocations — prevents double allocation"/>
      <StatCard icon="🔗" label="Allocations" value={allocations.length} color="#f97316" style={{ marginBottom: 24 }}/>
      <Card>
        <Table loading={loading} data={allocations} columns={[
          { key: 'stone_block_id', label: 'Block ID' },
          { key: 'project_id', label: 'Project ID' },
          { key: 'allocated_by', label: 'Allocated By' },
          { key: 'created_at', label: 'Date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
          { key: 'actions', label: '', render: (_, r) => (
            <Btn size="sm" variant="danger" onClick={async () => { await allocationsAPI.release(r.id); allocationsAPI.getAllocations().then(res => setAllocations(res.data)); }}>Release</Btn>
          )},
        ]}/>
      </Card>
    </div>
  );
}

// ── Job Work ──────────────────────────────────────────────────
import { jobWorkAPI } from '../services/api';

export function JobWorkPage() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    jobWorkAPI.getChallans().then(r => { setChallans(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const f = k => e => setForm(x => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    if (!form.stone_block_id || !form.vendor_name) return setErr('Block ID and vendor required');
    setSaving(true);
    try { await jobWorkAPI.createChallan(form); setModal(false); load(); }
    catch(e) { setErr(e.response?.data?.detail || 'Failed'); }
    setSaving(false);
  };

  return (
    <div>
      <PageTitle icon="🔧" title="Job Work" subtitle="GST-compliant delivery challans and vendor processing"
        action={<Btn onClick={() => { setForm({}); setErr(''); setModal(true); }}>+ New Challan</Btn>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="📄" label="Total Challans" value={challans.length} color="#f97316"/>
        <StatCard icon="🔄" label="Pending Return" value={challans.filter(c=>c.status==='sent').length} color="#dc2626"/>
        <StatCard icon="✅" label="Returned" value={challans.filter(c=>c.status==='returned').length} color="#16a34a"/>
      </div>
      <Card>
        <Table loading={loading} data={challans} columns={[
          { key: 'challan_number', label: 'Challan No', render: v => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</span> },
          { key: 'vendor_name', label: 'Vendor' },
          { key: 'stone_block_id', label: 'Block ID' },
          { key: 'work_description', label: 'Work' },
          { key: 'expected_return_date', label: 'Expected Return', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
          { key: 'status', label: 'Status', render: v => <Badge label={v} color={v==='returned'?'green':v==='sent'?'orange':'gray'}/> },
        ]}/>
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="New Delivery Challan">
        <AlertBox type="error" msg={err}/>
        <FormField label="Stone Block ID" required><Input value={form.stone_block_id||''} onChange={f('stone_block_id')} placeholder="Block ID"/></FormField>
        <FormField label="Vendor Name" required><Input value={form.vendor_name||''} onChange={f('vendor_name')} placeholder="Job work vendor"/></FormField>
        <FormField label="Work Description"><Input value={form.work_description||''} onChange={f('work_description')} placeholder="e.g. Surface polishing"/></FormField>
        <FormField label="Expected Return Date"><Input type="date" value={form.expected_return_date||''} onChange={f('expected_return_date')}/></FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving?'Saving…':'Create Challan'}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── Site Execution ──────────────────────────────────────────────────
import { siteAPI } from '../services/api';

export function SitePage() {
  const [dispatches, setDispatches] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dispatches');

  useEffect(() => {
    Promise.allSettled([siteAPI.getDispatches(), siteAPI.getInstallations()]).then(([d, i]) => {
      setDispatches(d.value?.data || []); setInstallations(i.value?.data || []); setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageTitle icon="🏛️" title="Site Execution" subtitle="Dispatches, e-way bills, and installation tracking"/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="🚚" label="Dispatches" value={dispatches.length} color="#f97316"/>
        <StatCard icon="🏛️" label="Installations" value={installations.length} color="#1e40af"/>
        <StatCard icon="✅" label="Verified" value={installations.filter(i=>i.verified).length} color="#16a34a"/>
        <StatCard icon="📋" label="E-Way Bills" value={dispatches.filter(d=>d.eway_bill_no).length} color="#7c3aed"/>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[{id:'dispatches',label:'Dispatches'},{id:'installations',label:'Installations'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 18px', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 13, fontWeight: tab===t.id?600:400,
            background: tab===t.id?'#0f2d5a':'#f0f4fa',
            color: tab===t.id?'#fff':'#374151',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>
      <Card>
        {tab === 'dispatches' && (
          <Table loading={loading} data={dispatches} columns={[
            { key: 'dispatch_number', label: 'Dispatch #', render: v => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</span> },
            { key: 'transporter_name', label: 'Transporter' },
            { key: 'vehicle_number', label: 'Vehicle' },
            { key: 'eway_bill_no', label: 'E-Way Bill', render: v => v || <Badge label="Not Generated" color="orange"/> },
            { key: 'dispatch_date', label: 'Date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
          ]}/>
        )}
        {tab === 'installations' && (
          <Table loading={loading} data={installations} columns={[
            { key: 'stone_block_id', label: 'Block ID' },
            { key: 'blueprint_position_id', label: 'Position ID' },
            { key: 'installation_date', label: 'Date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
            { key: 'verified', label: 'Verified', render: v => <Badge label={v?'Yes':'Pending'} color={v?'green':'orange'}/> },
            { key: 'actions', label: '', render: (_, r) => !r.verified && (
              <Btn size="sm" onClick={async () => { await siteAPI.verifyInstallation(r.id, {}); siteAPI.getInstallations().then(res => setInstallations(res.data)); }}>Verify</Btn>
            )},
          ]}/>
        )}
      </Card>
    </div>
  );
}

// ── Billing ──────────────────────────────────────────────────
import { billingAPI } from '../services/api';

export function BillingPage() {
  const [milestones, setMilestones] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('invoices');

  useEffect(() => {
    Promise.allSettled([billingAPI.getMilestones(), billingAPI.getInvoices()]).then(([m, i]) => {
      setMilestones(m.value?.data || []); setInvoices(i.value?.data || []); setLoading(false);
    });
  }, []);

  const totalBilled = invoices.reduce((a, i) => a + (i.total_amount || 0), 0);
  const totalPaid = invoices.reduce((a, i) => a + (i.paid_amount || 0), 0);

  return (
    <div>
      <PageTitle icon="🧾" title="Milestone Billing" subtitle="GST-compliant sales invoices with advance payment adjustment"/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="🎯" label="Milestones" value={milestones.length} color="#f97316"/>
        <StatCard icon="🧾" label="Invoices" value={invoices.length} color="#1e40af"/>
        <StatCard icon="💰" label="Total Billed" value={`₹${(totalBilled/100000).toFixed(1)}L`} color="#16a34a"/>
        <StatCard icon="⏳" label="Pending" value={`₹${((totalBilled-totalPaid)/100000).toFixed(1)}L`} color="#dc2626"/>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[{id:'invoices',label:'Invoices'},{id:'milestones',label:'Milestones'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 18px', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 13, fontWeight: tab===t.id?600:400,
            background: tab===t.id?'#0f2d5a':'#f0f4fa',
            color: tab===t.id?'#fff':'#374151',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>{t.label}</button>
        ))}
      </div>
      <Card>
        {tab === 'invoices' && (
          <Table loading={loading} data={invoices} columns={[
            { key: 'invoice_number', label: 'Invoice #', render: v => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</span> },
            { key: 'invoice_date', label: 'Date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'taxable_amount', label: 'Taxable', render: v => `₹${Number(v||0).toLocaleString('en-IN')}` },
            { key: 'total_gst', label: 'GST', render: v => `₹${Number(v||0).toLocaleString('en-IN')}` },
            { key: 'total_amount', label: 'Total', render: v => <span style={{ fontWeight: 700 }}>₹{Number(v||0).toLocaleString('en-IN')}</span> },
            { key: 'payment_status', label: 'Status', render: v => <Badge label={v} color={v==='paid'?'green':v==='partial'?'orange':'red'}/> },
          ]}/>
        )}
        {tab === 'milestones' && (
          <Table loading={loading} data={milestones} columns={[
            { key: 'name', label: 'Milestone', render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
            { key: 'project_id', label: 'Project ID' },
            { key: 'milestone_amount', label: 'Amount', render: v => `₹${Number(v||0).toLocaleString('en-IN')}` },
            { key: 'status', label: 'Status', render: v => <Badge label={v} color={v==='completed'?'green':v==='in_progress'?'orange':'gray'}/> },
            { key: 'completion_date', label: 'Completed', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
          ]}/>
        )}
      </Card>
    </div>
  );
}

// ── Users ──────────────────────────────────────────────────
import { authAPI } from '../services/api';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => { authAPI.getUsers().then(r => { setUsers(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  const f = k => e => setForm(x => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    if (!form.username || !form.password || !form.role) return setErr('Username, password, and role required');
    setSaving(true);
    try { await authAPI.createUser(form); setModal(false); load(); }
    catch(e) { setErr(e.response?.data?.detail || 'Failed'); }
    setSaving(false);
  };

  const ROLES = ['admin', 'project_manager', 'structural_engineer', 'production_supervisor', 'store_manager', 'accounts_manager', 'site_supervisor', 'contractor'];

  return (
    <div>
      <PageTitle icon="👤" title="User Management" subtitle="Role-based access control with 8 user roles"
        action={<Btn onClick={() => { setForm({}); setErr(''); setModal(true); }}>+ New User</Btn>}
      />
      <Card>
        <Table loading={loading} data={users} columns={[
          { key: 'username', label: 'Username', render: v => <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{v}</span> },
          { key: 'full_name', label: 'Full Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: v => <Badge label={v} color="blue"/> },
          { key: 'is_active', label: 'Status', render: v => <Badge label={v?'Active':'Inactive'} color={v?'green':'red'}/> },
        ]}/>
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Create User">
        <AlertBox type="error" msg={err}/>
        <FormField label="Username" required><Input value={form.username||''} onChange={f('username')}/></FormField>
        <FormField label="Full Name"><Input value={form.full_name||''} onChange={f('full_name')}/></FormField>
        <FormField label="Email"><Input type="email" value={form.email||''} onChange={f('email')}/></FormField>
        <FormField label="Password" required><Input type="password" value={form.password||''} onChange={f('password')}/></FormField>
        <FormField label="Role" required>
          <Select value={form.role||''} onChange={f('role')}>
            <option value="">Select role…</option>
            {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
          </Select>
        </FormField>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving?'Saving…':'Create User'}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── Audit Logs ──────────────────────────────────────────────────
import { auditAPI } from '../services/api';

export function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ table_name: '', action: '' });

  const load = () => {
    const params = {};
    if (filter.table_name) params.table_name = filter.table_name;
    if (filter.action) params.action = filter.action;
    auditAPI.getLogs(params).then(r => { setLogs(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <PageTitle icon="📋" title="Audit Logs" subtitle="Complete audit trail of all ERP operations"/>
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginBottom: 5 }}>Table Filter</label>
            <input value={filter.table_name} onChange={e => setFilter(f => ({ ...f, table_name: e.target.value }))} placeholder="e.g. stone_blocks" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box' }}/>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginBottom: 5 }}>Action</label>
            <select value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box' }}>
              <option value="">All actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
          <Btn onClick={load}>Filter</Btn>
        </div>
      </Card>
      <Card>
        <Table loading={loading} data={logs} columns={[
          { key: 'created_at', label: 'Time', render: v => v ? new Date(v).toLocaleString('en-IN') : '—' },
          { key: 'action', label: 'Action', render: v => <Badge label={v} color={v==='create'?'green':v==='update'?'orange':'red'}/> },
          { key: 'table_name', label: 'Table', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
          { key: 'record_id', label: 'Record ID' },
          { key: 'user_id', label: 'User ID' },
          { key: 'changes_summary', label: 'Summary', render: v => <span style={{ fontSize: 11, color: '#64748b' }}>{v?.slice(0,80)}{v?.length > 80 ? '…' : ''}</span> },
        ]}/>
      </Card>
    </div>
  );
}
