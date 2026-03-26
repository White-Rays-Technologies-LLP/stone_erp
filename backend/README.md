# Temple Construction ERP — FastAPI Backend

## Overview
Full-featured FastAPI + MySQL backend covering all 101 functions defined in the SRS.

## Stack
- **Framework**: FastAPI 0.111
- **Database**: MySQL (via SQLAlchemy ORM)
- **Auth**: JWT (python-jose) + bcrypt
- **ORM**: SQLAlchemy 2.0
- **Python**: 3.10+

---

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure environment variables
```bash
export DATABASE_URL="mysql+pymysql://root:password@localhost:3306/temple_erp"
export SECRET_KEY="your-super-secret-key"
export UPLOAD_DIR="/var/uploads/temple_erp"
```

### 3. Create MySQL database
```sql
CREATE DATABASE temple_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run the server
```bash
# From the parent directory of temple_erp/
uvicorn temple_erp.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Access API Docs
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## API Modules & Endpoints

### 🔐 Auth & User Management (`/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/users` | Create user (Admin only) |
| GET | `/auth/users` | List all users |
| GET | `/auth/users/{id}` | Get user |
| PUT | `/auth/users/{id}` | Update user |
| DELETE | `/auth/users/{id}` | Soft-delete user |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/me/password` | Change password |
| GET | `/auth/roles` | List all roles |

### 📦 Inventory (`/inventory`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET/PUT/DELETE | `/inventory/categories` | Item categories (HSN, GST mapping) |
| POST/GET/PUT/DELETE | `/inventory/items` | Item master |
| POST/GET/DELETE | `/inventory/warehouses` | Warehouse management |
| POST | `/inventory/stock/movement` | Record stock movement (prevents negative) |
| GET | `/inventory/stock/balance` | Current stock balance per warehouse |
| GET | `/inventory/stock/ledger` | Stock ledger history |

### 🪨 Stone Blocks (`/stones`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/stones/blocks` | Register block (auto serial, auto volume) |
| GET | `/stones/blocks` | List blocks (filter by status/project/warehouse) |
| GET | `/stones/blocks/{id}` | Get block |
| POST | `/stones/blocks/{id}/split` | Split block (validates volume, prevents over-split) |
| GET | `/stones/blocks/{id}/genealogy` | Full parent→child tree |
| GET | `/stones/blocks/{id}/children` | Direct children |
| DELETE | `/stones/blocks/{id}` | Soft-delete |

### 📐 Blueprints (`/blueprints`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET/DELETE | `/blueprints/structures` | Structure types |
| POST/GET/DELETE | `/blueprints/layers` | Layers per structure |
| POST/GET/PUT/DELETE | `/blueprints/positions` | Block positions with required dims |
| POST | `/blueprints/dependencies` | Add dependency (circular DAG check) |
| GET | `/blueprints/dependencies/{pos_id}` | Get prerequisites |
| DELETE | `/blueprints/dependencies/{pos}/{dep}` | Remove dependency |
| GET | `/blueprints/dependency-gap/{structure_id}` | Gap report with completion % |
| PUT | `/blueprints/positions/{id}/status` | Update status (validates prerequisites) |

### 🏗️ Projects (`/projects`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET/PUT/DELETE | `/projects` | Full project CRUD |
| GET | `/projects/{id}` | Project detail with completion % |

### 🔨 Manufacturing (`/manufacturing`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET | `/manufacturing/idols` | Idol linked to stone block |
| GET | `/manufacturing/idols/{id}` | Idol detail |
| POST | `/manufacturing/stages` | Add stage (auto-calculates cost) |
| PUT | `/manufacturing/stages/{id}` | Update stage |
| GET | `/manufacturing/idols/{id}/stages` | List stages |
| POST | `/manufacturing/idols/{id}/photos` | Upload stage photo |
| POST | `/manufacturing/components` | Structural component (dimension compliance check) |
| PUT | `/manufacturing/components/{id}/status` | Update WIP status |

### 🔀 Allocations (`/allocations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/allocations` | Allocate block to project (prevents double) |
| DELETE | `/allocations/{id}` | Release allocation |
| GET | `/allocations` | List active allocations |
| POST | `/allocations/transfers` | Stock transfer across warehouses |

### 🏭 Job Work (`/job-work`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/job-work` | Create outward (auto challan no.) |
| GET | `/job-work` | List job works |
| GET | `/job-work/{id}` | Get detail |
| PUT | `/job-work/{id}/return` | Process return (validates dims, calculates wastage) |

### 🚛 Site Execution (`/site`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/site/dispatches` | Create dispatch with e-way bill |
| GET | `/site/dispatches` | List dispatches |
| GET | `/site/dispatches/{id}/eway-bill` | E-way bill export data |
| POST | `/site/installations` | Record installation (validates dependencies) |
| GET | `/site/installations` | List installations |
| PUT | `/site/installations/{id}/verify` | Verify installation |
| POST | `/site/installations/{id}/photos` | Upload site photo |

### 👷 Contractors (`/contractors`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET/PUT/DELETE | `/contractors` | Contractor CRUD |
| POST/GET | `/contractors/agreements` | Agreement with GST/TDS/retention % |
| POST/GET | `/contractors/invoices` | Invoice (validates milestone, auto GST/TDS/retention) |
| PUT | `/contractors/invoices/{id}/payment` | Record payment |

### 💰 Billing (`/billing`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET | `/billing/milestones` | Project milestones |
| PUT | `/billing/milestones/{id}` | Update milestone status |
| POST/GET | `/billing/invoices` | GST-compliant invoice (CGST/SGST/IGST auto) |
| GET | `/billing/invoices/{id}` | Invoice detail |
| PUT | `/billing/invoices/{id}/payment` | Record payment |
| POST/GET | `/billing/advance-payments` | Advance receipts |

### 🧾 GST & Finance (`/gst`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/gst/calculate` | Live GST calculation |
| GET | `/gst/gstr1` | GSTR-1 export (filterable by date/project) |
| POST/GET | `/gst/project-costs` | Project cost tracking |
| GET | `/gst/project-margin/{id}` | Project margin % breakdown |

### 📊 Audit (`/audit`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit/logs` | Audit log (Admin only, filter by module/user) |

---

## User Roles & Access

| Role | Access |
|------|--------|
| `admin` | Full system access |
| `project_manager` | Projects, site, allocation |
| `structural_engineer` | Blueprints, installations |
| `production_supervisor` | Manufacturing |
| `store_manager` | Inventory, stock, job work |
| `accounts_manager` | Finance, GST, invoices |
| `site_supervisor` | Site execution, installations |
| `contractor` | Limited (read-only work orders) |

---

## Key Business Rules Enforced
- ✅ Negative stock prevention on all outward movements
- ✅ Stone split: child volume ≤ parent volume
- ✅ DAG circular dependency prevention
- ✅ Block processing blocked if predecessor incomplete
- ✅ Double allocation prevention (unique constraint)
- ✅ Invoice blocked if milestone not completed
- ✅ Auto GST (CGST+SGST vs IGST) based on state codes
- ✅ TDS + retention deducted from contractor invoices
- ✅ Advance payment auto-adjusted on invoice creation
- ✅ Project completion % auto-updated on installation
- ✅ Soft-delete (no hard deletes) everywhere
- ✅ Full audit log on all create/update/delete operations
