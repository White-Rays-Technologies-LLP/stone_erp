import { useState, useEffect } from 'react';
import { stonesAPI, inventoryAPI } from '../services/api';
import { PageTitle, Card, Table, Btn, Modal, FormField, Input, Select, Badge, AlertBox, StatCard } from '../components/UI';

export default function StonesPage() {
  const [blocks, setBlocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [splitModal, setSplitModal] = useState(false);
  const [genealogyModal, setGenealogyModal] = useState(false);
  const [form, setForm] = useState({});
  const [splitForm, setSplitForm] = useState({ block_id: '', children: [{ length: '', width: '', height: '' }] });
  const [genealogy, setGenealogy] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const load = () => {
    setLoading(true);
    Promise.allSettled([stonesAPI.getBlocks({}), inventoryAPI.getWarehouses()])
      .then(([b, w]) => {
        setBlocks(b.value?.data || []);
        setWarehouses(w.value?.data || []);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.serial_no || !form.length || !form.width || !form.height) return setErr('Serial no. and dimensions required');
    setSaving(true);
    try {
      await stonesAPI.registerBlock({ ...form, length: Number(form.length), width: Number(form.width), height: Number(form.height), weight_kg: Number(form.weight_kg || 0) });
      setModal(false); setErr(''); load();
    } catch(e) { setErr(e.response?.data?.detail || 'Failed to register block'); }
    setSaving(false);
  };

  const doSplit = async () => {
    if (!splitForm.block_id) return setErr('Select a block');
    setSaving(true);
    try {
      await stonesAPI.splitBlock(splitForm.block_id, {
        children: splitForm.children.map(c => ({ length: Number(c.length), width: Number(c.width), height: Number(c.height) }))
      });
      setSplitModal(false); setErr(''); load();
    } catch(e) { setErr(e.response?.data?.detail || 'Split failed'); }
    setSaving(false);
  };

  const loadGenealogy = async (id) => {
    try {
      const r = await stonesAPI.getGenealogy(id);
      setGenealogy(r.data);
      setGenealogyModal(true);
    } catch(e) { setErr('Genealogy not available'); }
  };

  const vol = (l, w, h) => l && w && h ? `${(l * w * h).toLocaleString()} cc` : '—';

  return (
    <div>
      <PageTitle icon="🪨" title="Stone Block Engine" subtitle="Block registration, volume tracking, splitting & genealogy"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={() => { setSplitForm({ block_id: '', children: [{ length: '', width: '', height: '' }] }); setErr(''); setSplitModal(true); }}>✂️ Split Block</Btn>
            <Btn onClick={() => { setForm({}); setErr(''); setModal(true); }}>+ Register Block</Btn>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="🪨" label="Total Blocks" value={blocks.length} color="#8b5cf6"/>
        <StatCard icon="✅" label="Available" value={blocks.filter(b=>b.status==='available').length} color="#16a34a"/>
        <StatCard icon="🔒" label="Allocated" value={blocks.filter(b=>b.status==='allocated').length} color="#f97316"/>
        <StatCard icon="✔️" label="Installed" value={blocks.filter(b=>b.status==='installed').length} color="#1e40af"/>
      </div>

      <Card>
        <Table loading={loading} data={blocks} columns={[
          { key: 'serial_no', label: 'Serial No.', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8faff', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>{v}</span> },
          { key: 'stone_type', label: 'Stone Type', render: v => v || '—' },
          { key: 'length', label: 'L × W × H', render: (_, r) => `${r.length} × ${r.width} × ${r.height} cm` },
          { key: 'volume_cc', label: 'Volume', render: v => v ? `${Number(v).toLocaleString()} cc` : '—' },
          { key: 'residual_volume', label: 'Residual', render: v => <span style={{ color: '#16a34a', fontWeight: 600 }}>{v ? `${Number(v).toLocaleString()} cc` : '—'}</span> },
          { key: 'status', label: 'Status', render: v => <Badge label={v} color={v==='available'?'green':v==='allocated'?'orange':'blue'}/> },
          { key: 'actions', label: '', render: (_, r) => <Btn size="sm" variant="ghost" onClick={() => loadGenealogy(r.id)}>🌳 Tree</Btn> },
        ]}/>
      </Card>

      {/* Register Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Register Stone Block">
        <AlertBox type="error" msg={err}/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormField label="Serial No." required><Input value={form.serial_no||''} onChange={f('serial_no')} placeholder="BLK-001"/></FormField>
          <FormField label="Stone Type"><Input value={form.stone_type||''} onChange={f('stone_type')} placeholder="Granite, Marble…"/></FormField>
          <FormField label="Warehouse">
            <Select value={form.warehouse_id||''} onChange={f('warehouse_id')}>
              <option value="">Select warehouse</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Supplier"><Input value={form.supplier||''} onChange={f('supplier')}/></FormField>
          <FormField label="Length (cm)" required><Input type="number" value={form.length||''} onChange={f('length')}/></FormField>
          <FormField label="Width (cm)" required><Input type="number" value={form.width||''} onChange={f('width')}/></FormField>
          <FormField label="Height (cm)" required><Input type="number" value={form.height||''} onChange={f('height')}/></FormField>
          <FormField label="Weight (kg)"><Input type="number" value={form.weight_kg||''} onChange={f('weight_kg')}/></FormField>
        </div>
        {form.length && form.width && form.height && (
          <div style={{ marginTop: 12, padding: 10, background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1e40af' }}>
            📐 Auto-computed volume: <strong>{vol(form.length, form.width, form.height)}</strong>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Register Block'}</Btn>
        </div>
      </Modal>

      {/* Split Modal */}
      <Modal open={splitModal} onClose={() => setSplitModal(false)} title="Split Stone Block">
        <AlertBox type="error" msg={err}/>
        <FormField label="Parent Block">
          <Select value={splitForm.block_id} onChange={e => setSplitForm(p => ({ ...p, block_id: e.target.value }))}>
            <option value="">Select block to split</option>
            {blocks.filter(b => b.status === 'available').map(b => <option key={b.id} value={b.id}>{b.serial_no} — {b.residual_volume} cc residual</option>)}
          </Select>
        </FormField>
        <div style={{ fontWeight: 600, fontSize: 13, margin: '14px 0 10px', color: '#374151' }}>Child Block Dimensions</div>
        {splitForm.children.map((child, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 10, alignItems: 'end' }}>
            <FormField label="L (cm)"><Input type="number" value={child.length} onChange={e => { const c=[...splitForm.children]; c[idx]={...c[idx],length:e.target.value}; setSplitForm(p=>({...p,children:c})); }}/></FormField>
            <FormField label="W (cm)"><Input type="number" value={child.width} onChange={e => { const c=[...splitForm.children]; c[idx]={...c[idx],width:e.target.value}; setSplitForm(p=>({...p,children:c})); }}/></FormField>
            <FormField label="H (cm)"><Input type="number" value={child.height} onChange={e => { const c=[...splitForm.children]; c[idx]={...c[idx],height:e.target.value}; setSplitForm(p=>({...p,children:c})); }}/></FormField>
            {idx > 0 && <Btn variant="ghost" onClick={() => setSplitForm(p => ({ ...p, children: p.children.filter((_,ii)=>ii!==idx) }))}>✕</Btn>}
          </div>
        ))}
        <Btn variant="ghost" onClick={() => setSplitForm(p => ({ ...p, children: [...p.children, { length: '', width: '', height: '' }] }))}>+ Add Child</Btn>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setSplitModal(false)}>Cancel</Btn>
          <Btn onClick={doSplit} disabled={saving}>{saving ? 'Splitting…' : 'Split Block'}</Btn>
        </div>
      </Modal>

      {/* Genealogy Modal */}
      <Modal open={genealogyModal} onClose={() => setGenealogyModal(false)} title="Block Genealogy Tree">
        {genealogy && <GenealogyTree node={genealogy} depth={0}/>}
      </Modal>
    </div>
  );
}

function GenealogyTree({ node, depth }) {
  if (!node) return null;
  return (
    <div style={{ paddingLeft: depth * 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f1f5fd' }}>
        {depth > 0 && <span style={{ color: '#94a3b8' }}>└</span>}
        <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8faff', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>{node.serial_no}</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>{node.length}×{node.width}×{node.height} cm · {node.volume_cc} cc</span>
        <Badge label={node.status} color={node.status === 'available' ? 'green' : 'orange'}/>
      </div>
      {node.children?.map(c => <GenealogyTree key={c.id} node={c} depth={depth + 1}/>)}
    </div>
  );
}
