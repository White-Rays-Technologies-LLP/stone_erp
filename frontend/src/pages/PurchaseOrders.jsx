import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [orderPayments, setOrderPayments] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptData, setReceiptData] = useState({
    po_id: '',
    warehouse_id: '',
    receipt_date: '',
    items: [],
    remarks: ''
  });
  const [showReceiptHistory, setShowReceiptHistory] = useState(false);
  const [receiptHistory, setReceiptHistory] = useState([]);
  const [receiptHistoryLoading, setReceiptHistoryLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', gstin: '', pan: '', phone: '', email: '', address: '', state: '', state_code: '' });
  const [formData, setFormData] = useState({
    vendor_id: '',
    vendor_name: '',
    vendor_gstin: '',
    po_date: '',
    expected_delivery: '',
    items: [{ item_id: '', qty: '', rate: '', length: '', width: '', height: '' }],
    remarks: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchItems();
    fetchCategories();
    fetchWarehouses();
    fetchVendors();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/purchase/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/inventory/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/inventory/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/inventory/warehouses');
      setWarehouses(response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await api.get('/vendors');
      setVendors(response.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleVendorChange = (value) => {
    if (value === '__create__') {
      setShowVendorModal(true);
      return;
    }
    const vendor = vendors.find(v => String(v.id) === String(value));
    setFormData(prev => ({
      ...prev,
      vendor_id: value,
      vendor_name: vendor?.name || '',
      vendor_gstin: vendor?.gstin || ''
    }));
  };

  const submitVendor = async (e) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) {
      alert('Vendor name is required');
      return;
    }
    try {
      setVendorSaving(true);
      const payload = {
        name: vendorForm.name.trim(),
        gstin: vendorForm.gstin || null,
        pan: vendorForm.pan || null,
        phone: vendorForm.phone || null,
        email: vendorForm.email || null,
        address: vendorForm.address || null,
        state: vendorForm.state || null,
        state_code: vendorForm.state_code || null
      };
      const res = await api.post('/vendors', payload);
      const created = res.data;
      setShowVendorModal(false);
      setVendorForm({ name: '', gstin: '', pan: '', phone: '', email: '', address: '', state: '', state_code: '' });
      await fetchVendors();
      setFormData(prev => ({
        ...prev,
        vendor_id: String(created.id),
        vendor_name: created.name,
        vendor_gstin: created.gstin || ''
      }));
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create vendor');
    } finally {
      setVendorSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
          const payload = {
        ...formData,
        vendor_id: formData.vendor_id ? Number(formData.vendor_id) : null,
        items: formData.items.map((item) => ({
          item_id: item.item_id,
          qty: item.qty === '' ? 0 : Number.parseInt(item.qty, 10),
          rate: item.rate === '' ? 0 : Number(item.rate),
          length: item.length === '' ? null : Number(item.length),
          width: item.width === '' ? null : Number(item.width),
          height: item.height === '' ? null : Number(item.height),
        }))
      };
      await api.post('/purchase/orders', payload);
      setShowForm(false);
      setFormData({
        vendor_id: '',
        vendor_name: '',
        vendor_gstin: '',
        po_date: '',
        expected_delivery: '',
        items: [{ item_id: '', qty: '', rate: '', length: '', width: '', height: '' }],
        remarks: ''
      });
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const handleApprove = async (poId) => {
    try {
      await api.put(`/purchase/orders/${poId}/approve`);
      fetchOrders();
    } catch (error) {
      console.error('Error approving order:', error);
    }
  };

  const handleDeleteOrder = async (poId) => {
    if (!window.confirm('Delete this purchase order?')) return;
    try {
      await api.delete(`/purchase/orders/${poId}`);
      setShowDetails(false);
      fetchOrders();
    } catch (error) {
      alert('Delete failed: ' + (error.response?.data?.detail || 'Error'));
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Delete this payment?')) return;
    try {
      await api.delete(`/purchase/payments/${paymentId}`);
      if (selectedOrder?.id) openDetails(selectedOrder.id);
    } catch (error) {
      alert('Delete failed: ' + (error.response?.data?.detail || 'Error'));
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm('Delete this receipt?')) return;
    try {
      await api.delete(`/purchase/receipts/${receiptId}`);
      openReceiptHistory();
      fetchOrders();
    } catch (error) {
      alert('Delete failed: ' + (error.response?.data?.detail || 'Error'));
    }
  };

  const openDetails = async (poId) => {
    setDetailsLoading(true);
    setShowDetails(true);
    setSelectedOrder(null);
    setOrderPayments([]);
    try {
      const res = await api.get(`/purchase/orders/${poId}`);
      setSelectedOrder(res.data);
      const pay = await api.get('/purchase/payments', { params: { po_id: poId } });
      setOrderPayments(pay.data || []);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openReceipt = async (poId) => {
    setReceiptLoading(true);
    setShowReceipt(true);
    try {
      const res = await api.get(`/purchase/orders/${poId}`);
      const today = new Date().toISOString().slice(0, 10);
      setReceiptData({
        po_id: res.data.id,
        warehouse_id: '',
        receipt_date: today,
        items: (res.data.items || []).map(it => ({
          item_id: it.item_id,
          received_qty: 0,
          max_qty: (it.qty || 0) - (it.received_qty || 0)
        })),
        remarks: ''
      });
    } catch (error) {
      console.error('Error preparing receipt:', error);
    } finally {
      setReceiptLoading(false);
    }
  };

  const updateReceiptItem = (index, value) => {
    const next = [...receiptData.items];
    next[index].received_qty = value;
    setReceiptData({ ...receiptData, items: next });
  };

  const submitReceipt = async (e) => {
    e.preventDefault();
    if (!receiptData.po_id || !receiptData.warehouse_id) return;
    try {
      setReceiptLoading(true);
      const payload = {
        po_id: receiptData.po_id,
        warehouse_id: Number(receiptData.warehouse_id),
        receipt_date: receiptData.receipt_date,
        items: receiptData.items
          .filter(it => Number(it.received_qty) > 0)
          .map(it => ({
            item_id: it.item_id,
            received_qty: Number(it.received_qty)
          })),
        remarks: receiptData.remarks
      };
      await api.post('/purchase/receipts', payload);
      setShowReceipt(false);
      setReceiptData({ po_id: '', warehouse_id: '', receipt_date: '', items: [], remarks: '' });
      fetchOrders();
    } catch (error) {
      console.error('Error submitting receipt:', error);
    } finally {
      setReceiptLoading(false);
    }
  };

  const openReceiptHistory = async () => {
    setShowReceiptHistory(true);
    setReceiptHistoryLoading(true);
    try {
      const res = await api.get('/purchase/receipts');
      setReceiptHistory(res.data || []);
    } catch (error) {
      console.error('Error fetching receipt history:', error);
    } finally {
      setReceiptHistoryLoading(false);
    }
  };


  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: '', qty: '', rate: '', length: '', width: '', height: '' }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    
    if (field === 'item_id') {
      const selectedItem = items.find(i => String(i.id) === String(value));
      const category = categories.find(c => c.id === selectedItem?.category_id);
      
      // Clear dimension fields if item is not dimensional
      if (category?.item_type !== 'dimensional') {
        newItems[index].length = '';
        newItems[index].width = '';
        newItems[index].height = '';
      }
    }
    
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const getItemDetails = (itemId) => {
    const item = items.find(i => String(i.id) === String(itemId));
    const category = categories.find(c => c.id === item?.category_id);
    return {
      item,
      category,
      itemType: category?.item_type || '',
      categoryName: category?.name || ''
    };
  };

  const isDimensional = (itemId) => {
    const { itemType } = getItemDetails(itemId);
    return itemType === 'dimensional';
  };

  const calcCft = (item) => {
    const l = parseFloat(item.length) || 0;
    const w = parseFloat(item.width) || 0;
    const h = parseFloat(item.height) || 0;
    return l * w * h; // CFT per unit
  };

  const calcAmount = (item) => {
    const qty = Number.parseInt(item.qty, 10) || 0;
    const rate = parseFloat(item.rate) || 0;
    
    if (isDimensional(item.item_id)) {
      // For dimensional items: (L x W x H) x Qty x Rate
      return calcCft(item) * qty * rate;
    }
    // For non-dimensional items: Qty x Rate
    return qty * rate;
  };

  const orderTotal = formData.items.reduce((sum, item) => sum + calcAmount(item), 0);

  // Helper function to get item display name with category
  const getItemDisplayName = (item) => {
    const { categoryName } = getItemDetails(item.id);
    return `${item.name} ${categoryName ? `(${categoryName})` : ''}`;
  };

  const filteredOrders = orders.filter(o => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(o.po_number || '').toLowerCase().includes(q) ||
      String(o.vendor_name || '').toLowerCase().includes(q) ||
      String(o.status || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

  useEffect(() => { setPage(1); }, [search, pageSize]);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Manage vendor purchase orders and approvals</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search PO, vendor, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '240px' }}
          />
          <button onClick={openReceiptHistory} className="btn btn-ghost">
            Receipt History
          </button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <span>+</span> Create PO
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '1100px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
            <h2 className="modal-title" style={{padding: '20px 24px', margin: 0, borderBottom: '1px solid #e5e7eb'}}>
              Create Purchase Order
            </h2>
            
            <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>
              {/* Scrollable Content Area */}
              <div style={{flex: 1, overflowY: 'auto', padding: '20px 24px'}}>
                {/* Vendor Details */}
                <div className="grid-2" style={{marginBottom: '24px'}}>
                  <div className="form-group">
                    <label className="form-label required">Vendor</label>
                    <select
                      value={formData.vendor_id}
                      onChange={(e) => handleVendorChange(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                      <option value="__create__">+ Create Vendor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vendor GSTIN</label>
                    <input
                      type="text"
                      value={formData.vendor_gstin}
                      onChange={(e) => setFormData({ ...formData, vendor_gstin: e.target.value })}
                      className="form-input"
                      readOnly={!!formData.vendor_id}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">PO Date</label>
                    <input
                      type="date"
                      value={formData.po_date}
                      onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Delivery</label>
                    <input
                      type="date"
                      value={formData.expected_delivery}
                      onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Items Section with Scroll */}
                <div style={{marginBottom: '20px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <label className="form-label">Items</label>
                    <button type="button" onClick={addItem} className="btn btn-sm btn-ghost">
                      + Add Item
                    </button>
                  </div>
                  
                  {/* Items Container with Scroll */}
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: '#ffffff',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {/* Sticky Header */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '250px 100px 80px 80px 80px 120px 100px 120px 40px',
                      gap: '12px',
                      padding: '12px 16px',
                      background: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280'
                    }}>
                      <div>Item</div>
                      <div>Quantity</div>
                      <div>Length (ft)</div>
                      <div>Width (ft)</div>
                      <div>Height (ft)</div>
                      <div>Rate</div>
                      <div>CFT/Unit</div>
                      <div>Amount</div>
                      <div></div>
                    </div>

                    {/* Item Rows */}
                    <div style={{padding: '8px 16px'}}>
                      {formData.items.map((item, index) => {
                        const dimensional = isDimensional(item.item_id);
                        const cft = dimensional ? calcCft(item) : 0;
                        
                        return (
                          <div
                            key={index}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '250px 100px 80px 80px 80px 120px 100px 120px 40px',
                              gap: '12px',
                              alignItems: 'start',
                              marginBottom: '12px',
                              padding: '12px',
                              background: '#f8faff',
                              borderRadius: '6px',
                              border: '1px solid #e0e7ff'
                            }}
                          >
                            {/* Item Select */}
                            <div className="form-group" style={{marginBottom: 0}}>
                              <select
                                value={item.item_id}
                                onChange={(e) => updateItem(index, 'item_id', e.target.value)}
                                className="form-select"
                                required
                                style={{width: '100%'}}
                              >
                                <option value="">Select Item</option>
                                {items.map(i => {
                                  const { categoryName, itemType } = getItemDetails(i.id);
                                  return (
                                    <option key={i.id} value={i.id}>
                                      {i.name} {categoryName ? `[${categoryName}]` : ''} - {itemType || 'standard'}
                                    </option>
                                  );
                                })}
                              </select>
                              {item.item_id && (
                                <div style={{fontSize: '11px', color: '#6b7280', marginTop: '4px'}}>
                                  {getItemDetails(item.item_id).categoryName}
                                </div>
                              )}
                            </div>

                            {/* Quantity */}
                            <div className="form-group" style={{marginBottom: 0}}>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateItem(index, 'qty', e.target.value.replace(/\D/g, ''))}
                                className="form-input"
                                required
                                min="0"
                                step="1"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Qty"
                              />
                            </div>

                            {/* Dimensions */}
                            <div className="form-group" style={{marginBottom: 0}}>
                              <input
                                type="number"
                                value={item.length}
                                onChange={(e) => updateItem(index, 'length', e.target.value)}
                                className="form-input"
                                required={dimensional}
                                disabled={!dimensional}
                                placeholder={dimensional ? 'L' : '--'}
                                min="0"
                                step="0.01"
                                style={{background: dimensional ? 'white' : '#f3f4f6'}}
                              />
                            </div>
                            <div className="form-group" style={{marginBottom: 0}}>
                              <input
                                type="number"
                                value={item.width}
                                onChange={(e) => updateItem(index, 'width', e.target.value)}
                                className="form-input"
                                required={dimensional}
                                disabled={!dimensional}
                                placeholder={dimensional ? 'W' : '--'}
                                min="0"
                                step="0.01"
                                style={{background: dimensional ? 'white' : '#f3f4f6'}}
                              />
                            </div>
                            <div className="form-group" style={{marginBottom: 0}}>
                              <input
                                type="number"
                                value={item.height}
                                onChange={(e) => updateItem(index, 'height', e.target.value)}
                                className="form-input"
                                required={dimensional}
                                disabled={!dimensional}
                                placeholder={dimensional ? 'H' : '--'}
                                min="0"
                                step="0.01"
                                style={{background: dimensional ? 'white' : '#f3f4f6'}}
                              />
                            </div>

                            {/* Rate */}
                            <div className="form-group" style={{marginBottom: 0}}>
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => updateItem(index, 'rate', e.target.value)}
                                className="form-input"
                                required
                                min="0"
                                step="0.01"
                                placeholder={dimensional ? 'Rate/CFT' : 'Rate'}
                              />
                            </div>

                            {/* CFT Display */}
                            <div style={{
                              textAlign: 'right',
                              fontWeight: '600',
                              color: dimensional ? '#2563eb' : '#9ca3af',
                              fontSize: '13px',
                              padding: '8px 0'
                            }}>
                              {dimensional && item.length && item.width && item.height ? (
                                <>
                                  {cft.toLocaleString(undefined, { maximumFractionDigits: 2 })} ft{'\u00B3'}
                                </>
                              ) : (
                                <span style={{color: '#9ca3af'}}>--</span>
                              )}
                            </div>

                            {/* Amount Display */}
                            <div style={{
                              textAlign: 'right',
                              fontWeight: '700',
                              color: '#10b981',
                              fontSize: '14px',
                              padding: '8px 0'
                            }}>
                              {'\u20B9'}{calcAmount(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </div>

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="btn btn-sm btn-danger"
                              disabled={formData.items.length === 1}
                              style={{
                                height: '36px',
                                width: '36px',
                                padding: '0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {'\u00D7'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Items Count */}
                  <div style={{marginTop: '8px', fontSize: '12px', color: '#6b7280'}}>
                    Total Items: {formData.items.length}
                  </div>
                </div>

                {/* Summary */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  color: 'white'
                }}>
                  <div>
                    <div style={{fontSize: '14px', opacity: '0.9', marginBottom: '4px'}}>
                      {formData.items.length} Item(s)
                    </div>
                    <div style={{fontSize: '12px', opacity: '0.8'}}>
                      Dimensional items: CFT = L {'\u00D7'} W {'\u00D7'} H
                    </div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: '14px', opacity: '0.9', marginBottom: '4px'}}>Total Amount</div>
                    <div style={{fontSize: '24px', fontWeight: '700'}}>
                      {'\u20B9'}{orderTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="form-textarea"
                    rows="3"
                    placeholder="Add any additional notes or remarks..."
                  />
                </div>
              </div>

              {/* Fixed Footer with Actions */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e5e7eb',
                background: '#f9fafb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button type="submit" className="btn btn-primary">
                  Create Purchase Order
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetails && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '1100px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
            <h2 className="modal-title" style={{padding: '20px 24px', margin: 0, borderBottom: '1px solid #e5e7eb'}}>
              Purchase Order Details
            </h2>

            <div style={{flex: 1, overflowY: 'auto', padding: '20px 24px'}}>
              {detailsLoading && <div>Loading...</div>}
              {!detailsLoading && selectedOrder && (
                <>
                  <div className="grid-2" style={{marginBottom: '20px'}}>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>PO Number</div>
                      <div style={{fontWeight: 600}}>{selectedOrder.po_number}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Status</div>
                      <div style={{fontWeight: 600}}>{selectedOrder.status}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Vendor Name</div>
                      <div style={{fontWeight: 600}}>{selectedOrder.vendor_name}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Vendor GSTIN</div>
                      <div style={{fontWeight: 600}}>{selectedOrder.vendor_gstin || '-'}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>PO Date</div>
                      <div style={{fontWeight: 600}}>{new Date(selectedOrder.po_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Expected Delivery</div>
                      <div style={{fontWeight: 600}}>
                        {selectedOrder.expected_delivery ? new Date(selectedOrder.expected_delivery).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Total Amount</div>
                      <div style={{fontWeight: 700, color: '#10b981'}}>
                        {'\u20B9'}{selectedOrder.total_amount?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Paid Amount</div>
                      <div style={{fontWeight: 700, color: '#0ea5e9'}}>
                        {'\u20B9'}{selectedOrder.paid_amount?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Payment Status</div>
                      <div style={{fontWeight: 600}}>{selectedOrder.payment_status}</div>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Created At</div>
                      <div style={{fontWeight: 600}}>{new Date(selectedOrder.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={{marginBottom: '16px'}}>
                    <div style={{fontSize: '12px', color: '#6b7280'}}>Remarks</div>
                    <div style={{fontWeight: 600}}>{selectedOrder.remarks || '-'}</div>
                  </div>

                  <div className="card" style={{padding: 0}}>
                    <div className="table-wrap">
                      <table style={{minWidth: '100%'}}>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th>Item ID</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Amount</th>
                            <th>Length</th>
                            <th>Width</th>
                            <th>Height</th>
                            <th>CFT</th>
                            <th>Received</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items?.map((it) => (
                            <tr key={it.id}>
                              <td>{getItemDetails(it.item_id).item?.name || ''}</td>
                              <td>{getItemDetails(it.item_id).categoryName || ''}</td>
                              <td>{it.item_id}</td>
                              <td>{it.qty}</td>
                              <td>{it.rate}</td>
                              <td>{it.amount}</td>
                              <td>{it.length ?? ''}</td>
                              <td>{it.width ?? ''}</td>
                              <td>{it.height ?? ''}</td>
                              <td>{it.cft ?? ''}</td>
                              <td>{it.received_qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card" style={{padding: 0, marginTop: '16px'}}>
                    <div style={{padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600}}>
                      Payments
                    </div>
                    <div className="table-wrap">
                      <table style={{minWidth: '100%'}}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Mode</th>
                            <th>Reference</th>
                            <th>Remarks</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderPayments.map(p => (
                            <tr key={p.id}>
                              <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                              <td>{p.amount}</td>
                              <td>{p.mode}</td>
                              <td>{p.reference_no || ''}</td>
                              <td>{p.remarks || ''}</td>
                              <td><button className="btn btn-danger btn-sm" onClick={() => handleDeletePayment(p.id)}>Delete</button></td>
                            </tr>
                          ))}
                          {orderPayments.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                                No payments recorded
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

      {showReceipt && (
        <div className="modal-overlay" onClick={() => setShowReceipt(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
            <h2 className="modal-title" style={{padding: '20px 24px', margin: 0, borderBottom: '1px solid #e5e7eb'}}>
              Receive Purchase Order
            </h2>

            <form onSubmit={submitReceipt} style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>
              <div style={{flex: 1, overflowY: 'auto', padding: '20px 24px'}}>
                {receiptLoading && <div>Loading...</div>}
                {!receiptLoading && (
                  <>
                    <div className="grid-2" style={{marginBottom: '16px'}}>
                      <div className="form-group">
                        <label className="form-label required">Warehouse</label>
                        <select
                          value={receiptData.warehouse_id}
                          onChange={(e) => setReceiptData({ ...receiptData, warehouse_id: e.target.value })}
                          className="form-select"
                          required
                        >
                          <option value="">Select Warehouse</option>
                          {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label required">Receipt Date</label>
                        <input
                          type="date"
                          value={receiptData.receipt_date}
                          onChange={(e) => setReceiptData({ ...receiptData, receipt_date: e.target.value })}
                          className="form-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="card" style={{padding: 0, marginBottom: '16px'}}>
                      <div className="table-wrap">
                        <table style={{minWidth: '100%'}}>
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Category</th>
                              <th>Max Qty</th>
                              <th>Receive Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receiptData.items.map((it, idx) => (
                              <tr key={`${it.item_id}-${idx}`}>
                                <td>{getItemDetails(it.item_id).item?.name || ''}</td>
                                <td>{getItemDetails(it.item_id).categoryName || ''}</td>
                                <td>{it.max_qty}</td>
                                <td style={{maxWidth: '140px'}}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    max={it.max_qty}
                                    value={it.received_qty}
                                    onChange={(e) => updateReceiptItem(idx, e.target.value)}
                                    className="form-input"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Remarks</label>
                      <textarea
                        value={receiptData.remarks}
                        onChange={(e) => setReceiptData({ ...receiptData, remarks: e.target.value })}
                        className="form-textarea"
                        rows="3"
                      />
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
                <button type="submit" className="btn btn-primary" disabled={receiptLoading}>
                  Submit Receipt
                </button>
                <button type="button" onClick={() => setShowReceipt(false)} className="btn btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceiptHistory && (
        <div className="modal-overlay" onClick={() => setShowReceiptHistory(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '1100px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
            <h2 className="modal-title" style={{padding: '20px 24px', margin: 0, borderBottom: '1px solid #e5e7eb'}}>
              Purchase Receipt History
            </h2>

            <div style={{flex: 1, overflowY: 'auto', padding: '20px 24px'}}>
              {receiptHistoryLoading && <div>Loading...</div>}
              {!receiptHistoryLoading && (
                <div className="card" style={{padding: 0}}>
                  <div className="table-wrap">
                    <table style={{minWidth: '100%'}}>
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
                        {receiptHistory.map(r => (
                          <tr key={r.id}>
                            <td>{r.purchase_order?.po_number || ''}</td>
                            <td>{r.purchase_order?.vendor_name || ''}</td>
                            <td>{warehouses.find(w => w.id === r.warehouse_id)?.name || ''}</td>
                            <td>{new Date(r.receipt_date).toLocaleDateString()}</td>
                            <td>
                              {(r.items || []).map(it => {
                                const itemName = getItemDetails(it.item_id).item?.name || '';
                                return (
                                  <div key={it.id} style={{fontSize: '12px'}}>
                                    {itemName} {itemName ? '—' : ''} {it.received_qty}
                                  </div>
                                );
                              })}
                            </td>
                            <td><button className="btn btn-danger btn-sm" onClick={() => handleDeleteReceipt(r.id)}>Delete</button></td>
                          </tr>
                        ))}
                        {receiptHistory.length === 0 && (
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
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button type="button" onClick={() => setShowReceiptHistory(false)} className="btn btn-ghost">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="card">
        <div className="table-scroll" style={{maxHeight: '500px'}}>
          <div className="table-wrap">
          <table style={{minWidth: '100%'}}>
            <thead style={{position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10}}>
              <tr>
                <th>PO Number</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedOrders.map((order) => (
                <tr key={order.id}>
                  <td style={{fontWeight: '600', color: 'var(--text)'}}>
                    {order.po_number}
                  </td>
                  <td>{order.vendor_name}</td>
                  <td>{new Date(order.po_date).toLocaleDateString()}</td>
                  <td>{order.items?.length || 0} items</td>
                  <td style={{fontWeight: '600', color: '#10b981'}}>
                    {'\u20B9'}{order.total_amount?.toLocaleString()}
                  </td>
                  <td style={{fontWeight: '600', color: '#0ea5e9'}}>
                    {'\u20B9'}{order.paid_amount?.toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${
                      order.payment_status === 'paid' ? 'badge-green' :
                      order.payment_status === 'partial' ? 'badge-blue' :
                      'badge-orange'
                    }`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      order.status === 'draft' ? 'badge-orange' :
                      order.status === 'approved' ? 'badge-blue' :
                      order.status === 'received' ? 'badge-green' :
                      'badge-gray'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => openDetails(order.id)}
                      className="btn btn-sm btn-ghost"
                      style={{marginRight: '8px'}}
                    >
                      View
                    </button>
                    {(order.status === 'approved' || order.status === 'sent') && (
                      <button
                        onClick={() => openReceipt(order.id)}
                        className="btn btn-sm btn-ghost"
                        style={{marginRight: '8px'}}
                      >
                        Receive
                      </button>
                    )}
                    {order.status === 'draft' && (
                      <button
                        onClick={() => handleApprove(order.id)}
                        className="btn btn-sm btn-primary"
                        style={{ marginRight: '8px' }}
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
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
      </div>

      {showVendorModal && (
        <div className="modal-overlay" onClick={() => setShowVendorModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div className="modal-title">Create Vendor</div>
            <form onSubmit={submitVendor}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label required">Vendor Name</label>
                  <input
                    className="form-input"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input
                    className="form-input"
                    value={vendorForm.gstin}
                    onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN</label>
                  <input
                    className="form-input"
                    value={vendorForm.pan}
                    onChange={(e) => setVendorForm({ ...vendorForm, pan: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    className="form-input"
                    value={vendorForm.state}
                    onChange={(e) => setVendorForm({ ...vendorForm, state: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State Code</label>
                  <input
                    className="form-input"
                    value={vendorForm.state_code}
                    onChange={(e) => setVendorForm({ ...vendorForm, state_code: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowVendorModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={vendorSaving}>
                  {vendorSaving ? 'Saving...' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
