from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from database import engine, Base
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router
from routers.stones import router as stones_router
from routers.blueprints import router as blueprints_router
from routers.purchase import router as purchase_router
from routers.reports import router as reports_router
from routers.vendors import router as vendors_router
from routers.main_routers import (
    projects_router, mfg_router, alloc_router,
    jobwork_router, site_router, contractor_router,
    billing_router, gst_router, audit_router,
)

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Temple Construction ERP",
    description="""
## Temple Construction ERP Platform

A full-featured ERP system for managing temple construction projects.

### Modules
- 🔐 **Auth & User Management** — JWT auth, 8 roles, RBAC
- 📦 **Inventory Management** — Items, categories, warehouses, stock ledger
- 🪨 **Stone Block Engine** — Block registration, split validation, genealogy tree
- 📐 **Blueprint & Dependency Engine** — DAG-based structural modeling
- 🔨 **Manufacturing** — Idol & structural component manufacturing
- 🔀 **Multi-Project Allocation** — Block assignment, stock transfers
- 🏭 **Job Work Management** — Outward/inward processing with challan
- 🚛 **Site Execution** — Dispatch, installation, e-way bill
- 👷 **Contractor Management** — Agreements, invoices, TDS/GST/retention
- 💰 **Milestone-Based Billing** — GST-compliant invoicing
- 🧾 **GST & Finance** — CGST/SGST/IGST engine, GSTR-1 export, costing
- 📊 **Audit Logs** — Full audit trail
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(round(time.time() - start, 4))
    return response


# Global exception handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": f"Internal server error: {str(exc)}"})


# Include all routers
app.include_router(auth_router)
app.include_router(inventory_router)
app.include_router(stones_router)
app.include_router(blueprints_router)
app.include_router(purchase_router)
app.include_router(reports_router)
app.include_router(vendors_router)
app.include_router(projects_router)
app.include_router(mfg_router)
app.include_router(alloc_router)
app.include_router(jobwork_router)
app.include_router(site_router)
app.include_router(contractor_router)
app.include_router(billing_router)
app.include_router(gst_router)
app.include_router(audit_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "app": "Temple Construction ERP",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
