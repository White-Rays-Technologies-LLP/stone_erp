# CRUD Form Template - Quick Reference Guide

## 📋 Overview
This template provides a complete CRUD (Create, Read, Update, Delete) pattern with mandatory field validation, error handling, and modal forms.

## 🚀 Quick Start (5 Steps)

### Step 1: Copy Template
```bash
cp frontend/FORM_TEMPLATE.jsx frontend/src/pages/YourModule.jsx
```

### Step 2: Define Fields
Update `FIELD_CONFIG` with your fields:

```javascript
const FIELD_CONFIG = {
  name: { 
    label: 'Full Name', 
    type: 'text', 
    required: true, 
    defaultValue: '' 
  },
  email: { 
    label: 'Email Address', 
    type: 'email', 
    required: true, 
    defaultValue: '' 
  },
  phone: { 
    label: 'Phone Number', 
    type: 'text', 
    required: false, 
    defaultValue: '' 
  }
};
```

### Step 3: Connect API
Replace API calls with your actual endpoints:

```javascript
// Load data
const loadData = () => {
  setLoading(true);
  yourAPI.list()
    .then(r => { setData(r.data); setLoading(false); })
    .catch(() => setLoading(false));
};

// Create/Update
if (editMode) {
  await yourAPI.update(editId, payload);
} else {
  await yourAPI.create(payload);
}

// Delete
await yourAPI.delete(id);
```

### Step 4: Customize Table
Update table columns to match your data:

```javascript
<thead>
  <tr>
    <th>Name</th>
    <th>Email</th>
    <th>Phone</th>
    <th>Actions</th>
  </tr>
</thead>
<tbody>
  {data.map(record => (
    <tr key={record.id}>
      <td><strong>{record.name}</strong></td>
      <td>{record.email}</td>
      <td>{record.phone || '—'}</td>
      <td>
        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(record)}>Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(record.id)}>Delete</button>
      </td>
    </tr>
  ))}
</tbody>
```

### Step 5: Update Labels
- Component name: `export default function YourModule()`
- Page title: `<div className="page-title">👤 Your Module</div>`
- Modal title: `{editMode ? '✏️ Edit Record' : '➕ New Record'}`

## 📝 Field Types Reference

| Type | Use Case | Example |
|------|----------|---------|
| `text` | Regular text | Name, Code, Address |
| `email` | Email with validation | Email Address |
| `number` | Numeric values | Age, Quantity, Price |
| `date` | Date picker | Start Date, Due Date |
| `select` | Dropdown options | Role, Status, Category |
| `textarea` | Multi-line text | Description, Notes |

## 🎯 Field Configuration Examples

### Text Field (Required)
```javascript
name: { 
  label: 'Project Name', 
  type: 'text', 
  required: true, 
  defaultValue: '' 
}
```

### Select Field (Required)
```javascript
role: { 
  label: 'User Role', 
  type: 'select', 
  required: true, 
  defaultValue: 'admin',
  options: [
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Project Manager' },
    { value: 'user', label: 'Regular User' }
  ]
}
```

### Number Field (Optional)
```javascript
budget: { 
  label: 'Budget Amount', 
  type: 'number', 
  required: false, 
  defaultValue: 0 
}
```

### Date Field (Optional)
```javascript
start_date: { 
  label: 'Start Date', 
  type: 'date', 
  required: false, 
  defaultValue: '' 
}
```

### Textarea Field (Optional)
```javascript
description: { 
  label: 'Description', 
  type: 'textarea', 
  required: false, 
  defaultValue: '' 
}
```

## 🎨 Layout Customization

### Two-Column Layout
```javascript
<div className="grid-2">
  {renderField('first_name')}
  {renderField('last_name')}
</div>
```

### Three-Column Layout
```javascript
<div className="grid-3">
  {renderField('field1')}
  {renderField('field2')}
  {renderField('field3')}
</div>
```

### Mixed Layout
```javascript
{renderField('name')}
<div className="grid-2">
  {renderField('email')}
  {renderField('phone')}
</div>
{renderField('address')}
```

## 🔍 Common Customizations

### 1. Add Search Filter
```javascript
const [search, setSearch] = useState('');

// In render, before table:
<input 
  className="form-input" 
  placeholder="Search..." 
  value={search}
  onChange={e => setSearch(e.target.value)}
  style={{ marginBottom: '16px', maxWidth: '300px' }}
/>

// Filter data:
const filtered = data.filter(d => 
  d.name.toLowerCase().includes(search.toLowerCase())
);

// Use filtered instead of data in map
```

### 2. Add Status Badges
```javascript
<td>
  <span className={`badge badge-${record.status === 'active' ? 'green' : 'gray'}`}>
    {record.status}
  </span>
</td>
```

Badge colors: `badge-green`, `badge-blue`, `badge-orange`, `badge-red`, `badge-gray`, `badge-purple`

### 3. Add Custom Validation
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Custom validation
  if (form.email && !form.email.includes('@')) {
    setError('Please enter a valid email address');
    return;
  }
  
  if (form.phone && form.phone.length < 10) {
    setError('Phone number must be at least 10 digits');
    return;
  }
  
  // Continue with save...
};
```

### 4. Format Display Values
```javascript
// Currency
<td>₹{Number(record.amount).toLocaleString('en-IN')}</td>

// Date
<td>{new Date(record.created_at).toLocaleDateString()}</td>

// Percentage
<td>{record.completion}%</td>

// Conditional
<td>{record.value || '—'}</td>
```

## 📚 Real-World Examples

### Example 1: Users Module
```javascript
const FIELD_CONFIG = {
  name: { label: 'Full Name', type: 'text', required: true, defaultValue: '' },
  email: { label: 'Email', type: 'email', required: true, defaultValue: '' },
  password: { label: 'Password', type: 'password', required: true, defaultValue: '' },
  role: { 
    label: 'Role', 
    type: 'select', 
    required: true, 
    defaultValue: 'admin',
    options: [
      { value: 'admin', label: 'Admin' },
      { value: 'project_manager', label: 'Project Manager' }
    ]
  }
};
```

### Example 2: Projects Module
```javascript
const FIELD_CONFIG = {
  name: { label: 'Project Name', type: 'text', required: true, defaultValue: '' },
  code: { label: 'Project Code', type: 'text', required: true, defaultValue: '' },
  location: { label: 'Location', type: 'text', required: false, defaultValue: '' },
  start_date: { label: 'Start Date', type: 'date', required: false, defaultValue: '' },
  budget: { label: 'Budget', type: 'number', required: false, defaultValue: 0 }
};
```

### Example 3: Contractors Module
```javascript
const FIELD_CONFIG = {
  name: { label: 'Contractor Name', type: 'text', required: true, defaultValue: '' },
  gstin: { label: 'GSTIN', type: 'text', required: false, defaultValue: '' },
  pan: { label: 'PAN', type: 'text', required: false, defaultValue: '' },
  phone: { label: 'Phone', type: 'text', required: false, defaultValue: '' },
  email: { label: 'Email', type: 'email', required: false, defaultValue: '' },
  address: { label: 'Address', type: 'textarea', required: false, defaultValue: '' }
};
```

## ✅ Testing Checklist

- [ ] Create new record works
- [ ] Edit existing record works
- [ ] Delete record works (with confirmation)
- [ ] Mandatory fields show red asterisk
- [ ] Form validation prevents empty required fields
- [ ] Error messages display properly
- [ ] Loading states show correctly
- [ ] Empty state displays when no data
- [ ] Modal closes after successful save
- [ ] Data refreshes after operations

## 🐛 Troubleshooting

**Issue**: Fields not showing
- Check FIELD_CONFIG is defined correctly
- Verify renderField is called for each field

**Issue**: API calls not working
- Replace mock API calls with actual API imports
- Check API endpoint paths match backend

**Issue**: Required validation not working
- Ensure `required={config.required}` is on input elements
- Check form submission preventDefault is called

**Issue**: Edit not populating form
- Verify field names in FIELD_CONFIG match API response keys
- Check openEditModal is mapping all fields correctly

## 📞 Need Help?

Refer to existing working examples:
- `frontend/src/pages/Projects.jsx` - Basic CRUD
- `frontend/src/pages/Contractors.jsx` - With optional fields
- `frontend/src/pages/Users.jsx` - With role selection
