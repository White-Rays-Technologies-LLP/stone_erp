import { useEffect, useState } from 'react';
import api from '../services/api';

export default function PurchaseReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnForm, setReturnForm] = useState({
    items: [{ item_id: '', qty: '', reason: 'incorrect' }],
    remarks: ''
  });
  const [paymentData, setPaymentData] = useState({
    po_id: '',
    amount: '',
    payment_date: '',
    mode: 'cash',
    reference_no: '',
    remarks: ''
  });

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const [r, w, i] = await Promise.all([
        api.get('/purchase/receipts'),
        api.get('/inventory/warehouses'),
        api.get('/inventory/items')
      ]);
      setReceipts(r.data || []);
      setWarehouses(w.data || []);
      setItems(i.data || []);
    } catch (e) {
      console.error('Error loading receipts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const warehouseName = (id) => warehouses.find(w => w.id === id)?.name || '';
  const itemName = (id) => items.find(i => i.id === id)?.name || '';

  const filteredReceipts = receipts.filter(r => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(r.id || '').toLowerCase().includes(q) ||
      String(r.purchase_order?.po_number || '').toLowerCase().includes(q) ||
      String(r.purchase_order?.vendor_name || '').toLowerCase().includes(q) ||
      String(warehouseName(r.warehouse_id) || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedReceipts = filteredReceipts.slice(startIndex, startIndex + pageSize);

  useEffect(() => { setPage(1); }, [search, pageSize]);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const openDetails = async (id) => {
    setShowDetails(true);
    setDetailsLoading(true);
    setSelectedReceipt(null);
    try {
      const res = await api.get(`/purchase/receipts/${id}`);
      setSelectedReceipt(res.data);
      setReturnForm({ items: [{ item_id: '', qty: '', reason: 'incorrect' }], remarks: '' });
    } catch (e) {
      console.error('Error loading receipt detail', e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const addReturnItem = () => {
    setReturnForm((p) => ({ ...p, items: [...p.items, { item_id: '', qty: '', reason: 'incorrect' }] }));
  };

  const updateReturnItem = (idx, field, value) => {
    setReturnForm((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    }));
  };

  const removeReturnItem = (idx) => {
    setReturnForm((p) => ({
      ...p,
      items: p.items.filter((_, i) => i !== idx)
    }));
  };

  const submitReturn = async (e) => {
    e.preventDefault();
    if (!selectedReceipt) return;
    setReturnLoading(true);
    try {
      const payload = {
        remarks: returnForm.remarks || null,
        items: returnForm.items
          .filter(it => it.item_id && Number(it.qty) > 0)
          .map(it => ({ item_id: Number(it.item_id), qty: Number(it.qty), reason: it.reason }))
      };
      if (payload.items.length === 0) {
        alert('Add at least one item to return.');
        return;
      }
      await api.post(`/purchase/receipts/${selectedReceipt.id}/returns`, payload);
      await openDetails(selectedReceipt.id);
      await loadReceipts();
    } catch (e) {
      alert('Return failed: ' + (e.response?.data?.detail || 'Error'));
    } finally {
      setReturnLoading(false);
    }
  };

  const openPaymentFromReceipt = async (receipt) => {
    try {
      const poRes = await api.get(`/purchase/orders/${receipt.po_id}`);
      const order = poRes.data;
      const today = new Date().toISOString().slice(0, 10);
      const remaining = Math.max(0, (order.total_amount || 0) - (order.paid_amount || 0));
      setPaymentData({
        po_id: receipt.po_id,
        amount: remaining,
        payment_date: today,
        mode: 'cash',
        reference_no: '',
        remarks: '',
        max_amount: remaining,
        total_amount: order.total_amount || 0,
        paid_amount: order.paid_amount || 0
      });
      setShowPayment(true);
    } catch (e) {
      console.error('Error preparing payment', e);
    }
  };

  const handleDeleteReceipt = async (id) => {
    if (!window.confirm('Delete this receipt?')) return;
    try {
      await api.delete(`/purchase/receipts/${id}`);
      const res = await api.get('/purchase/receipts');
      setReceipts(res.data || []);
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.detail || 'Error'));
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    try {
      setPaymentLoading(true);
      const payload = {
        ...paymentData,
        amount: Number(paymentData.amount),
        mode: String(paymentData.mode || '').toLowerCase()
      };
      await api.post('/purchase/payments', payload);
      setShowPayment(false);
      setPaymentData({ po_id: '', amount: '', payment_date: '', mode: 'cash', reference_no: '', remarks: '' });
      const res = await api.get('/purchase/receipts');
      setReceipts(res.data || []);
    } catch (e) {
      console.error('Error recording payment', e);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Receipts</h1>
          <p className="page-subtitle">Receipt history for purchase orders</p>
        </div>
        <input
          type="text"
          className="form-input"
          placeholder="Search receipt, PO, vendor, warehouse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '280px' }}
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="table-scroll" style={{ maxHeight: '500px' }}>
            <div className="table-wrap">
              <table style={{ minWidth: '100%' }}>
              <thead>
                <tr>
                  
                  <th>PO Number</th>
                  <th>Vendor</th>
                  <th>Warehouse</th>
                  <th>Receipt Date</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedReceipts.map(r => (
                  <tr key={r.id}>
                    <td>{r.purchase_order?.po_number || ''}</td>
                    <td>{r.purchase_order?.vendor_name || ''}</td>
                    <td>{warehouseName(r.warehouse_id)}</td>
                    <td>{new Date(r.receipt_date).toLocaleDateString()}</td>
                    <td>
                      {(r.items || []).map(it => (
                        <div key={it.id} style={{ fontSize: '12px' }}>
                          {itemName(it.item_id)} {itemName(it.item_id) ? '—' : ''} {it.received_qty}
                        </div>
                      ))}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={() => openDetails(r.id)}>
                        View
                      </button>
                      {r.purchase_order?.payment_status !== 'paid' && (
                        <button className="btn btn-sm btn-primary" onClick={() => openPaymentFromReceipt(r)}>
                          Pay
                        </button>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteReceipt(r.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
                      No receipts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
        {!loading && (
          <div className="report-pagination" style={{ marginTop: '12px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(1)} disabled={safePage === 1}>First</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>Prev</button>
            <span className="report-page-meta">Page {safePage} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>Last</button>
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ width: '110px' }}
            >
              {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size} / page</option>)}
            </select>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
            <h2 className="modal-title" style={{padding: '20px 24px', margin: 0, borderBottom: '1px solid #e5e7eb'}}>
              Receipt Details
            </h2>

            <div style={{flex: 1, overflowY: 'auto', padding: '20px 24px'}}>
              {detailsLoading && <div>Loading...</div>}
              {!detailsLoading && selectedReceipt && (
                <>
                  <div className="grid-2" style={{marginBottom: '16px'}}>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Receipt Date</div>
                      <div style={{fontWeight: 600}}>{new Date(selectedReceipt.receipt_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>PO Number</div>
                      <div style={{fontWeight: 600}}>{selectedReceipt.purchase_order?.po_number || ''}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Vendor</div>
                      <div style={{fontWeight: 600}}>{selectedReceipt.purchase_order?.vendor_name || ''}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Warehouse</div>
                      <div style={{fontWeight: 600}}>{warehouseName(selectedReceipt.warehouse_id)}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Created At</div>
                      <div style={{fontWeight: 600}}>{new Date(selectedReceipt.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={{marginBottom: '16px'}}>
                    <div style={{fontSize: '12px', color: '#6b7280'}}>Remarks</div>
                    <div style={{fontWeight: 600}}>{selectedReceipt.remarks || ''}</div>
                  </div>

                  <div className="card" style={{padding: 0}}>
                    <div className="table-wrap">
                      <table style={{minWidth: '100%'}}>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Item ID</th>
                            <th>Received Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedReceipt.items || []).map(it => (
                            <tr key={it.id}>
                              <td>{itemName(it.item_id)}</td>
                              <td>{it.item_id}</td>
                              <td>{it.received_qty}</td>
                            </tr>
                          ))}
                          {(selectedReceipt.items || []).length === 0 && (
                            <tr>
                              <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                                No items
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card" style={{ padding: '16px', marginTop: '16px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '12px' }}>Raw Material Return</div>
                    <form onSubmit={submitReturn}>
                      {(returnForm.items || []).map((line, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.6fr 0.8fr 80px', gap: '10px', marginBottom: '10px' }}>
                          <select
                            className="form-select"
                            value={line.item_id}
                            onChange={(e) => updateReturnItem(idx, 'item_id', e.target.value)}
                            required
                          >
                            <option value="">Select Item</option>
                            {(selectedReceipt.items || []).map(it => (
                              <option key={it.item_id} value={it.item_id}>
                                {itemName(it.item_id)} {it.item_id}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-input"
                            placeholder="Qty"
                            value={line.qty}
                            onChange={(e) => updateReturnItem(idx, 'qty', e.target.value)}
                            required
                          />
                          <select
                            className="form-select"
                            value={line.reason}
                            onChange={(e) => updateReturnItem(idx, 'reason', e.target.value)}
                          >
                            <option value="incorrect">Incorrect</option>
                            <option value="damaged">Damaged</option>
                          </select>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeReturnItem(idx)}>
                            Remove
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={addReturnItem}>+ Add Item</button>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Remarks</label>
                        <textarea
                          className="form-textarea"
                          rows="2"
                          value={returnForm.remarks}
                          onChange={(e) => setReturnForm(p => ({ ...p, remarks: e.target.value }))}
                          placeholder="Optional remarks..."
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" type="submit" disabled={returnLoading}>
                          {returnLoading ? 'Submitting...' : 'Submit Return'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="card" style={{padding: 0, marginTop: '16px'}}>
                    <div style={{padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600}}>
                      Return History
                    </div>
                    <div className="table-wrap">
                      <table style={{minWidth: '100%'}}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedReceipt.returns || []).flatMap(ret => (
                            (ret.items || []).map(rit => (
                              <tr key={`${ret.id}-${rit.id}`}>
                                <td>{new Date(ret.created_at).toLocaleDateString()}</td>
                                <td>{itemName(rit.item_id)}</td>
                                <td>{rit.qty}</td>
                                <td>{rit.reason}</td>
                              </tr>
                            ))
                          ))}
                          {(selectedReceipt.returns || []).length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                                No returns
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button type="button" onClick={() => setShowDetails(false)} className="btn btn-ghost">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
            <h2 className="modal-title" style={{padding: '20px 24px', margin: 0, borderBottom: '1px solid #e5e7eb'}}>
              Record Payment
            </h2>

            <form onSubmit={submitPayment} style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>
              <div style={{flex: 1, overflowY: 'auto', padding: '20px 24px'}}>
                <div style={{display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '12px', color: '#6b7280'}}>
                  <div>Total: <strong style={{color: '#111827'}}>{paymentData.total_amount ?? ''}</strong></div>
                  <div>Paid: <strong style={{color: '#0ea5e9'}}>{paymentData.paid_amount ?? ''}</strong></div>
                  <div>Remaining: <strong style={{color: '#10b981'}}>{paymentData.max_amount ?? ''}</strong></div>
                </div>
                <div className="grid-2" style={{marginBottom: '16px'}}>
                  <div className="form-group">
                    <label className="form-label required">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      max={paymentData.max_amount ?? undefined}
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                      className="form-input"
                      required
                    />
                    {paymentData.max_amount !== undefined && (
                      <div style={{fontSize: '11px', color: '#6b7280', marginTop: '4px'}}>
                        Max: {paymentData.max_amount}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Payment Date</label>
                    <input
                      type="date"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Mode</label>
                    <select
                      value={paymentData.mode}
                      onChange={(e) => setPaymentData({ ...paymentData, mode: e.target.value })}
                      className="form-select"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference / Txn ID</label>
                    <input
                      type="text"
                      value={paymentData.reference_no}
                      onChange={(e) => setPaymentData({ ...paymentData, reference_no: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea
                    value={paymentData.remarks}
                    onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                    className="form-textarea"
                    rows="3"
                  />
                </div>
              </div>

              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e5e7eb',
                background: '#f9fafb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button type="submit" className="btn btn-primary" disabled={paymentLoading}>
                  {paymentLoading ? 'Saving...' : 'Save Payment'}
                </button>
                <button type="button" onClick={() => setShowPayment(false)} className="btn btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
