# Temple Construction ERP — React Frontend

A full-featured React frontend connected to your FastAPI backend.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build
```

## Backend Connection

The frontend connects to your FastAPI backend. Set the API URL in `.env`:

```env
VITE_API_URL=http://localhost:8000
```

Start your backend first:
```bash
cd temple_erp
uvicorn temple_erp.main:app --reload --host 0.0.0.0 --port 8000
# Docs: http://localhost:8000/docs
```

## Modules with Full UI

| Module | Status | Features |
|--------|--------|----------|
| Dashboard | ✅ Full | Stats, module grid, recent projects |
| Projects | ✅ Full | CRUD, completion progress bar |
| Inventory | ✅ Full | Items, categories, warehouses, stock movements |
| Stone Blocks | ✅ Full | Register, split with child validation, genealogy tree |
| Contractors | ✅ Full | Contractor CRUD, invoices with GST/TDS display |
| Blueprints | ✅ Connected | Live table from API |
| Manufacturing | ✅ Connected | Live table from API |
| Allocations | ✅ Connected | Live table from API |
| Job Work | ✅ Connected | Live table from API |
| Site Execution | ✅ Connected | Live table from API |
| Billing | ✅ Connected | Live table from API |
| GST & Finance | ✅ Connected | API status display |
| Users | ✅ Connected | Live user table from API |
| Audit Logs | ✅ Connected | Live audit log table from API |

## Tech Stack
- React 18 + Vite
- React Router DOM v6 (client-side routing)
- Axios (HTTP client with JWT interceptors)
- CSS custom properties (no external UI library needed)
- Google Fonts: Cinzel + Plus Jakarta Sans

## Auth Flow
1. Login → POST /auth/login (OAuth2 form)
2. JWT token stored in localStorage
3. All API calls auto-attach `Authorization: Bearer <token>`
4. 401 responses auto-redirect to /login
