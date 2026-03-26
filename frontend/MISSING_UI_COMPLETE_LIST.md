# Complete Missing UI Functions List

## ✅ COMPLETED MODULES
1. **Users** - UsersNew.jsx (Full CRUD)
2. **Inventory** - Inventory.jsx (Full CRUD for Items/Categories/Warehouses)
3. **ItemCategories** - ItemCategories.jsx (Full CRUD)
4. **Contractors** - Contractors.jsx (Edit/Delete contractors, Create invoices)

## 🔴 CRITICAL MISSING - IMPLEMENT FIRST

### 1. Projects.jsx - Add Edit/Delete
```jsx
// Add to existing Projects.jsx:
const openEdit = (p) => { setForm(p); setEditMode(true); setEditId(p.id); setShowModal(true); };
// In handleCreate: if (editMode) await projectsAPI.update(editId, payload); else await projectsAPI.create(payload);
// Add Edit button: <button onClick={() => openEdit(p)}>Edit</button>
```

### 2. Stones.jsx - Add Edit/Delete
```jsx
// Add: const openEdit = (s) => { setForm(s); setEditMode(true); setEditId(s.id); setShowModal('edit'); };
// Add: const handleDelete = async (id) => { if (confirm('Delete?')) { await stonesAPI.delete(id); load(); } };
// Add Edit/Delete buttons in table
```

### 3. Manufacturing.jsx - Add Edit/Delete Idols
```jsx
// Add edit/delete for idols similar to Contractors pattern
```

### 4. Site.jsx - Add Edit/Delete/Verify
```jsx
// Add edit/delete for dispatches and installations
// Add verify button: <button onClick={() => siteAPI.verifyInstallation(id)}>Verify</button>
```

### 5. JobWork.jsx - Add Edit/Delete/Return
```jsx
// Add edit/delete for challans
// Add return processing modal
```

## 🟡 MEDIUM PRIORITY

### 6. Billing.jsx - Add Edit/Delete/Payment
```jsx
// Add edit/delete for milestones and invoices
// Add payment recording modal
```

### 7. Allocations.jsx - Add Transfer
```jsx
// Add transfer modal with project selection
```

### 8. Blueprints.jsx - Add Full CRUD
```jsx
// Add tabs for Structures/Layers/Positions/Dependencies
// Add CRUD for each entity type
```

## 🟢 LOW PRIORITY

### 9. GSTFinance.jsx - Add All UI
```jsx
// Add GST calculator
// Add GSTR-1 export
// Add project costs display
// Add margin report
```

### 10. Contractors.jsx - Add Agreements Tab
```jsx
// Add third tab for agreements
// Add CRUD for agreements
// Add payment recording for invoices
```

## IMPLEMENTATION PATTERN (Copy-Paste Template)

```jsx
// 1. Add state
const [editMode, setEditMode] = useState(false);
const [editId, setEditId] = useState(null);

// 2. Add handlers
const openEdit = (record) => { setForm(record); setEditMode(true); setEditId(record.id); setShowModal(true); };
const handleDelete = async (id) => { if (!confirm('Delete?')) return; await API.delete(id); load(); };

// 3. Update save handler
const handleSave = async (e) => {
  e.preventDefault();
  if (editMode) await API.update(editId, form);
  else await API.create(form);
  setShowModal(false); setEditMode(false); setEditId(null); load();
};

// 4. Add buttons
<button onClick={() => openEdit(record)}>Edit</button>
<button onClick={() => handleDelete(record.id)}>Delete</button>

// 5. Update modal title
{editMode ? '✏️ Edit' : '➕ New'}
```

## QUICK WINS (5 min each)

1. **Projects** - Just add Edit button + editMode logic
2. **Stones** - Just add Edit/Delete buttons
3. **Manufacturing** - Just add Edit/Delete buttons
4. **Allocations** - Just add Transfer button + modal
5. **JobWork** - Just add Edit/Delete buttons

## ESTIMATED TIME
- Critical (5 pages): 2 hours
- Medium (3 pages): 1.5 hours  
- Low (2 pages): 1 hour
- **Total: 4.5 hours**
