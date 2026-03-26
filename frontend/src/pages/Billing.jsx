import { useState, useEffect } from 'react';
import { billingAPI, projectsAPI, inventoryAPI } from '../services/api';

export default function Billing() {
  const [milestones, setMilestones] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [advancePayments, setAdvancePayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [projectItemIds, setProjectItemIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('milestones');
  const [showModal, setShowModal] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [dispatchInvoiceItems, setDispatchInvoiceItems] = useState([]);
  const [dispatchItemLoading, setDispatchItemLoading] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [dispatchSearch, setDispatchSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.allSettled([billingAPI.milestones(null), billingAPI.invoices(), billingAPI.advancePayments(), projectsAPI.list(), inventoryAPI.items()]).then(([m, i, a, p, itemsRes]) => {
      setMilestones(m.value?.data || []);
      setInvoices(i.value?.data || []);
      setAdvancePayments(a.value?.data || []);
      setProjects(p.value?.data || []);
      setAllItems(itemsRes.value?.data || []);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (showModal === 'payment') {
        await billingAPI.recordPayment(editId, { ...form, payment_amount: Number(form.payment_amount) });
      } else if (showModal === 'milestone') {
        const payload = { ...form, milestone_value: Number(form.milestone_value), project_id: Number(form.project_id) };
        if (editMode) await billingAPI.updateMilestone(editId, payload);
        else await billingAPI.createMilestone(payload);
      } else {
        const dispatchAllocations = form.dispatch_allocations || [];
        const hasDispatchAllocations = dispatchAllocations.length > 0;
        const manualItems = (form.manual_items || []).filter((x) => Number(x.item_id));
        const mappedLineItems = manualItems.map((x) => {
          const item = allItems.find((it) => Number(it.id) === Number(x.item_id));
          return {
            description: item?.name || x.description || 'Item',
            hsn_code: item?.hsn_code || null,
            qty: Number(x.qty || 0),
            rate: Number(x.rate || 0),
          };
        });
        const payload = {
          ...form,
          project_id: Number(form.project_id),
          gst_rate: Number(form.gst_rate || 18),
          line_items: hasDispatchAllocations ? [] : mappedLineItems,
          dispatch_allocations: hasDispatchAllocations ? dispatchAllocations : [],
        };
        if (editMode) await billingAPI.updateInvoice(editId, payload);
        else await billingAPI.createInvoice(payload);
      }
      setShowModal(null); setEditMode(false); setEditId(null); setForm({}); load();
    } catch (e) { setError(e.response?.data?.detail || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      if (type === 'milestone') await billingAPI.deleteMilestone(id);
      else if (type === 'invoice') await billingAPI.deleteInvoice(id);
      else await billingAPI.deleteAdvancePayment(id);
      load();
    } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const openEdit = (type, record) => { setForm(record); setEditMode(true); setEditId(record.id); setError(null); setShowModal(type); };
  const openCreate = (type) => {
    setForm(type === 'invoice' ? { sale_mode: 'project', manual_items: [{ item_id: '', qty: 1, rate: 0 }] } : {});
    setEditMode(false);
    setEditId(null);
    setError(null);
    setShowModal(type);
  };
  const openPayment = (invoice) => { setForm({}); setEditId(invoice.id); setError(null); setShowModal('payment'); };

  const handleIssueInvoice = async (invoice) => {
    if (!window.confirm(`Issue invoice ${invoice.invoice_no}? After issue it will be locked.`)) return;
    try {
      await billingAPI.issueInvoice(invoice.id);
      load();
    } catch (e) {
      alert('Issue failed: ' + (e.response?.data?.detail || 'Error'));
    }
  };

  const _fetchInvoiceDocBlob = async (invoiceId) => {
    const res = await billingAPI.invoicePdf(invoiceId);
    return new Blob([res.data], { type: 'application/pdf' });
  };

  const handlePreviewInvoice = async (invoice) => {
    try {
      const blob = await _fetchInvoiceDocBlob(invoice.id);
      const url = URL.createObjectURL(blob);
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(url);
      setPreviewInvoice(invoice);
    } catch (e) {
      alert('Preview failed: ' + (e.response?.data?.detail || 'Error'));
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    try {
      const blob = await _fetchInvoiceDocBlob(invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_no || 'invoice'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Download failed: ' + (e.response?.data?.detail || 'Error'));
    }
  };

  const handlePrintInvoice = async (invoice) => {
    try {
      const blob = await _fetchInvoiceDocBlob(invoice.id);
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) return;
      const doPrint = () => {
        try { w.focus(); w.print(); } catch {}
      };
      setTimeout(doPrint, 600);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      alert('Print failed: ' + (e.response?.data?.detail || 'Error'));
    }
  };

  const closePreview = () => {
    if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
    setPreviewPdfUrl('');
    setPreviewInvoice(null);
  };

  const selectedDispatchAllocations = form.dispatch_allocations || [];
  const dispatchRateMap = Object.fromEntries((dispatchInvoiceItems || []).map((r) => [Number(r.dispatch_item_id), Number(r.rate || 0)]));
  const dispatchTaxable = selectedDispatchAllocations.reduce((sum, row) => sum + Number(row.qty || 0) * Number(dispatchRateMap[Number(row.dispatch_item_id)] || 0), 0);
  const manualTaxable = (form.manual_items || []).reduce((sum, r) => sum + Number(r.qty || 0) * Number(r.rate || 0), 0);
  const previewTaxable = selectedDispatchAllocations.length > 0 ? dispatchTaxable : manualTaxable;
  const previewGstRate = Number(form.gst_rate || 18);
  const previewTax = (previewTaxable * previewGstRate) / 100;
  const previewGross = previewTaxable + previewTax;
  const previewNet = previewGross - Number(form.advance_adjustment || 0);

  useEffect(() => {
    const loadDispatchItems = async () => {
      if (showModal !== 'invoice' || !form.project_id) {
        setDispatchInvoiceItems([]);
        setProjectItemIds([]);
        return;
      }
      setDispatchItemLoading(true);
      try {
        const res = await billingAPI.dispatchItems(Number(form.project_id));
        setDispatchInvoiceItems(res.data || []);
        const proj = await projectsAPI.get(Number(form.project_id));
        const mats = proj.data?.materials || [];
        setProjectItemIds(Array.from(new Set(mats.map((m) => Number(m.item_id)).filter(Boolean))));
      } catch {
        setDispatchInvoiceItems([]);
        setProjectItemIds([]);
      } finally {
        setDispatchItemLoading(false);
      }
    };
    loadDispatchItems();
  }, [showModal, form.project_id]);

  const invoiceSelectableItems = (form.sale_mode || 'project') === 'direct'
    ? allItems
    : allItems.filter((it) => projectItemIds.includes(Number(it.id)));
  const filteredDispatchInvoiceItems = (dispatchInvoiceItems || []).filter((row) => {
    const q = dispatchSearch.trim().toLowerCase();
    if (!q) return true;
    const text = `${row.dispatch_note_no || ''} ${row.description || ''} ${row.serial_no || ''}`.toLowerCase();
    return text.includes(q);
  });
  const filteredInvoiceSelectableItems = invoiceSelectableItems.filter((it) => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return true;
    return `${it.name || ''} ${it.code || ''}`.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">💰 Milestone-Based Billing</div><div className="page-subtitle">GST-compliant invoice generation tied to project milestones</div></div>
        {tab !== 'advance' && (
          <button className="btn btn-primary" onClick={() => openCreate(tab === 'milestones' ? 'milestone' : 'invoice')}>
            + New {tab === 'milestones' ? 'Milestone' : 'Invoice'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        <button onClick={() => setTab('milestones')} className="btn" style={{ background: tab === 'milestones' ? '#1e40af' : '#fff', color: tab === 'milestones' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>🎯 Milestones ({milestones.length})</button>
        <button onClick={() => setTab('invoices')} className="btn" style={{ background: tab === 'invoices' ? '#1e40af' : '#fff', color: tab === 'invoices' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>🧾 Invoices ({invoices.length})</button>
        <button onClick={() => setTab('advance')} className="btn" style={{ background: tab === 'advance' ? '#1e40af' : '#fff', color: tab === 'advance' ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>💸 Advance Payments ({advancePayments.length})</button>
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <>
            {tab === 'milestones' && (
              <div className="table-wrap"><table>
                <thead><tr><th>Name</th><th>Project</th><th>Value</th><th>Status</th><th>Due Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {milestones.map(m => (<tr key={m.id}>
                    <td><strong>{m.name}</strong></td>
                    <td>{projects.find(p => p.id === m.project_id)?.name || m.project_id}</td>
                    <td>₹{Number(m.milestone_value || 0).toLocaleString('en-IN')}</td>
                    <td><span className={`badge badge-${m.status === 'completed' ? 'green' : 'orange'}`}>{m.status}</span></td>
                    <td>{m.due_date || '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit('milestone', m)} style={{ marginRight: '4px' }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete('milestone', m.id)}>Delete</button>
                    </td>
                  </tr>))}
                  {milestones.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No milestones yet</td></tr>}
                </tbody>
              </table></div>
            )}
            {tab === 'invoices' && (
              <div className="table-wrap"><table>
                <thead><tr><th>Invoice #</th><th>Date</th><th>Taxable</th><th>GST</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {invoices.map(inv => (<tr key={inv.id}>
                    <td><strong>{inv.invoice_no}</strong></td>
                    <td>{inv.invoice_date || '—'}</td>
                    <td>Rs.{Number(inv.taxable_amount || 0).toLocaleString('en-IN')}</td>
                    <td>Rs.{Number(inv.total_tax || 0).toLocaleString('en-IN')}</td>
                    <td><strong>Rs.{Number(inv.gross_amount || 0).toLocaleString('en-IN')}</strong></td>
                    <td>
                      <span className={`badge badge-${inv.invoice_status === 'issued' ? 'blue' : 'orange'}`} style={{ marginRight: '6px' }}>{inv.invoice_status || 'draft'}</span>
                      <span className={`badge badge-${inv.payment_status === 'paid' ? 'green' : inv.payment_status === 'partial' ? 'orange' : 'gray'}`}>{inv.payment_status}</span>
                    </td>
                    <td>
                      {inv.invoice_status !== 'issued' && <button className="btn btn-primary btn-sm" onClick={() => handleIssueInvoice(inv)} style={{ marginRight: '4px' }}>Issue</button>}
                      {inv.invoice_status === 'issued' && inv.payment_status !== 'paid' && <button className="btn btn-primary btn-sm" onClick={() => openPayment(inv)} style={{ marginRight: '4px' }}>Pay</button>}
                      {inv.invoice_status === 'issued' && <button className="btn btn-ghost btn-sm" onClick={() => handlePreviewInvoice(inv)} style={{ marginRight: '4px' }}>Preview</button>}
                      {inv.invoice_status === 'issued' && <button className="btn btn-ghost btn-sm" onClick={() => handleDownloadInvoice(inv)} style={{ marginRight: '4px' }}>Download</button>}
                      {inv.invoice_status === 'issued' && <button className="btn btn-ghost btn-sm" onClick={() => handlePrintInvoice(inv)} style={{ marginRight: '4px' }}>Print</button>}
                      {inv.invoice_status !== 'issued' && <button className="btn btn-ghost btn-sm" onClick={() => openEdit('invoice', inv)} style={{ marginRight: '4px' }}>Edit</button>}
                      {inv.invoice_status !== 'issued' && <button className="btn btn-danger btn-sm" onClick={() => handleDelete('invoice', inv.id)}>Delete</button>}
                      {inv.invoice_status === 'issued' && <span style={{ fontSize: '12px', color: '#64748b' }}>Locked</span>}
                    </td>
                  </tr>))}
                  {invoices.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No invoices yet</td></tr>}
                </tbody>
              </table></div>
            )}
            {tab === 'advance' && (
              <div className="table-wrap"><table>
                <thead><tr><th>Project</th><th>Amount</th><th>Adjusted</th><th>Balance</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {advancePayments.map(a => (
                    <tr key={a.id}>
                      <td>{projects.find(p => p.id === a.project_id)?.name || a.project_id}</td>
                      <td>₹{Number(a.amount || 0).toLocaleString('en-IN')}</td>
                      <td>₹{Number(a.adjusted_amount || 0).toLocaleString('en-IN')}</td>
                      <td>₹{Number(a.balance || 0).toLocaleString('en-IN')}</td>
                      <td>{a.payment_date || a.date || '—'}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete('advance', a.id)}>Delete</button></td>
                    </tr>
                  ))}
                  {advancePayments.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No advance payments</td></tr>}
                </tbody>
              </table></div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              width: showModal === 'invoice' ? 'min(1180px, 96vw)' : 'min(860px, 94vw)',
              maxHeight: '92vh',
              overflow: 'auto',
            }}
          >
            <div className="modal-title">
              {showModal === 'payment' ? '💳 Record Payment' : (editMode ? '✏️ Edit' : '➕ New')} {showModal === 'milestone' ? 'Milestone' : showModal === 'invoice' ? 'Invoice' : ''}
            </div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <form onSubmit={handleSave}>
              {showModal === 'milestone' ? (<>
                <div className="form-group"><label className="form-label">Milestone Name *</label><input className="form-input" value={form.name || ''} required onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Project *</label>
                  <select className="form-select" value={form.project_id || ''} required onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))}>
                    <option value="">Select project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Value (₹)</label><input className="form-input" type="number" value={form.milestone_value || ''} onChange={e => setForm(p => ({ ...p, milestone_value: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.due_date || ''} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              </>) : showModal === 'invoice' ? (<>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '12px', background: '#f8fafc' }}>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Project *</label>
                    <select className="form-select" value={form.project_id || ''} required onChange={e => setForm(p => ({ ...p, project_id: e.target.value, dispatch_allocations: [], manual_items: [] }))}>
                      <option value="">Select project...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Invoice Date *</label><input className="form-input" type="date" value={form.invoice_date || ''} required onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} /></div>
                </div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Item Source</label>
                    <select className="form-select" value={form.sale_mode || 'project'} onChange={e => setForm(p => ({ ...p, sale_mode: e.target.value, manual_items: [] }))}>
                      <option value="project">Project Items</option>
                      <option value="direct">Direct Sale (Any Item)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dispatch Items (Optional)</label>
                  <input
                    className="form-input"
                    placeholder="Search dispatch / description / serial..."
                    value={dispatchSearch}
                    onChange={e => setDispatchSearch(e.target.value)}
                    style={{ marginBottom: '8px' }}
                  />
                  {dispatchItemLoading && <div style={{ fontSize: '12px', color: '#64748b' }}>Loading dispatch items...</div>}
                  {!dispatchItemLoading && dispatchInvoiceItems.length === 0 && <div style={{ fontSize: '12px', color: '#64748b' }}>No unbilled dispatch items for this project.</div>}
                  {!dispatchItemLoading && dispatchInvoiceItems.length > 0 && (
                    <div className="table-wrap" style={{ maxHeight: '280px', overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <table>
                        <thead><tr><th>Select</th><th>Dispatch</th><th>Description</th><th>Serial No</th><th>L</th><th>W</th><th>H</th><th>CFT</th><th>Unbilled</th><th>Rate</th><th>Qty To Bill</th></tr></thead>
                        <tbody>
                          {filteredDispatchInvoiceItems.map((row) => {
                            const selected = (form.dispatch_allocations || []).find(a => Number(a.dispatch_item_id) === Number(row.dispatch_item_id));
                            return (
                              <tr key={row.dispatch_item_id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={!!selected}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setForm(p => {
                                        const current = [...(p.dispatch_allocations || [])];
                                        const idx = current.findIndex(a => Number(a.dispatch_item_id) === Number(row.dispatch_item_id));
                                        if (checked && idx === -1) current.push({ dispatch_item_id: row.dispatch_item_id, qty: row.unbilled_qty });
                                        if (!checked && idx !== -1) current.splice(idx, 1);
                                        return { ...p, dispatch_allocations: current };
                                      });
                                    }}
                                  />
                                </td>
                                <td>{row.dispatch_note_no}</td>
                                <td>{row.description}</td>
                                <td>{row.serial_no || '-'}</td>
                                <td>{row.length ?? '-'}</td>
                                <td>{row.width ?? '-'}</td>
                                <td>{row.height ?? '-'}</td>
                                <td>{row.cft ?? '-'}</td>
                                <td>{row.unbilled_qty}</td>
                                <td>{row.rate}</td>
                                <td>
                                  <input
                                    className="form-input"
                                    type="number"
                                    min="0"
                                    max={row.unbilled_qty}
                                    step="0.001"
                                    disabled={!selected}
                                    value={selected?.qty ?? ''}
                                    onChange={(e) => {
                                      const qty = Number(e.target.value || 0);
                                      setForm(p => ({
                                        ...p,
                                        dispatch_allocations: (p.dispatch_allocations || []).map(a => Number(a.dispatch_item_id) === Number(row.dispatch_item_id) ? { ...a, qty } : a),
                                      }));
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                          {filteredDispatchInvoiceItems.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', color: '#64748b' }}>No matching dispatch rows</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {(form.dispatch_allocations || []).length === 0 && (
                  <div className="form-group">
                    <label className="form-label">Manual Invoice Items *</label>
                    <input
                      className="form-input"
                      placeholder="Search item by name/code..."
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      style={{ marginBottom: '8px' }}
                    />
                    <div className="table-wrap" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <table>
                        <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Action</th></tr></thead>
                        <tbody>
                          {(form.manual_items || []).map((mi, idx) => (
                            <tr key={idx}>
                              <td>
                                <select className="form-select" value={mi.item_id || ''} onChange={e => setForm(p => {
                                  const next = [...(p.manual_items || [])];
                                  next[idx] = { ...next[idx], item_id: Number(e.target.value) };
                                  return { ...p, manual_items: next };
                                })}>
                                  <option value="">Select item...</option>
                                  {filteredInvoiceSelectableItems.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                                </select>
                              </td>
                              <td><input className="form-input" type="number" min="0" step="0.001" value={mi.qty || ''} onChange={e => setForm(p => {
                                const next = [...(p.manual_items || [])];
                                next[idx] = { ...next[idx], qty: Number(e.target.value || 0) };
                                return { ...p, manual_items: next };
                              })} /></td>
                              <td><input className="form-input" type="number" min="0" step="0.01" value={mi.rate || ''} onChange={e => setForm(p => {
                                const next = [...(p.manual_items || [])];
                                next[idx] = { ...next[idx], rate: Number(e.target.value || 0) };
                                return { ...p, manual_items: next };
                              })} /></td>
                              <td>₹{(Number(mi.qty || 0) * Number(mi.rate || 0)).toFixed(2)}</td>
                              <td><button type="button" className="btn btn-danger btn-sm" onClick={() => setForm(p => ({ ...p, manual_items: (p.manual_items || []).filter((_, i) => i !== idx) }))}>Remove</button></td>
                            </tr>
                          ))}
                          {(form.manual_items || []).length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>No manual items</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }} onClick={() => setForm(p => ({ ...p, manual_items: [...(p.manual_items || []), { item_id: '', qty: 1, rate: 0 }] }))}>+ Add Manual Item</button>
                  </div>
                )}
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">GST Rate %</label><input className="form-input" type="number" step="0.5" value={form.gst_rate ?? 18} onChange={e => setForm(p => ({ ...p, gst_rate: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Client Name</label><input className="form-input" value={form.client_name || ''} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} /></div>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', background: '#f8fafc', fontSize: '12px', marginTop: '4px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>Invoice Totals Preview</div>
                  <div>Taxable: <b>₹{previewTaxable.toFixed(2)}</b></div>
                  <div>GST ({previewGstRate}%): <b>₹{previewTax.toFixed(2)}</b></div>
                  <div>Gross: <b>₹{previewGross.toFixed(2)}</b></div>
                  <div>Net Payable: <b>₹{previewNet.toFixed(2)}</b></div>
                </div>
              </>) : (<>
                <div className="form-group"><label className="form-label">Payment Amount (₹) *</label><input className="form-input" type="number" value={form.payment_amount || ''} required onChange={e => setForm(p => ({ ...p, payment_amount: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Payment Date</label><input className="form-input" type="date" value={form.payment_date || ''} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Payment Method</label><input className="form-input" value={form.payment_method || ''} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))} /></div>
              </>)}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (showModal === 'payment' ? 'Record Payment' : (editMode ? 'Update' : 'Create'))}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewInvoice && (
        <div className="modal-overlay" onClick={closePreview}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(1000px, 96vw)' }}>
            <div className="modal-title">Invoice Preview • {previewInvoice.invoice_no}</div>
            <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDownloadInvoice(previewInvoice)}>Download</button>
              <button className="btn btn-primary btn-sm" onClick={() => handlePrintInvoice(previewInvoice)}>Print</button>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', padding: '8px' }}>
              <iframe title="Invoice PDF Preview" src={previewPdfUrl} style={{ width: '100%', height: '78vh', border: 'none' }} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={closePreview}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
