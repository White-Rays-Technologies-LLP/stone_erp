import { useState, useEffect } from 'react';
import { inventoryAPI, stonesAPI } from '../services/api';
import Stones from './Stones';

export default function Inventory() {
  const [tab, setTab] = useState('items');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [balance, setBalance] = useState([]);
  const [serials, setSerials] = useState([]);
  const [scrap, setScrap] = useState([]);
  const [stoneCount, setStoneCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState({ items: '', categories: '', warehouses: '', balance: '', serials: '', scrap: '' });
  const [page, setPage] = useState({ items: 1, categories: 1, warehouses: 1, balance: 1, serials: 1, scrap: 1 });
  const [pageSize, setPageSize] = useState({ items: 25, categories: 25, warehouses: 25, balance: 25, serials: 25, scrap: 25 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.allSettled([inventoryAPI.items(), inventoryAPI.categories(), inventoryAPI.warehouses(), inventoryAPI.stockBalance(), inventoryAPI.serials(), inventoryAPI.scrap(), stonesAPI.list()])
      .then(([i, c, w, b, s, sc, st]) => {
        setItems(i.value?.data || []);
        setCategories(c.value?.data || []);
        setWarehouses(w.value?.data || []);
        setBalance(b.value?.data || []);
        setSerials(s.value?.data || []);
        setScrap(sc.value?.data || []);
        setStoneCount((st.value?.data || []).length);
        setLoading(false);
      });
  };
  useEffect(load, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (showModal === 'item') {
        if (editMode) await inventoryAPI.updateItem(editId, form);
        else await inventoryAPI.createItem(form);
      } else if (showModal === 'category') {
        if (editMode) await inventoryAPI.updateCategory(editId, form);
        else await inventoryAPI.createCategory(form);
      } else if (showModal === 'warehouse') {
        if (editMode) await inventoryAPI.updateWarehouse(editId, form);
        else await inventoryAPI.createWarehouse(form);
      } else if (showModal === 'movement') {
        await inventoryAPI.stockMovement(form);
      }
      setShowModal(null); setEditMode(false); setEditId(null); load();
    } catch (e) { setError(e.response?.data?.detail || 'Operation failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      if (type === 'item') await inventoryAPI.deleteItem(id);
      else if (type === 'category') await inventoryAPI.deleteCategory(id);
      else if (type === 'warehouse') await inventoryAPI.deleteWarehouse(id);
      load();
    } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const handleDeleteSerial = async (serialId) => {
    if (!window.confirm('Delete this serial?')) return;
    try {
      await inventoryAPI.deleteSerial(serialId);
      load();
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.detail || 'Error'));
    }
  };

  const handleDeleteBalance = async (itemId, warehouseId) => {
    if (!window.confirm('Delete stock balance for this item and warehouse? This will remove ledger entries.')) return;
    try {
      await inventoryAPI.deleteStockBalance(itemId, warehouseId);
      load();
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.detail || 'Error'));
    }
  };

  const openEdit = (type, record) => { setForm(record); setEditMode(true); setEditId(record.id); setError(null); setShowModal(type); };
  const openCreate = (type) => { setForm({}); setEditMode(false); setEditId(null); setError(null); setShowModal(type); };

  const tabs = [
    { key: 'items', label: 'Items', emoji: '📦', count: items.length },
    { key: 'categories', label: 'Categories', emoji: '🗂️', count: categories.length },
    { key: 'warehouses', label: 'Warehouses', emoji: '🏢', count: warehouses.length },
    { key: 'balance', label: 'Stock Balance', emoji: '📊', count: balance.length },
    { key: 'serials', label: 'Serials', emoji: '🏷️', count: serials.length },
    { key: 'stones', label: 'Stone Blocks', emoji: '🪨', count: stoneCount },
    { key: 'scrap', label: 'Scrap Inventory', emoji: '🔩', count: scrap.length },
  ];

  const getPaged = (list, key) => {
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize[key]));
    const safePage = Math.min(page[key], totalPages);
    const startIndex = (safePage - 1) * pageSize[key];
    const paged = list.slice(startIndex, startIndex + pageSize[key]);
    return { paged, totalPages, safePage };
  };

  const renderPagination = (key, totalPages, safePage) => (
    <div className="report-pagination" style={{ marginTop: '12px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => ({ ...p, [key]: 1 }))} disabled={safePage === 1}>First</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => ({ ...p, [key]: Math.max(1, p[key] - 1) }))} disabled={safePage === 1}>Prev</button>
      <span className="report-page-meta">Page {safePage} of {totalPages}</span>
      <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => ({ ...p, [key]: Math.min(totalPages, p[key] + 1) }))} disabled={safePage === totalPages}>Next</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => ({ ...p, [key]: totalPages }))} disabled={safePage === totalPages}>Last</button>
      <select
        className="form-select"
        value={pageSize[key]}
        onChange={(e) => setPageSize(s => ({ ...s, [key]: Number(e.target.value) }))}
        style={{ width: '110px' }}
      >
        {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size} / page</option>)}
      </select>
    </div>
  );

  const filteredItems = items.filter(i => {
    const q = search.items.trim().toLowerCase();
    if (!q) return true;
    const catName = categories.find(c => c.id === i.category_id)?.name || '';
    return (
      String(i.name || '').toLowerCase().includes(q) ||
      String(i.code || '').toLowerCase().includes(q) ||
      String(catName || '').toLowerCase().includes(q) ||
      String(i.uom || '').toLowerCase().includes(q)
    );
  });

  const filteredCategories = categories.filter(c => {
    const q = search.categories.trim().toLowerCase();
    if (!q) return true;
    return (
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.item_type || '').toLowerCase().includes(q) ||
      String(c.description || '').toLowerCase().includes(q)
    );
  });

  const filteredWarehouses = warehouses.filter(w => {
    const q = search.warehouses.trim().toLowerCase();
    if (!q) return true;
    return (
      String(w.name || '').toLowerCase().includes(q) ||
      String(w.code || '').toLowerCase().includes(q) ||
      String(w.warehouse_type || '').toLowerCase().includes(q) ||
      String(w.address || '').toLowerCase().includes(q) ||
      String(w.state_code || '').toLowerCase().includes(q)
    );
  });

  const filteredBalance = balance.filter(b => {
    const q = search.balance.trim().toLowerCase();
    if (!q) return true;
    const itemName = items.find(i => i.id === b.item_id)?.name || b.item_id;
    const whName = warehouses.find(w => w.id === b.warehouse_id)?.name || b.warehouse_id;
    return (
      String(itemName || '').toLowerCase().includes(q) ||
      String(whName || '').toLowerCase().includes(q)
    );
  });

  const filteredSerials = serials.filter(s => {
    const q = search.serials.trim().toLowerCase();
    if (!q) return true;
    const itemName = items.find(i => i.id === s.item_id)?.name || s.item_id;
    const whName = warehouses.find(w => w.id === s.warehouse_id)?.name || s.warehouse_id;
    return (
      String(s.serial_no || '').toLowerCase().includes(q) ||
      String(itemName || '').toLowerCase().includes(q) ||
      String(whName || '').toLowerCase().includes(q) ||
      String(s.status || '').toLowerCase().includes(q)
    );
  });

  const filteredScrap = scrap.filter(sc => {
    const q = search.scrap.trim().toLowerCase();
    if (!q) return true;
    const itemName = items.find(i => i.id === sc.item_id)?.name || '';
    const whName = warehouses.find(w => w.id === sc.warehouse_id)?.name || '';
    return (
      String(itemName || '').toLowerCase().includes(q) ||
      String(whName || '').toLowerCase().includes(q) ||
      String(sc.reason || '').toLowerCase().includes(q) ||
      String(sc.source_type || '').toLowerCase().includes(q)
    );
  });

  const itemsPage = getPaged(filteredItems, 'items');
  const categoriesPage = getPaged(filteredCategories, 'categories');
  const warehousesPage = getPaged(filteredWarehouses, 'warehouses');
  const balancePage = getPaged(filteredBalance, 'balance');
  const serialsPage = getPaged(filteredSerials, 'serials');
  const scrapPage = getPaged(filteredScrap, 'scrap');

  useEffect(() => { setPage(p => ({ ...p, items: 1 })); }, [search.items, pageSize.items]);
  useEffect(() => { setPage(p => ({ ...p, categories: 1 })); }, [search.categories, pageSize.categories]);
  useEffect(() => { setPage(p => ({ ...p, warehouses: 1 })); }, [search.warehouses, pageSize.warehouses]);
  useEffect(() => { setPage(p => ({ ...p, balance: 1 })); }, [search.balance, pageSize.balance]);
  useEffect(() => { setPage(p => ({ ...p, serials: 1 })); }, [search.serials, pageSize.serials]);
  useEffect(() => { setPage(p => ({ ...p, scrap: 1 })); }, [search.scrap, pageSize.scrap]);


  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">📦 Inventory Management</div><div className="page-subtitle">Items, warehouses and stock movements</div></div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => openCreate('movement')}>Record Movement</button>
          <button className="btn btn-primary" onClick={() => openCreate(tab === 'categories' ? 'category' : tab === 'warehouses' ? 'warehouse' : 'item')}>
            + Add {tab === 'categories' ? 'Category' : tab === 'warehouses' ? 'Warehouse' : 'Item'}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="btn" style={{ background: tab === t.key ? '#1e40af' : '#fff', color: tab === t.key ? '#fff' : '#64748b', border: '1px solid #dce8f5' }}>
            {t.emoji} {t.label} <span style={{ opacity: .7, fontSize: '11px' }}>({t.count})</span>
          </button>
        ))}
      </div>
      <div className="card">
        {loading ? <div className="loading">Loading...</div> : (
          <>
            {tab === 'items' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search items, code, category..."
                    value={search.items}
                    onChange={(e) => setSearch(s => ({ ...s, items: e.target.value }))}
                    style={{ width: '260px' }}
                  />
                </div>
                <div className="table-scroll" style={{ maxHeight: '500px' }}>
                  <div className="table-wrap"><table>
                    <thead><tr><th>Item Name</th><th>Code</th><th>Category</th><th>UOM</th><th>Valuation</th><th>Actions</th></tr></thead>
                    <tbody>
                      {itemsPage.paged.map(i => (<tr key={i.id}>
                        <td><strong>{i.name}</strong></td>
                        <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{i.code}</code></td>
                        <td>{categories.find(c => c.id === i.category_id)?.name || i.category_id}</td>
                        <td>{i.uom}</td>
                        <td><span className="badge badge-blue">{i.valuation_method}</span></td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit('item', i)} style={{ marginRight: '4px' }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete('item', i.id)}>Delete</button>
                        </td>
                      </tr>))}
                      {filteredItems.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No items found</td></tr>}
                    </tbody>
                  </table></div>
                </div>
                {renderPagination('items', itemsPage.totalPages, itemsPage.safePage)}
              </>
            )}
            {tab === 'categories' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search categories, type..."
                    value={search.categories}
                    onChange={(e) => setSearch(s => ({ ...s, categories: e.target.value }))}
                    style={{ width: '260px' }}
                  />
                </div>
                <div className="table-scroll" style={{ maxHeight: '500px' }}>
                  <div className="table-wrap"><table>
                    <thead><tr><th>Category Name</th><th>Item Type</th><th>Description</th><th>Actions</th></tr></thead>
                    <tbody>
                      {categoriesPage.paged.map(c => (<tr key={c.id}>
                        <td><strong>{c.name}</strong></td>
                        <td><span className="badge badge-purple">{c.item_type}</span></td>
                        <td>{c.description || '?'}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit('category', c)} style={{ marginRight: '4px' }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete('category', c.id)}>Delete</button>
                        </td>
                      </tr>))}
                      {filteredCategories.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No categories found</td></tr>}
                    </tbody>
                  </table></div>
                </div>
                {renderPagination('categories', categoriesPage.totalPages, categoriesPage.safePage)}
              </>
            )}
{tab === 'warehouses' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search warehouses, code, state..."
                    value={search.warehouses}
                    onChange={(e) => setSearch(s => ({ ...s, warehouses: e.target.value }))}
                    style={{ width: '260px' }}
                  />
                </div>
                <div className="table-scroll" style={{ maxHeight: '500px' }}>
                  <div className="table-wrap"><table>
                    <thead><tr><th>Warehouse</th><th>Code</th><th>Type</th><th>Address</th><th>State Code</th><th>Actions</th></tr></thead>
                    <tbody>
                      {warehousesPage.paged.map(w => (<tr key={w.id}>
                        <td><strong>{w.name}</strong></td>
                        <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{w.code}</code></td>
                        <td><span className="badge badge-orange">{w.warehouse_type}</span></td>
                        <td>{w.address || '?'}</td>
                        <td>{w.state_code || '?'}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit('warehouse', w)} style={{ marginRight: '4px' }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete('warehouse', w.id)}>Delete</button>
                        </td>
                      </tr>))}
                      {filteredWarehouses.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No warehouses found</td></tr>}
                    </tbody>
                  </table></div>
                </div>
                {renderPagination('warehouses', warehousesPage.totalPages, warehousesPage.safePage)}
              </>
            )}
{tab === 'balance' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search item or warehouse..."
                    value={search.balance}
                    onChange={(e) => setSearch(s => ({ ...s, balance: e.target.value }))}
                    style={{ width: '260px' }}
                  />
                </div>
                <div className="table-scroll" style={{ maxHeight: '500px' }}>
                  <div className="table-wrap"><table>
                    <thead><tr><th>Item</th><th>Warehouse</th><th>Total In Stock</th><th>Reserved for Project</th><th>Available to Use</th><th>Actions</th></tr></thead>
                    <tbody>
                      {balancePage.paged.map((b, idx) => {
                        const itemName = items.find(i => i.id === b.item_id)?.name || b.item_id;
                        const whName = warehouses.find(w => w.id === b.warehouse_id)?.name || b.warehouse_id;
                        const qty = b.balance_qty ?? b.quantity ?? 0;
                        const reserved = b.reserved_qty ?? 0;
                        const available = b.available_qty ?? (qty - reserved);
                        return (
                          <tr key={idx}>
                            <td><strong>{itemName}</strong></td>
                            <td>{whName}</td>
                            <td style={{ fontWeight: 600 }}>{qty}</td>
                            <td>{reserved}</td>
                            <td><span style={{ color: available <= 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>{available}</span></td>
                            <td>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBalance(b.item_id, b.warehouse_id)}>Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredBalance.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No stock balance data</td></tr>}
                    </tbody>
                  </table></div>
                </div>
                {renderPagination('balance', balancePage.totalPages, balancePage.safePage)}
              </>
            )}
{tab === 'serials' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search serial, item, warehouse..."
                    value={search.serials}
                    onChange={(e) => setSearch(s => ({ ...s, serials: e.target.value }))}
                    style={{ width: '260px' }}
                  />
                </div>
                <div className="table-scroll" style={{ maxHeight: '500px' }}>
                  <div className="table-wrap"><table>
                    <thead><tr><th>Serial No</th><th>Item</th><th>Warehouse</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {serialsPage.paged.map((s) => {
                        const itemName = items.find(i => i.id === s.item_id)?.name || s.item_id;
                        const whName = warehouses.find(w => w.id === s.warehouse_id)?.name || s.warehouse_id;
                        return (
                          <tr key={s.id}>
                            <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{s.serial_no}</code></td>
                            <td>{itemName}</td>
                            <td>{whName}</td>
                            <td>
                              <span className={`badge badge-${s.status === 'available' ? 'green' : s.status === 'allocated' ? 'blue' : s.status === 'issued' ? 'orange' : s.status === 'returned' ? 'purple' : 'gray'}`}>
                                {s.status}
                              </span>
                            </td>
                            <td><button className="btn btn-danger btn-sm" onClick={() => handleDeleteSerial(s.id)}>Delete</button></td>
                          </tr>
                        );
                      })}
                      {filteredSerials.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No serials</td></tr>}
                    </tbody>
                  </table></div>
                </div>
                {renderPagination('serials', serialsPage.totalPages, serialsPage.safePage)}
              </>
            )}
            {tab === 'stones' && (
              <div>
                <Stones embedded />
              </div>
            )}
            {tab === 'scrap' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search scrap..."
                    value={search.scrap}
                    onChange={(e) => setSearch(s => ({ ...s, scrap: e.target.value }))}
                    style={{ width: '260px' }}
                  />
                </div>
                <div className="table-scroll" style={{ maxHeight: '500px' }}>
                  <div className="table-wrap"><table>
                    <thead><tr><th>Date</th><th>Item</th><th>Stone Block</th><th>Warehouse</th><th>Qty</th><th>Reason</th><th>Source</th></tr></thead>
                    <tbody>
                      {scrapPage.paged.map(sc => (
                        <tr key={sc.id}>
                          <td>{sc.created_at ? new Date(sc.created_at).toLocaleDateString() : ''}</td>
                          <td>{items.find(i => i.id === sc.item_id)?.name || ''}</td>
                          <td>{sc.stone_block_id || ''}</td>
                          <td>{warehouses.find(w => w.id === sc.warehouse_id)?.name || ''}</td>
                          <td>{sc.qty}</td>
                          <td>{sc.reason}</td>
                          <td>{sc.source_type || ''}</td>
                        </tr>
                      ))}
                      {filteredScrap.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No scrap records</td></tr>}
                    </tbody>
                  </table></div>
                </div>
                {renderPagination('scrap', scrapPage.totalPages, scrapPage.safePage)}
              </>
            )}


          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {showModal === 'item' ? (editMode ? '✏️ Edit Item' : '📦 Add Item') : 
               showModal === 'category' ? (editMode ? '✏️ Edit Category' : '🗂️ Add Category') : 
               showModal === 'warehouse' ? (editMode ? '✏️ Edit Warehouse' : '🏢 Add Warehouse') : '📋 Record Stock Movement'}
            </div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <form onSubmit={handleSave}>
              {showModal === 'item' && (<>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name || ''} required onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Code *</label><input className="form-input" value={form.code || ''} required placeholder="e.g. ITM-001" onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Category *</label>
                    <select className="form-select" value={form.category_id || ''} required onChange={e => setForm(p => ({ ...p, category_id: Number(e.target.value) }))}>
                      <option value="">Select...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Unit (UOM) *</label>
                    <select className="form-select" value={form.uom || ''} required onChange={e => setForm(p => ({ ...p, uom: e.target.value }))}>
                      <option value="">Select...</option>
                      {['pcs','kg','ton','cft','sqft','litre','set','nos'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Has Serial No</label>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={!!form.has_serial_no}
                        onChange={e => setForm(p => ({ ...p, has_serial_no: e.target.checked }))}
                      />
                      <span>Yes</span>
                    </label>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Valuation Method</label>
                    <select className="form-select" value={form.valuation_method || 'weighted_avg'} onChange={e => setForm(p => ({ ...p, valuation_method: e.target.value }))}>
                      <option value="weighted_avg">Weighted Average</option>
                      <option value="fifo">FIFO</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Reorder Level</label><input className="form-input" type="number" step="0.01" value={form.reorder_level ?? 0} onChange={e => setForm(p => ({ ...p, reorder_level: Number(e.target.value) }))} /></div>
                </div>
              </>)}
              {showModal === 'category' && (<>
                <div className="form-group"><label className="form-label">Category Name *</label><input className="form-input" value={form.name || ''} required onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Item Type *</label>
                  <select className="form-select" value={form.item_type || ''} required onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))}>
                    <option value="">Select...</option>
                    {['serialized','batch','dimensional','standard'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">HSN Code</label><input className="form-input" value={form.hsn_code || ''} onChange={e => setForm(p => ({ ...p, hsn_code: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">GST Rate %</label><input className="form-input" type="number" value={form.gst_rate ?? 18} onChange={e => setForm(p => ({ ...p, gst_rate: Number(e.target.value) }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              </>)}
              {showModal === 'warehouse' && (<>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Warehouse Name *</label><input className="form-input" value={form.name || ''} required onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Code *</label><input className="form-input" value={form.code || ''} required placeholder="e.g. WH-01" onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Type *</label>
                  <select className="form-select" value={form.warehouse_type || ''} required onChange={e => setForm(p => ({ ...p, warehouse_type: e.target.value }))}>
                    <option value="">Select...</option>
                    {['main','site','job_work','transit'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">State Code</label><input className="form-input" value={form.state_code || ''} onChange={e => setForm(p => ({ ...p, state_code: e.target.value }))} /></div>
                </div>
              </>)}
              {showModal === 'movement' && (<>
                <div className="form-group"><label className="form-label">Item *</label>
                  <select className="form-select" required onChange={e => setForm(p => ({ ...p, item_id: Number(e.target.value) }))}>
                    <option value="">Select...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Warehouse *</label>
                  <select className="form-select" required onChange={e => setForm(p => ({ ...p, warehouse_id: Number(e.target.value) }))}>
                    <option value="">Select...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Movement Type *</label>
                    <select className="form-select" required onChange={e => setForm(p => ({ ...p, movement_type: e.target.value }))}>
                      <option value="">Select...</option>
                      {['inward','outward','transfer'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Quantity *</label><input className="form-input" type="number" step="0.01" required onChange={e => setForm(p => ({ ...p, qty: Number(e.target.value) }))} /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Rate</label><input className="form-input" type="number" step="0.01" onChange={e => setForm(p => ({ ...p, rate: Number(e.target.value) }))} /></div>
                  <div className="form-group"><label className="form-label">Remarks</label><input className="form-input" onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} /></div>
                </div>
              </>)}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
