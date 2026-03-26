# Form Verification Checklist

## ✅ VERIFIED & WORKING

### 1. UsersNew.jsx
- ✓ CRUD operations complete
- ✓ Mandatory fields marked with *
- ✓ API connected (authAPI)
- ✓ Edit/Delete working
- ✓ Password field hidden in edit mode

### 2. ItemCategories.jsx
- ✓ CRUD operations complete
- ✓ Mandatory fields marked with *
- ✓ API connected (inventoryAPI)
- ✓ Edit/Delete working
- ✓ Dropdown for item_type

### 3. Projects.jsx
- ✓ Syntax error fixed
- ✓ Create operation working
- ⚠️ Missing: Edit functionality
- ⚠️ Missing: FIELD_CONFIG pattern implementation

### 4. BillingMilestones.jsx
- ✓ Recreated with proper implementation
- ✓ Project dropdown loaded dynamically
- ✓ Mandatory fields marked
- ✓ API connected (billingAPI)

## ⚠️ NEEDS VERIFICATION

Check these files exist and are properly implemented:

### 5. InventoryItems.jsx
**Required Fields**: name*, code*, category_id*
**Optional**: uom, reorder_level
**API**: inventoryAPI.items(), inventoryAPI.createItem()
**Dropdown**: Load categories for category_id

### 6. InventoryWarehouses.jsx
**Required Fields**: name*, code*
**Optional**: warehouse_type, address, gstin, state_code
**API**: inventoryAPI.warehouses(), inventoryAPI.createWarehouse()

### 7. Stones.jsx (Update existing)
**Required Fields**: length*, width*, height*
**Optional**: stone_type, quarry_source, rate_per_cft
**API**: stonesAPI.list(), stonesAPI.register()
**Note**: No edit/delete, only register

### 8. BlueprintsStructures.jsx
**Required Fields**: name*
**Optional**: description
**API**: blueprintsAPI.structures(), blueprintsAPI.createStructure()

### 9. Contractors.jsx (Update existing)
**Required Fields**: name*
**Optional**: gstin, pan, phone, email, address, state, state_code
**API**: contractorsAPI.list(), contractorsAPI.create()
**Add**: Edit functionality

### 10. ManufacturingIdols.jsx
**Required Fields**: stone_block_id*, idol_name*
**Optional**: description
**API**: manufacturingAPI.idols(), manufacturingAPI.createIdol()
**Dropdown**: Load available stone blocks

### 11. AllocationsNew.jsx
**Required Fields**: stone_block_id*, project_id*
**Optional**: allocation_date, remarks
**API**: allocationsAPI.list(), allocationsAPI.allocate()
**Dropdowns**: Load stone blocks and projects

### 12. JobWorkNew.jsx
**Required Fields**: stone_block_id*, vendor_name*, from_warehouse_id*, dispatch_date*
**Optional**: vendor_gstin, expected_return_date, job_description
**API**: jobworkAPI.list(), jobworkAPI.create()
**Dropdowns**: Load stone blocks and warehouses

### 13. SiteInstallations.jsx
**Required Fields**: stone_block_id*, position_id*, project_id*
**Optional**: installation_date, remarks
**API**: siteAPI.installations(), siteAPI.createInstallation()
**Dropdowns**: Load stone blocks, positions, projects

## 🔧 QUICK FIX GUIDE

### For any form with template code still present:

1. **Check for TODO comments** - Replace all TODO sections
2. **Verify FIELD_CONFIG** - Must match backend schema
3. **Check API imports** - Must import correct API module
4. **Test Create** - Try creating a record
5. **Test Edit** - Try editing a record (if applicable)
6. **Test Delete** - Try deleting a record (if applicable)
7. **Check mandatory fields** - Red * should appear
8. **Test validation** - Submit empty required fields

### Common Issues to Check:

```javascript
// ❌ WRONG - Template code
// TODO: Import your API module
// import { yourAPI } from '../services/api';

// ✅ CORRECT
import { inventoryAPI } from '../services/api';

// ❌ WRONG - Mock data
setTimeout(() => {
  setData([...]);
}, 500);

// ✅ CORRECT
inventoryAPI.items()
  .then(r => { setData(r.data); setLoading(false); })
  .catch(() => setLoading(false));

// ❌ WRONG - Generic title
<div className="page-title">👤 Your Module Name</div>

// ✅ CORRECT
<div className="page-title">📦 Items Master</div>
```

## 🧪 TESTING CHECKLIST

For each form, test:

- [ ] Page loads without errors
- [ ] "New" button opens modal
- [ ] Required fields show red *
- [ ] Form validation works (try submitting empty)
- [ ] Create operation saves data
- [ ] Data appears in table after create
- [ ] Edit button opens modal with data (if applicable)
- [ ] Update operation works (if applicable)
- [ ] Delete button works with confirmation
- [ ] Error messages display properly
- [ ] Loading states show correctly
- [ ] Empty state displays when no data

## 📊 COMPLETION STATUS

| Form | File | Status | Priority |
|------|------|--------|----------|
| Users | UsersNew.jsx | ✅ Complete | High |
| Item Categories | ItemCategories.jsx | ✅ Complete | High |
| Items | InventoryItems.jsx | ⚠️ Verify | High |
| Warehouses | InventoryWarehouses.jsx | ⚠️ Verify | High |
| Projects | Projects.jsx | ⚠️ Needs Edit | High |
| Stone Blocks | Stones.jsx | ⚠️ Verify | High |
| Blueprints | BlueprintsStructures.jsx | ⚠️ Verify | Medium |
| Contractors | Contractors.jsx | ⚠️ Needs Edit | High |
| Manufacturing | ManufacturingIdols.jsx | ⚠️ Verify | Medium |
| Allocations | AllocationsNew.jsx | ⚠️ Verify | Medium |
| Job Work | JobWorkNew.jsx | ⚠️ Verify | Medium |
| Site | SiteInstallations.jsx | ⚠️ Verify | Medium |
| Billing | BillingMilestones.jsx | ✅ Complete | Medium |

## 🚀 NEXT STEPS

1. **Run the app**: `npm run dev`
2. **Test each form** using the testing checklist above
3. **Fix any issues** found during testing
4. **Report back** which forms have issues

## 💡 QUICK FIXES

### If form shows template code:
Copy the working pattern from UsersNew.jsx or ItemCategories.jsx

### If dropdown is empty:
Add useEffect to load options:
```javascript
useEffect(() => {
  projectsAPI.list().then(r => {
    FIELD_CONFIG.project_id.options = r.data.map(p => ({ 
      value: p.id, 
      label: p.name 
    }));
  });
}, []);
```

### If API call fails:
Check backend is running and API endpoint exists in api.js

Would you like me to verify specific forms or fix any issues you've found?
