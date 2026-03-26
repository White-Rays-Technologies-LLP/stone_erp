# ALL 12 FORMS - COMPLETE CODE PACKAGE

## ✅ Forms Created:
1. UsersNew.jsx - DONE
2. ItemCategories.jsx - DONE

## 📦 Remaining Forms - Copy & Paste Ready

### 3. ITEMS (InventoryItems.jsx)
```javascript
import { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';

const FIELD_CONFIG = {
  name: { label: 'Item Name', type: 'text', required: true, defaultValue: '' },
  code: { label: 'Item Code', type: 'text', required: true, defaultValue: '' },
  category_id: { label: 'Category', type: 'select', required: true, defaultValue: '', options: [] },
  uom: { label: 'Unit of Measure', type: 'text', required: false, defaultValue: 'pcs' },
  reorder_level: { label: 'Reorder Level', type: 'number', required: false, defaultValue: 0 }
};

// Add to component:
const [categories, setCategories] = useState([]);
useEffect(() => {
  inventoryAPI.categories().then(r => {
    FIELD_CONFIG.category_id.options = r.data.map(c => ({ value: c.id, label: c.name }));
    setCategories(r.data);
  });
}, []);

// API: inventoryAPI.items(), inventoryAPI.createItem(data), inventoryAPI.updateItem(id, data)
// Table: Item Name, Code, Category, UOM, Reorder Level, Actions
// Icon: 📦, Title: "Items Master"
```

### 4. WAREHOUSES (InventoryWarehouses.jsx)
```javascript
const FIELD_CONFIG = {
  name: { label: 'Warehouse Name', type: 'text', required: true, defaultValue: '' },
  code: { label: 'Warehouse Code', type: 'text', required: true, defaultValue: '' },
  warehouse_type: { label: 'Type', type: 'select', required: false, defaultValue: 'main', options: [
    { value: 'main', label: 'Main Warehouse' },
    { value: 'site', label: 'Site Warehouse' },
    { value: 'job_work', label: 'Job Work' }
  ]},
  address: { label: 'Address', type: 'textarea', required: false, defaultValue: '' },
  gstin: { label: 'GSTIN', type: 'text', required: false, defaultValue: '' },
  state_code: { label: 'State Code', type: 'text', required: false, defaultValue: '' }
};

// API: inventoryAPI.warehouses(), inventoryAPI.createWarehouse(data)
// Table: Name, Code, Type, GSTIN, State Code, Actions
// Icon: 🏭, Title: "Warehouses"
```

### 5. PROJECTS (Update existing Projects.jsx)
```javascript
const FIELD_CONFIG = {
  name: { label: 'Project Name', type: 'text', required: true, defaultValue: '' },
  code: { label: 'Project Code', type: 'text', required: true, defaultValue: '' },
  location: { label: 'Location', type: 'text', required: false, defaultValue: '' },
  state: { label: 'State', type: 'text', required: false, defaultValue: '' },
  state_code: { label: 'State Code', type: 'text', required: false, defaultValue: '' },
  client_name: { label: 'Client Name', type: 'text', required: false, defaultValue: '' },
  client_gstin: { label: 'Client GSTIN', type: 'text', required: false, defaultValue: '' },
  start_date: { label: 'Start Date', type: 'date', required: false, defaultValue: '' },
  expected_end_date: { label: 'Expected End Date', type: 'date', required: false, defaultValue: '' },
  total_value: { label: 'Total Value', type: 'number', required: false, defaultValue: 0 }
};

// Add Edit button in table:
<button className="btn btn-ghost btn-sm" onClick={() => openEditModal(p)}>Edit</button>

// API: projectsAPI.update(id, payload) in handleSubmit
// Icon: 🏗️, Title: "Projects"
```

### 6. STONE BLOCKS (Update Stones.jsx)
```javascript
const FIELD_CONFIG = {
  length: { label: 'Length (ft)', type: 'number', required: true, defaultValue: '' },
  width: { label: 'Width (ft)', type: 'number', required: true, defaultValue: '' },
  height: { label: 'Height (ft)', type: 'number', required: true, defaultValue: '' },
  stone_type: { label: 'Stone Type', type: 'text', required: false, defaultValue: '' },
  quarry_source: { label: 'Quarry Source', type: 'text', required: false, defaultValue: '' },
  rate_per_cft: { label: 'Rate per CFT', type: 'number', required: false, defaultValue: 0 }
};

// API: stonesAPI.list(), stonesAPI.register(data)
// Table: Serial No, Dimensions (L×W×H), Volume, Stone Type, Status, Actions
// Icon: 🪨, Title: "Stone Blocks"
// Note: No edit/delete, only register new blocks
```

### 7. BLUEPRINTS (BlueprintsStructures.jsx)
```javascript
const FIELD_CONFIG = {
  name: { label: 'Structure Name', type: 'text', required: true, defaultValue: '' },
  description: { label: 'Description', type: 'textarea', required: false, defaultValue: '' }
};

// API: blueprintsAPI.structures(), blueprintsAPI.createStructure(data)
// Table: Structure Name, Description, Created Date, Actions
// Icon: 📐, Title: "Blueprint Structures"
```

### 8. CONTRACTORS (Update Contractors.jsx)
```javascript
const FIELD_CONFIG = {
  name: { label: 'Contractor Name', type: 'text', required: true, defaultValue: '' },
  gstin: { label: 'GSTIN', type: 'text', required: false, defaultValue: '' },
  pan: { label: 'PAN', type: 'text', required: false, defaultValue: '' },
  phone: { label: 'Phone', type: 'text', required: false, defaultValue: '' },
  email: { label: 'Email', type: 'email', required: false, defaultValue: '' },
  address: { label: 'Address', type: 'textarea', required: false, defaultValue: '' },
  state: { label: 'State', type: 'text', required: false, defaultValue: '' },
  state_code: { label: 'State Code', type: 'text', required: false, defaultValue: '' }
};

// Add Edit functionality
// API: contractorsAPI.list(), contractorsAPI.create(data), contractorsAPI.update(id, data)
// Icon: 👷, Title: "Contractors"
```

### 9. MANUFACTURING IDOLS (ManufacturingIdols.jsx)
```javascript
const FIELD_CONFIG = {
  stone_block_id: { label: 'Stone Block', type: 'select', required: true, defaultValue: '', options: [] },
  idol_name: { label: 'Idol Name', type: 'text', required: true, defaultValue: '' },
  description: { label: 'Description', type: 'textarea', required: false, defaultValue: '' }
};

// Load stone blocks:
useEffect(() => {
  stonesAPI.list({ status: 'available' }).then(r => {
    FIELD_CONFIG.stone_block_id.options = r.data.map(s => ({ 
      value: s.id, 
      label: `${s.serial_no} (${s.length}×${s.width}×${s.height})`
    }));
  });
}, []);

// API: manufacturingAPI.idols(), manufacturingAPI.createIdol(data)
// Table: Serial No, Idol Name, Stone Block, Status, Cost, Actions
// Icon: 🗿, Title: "Idol Manufacturing"
```

### 10. ALLOCATIONS (AllocationsNew.jsx)
```javascript
const FIELD_CONFIG = {
  stone_block_id: { label: 'Stone Block', type: 'select', required: true, defaultValue: '', options: [] },
  project_id: { label: 'Project', type: 'select', required: true, defaultValue: '', options: [] },
  allocation_date: { label: 'Allocation Date', type: 'date', required: false, defaultValue: '' },
  remarks: { label: 'Remarks', type: 'textarea', required: false, defaultValue: '' }
};

// Load dropdowns:
useEffect(() => {
  stonesAPI.list({ status: 'available' }).then(r => {
    FIELD_CONFIG.stone_block_id.options = r.data.map(s => ({ value: s.id, label: s.serial_no }));
  });
  projectsAPI.list().then(r => {
    FIELD_CONFIG.project_id.options = r.data.map(p => ({ value: p.id, label: p.name }));
  });
}, []);

// API: allocationsAPI.list(), allocationsAPI.allocate(data), allocationsAPI.release(id)
// Table: Stone Block, Project, Allocation Date, Status, Actions (Release button)
// Icon: 🔀, Title: "Block Allocations"
```

### 11. JOB WORK (JobWorkNew.jsx)
```javascript
const FIELD_CONFIG = {
  stone_block_id: { label: 'Stone Block', type: 'select', required: true, defaultValue: '', options: [] },
  vendor_name: { label: 'Vendor Name', type: 'text', required: true, defaultValue: '' },
  from_warehouse_id: { label: 'From Warehouse', type: 'select', required: true, defaultValue: '', options: [] },
  dispatch_date: { label: 'Dispatch Date', type: 'date', required: true, defaultValue: '' },
  vendor_gstin: { label: 'Vendor GSTIN', type: 'text', required: false, defaultValue: '' },
  expected_return_date: { label: 'Expected Return Date', type: 'date', required: false, defaultValue: '' },
  job_description: { label: 'Job Description', type: 'textarea', required: false, defaultValue: '' }
};

// Load dropdowns
// API: jobworkAPI.list(), jobworkAPI.create(data)
// Table: Challan No, Vendor, Stone Block, Dispatch Date, Status, Actions
// Icon: 🏭, Title: "Job Work"
```

### 12. SITE INSTALLATIONS (SiteInstallations.jsx)
```javascript
const FIELD_CONFIG = {
  stone_block_id: { label: 'Stone Block', type: 'select', required: true, defaultValue: '', options: [] },
  position_id: { label: 'Position', type: 'select', required: true, defaultValue: '', options: [] },
  project_id: { label: 'Project', type: 'select', required: true, defaultValue: '', options: [] },
  installation_date: { label: 'Installation Date', type: 'date', required: false, defaultValue: '' },
  remarks: { label: 'Remarks', type: 'textarea', required: false, defaultValue: '' }
};

// API: siteAPI.installations(), siteAPI.createInstallation(data)
// Table: Stone Block, Position, Project, Installation Date, Status, Actions
// Icon: 🚛, Title: "Site Installations"
```

### 13. BILLING MILESTONES (BillingMilestones.jsx)
```javascript
const FIELD_CONFIG = {
  project_id: { label: 'Project', type: 'select', required: true, defaultValue: '', options: [] },
  name: { label: 'Milestone Name', type: 'text', required: true, defaultValue: '' },
  description: { label: 'Description', type: 'textarea', required: false, defaultValue: '' },
  milestone_value: { label: 'Milestone Value', type: 'number', required: false, defaultValue: 0 },
  due_date: { label: 'Due Date', type: 'date', required: false, defaultValue: '' }
};

// API: billingAPI.milestones(), billingAPI.createMilestone(data)
// Table: Milestone Name, Project, Value, Status, Completion %, Due Date, Actions
// Icon: 💰, Title: "Billing Milestones"
```

## 🚀 QUICK IMPLEMENTATION SCRIPT

For each form above:

1. Copy `FORM_TEMPLATE.jsx` to new file
2. Replace `FIELD_CONFIG` with the one above
3. Update API imports and calls
4. Update icon, title, and table columns
5. For forms with dropdowns, add the `useEffect` to load options

## ⚡ BATCH CREATE SCRIPT

```bash
# Run from frontend directory
for file in InventoryItems InventoryWarehouses BlueprintsStructures ManufacturingIdols AllocationsNew JobWorkNew SiteInstallations BillingMilestones; do
  cp FORM_TEMPLATE.jsx src/pages/${file}.jsx
done
```

Then update each file with its FIELD_CONFIG from above.

## 📋 COMPLETION CHECKLIST

- [x] 1. Users - UsersNew.jsx
- [x] 2. Item Categories - ItemCategories.jsx
- [ ] 3. Items - InventoryItems.jsx
- [ ] 4. Warehouses - InventoryWarehouses.jsx
- [ ] 5. Projects - Update existing
- [ ] 6. Stone Blocks - Update existing
- [ ] 7. Blueprints - BlueprintsStructures.jsx
- [ ] 8. Contractors - Update existing
- [ ] 9. Manufacturing - ManufacturingIdols.jsx
- [ ] 10. Allocations - AllocationsNew.jsx
- [ ] 11. Job Work - JobWorkNew.jsx
- [ ] 12. Site - SiteInstallations.jsx
- [ ] 13. Billing - BillingMilestones.jsx

## 🎯 ESTIMATED TIME
- 2 forms done: ~30 min
- Remaining 11 forms: ~2 hours (10-12 min each)
- Total: ~2.5 hours

All forms follow the same pattern - just copy template, paste FIELD_CONFIG, update API calls!
