from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import date, datetime
import uuid, os, shutil
from database import get_db
from models.models import (
    IdolManufacturing, ManufacturingStage, ManufacturingPhoto, IdolMaterial,
    StructuralComponent, BlueprintPosition, StoneBlock, StructureLayer, StructureType,
    BlockAllocation, StockTransfer, StockLedger,
    IdolStockMovement, IdolSale,
    JobWork, Dispatch, DispatchWorkflow, DispatchItem, DispatchItemSerial, Installation, InstallationPhoto,
    Contractor, ContractorAgreement, ContractorInvoice,
    Milestone, SalesInvoice, InvoiceLineItem, InvoiceDispatchAllocation, InvoiceWorkflow,
    ProjectCost, Project, AdvancePayment, User, AuditLog,
    ItemReservation, Item, Warehouse, ItemSerial, StageMaster, ItemCategory, PositionStage
)
from models.project_materials import ProjectMaterial, ProjectMaterialSerial
from schemas import (
    IdolCreate, IdolOut, IdolUpdate, StageCreate, StageUpdate, StageOut,
    IdolStockPlaceIn, IdolStockTransferIn, IdolSellIn, IdolStockMovementOut,
    StructuralComponentCreate,
    AllocationCreate, StockTransferCreate,
    JobWorkCreate, JobWorkReturnUpdate, JobWorkOut,
    DispatchCreate, DispatchUpdate, DispatchOut, DispatchFGInventoryOut,
    InstallationCreate, InstallationVerify, InstallationOut,
    ContractorCreate, ContractorOut, AgreementCreate, AgreementOut,
    ContractorInvoiceCreate, ContractorInvoiceOut,
    MilestoneCreate, MilestoneUpdate, MilestoneOut,
    SalesInvoiceCreate, SalesInvoiceOut, DispatchInvoiceItemOut,
    ProjectCostCreate, ProjectCostOut, ProjectMarginOut,
    AdvancePaymentCreate, AdvancePaymentOut,
    AuditLogOut, ProjectCreate, ProjectOut,
    ReserveMaterialsRequest
)
from utils.auth import get_current_user, require_roles, log_audit
from config import Role, MovementType, WIPStatus, PaymentStatus, MilestoneStatus, StageStatus
from services.gst import calculate_gst, is_interstate_transaction

def _hard_delete_or_400(db: Session, obj, label: str):
    try:
        db.delete(obj)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Cannot delete {label} because it is linked. Delete related records first.")

# ════════════════════════════════════════════════════════════════
# PROJECTS
# ════════════════════════════════════════════════════════════════

projects_router = APIRouter(prefix="/projects", tags=["Projects"])


@projects_router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER)),
):
    from models.project_materials import ProjectMaterial, ProjectMaterialSerial
    
    p = Project(**payload.dict(exclude={'materials'}), created_by=current_user.id)
    db.add(p)
    db.flush()
    
    # Add materials
    for material in payload.materials:
        pm = ProjectMaterial(
            project_id=p.id,
            item_id=material.item_id,
            stone_block_id=material.stone_block_id,
            required_qty=material.required_qty
        )
        db.add(pm)
        db.flush()
        for sid in (material.serial_ids or []):
            serial = db.query(ItemSerial).filter(ItemSerial.id == sid).first()
            if not serial:
                raise HTTPException(status_code=404, detail=f"Serial not found: {sid}")
            if serial.status != "available":
                raise HTTPException(status_code=400, detail=f"Serial not available: {serial.serial_no}")
            db.add(ProjectMaterialSerial(
                project_material_id=pm.id,
                item_serial_id=sid,
            ))
            serial.status = "allocated"
    _auto_reserve_project_materials_internal(p.id, db, current_user)
    db.commit()
    db.refresh(p)
    log_audit(db, current_user.id, "CREATE", "projects", p.id)
    return p


@projects_router.get("", response_model=List[ProjectOut])
def list_projects(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Project).filter(Project.is_deleted == False)
    if status:
        q = q.filter(Project.status == status)
    return q.all()


@projects_router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = (
        db.query(Project)
        .options(selectinload(Project.materials).selectinload(ProjectMaterial.serials))
        .filter(Project.id == project_id, Project.is_deleted == False)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@projects_router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int, payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER)),
):
    from models.project_materials import ProjectMaterial, ProjectMaterialSerial

    p = db.query(Project).filter(Project.id == project_id, Project.is_deleted == False).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update base fields (exclude materials)
    for k, v in payload.dict(exclude={"materials"}).items():
        setattr(p, k, v)

    # Replace materials
    _release_project_materials_internal(project_id, db)
    # release previously linked serials
    prev_serial_ids = (
        db.query(ProjectMaterialSerial.item_serial_id)
        .join(ProjectMaterial, ProjectMaterialSerial.project_material_id == ProjectMaterial.id)
        .filter(ProjectMaterial.project_id == project_id)
        .all()
    )
    if prev_serial_ids:
        ids = [r[0] for r in prev_serial_ids]
        db.query(ItemSerial).filter(ItemSerial.id.in_(ids)).update({"status": "available"}, synchronize_session=False)

    db.query(ProjectMaterialSerial).filter(
        ProjectMaterialSerial.project_material_id.in_(
            db.query(ProjectMaterial.id).filter(ProjectMaterial.project_id == project_id)
        )
    ).delete(synchronize_session=False)
    db.query(ProjectMaterial).filter(ProjectMaterial.project_id == project_id).delete()
    for material in payload.materials:
        pm = ProjectMaterial(
            project_id=project_id,
            item_id=material.item_id,
            stone_block_id=material.stone_block_id,
            required_qty=material.required_qty
        )
        db.add(pm)
        db.flush()
        for sid in (material.serial_ids or []):
            serial = db.query(ItemSerial).filter(ItemSerial.id == sid).first()
            if not serial:
                raise HTTPException(status_code=404, detail=f"Serial not found: {sid}")
            if serial.status != "available":
                raise HTTPException(status_code=400, detail=f"Serial not available: {serial.serial_no}")
            db.add(ProjectMaterialSerial(
                project_material_id=pm.id,
                item_serial_id=sid,
            ))
            serial.status = "allocated"
    _auto_reserve_project_materials_internal(project_id, db, current_user)
    db.commit()
    db.refresh(p)
    return p


@projects_router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(Role.ADMIN))):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    p.is_deleted = True
    db.commit()


@projects_router.post("/{project_id}/reserve-materials")
def reserve_project_materials(
    project_id: int,
    payload: ReserveMaterialsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER, Role.STORE_MANAGER)),
):
    from models.project_materials import ProjectMaterial
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    materials = db.query(ProjectMaterial).filter(ProjectMaterial.project_id == project_id).all()
    if not materials:
        raise HTTPException(status_code=400, detail="No required materials found for this project")

    # Map of item_id -> preferred warehouse_id (if provided)
    preferred_wh = {i.item_id: i.warehouse_id for i in payload.items if i.item_id}

    for m in materials:
        if m.stone_block_id:
            # Reserve stone block via allocation
            existing = db.query(BlockAllocation).filter(
                BlockAllocation.stone_block_id == m.stone_block_id,
                BlockAllocation.is_released == False
            ).first()
            if not existing:
                alloc = BlockAllocation(
                    stone_block_id=m.stone_block_id,
                    project_id=project_id,
                    allocated_by=current_user.id
                )
                db.add(alloc)
                block = db.query(StoneBlock).filter(StoneBlock.id == m.stone_block_id).first()
                if block:
                    block.project_id = project_id
                    block.status = "allocated"
            continue

        if m.item_id:
            already_reserved = (
                db.query(func.coalesce(func.sum(ItemReservation.qty), 0))
                .filter(ItemReservation.project_id == project_id, ItemReservation.item_id == m.item_id, ItemReservation.is_released == False)
                .scalar()
            )
            remaining_qty = float(m.required_qty) - float(already_reserved or 0)
            if remaining_qty <= 0:
                continue

            # Reserve items from warehouse
            wh_id = preferred_wh.get(m.item_id)
            if not wh_id:
                # auto-pick warehouse with highest balance
                subq = (
                    db.query(
                        StockLedger.warehouse_id,
                        func.max(StockLedger.id).label("max_id"),
                    )
                    .filter(StockLedger.item_id == m.item_id)
                    .group_by(StockLedger.warehouse_id)
                    .subquery()
                )
                latest = (
                    db.query(StockLedger)
                    .join(subq, StockLedger.id == subq.c.max_id)
                    .order_by(StockLedger.balance_qty.desc())
                    .first()
                )
                if not latest:
                    raise HTTPException(status_code=400, detail=f"No stock available for item_id={m.item_id}")
                wh_id = latest.warehouse_id

            # Check available balance
            last = (
                db.query(StockLedger)
                .filter(StockLedger.item_id == m.item_id, StockLedger.warehouse_id == wh_id)
                .order_by(StockLedger.id.desc())
                .first()
            )
            balance_qty = last.balance_qty if last else 0
            reserved_qty = (
                db.query(func.coalesce(func.sum(ItemReservation.qty), 0))
                .filter(ItemReservation.item_id == m.item_id, ItemReservation.warehouse_id == wh_id, ItemReservation.is_released == False)
                .scalar()
            )
            available_qty = float(balance_qty) - float(reserved_qty or 0)
            if available_qty < remaining_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient available stock for item_id={m.item_id} in warehouse {wh_id}. Available: {available_qty}"
                )

            db.add(ItemReservation(
                project_id=project_id,
                item_id=m.item_id,
                warehouse_id=wh_id,
                qty=remaining_qty,
                created_by=current_user.id
            ))

    db.commit()
    return {"message": "Materials reserved"}


@projects_router.get("/{project_id}/reserve-status")
def get_project_reserve_status(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models.project_materials import ProjectMaterial

    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    materials = db.query(ProjectMaterial).filter(ProjectMaterial.project_id == project_id).all()
    item_ids = [m.item_id for m in materials if m.item_id]

    reservations = (
        db.query(ItemReservation)
        .filter(ItemReservation.project_id == project_id)
        .order_by(ItemReservation.id.desc())
        .all()
    )
    allocations = (
        db.query(BlockAllocation)
        .filter(BlockAllocation.project_id == project_id)
        .order_by(BlockAllocation.id.desc())
        .all()
    )

    stock_balances = []
    if item_ids:
        subq = (
            db.query(
                StockLedger.item_id,
                StockLedger.warehouse_id,
                func.max(StockLedger.id).label("max_id"),
            )
            .filter(StockLedger.item_id.in_(item_ids))
            .group_by(StockLedger.item_id, StockLedger.warehouse_id)
            .subquery()
        )
        rows = (
            db.query(StockLedger)
            .join(
                subq,
                (StockLedger.item_id == subq.c.item_id)
                & (StockLedger.warehouse_id == subq.c.warehouse_id)
                & (StockLedger.id == subq.c.max_id),
            )
            .all()
        )
        reserved = (
            db.query(
                ItemReservation.item_id,
                ItemReservation.warehouse_id,
                func.sum(ItemReservation.qty).label("qty"),
            )
            .filter(ItemReservation.is_released == False)
            .group_by(ItemReservation.item_id, ItemReservation.warehouse_id)
            .all()
        )
        reserved_map = {(r.item_id, r.warehouse_id): float(r.qty or 0) for r in reserved}

        for r in rows:
            key = (r.item_id, r.warehouse_id)
            reserved_qty = reserved_map.get(key, 0.0)
            available_qty = float(r.balance_qty or 0) - reserved_qty
            stock_balances.append({
                "item_id": r.item_id,
                "warehouse_id": r.warehouse_id,
                "balance_qty": r.balance_qty,
                "reserved_qty": reserved_qty,
                "available_qty": available_qty,
            })

    return {
        "materials": [
            {
                "id": m.id,
                "item_id": m.item_id,
                "stone_block_id": m.stone_block_id,
                "required_qty": m.required_qty,
            } for m in materials
        ],
        "reservations": [
            {
                "id": r.id,
                "item_id": r.item_id,
                "warehouse_id": r.warehouse_id,
                "qty": r.qty,
                "is_released": r.is_released,
                "released_at": r.released_at,
                "created_at": r.created_at,
            } for r in reservations
        ],
        "allocations": [
            {
                "id": a.id,
                "stone_block_id": a.stone_block_id,
                "is_released": a.is_released,
                "released_at": a.released_at,
                "created_at": a.created_at,
            } for a in allocations
        ],
        "stock_balances": stock_balances,
    }


@projects_router.post("/{project_id}/release-materials")
def release_project_materials(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER, Role.STORE_MANAGER)),
):
    from datetime import datetime
    # release item reservations
    db.query(ItemReservation).filter(
        ItemReservation.project_id == project_id,
        ItemReservation.is_released == False
    ).update({"is_released": True, "released_at": datetime.utcnow()})

    # release stone allocations
    allocations = db.query(BlockAllocation).filter(
        BlockAllocation.project_id == project_id,
        BlockAllocation.is_released == False
    ).all()
    for alloc in allocations:
        alloc.is_released = True
        alloc.released_at = datetime.utcnow()
        block = db.query(StoneBlock).filter(StoneBlock.id == alloc.stone_block_id).first()
        if block:
            block.status = "available"
            block.project_id = None

    db.commit()
    return {"message": "Materials released"}


def _release_project_materials_internal(project_id: int, db: Session) -> None:
    db.query(ItemReservation).filter(
        ItemReservation.project_id == project_id,
        ItemReservation.is_released == False
    ).update({"is_released": True, "released_at": datetime.utcnow()})

    allocations = db.query(BlockAllocation).filter(
        BlockAllocation.project_id == project_id,
        BlockAllocation.is_released == False
    ).all()
    for alloc in allocations:
        alloc.is_released = True
        alloc.released_at = datetime.utcnow()
        block = db.query(StoneBlock).filter(StoneBlock.id == alloc.stone_block_id).first()
        if block:
            block.status = "available"
            block.project_id = None


def _auto_reserve_project_materials_internal(project_id: int, db: Session, current_user: User) -> None:
    from models.project_materials import ProjectMaterial

    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == False).first()
    if not project:
        return

    materials = db.query(ProjectMaterial).filter(ProjectMaterial.project_id == project_id).all()
    if not materials:
        return

    for m in materials:
        if m.stone_block_id:
            existing = db.query(BlockAllocation).filter(
                BlockAllocation.stone_block_id == m.stone_block_id,
                BlockAllocation.is_released == False
            ).first()
            if not existing:
                alloc = BlockAllocation(
                    stone_block_id=m.stone_block_id,
                    project_id=project_id,
                    allocated_by=current_user.id
                )
                db.add(alloc)
                block = db.query(StoneBlock).filter(StoneBlock.id == m.stone_block_id).first()
                if block:
                    block.project_id = project_id
                    block.status = "allocated"
            continue

        if m.item_id:
            already_reserved = (
                db.query(func.coalesce(func.sum(ItemReservation.qty), 0))
                .filter(ItemReservation.project_id == project_id, ItemReservation.item_id == m.item_id, ItemReservation.is_released == False)
                .scalar()
            )
            remaining_qty = float(m.required_qty) - float(already_reserved or 0)
            if remaining_qty <= 0:
                continue

            subq = (
                db.query(
                    StockLedger.warehouse_id,
                    func.max(StockLedger.id).label("max_id"),
                )
                .filter(StockLedger.item_id == m.item_id)
                .group_by(StockLedger.warehouse_id)
                .subquery()
            )
            latest = (
                db.query(StockLedger)
                .join(subq, StockLedger.id == subq.c.max_id)
                .order_by(StockLedger.balance_qty.desc())
                .first()
            )
            if not latest:
                raise HTTPException(status_code=400, detail=f"No stock available for item_id={m.item_id}")
            wh_id = latest.warehouse_id

            last = (
                db.query(StockLedger)
                .filter(StockLedger.item_id == m.item_id, StockLedger.warehouse_id == wh_id)
                .order_by(StockLedger.id.desc())
                .first()
            )
            balance_qty = last.balance_qty if last else 0
            reserved_qty = (
                db.query(func.coalesce(func.sum(ItemReservation.qty), 0))
                .filter(ItemReservation.item_id == m.item_id, ItemReservation.warehouse_id == wh_id, ItemReservation.is_released == False)
                .scalar()
            )
            available_qty = float(balance_qty) - float(reserved_qty or 0)
            if available_qty < remaining_qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient available stock for item_id={m.item_id} in warehouse {wh_id}. Available: {available_qty}"
                )

            db.add(ItemReservation(
                project_id=project_id,
                item_id=m.item_id,
                warehouse_id=wh_id,
                qty=remaining_qty,
                created_by=current_user.id
            ))


# ════════════════════════════════════════════════════════════════
# MANUFACTURING
# ════════════════════════════════════════════════════════════════

mfg_router = APIRouter(prefix="/manufacturing", tags=["Manufacturing"])

MFG_ROLES = (Role.ADMIN, Role.PRODUCTION_SUPERVISOR, Role.PROJECT_MANAGER)


def _summarize_idol_stages(db: Session, idol_ids: List[int]):
    if not idol_ids:
        return {}
    rows = (
        db.query(ManufacturingStage.idol_id, ManufacturingStage.status, func.count(ManufacturingStage.id))
        .filter(ManufacturingStage.idol_id.in_(idol_ids))
        .group_by(ManufacturingStage.idol_id, ManufacturingStage.status)
        .all()
    )
    summary = {iid: {"stage_total": 0, "stage_completed": 0, "stage_in_progress": 0, "stage_pending": 0, "stage_status": "pending"} for iid in idol_ids}
    for iid, status, count in rows:
        if iid not in summary:
            summary[iid] = {"stage_total": 0, "stage_completed": 0, "stage_in_progress": 0, "stage_pending": 0, "stage_status": "pending"}
        summary[iid]["stage_total"] += int(count or 0)
        if status == "completed":
            summary[iid]["stage_completed"] += int(count or 0)
        elif status == "in_progress":
            summary[iid]["stage_in_progress"] += int(count or 0)
        else:
            summary[iid]["stage_pending"] += int(count or 0)

    for iid, s in summary.items():
        if s["stage_total"] == 0:
            s["stage_status"] = "pending"
        elif s["stage_completed"] == s["stage_total"]:
            s["stage_status"] = "completed"
        elif s["stage_in_progress"] > 0 or s["stage_completed"] > 0:
            s["stage_status"] = "in_progress"
        else:
            s["stage_status"] = "pending"
    return summary
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/temple_erp_uploads")


def _save_upload(file: UploadFile, subfolder: str) -> str:
    dest_dir = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(dest_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    fname = f"{uuid.uuid4().hex}{ext}"
    fpath = os.path.join(dest_dir, fname)
    with open(fpath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return fpath


def _recalc_idol_status(db: Session, idol_id: int) -> None:
    """Recalculate idol status from its stages."""
    stages = (
        db.query(ManufacturingStage.status)
        .filter(ManufacturingStage.idol_id == idol_id)
        .all()
    )
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == idol_id).first()
    if not idol:
        return
    if not stages:
        idol.status = WIPStatus.PENDING
        return
    status_set = {s[0] for s in stages}
    if status_set == {StageStatus.COMPLETED}:
        idol.status = WIPStatus.COMPLETED
    elif StageStatus.IN_PROGRESS in status_set:
        idol.status = WIPStatus.IN_PROGRESS
    else:
        idol.status = WIPStatus.PENDING


def _recalc_idol_totals(db: Session, idol_id: int) -> None:
    """Recalculate idol total labor hours and costs from stages."""
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == idol_id).first()
    if not idol:
        return
    totals = (
        db.query(
            func.coalesce(func.sum(ManufacturingStage.labor_hours), 0),
            func.coalesce(func.sum(ManufacturingStage.stage_cost), 0),
        )
        .filter(ManufacturingStage.idol_id == idol_id)
        .first()
    )
    labor_hours, stage_cost = totals if totals else (0, 0)
    idol.total_labor_hours = float(labor_hours or 0)
    idol.total_stage_cost = float(stage_cost or 0)
    idol.total_manufacturing_cost = idol.total_stage_cost


# ─── Idol Manufacturing ───────────────────────────────────

def _idol_stock_snapshot_map(db: Session, idol_ids: List[int]):
    snapshot = {
        iid: {
            "stock_balance": 0.0,
            "stock_warehouse_id": None,
            "stock_warehouse_name": None,
            "stock_state": "not_placed",
            "is_sold": False,
            "sold_to_customer": None,
            "sold_date": None,
        }
        for iid in idol_ids
    }
    if not idol_ids:
        return snapshot

    latest_subq = (
        db.query(
            IdolStockMovement.idol_id.label("idol_id"),
            func.max(IdolStockMovement.id).label("max_id"),
        )
        .filter(IdolStockMovement.idol_id.in_(idol_ids))
        .group_by(IdolStockMovement.idol_id)
        .subquery()
    )
    latest_rows = (
        db.query(IdolStockMovement, Warehouse.name)
        .join(latest_subq, IdolStockMovement.id == latest_subq.c.max_id)
        .outerjoin(Warehouse, Warehouse.id == IdolStockMovement.warehouse_id)
        .all()
    )
    for move, warehouse_name in latest_rows:
        state = "in_stock" if float(move.balance_qty or 0) > 0 else "out_of_stock"
        snapshot[move.idol_id] = {
            "stock_balance": float(move.balance_qty or 0),
            "stock_warehouse_id": move.warehouse_id,
            "stock_warehouse_name": warehouse_name,
            "stock_state": state,
            "is_sold": False,
            "sold_to_customer": None,
            "sold_date": None,
        }

    sales = db.query(IdolSale).filter(IdolSale.idol_id.in_(idol_ids)).all()
    for sale in sales:
        row = snapshot.setdefault(sale.idol_id, {})
        row["is_sold"] = True
        row["sold_to_customer"] = sale.customer_name
        row["sold_date"] = sale.sale_date
        if float(row.get("stock_balance") or 0) <= 0:
            row["stock_state"] = "sold"
    return snapshot


def _idol_current_stock_row(db: Session, idol_id: int):
    return (
        db.query(IdolStockMovement)
        .filter(IdolStockMovement.idol_id == idol_id)
        .order_by(IdolStockMovement.id.desc())
        .first()
    )


def _validate_idol_materials(db: Session, project_id: int, materials: List):
    if not project_id:
        raise HTTPException(status_code=400, detail="project_id is required")
    if not materials:
        raise HTTPException(status_code=400, detail="At least one material is required")

    from models.project_materials import ProjectMaterial
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_materials = db.query(ProjectMaterial).filter(ProjectMaterial.project_id == project_id).all()
    if not project_materials:
        raise HTTPException(status_code=400, detail="No required materials found for this project")

    pm_by_item = {m.item_id: m for m in project_materials if m.item_id}
    pm_by_block = {m.stone_block_id: m for m in project_materials if m.stone_block_id}

    seen = set()
    primary_block_id = None
    for m in materials:
        key = ("block", m.stone_block_id) if m.stone_block_id else ("item", m.item_id)
        if key in seen:
            raise HTTPException(status_code=400, detail="Duplicate material in request")
        seen.add(key)

        if m.item_id:
            item = db.query(Item).filter(Item.id == m.item_id).first()
            if not item:
                raise HTTPException(status_code=404, detail=f"Item not found: {m.item_id}")
            category = db.query(ItemCategory).filter(ItemCategory.id == item.category_id).first() if item else None
            item_type = category.item_type if category else None
            pm = pm_by_item.get(m.item_id)
            if not pm:
                raise HTTPException(status_code=400, detail=f"Item {m.item_id} is not in project materials")
            if float(m.qty) > float(pm.required_qty):
                raise HTTPException(status_code=400, detail=f"Qty exceeds required for item {m.item_id}")
            if item.has_serial_no and not m.stone_block_id and item_type != "dimensional":
                try:
                    qty_int = int(m.qty)
                except Exception:
                    raise HTTPException(status_code=400, detail=f"Qty must be whole number for serialized item {m.item_id}")
                if qty_int <= 0 or qty_int != m.qty:
                    raise HTTPException(status_code=400, detail=f"Qty must be whole number for serialized item {m.item_id}")
                serial_ids = list(m.serial_ids or [])
                if len(serial_ids) != qty_int:
                    raise HTTPException(status_code=400, detail=f"Select exactly {qty_int} serial(s) for item {m.item_id}")
                # Validate each serial id
                for sid in serial_ids:
                    serial = db.query(ItemSerial).filter(ItemSerial.id == sid).first()
                    if not serial:
                        raise HTTPException(status_code=404, detail=f"Serial not found: {sid}")
                    if serial.item_id != m.item_id:
                        raise HTTPException(status_code=400, detail=f"Serial {sid} does not belong to item {m.item_id}")
                    if serial.status == "issued":
                        raise HTTPException(status_code=400, detail=f"Serial not available: {serial.serial_no}")
                    if serial.status == "allocated":
                        linked = (
                            db.query(ProjectMaterialSerial)
                            .join(ProjectMaterial, ProjectMaterialSerial.project_material_id == ProjectMaterial.id)
                            .filter(ProjectMaterial.project_id == project_id, ProjectMaterial.item_id == m.item_id)
                            .filter(ProjectMaterialSerial.item_serial_id == sid)
                            .first()
                        )
                        if not linked:
                            raise HTTPException(status_code=400, detail=f"Serial {serial.serial_no} is allocated to another project")
        if m.stone_block_id or (m.item_id and m.serial_ids):
            # Stone path: allow either explicit stone_block_id or list of block ids in serial_ids
            block_ids = []
            if m.stone_block_id:
                block_ids = [m.stone_block_id]
            elif m.serial_ids:
                block_ids = list(m.serial_ids)

            # If item_id is provided, validate against project item planning
            if m.item_id:
                pm_item = pm_by_item.get(m.item_id)
                if not pm_item:
                    raise HTTPException(status_code=400, detail=f"Stone item {m.item_id} is not in project materials")
                if float(m.qty) > float(pm_item.required_qty):
                    raise HTTPException(status_code=400, detail=f"Qty exceeds required for item {m.item_id}")

            for bid in block_ids:
                pm = pm_by_block.get(bid)
                if pm:
                    if float(m.qty) < 1:
                        raise HTTPException(status_code=400, detail=f"Qty must be >= 1 for block {bid}")
                block = db.query(StoneBlock).filter(StoneBlock.id == bid).first()
                if not block:
                    raise HTTPException(status_code=404, detail="Stone block not found")
                if block.project_id and block.project_id != project_id:
                    raise HTTPException(status_code=400, detail=f"Stone block {block.serial_no} is allocated to another project")
                if block.project_id != project_id:
                    block.project_id = project_id
                if block.status == "available":
                    block.status = "allocated"

                if primary_block_id is None:
                    primary_block_id = bid
            continue

        if m.stone_block_id:
            pm = pm_by_block.get(m.stone_block_id)
            if not pm:
                if m.item_id:
                    pm_item = pm_by_item.get(m.item_id)
                    if not pm_item:
                        raise HTTPException(status_code=400, detail=f"Stone item {m.item_id} is not in project materials")
                    if float(m.qty) > float(pm_item.required_qty):
                        raise HTTPException(status_code=400, detail=f"Qty exceeds required for item {m.item_id}")
                else:
                    raise HTTPException(status_code=400, detail=f"Stone block {m.stone_block_id} is not in project materials")
            else:
                if float(m.qty) > float(pm.required_qty):
                    raise HTTPException(status_code=400, detail=f"Qty exceeds required for block {m.stone_block_id}")
            if primary_block_id is None:
                primary_block_id = m.stone_block_id

    if primary_block_id is None:
        raise HTTPException(status_code=400, detail="At least one stone block material is required")
    return primary_block_id


def _consume_serials_for_idol(
    db: Session,
    project_id: int,
    idol_id: int,
    materials: List,
):
    for m in materials:
        if not m.item_id:
            continue
        item = db.query(Item).filter(Item.id == m.item_id).first()
        if not item:
            continue
        category = db.query(ItemCategory).filter(ItemCategory.id == item.category_id).first() if item else None
        item_type = category.item_type if category else None
        if not item.has_serial_no or m.stone_block_id or item_type == "dimensional":
            continue
        serial_ids = list(m.serial_ids or [])
        serials = db.query(ItemSerial).filter(ItemSerial.id.in_(serial_ids)).all()
        if len(serials) != len(serial_ids):
            raise HTTPException(status_code=400, detail=f"Serial selection invalid for item {m.item_id}")
        for s in serials:
            s.status = "allocated"
            s.reference_type = "idol"
            s.reference_id = idol_id


def _restore_serials_for_idol(db: Session, idol_id: int):
    serials = (
        db.query(ItemSerial)
        .filter(ItemSerial.reference_type == "idol", ItemSerial.reference_id == idol_id)
        .all()
    )
    for s in serials:
        s.status = "allocated"
        s.reference_type = None
        s.reference_id = None


def _latest_stock_balance(db: Session, item_id: int, warehouse_id: int) -> float:
    row = (
        db.query(StockLedger)
        .filter(StockLedger.item_id == item_id, StockLedger.warehouse_id == warehouse_id)
        .order_by(StockLedger.id.desc())
        .first()
    )
    return float(row.balance_qty or 0) if row else 0.0


def _append_stock_out(
    db: Session,
    *,
    item_id: int,
    warehouse_id: int,
    qty: float,
    reference_type: str,
    reference_id: int,
    created_by: int,
    serial_no: Optional[str] = None,
    remarks: Optional[str] = None,
) -> None:
    current_balance = _latest_stock_balance(db, item_id, warehouse_id)
    if current_balance + 1e-9 < float(qty):
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock for item_id={item_id} in warehouse {warehouse_id}. Available: {round(current_balance, 3)}",
        )
    db.add(
        StockLedger(
            item_id=item_id,
            warehouse_id=warehouse_id,
            movement_type=MovementType.OUTWARD,
            qty_in=0,
            qty_out=float(qty),
            balance_qty=round(current_balance - float(qty), 6),
            rate=0,
            value=0,
            reference_type=reference_type,
            reference_id=reference_id,
            serial_no=serial_no,
            remarks=remarks,
            created_by=created_by,
        )
    )


def _append_stock_in(
    db: Session,
    *,
    item_id: int,
    warehouse_id: int,
    qty: float,
    reference_type: str,
    reference_id: int,
    created_by: int,
    serial_no: Optional[str] = None,
    remarks: Optional[str] = None,
) -> None:
    current_balance = _latest_stock_balance(db, item_id, warehouse_id)
    db.add(
        StockLedger(
            item_id=item_id,
            warehouse_id=warehouse_id,
            movement_type=MovementType.INWARD,
            qty_in=float(qty),
            qty_out=0,
            balance_qty=round(current_balance + float(qty), 6),
            rate=0,
            value=0,
            reference_type=reference_type,
            reference_id=reference_id,
            serial_no=serial_no,
            remarks=remarks,
            created_by=created_by,
        )
    )


def _ensure_finished_idol_category(db: Session) -> ItemCategory:
    category = (
        db.query(ItemCategory)
        .filter(func.lower(ItemCategory.name) == "finished idols")
        .first()
    )
    if category:
        return category
    category = ItemCategory(
        name="Finished Idols",
        item_type="serialized",
        gst_rate=18.0,
        description="Auto-created category for completed idol stock",
        is_deleted=False,
    )
    db.add(category)
    db.flush()
    return category


def _ensure_idol_stock_item(db: Session, idol: IdolManufacturing) -> Item:
    code = f"FG-IDOL-{idol.id}"
    item = db.query(Item).filter(Item.code == code).first()
    if item:
        if item.name != (idol.idol_name or item.name):
            item.name = idol.idol_name or item.name
        return item
    category = _ensure_finished_idol_category(db)
    item = Item(
        name=idol.idol_name or f"Idol {idol.serial_no}",
        code=code,
        category_id=category.id,
        uom="pcs",
        has_serial_no=True,
        is_deleted=False,
    )
    db.add(item)
    db.flush()
    return item


def _ensure_idol_serial(
    db: Session,
    *,
    idol: IdolManufacturing,
    item_id: int,
    warehouse_id: int,
    status: str = "available",
    reference_type: Optional[str] = "idol_stock",
    reference_id: Optional[int] = None,
) -> ItemSerial:
    serial = (
        db.query(ItemSerial)
        .filter(ItemSerial.item_id == item_id, ItemSerial.serial_no == idol.serial_no)
        .first()
    )
    if not serial:
        serial = ItemSerial(
            item_id=item_id,
            warehouse_id=warehouse_id,
            serial_no=idol.serial_no,
            status=status,
            reference_type=reference_type,
            reference_id=reference_id if reference_id is not None else idol.id,
        )
        db.add(serial)
        db.flush()
        return serial
    serial.warehouse_id = warehouse_id
    serial.status = status
    serial.reference_type = reference_type
    serial.reference_id = reference_id if reference_id is not None else idol.id
    return serial


def _decrement_project_reservation(
    db: Session,
    *,
    project_id: Optional[int],
    item_id: int,
    warehouse_id: int,
    qty: float,
) -> None:
    if not project_id or qty <= 0:
        return
    remaining = float(qty)
    rows = (
        db.query(ItemReservation)
        .filter(
            ItemReservation.project_id == project_id,
            ItemReservation.item_id == item_id,
            ItemReservation.warehouse_id == warehouse_id,
            ItemReservation.is_released == False,
        )
        .order_by(ItemReservation.id.asc())
        .all()
    )
    for row in rows:
        if remaining <= 0:
            break
        row_qty = float(row.qty or 0)
        if row_qty <= 0:
            continue
        consume = min(row_qty, remaining)
        row.qty = round(row_qty - consume, 6)
        remaining = round(remaining - consume, 6)
        if row.qty <= 0:
            row.qty = 0
            row.is_released = True
            row.released_at = datetime.utcnow()


def _consume_item_qty_for_idol(
    db: Session,
    *,
    project_id: Optional[int],
    idol_id: int,
    idol_serial_no: str,
    item_id: int,
    qty: float,
    created_by: int,
) -> None:
    remaining = float(qty)
    if remaining <= 0:
        return

    # Consume from project reservations first (reserved warehouse linkage is preserved)
    reservations = (
        db.query(ItemReservation)
        .filter(
            ItemReservation.project_id == project_id,
            ItemReservation.item_id == item_id,
            ItemReservation.is_released == False,
        )
        .order_by(ItemReservation.id.asc())
        .all()
    )
    for res in reservations:
        if remaining <= 0:
            break
        res_qty = float(res.qty or 0)
        if res_qty <= 0:
            continue
        take = min(res_qty, remaining)
        _append_stock_out(
            db,
            item_id=item_id,
            warehouse_id=res.warehouse_id,
            qty=take,
            reference_type="idol_material_issue",
            reference_id=idol_id,
            created_by=created_by,
            remarks=f"Material issued for idol {idol_serial_no}",
        )
        res.qty = round(res_qty - take, 6)
        if res.qty <= 0:
            res.qty = 0
            res.is_released = True
            res.released_at = datetime.utcnow()
        remaining = round(remaining - take, 6)

    if remaining <= 0:
        return

    # Fallback: consume from available stock across warehouses.
    subq = (
        db.query(StockLedger.warehouse_id, func.max(StockLedger.id).label("max_id"))
        .filter(StockLedger.item_id == item_id)
        .group_by(StockLedger.warehouse_id)
        .subquery()
    )
    rows = (
        db.query(StockLedger.warehouse_id, StockLedger.balance_qty)
        .join(subq, StockLedger.id == subq.c.max_id)
        .order_by(StockLedger.balance_qty.desc())
        .all()
    )
    for wh_id, bal in rows:
        if remaining <= 0:
            break
        available = float(bal or 0)
        if available <= 0:
            continue
        take = min(available, remaining)
        _append_stock_out(
            db,
            item_id=item_id,
            warehouse_id=wh_id,
            qty=take,
            reference_type="idol_material_issue",
            reference_id=idol_id,
            created_by=created_by,
            remarks=f"Material issued for idol {idol_serial_no}",
        )
        _decrement_project_reservation(
            db,
            project_id=project_id,
            item_id=item_id,
            warehouse_id=wh_id,
            qty=take,
        )
        remaining = round(remaining - take, 6)

    if remaining > 1e-9:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock to complete idol for item_id={item_id}. Short by {round(remaining, 3)}",
        )


def _consume_idol_materials_from_stock(
    db: Session,
    idol_id: int,
    current_user: User,
) -> None:
    idol = (
        db.query(IdolManufacturing)
        .options(selectinload(IdolManufacturing.materials))
        .filter(IdolManufacturing.id == idol_id, IdolManufacturing.is_deleted == False)
        .first()
    )
    if not idol:
        return

    already_issued = (
        db.query(StockLedger.id)
        .filter(
            StockLedger.reference_type == "idol_material_issue",
            StockLedger.reference_id == idol_id,
        )
        .first()
    )
    if already_issued:
        return

    for m in idol.materials:
        # Stone block allocation path
        if m.stone_block_id:
            block = db.query(StoneBlock).filter(StoneBlock.id == m.stone_block_id).first()
            if not block:
                raise HTTPException(status_code=404, detail=f"Stone block not found: {m.stone_block_id}")
            if not block.item_id:
                raise HTTPException(status_code=400, detail=f"Stone block {block.serial_no} is not linked to an item")
            if not block.warehouse_id:
                raise HTTPException(status_code=400, detail=f"Warehouse is missing for stone block {block.serial_no}")
            _append_stock_out(
                db,
                item_id=block.item_id,
                warehouse_id=block.warehouse_id,
                qty=1,
                reference_type="idol_material_issue",
                reference_id=idol.id,
                serial_no=block.serial_no,
                remarks=f"Stone block issued for idol {idol.serial_no}",
                created_by=current_user.id,
            )
            _decrement_project_reservation(
                db,
                project_id=idol.project_id,
                item_id=block.item_id,
                warehouse_id=block.warehouse_id,
                qty=1,
            )
            block.status = "issued"
            continue

        if not m.item_id:
            continue

        item = db.query(Item).filter(Item.id == m.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item not found: {m.item_id}")
        category = db.query(ItemCategory).filter(ItemCategory.id == item.category_id).first() if item.category_id else None
        item_type = category.item_type if category else None

        # Serialized non-stone items: selected serials linked to this idol are now issued.
        if item.has_serial_no and item_type != "dimensional":
            try:
                unit_count = int(m.qty)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid qty for serialized item {m.item_id}")
            if unit_count <= 0 or abs(float(m.qty) - unit_count) > 1e-9:
                raise HTTPException(status_code=400, detail=f"Qty must be a whole number for serialized item {m.item_id}")
            serials = (
                db.query(ItemSerial)
                .filter(
                    ItemSerial.item_id == m.item_id,
                    ItemSerial.reference_type == "idol",
                    ItemSerial.reference_id == idol.id,
                )
                .order_by(ItemSerial.id.asc())
                .all()
            )
            if len(serials) < unit_count:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough selected serials for item {m.item_id}. Required: {unit_count}, found: {len(serials)}",
                )
            for serial in serials[:unit_count]:
                _append_stock_out(
                    db,
                    item_id=m.item_id,
                    warehouse_id=serial.warehouse_id,
                    qty=1,
                    reference_type="idol_material_issue",
                    reference_id=idol.id,
                    serial_no=serial.serial_no,
                    remarks=f"Serialized item issued for idol {idol.serial_no}",
                    created_by=current_user.id,
                )
                _decrement_project_reservation(
                    db,
                    project_id=idol.project_id,
                    item_id=m.item_id,
                    warehouse_id=serial.warehouse_id,
                    qty=1,
                )
                serial.status = "issued"
                serial.reference_type = "idol"
                serial.reference_id = idol.id
            continue

        # Non-serialized item
        _consume_item_qty_for_idol(
            db,
            project_id=idol.project_id,
            idol_id=idol.id,
            idol_serial_no=idol.serial_no,
            item_id=m.item_id,
            qty=float(m.qty or 0),
            created_by=current_user.id,
        )


@mfg_router.post("/idols", response_model=IdolOut, status_code=201)
def create_idol(
    payload: IdolCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    primary_block_id = _validate_idol_materials(db, payload.project_id, payload.materials)

    idol = IdolManufacturing(
        serial_no=f"IDOL-{uuid.uuid4().hex[:8].upper()}",
        stone_block_id=primary_block_id,
        project_id=payload.project_id,
        idol_name=payload.idol_name,
        description=payload.description,
        created_by=current_user.id,
    )
    db.add(idol)
    db.flush()

    for m in payload.materials:
        if m.item_id and m.serial_ids and not m.stone_block_id:
            # Stone blocks selected via serial_ids list
            for bid in m.serial_ids:
                db.add(IdolMaterial(
                    idol_id=idol.id,
                    item_id=m.item_id,
                    stone_block_id=bid,
                    qty=1,
                ))
        else:
            db.add(IdolMaterial(
                idol_id=idol.id,
                item_id=m.item_id,
                stone_block_id=m.stone_block_id,
                qty=m.qty,
            ))

    _consume_serials_for_idol(db, payload.project_id, idol.id, payload.materials)

    db.commit()
    db.refresh(idol)
    log_audit(db, current_user.id, "CREATE", "idol_manufacturing", idol.id)
    return idol


@mfg_router.put("/idols/{idol_id}", response_model=IdolOut)
def update_idol(
    idol_id: int,
    payload: IdolUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == idol_id, IdolManufacturing.is_deleted == False).first()
    if not idol:
        raise HTTPException(status_code=404, detail="Idol not found")

    if payload.idol_name is not None:
        idol.idol_name = payload.idol_name
    if payload.description is not None:
        idol.description = payload.description

    if payload.materials is not None:
        if idol.status == WIPStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Cannot change materials after idol is completed")
        _restore_serials_for_idol(db, idol_id)
        primary_block_id = _validate_idol_materials(db, idol.project_id, payload.materials)
        idol.stone_block_id = primary_block_id
        db.query(IdolMaterial).filter(IdolMaterial.idol_id == idol_id).delete()
        for m in payload.materials:
            if m.item_id and m.serial_ids and not m.stone_block_id:
                for bid in m.serial_ids:
                    db.add(IdolMaterial(
                        idol_id=idol.id,
                        item_id=m.item_id,
                        stone_block_id=bid,
                        qty=1,
                    ))
            else:
                db.add(IdolMaterial(
                    idol_id=idol.id,
                    item_id=m.item_id,
                    stone_block_id=m.stone_block_id,
                    qty=m.qty,
                ))
        _consume_serials_for_idol(db, idol.project_id, idol.id, payload.materials)

    db.commit()
    db.refresh(idol)
    return idol


@mfg_router.delete("/idols/{idol_id}", status_code=204)
def delete_idol(
    idol_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == idol_id).first()
    if not idol:
        raise HTTPException(status_code=404, detail="Idol not found")
    _hard_delete_or_400(db, idol, "idol")


@mfg_router.get("/idols", response_model=List[IdolOut])
def list_idols(
    status: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(IdolManufacturing).filter(IdolManufacturing.is_deleted == False)
    if status:
        q = q.filter(IdolManufacturing.status == status)
    if project_id:
        q = q.filter(IdolManufacturing.project_id == project_id)
    idols = q.all()
    summaries = _summarize_idol_stages(db, [i.id for i in idols])
    stock_map = _idol_stock_snapshot_map(db, [i.id for i in idols])
    result = []
    for i in idols:
        row = IdolOut.from_orm(i).dict()
        row.update(summaries.get(i.id, {}))
        row.update(stock_map.get(i.id, {}))
        result.append(row)
    return result


@mfg_router.get("/idols/{idol_id}", response_model=IdolOut)
def get_idol(idol_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == idol_id).first()
    if not idol:
        raise HTTPException(status_code=404, detail="Idol not found")
    row = IdolOut.from_orm(idol).dict()
    row.update(_summarize_idol_stages(db, [idol.id]).get(idol.id, {}))
    row.update(_idol_stock_snapshot_map(db, [idol.id]).get(idol.id, {}))
    return row


@mfg_router.post("/idols/{idol_id}/stock/place", response_model=IdolStockMovementOut, status_code=201)
def place_completed_idol_in_warehouse(
    idol_id: int,
    payload: IdolStockPlaceIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PRODUCTION_SUPERVISOR, Role.STORE_MANAGER, Role.PROJECT_MANAGER)),
):
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == idol_id, IdolManufacturing.is_deleted == False).first()
    if not idol:
        raise HTTPException(status_code=404, detail="Idol not found")
    if idol.status != WIPStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Only completed idol can be moved to warehouse stock")
    warehouse = db.query(Warehouse).filter(Warehouse.id == payload.warehouse_id, Warehouse.is_deleted == False).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    sale = db.query(IdolSale).filter(IdolSale.idol_id == idol_id).first()
    if sale:
        raise HTTPException(status_code=400, detail="Idol is already sold")

    latest = _idol_current_stock_row(db, idol_id)
    if latest and float(latest.balance_qty or 0) > 0:
        raise HTTPException(status_code=400, detail="Idol is already in warehouse stock. Use transfer endpoint.")

    idol_item = _ensure_idol_stock_item(db, idol)
    _append_stock_in(
        db,
        item_id=idol_item.id,
        warehouse_id=payload.warehouse_id,
        qty=1,
        reference_type="idol_stock_place",
        reference_id=idol.id,
        created_by=current_user.id,
        serial_no=idol.serial_no,
        remarks=payload.remarks or f"Placed completed idol {idol.serial_no} in stock",
    )
    _ensure_idol_serial(
        db,
        idol=idol,
        item_id=idol_item.id,
        warehouse_id=payload.warehouse_id,
        status="available",
        reference_type="idol_stock",
        reference_id=idol.id,
    )

    move = IdolStockMovement(
        idol_id=idol_id,
        warehouse_id=payload.warehouse_id,
        movement_type=MovementType.INWARD,
        qty_in=1,
        qty_out=0,
        balance_qty=1,
        reference_type="idol_completion",
        reference_id=idol_id,
        remarks=payload.remarks,
        created_by=current_user.id,
    )
    db.add(move)
    db.commit()
    db.refresh(move)
    return move


@mfg_router.post("/idols/{idol_id}/stock/transfer", response_model=List[IdolStockMovementOut], status_code=201)
def transfer_idol_stock(
    idol_id: int,
    payload: IdolStockTransferIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER, Role.PROJECT_MANAGER)),
):
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == idol_id, IdolManufacturing.is_deleted == False).first()
    if not idol:
        raise HTTPException(status_code=404, detail="Idol not found")
    if idol.status != WIPStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Only completed idol can be transferred")
    target_wh = db.query(Warehouse).filter(Warehouse.id == payload.to_warehouse_id, Warehouse.is_deleted == False).first()
    if not target_wh:
        raise HTTPException(status_code=404, detail="Target warehouse not found")
    sale = db.query(IdolSale).filter(IdolSale.idol_id == idol_id).first()
    if sale:
        raise HTTPException(status_code=400, detail="Idol is already sold")

    latest = _idol_current_stock_row(db, idol_id)
    if not latest or float(latest.balance_qty or 0) <= 0:
        raise HTTPException(status_code=400, detail="Idol is not currently available in stock")
    if latest.warehouse_id == payload.to_warehouse_id:
        raise HTTPException(status_code=400, detail="Source and destination warehouse cannot be same")

    idol_item = _ensure_idol_stock_item(db, idol)
    _append_stock_out(
        db,
        item_id=idol_item.id,
        warehouse_id=latest.warehouse_id,
        qty=1,
        reference_type="idol_stock_transfer",
        reference_id=idol.id,
        created_by=current_user.id,
        serial_no=idol.serial_no,
        remarks=payload.remarks or f"Transferred idol {idol.serial_no} out",
    )
    _append_stock_in(
        db,
        item_id=idol_item.id,
        warehouse_id=payload.to_warehouse_id,
        qty=1,
        reference_type="idol_stock_transfer",
        reference_id=idol.id,
        created_by=current_user.id,
        serial_no=idol.serial_no,
        remarks=payload.remarks or f"Transferred idol {idol.serial_no} in",
    )
    _ensure_idol_serial(
        db,
        idol=idol,
        item_id=idol_item.id,
        warehouse_id=payload.to_warehouse_id,
        status="available",
        reference_type="idol_stock",
        reference_id=idol.id,
    )

    out_move = IdolStockMovement(
        idol_id=idol_id,
        warehouse_id=latest.warehouse_id,
        movement_type=MovementType.TRANSFER,
        qty_in=0,
        qty_out=1,
        balance_qty=0,
        reference_type="idol_transfer",
        reference_id=idol_id,
        remarks=payload.remarks,
        created_by=current_user.id,
    )
    db.add(out_move)
    db.flush()

    in_move = IdolStockMovement(
        idol_id=idol_id,
        warehouse_id=payload.to_warehouse_id,
        movement_type=MovementType.TRANSFER,
        qty_in=1,
        qty_out=0,
        balance_qty=1,
        reference_type="idol_transfer",
        reference_id=out_move.id,
        remarks=payload.remarks,
        created_by=current_user.id,
    )
    db.add(in_move)
    db.commit()
    db.refresh(out_move)
    db.refresh(in_move)
    return [out_move, in_move]


@mfg_router.post("/idols/{idol_id}/stock/sell", status_code=201)
def sell_idol_from_stock(
    idol_id: int,
    payload: IdolSellIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ACCOUNTS_MANAGER, Role.STORE_MANAGER, Role.PROJECT_MANAGER)),
):
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == idol_id, IdolManufacturing.is_deleted == False).first()
    if not idol:
        raise HTTPException(status_code=404, detail="Idol not found")
    if idol.status != WIPStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Only completed idol can be sold")
    existing_sale = db.query(IdolSale).filter(IdolSale.idol_id == idol_id).first()
    if existing_sale:
        raise HTTPException(status_code=400, detail="Idol is already sold")

    latest = _idol_current_stock_row(db, idol_id)
    if not latest or float(latest.balance_qty or 0) <= 0:
        raise HTTPException(status_code=400, detail="Idol is not in stock. Place it in warehouse before sale")

    idol_item = _ensure_idol_stock_item(db, idol)
    _append_stock_out(
        db,
        item_id=idol_item.id,
        warehouse_id=latest.warehouse_id,
        qty=1,
        reference_type="idol_sale",
        reference_id=idol.id,
        created_by=current_user.id,
        serial_no=idol.serial_no,
        remarks=payload.remarks or f"Sold idol {idol.serial_no}",
    )
    _ensure_idol_serial(
        db,
        idol=idol,
        item_id=idol_item.id,
        warehouse_id=latest.warehouse_id,
        status="issued",
        reference_type="idol_sale",
        reference_id=idol.id,
    )

    out_move = IdolStockMovement(
        idol_id=idol_id,
        warehouse_id=latest.warehouse_id,
        movement_type=MovementType.OUTWARD,
        qty_in=0,
        qty_out=1,
        balance_qty=0,
        reference_type="idol_sale",
        reference_id=idol_id,
        remarks=payload.remarks,
        created_by=current_user.id,
    )
    db.add(out_move)
    db.flush()

    sale = IdolSale(
        idol_id=idol_id,
        warehouse_id=latest.warehouse_id,
        customer_name=payload.customer_name,
        customer_gstin=payload.customer_gstin,
        sale_date=payload.sale_date,
        sale_amount=payload.sale_amount,
        remarks=payload.remarks,
        created_by=current_user.id,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return {
        "message": "Idol sold successfully",
        "sale_id": sale.id,
        "idol_id": idol_id,
        "customer_name": sale.customer_name,
        "sale_date": str(sale.sale_date),
        "warehouse_id": sale.warehouse_id,
        "sale_amount": sale.sale_amount,
    }


@mfg_router.get("/idols/{idol_id}/stock/movements", response_model=List[IdolStockMovementOut])
def get_idol_stock_movements(
    idol_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == idol_id, IdolManufacturing.is_deleted == False).first()
    if not idol:
        raise HTTPException(status_code=404, detail="Idol not found")
    return (
        db.query(IdolStockMovement)
        .filter(IdolStockMovement.idol_id == idol_id)
        .order_by(IdolStockMovement.id.asc())
        .all()
    )


@mfg_router.post("/stock/sync-finished-idols")
def sync_finished_idol_stock_to_ledger(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER, Role.PROJECT_MANAGER)),
):
    idols = db.query(IdolManufacturing).filter(IdolManufacturing.is_deleted == False).all()
    synced = 0
    skipped = 0

    for idol in idols:
        latest = _idol_current_stock_row(db, idol.id)
        if not latest or float(latest.balance_qty or 0) <= 0:
            skipped += 1
            continue
        idol_item = _ensure_idol_stock_item(db, idol)
        current_bal = _latest_stock_balance(db, idol_item.id, latest.warehouse_id)
        if current_bal >= 1:
            _ensure_idol_serial(
                db,
                idol=idol,
                item_id=idol_item.id,
                warehouse_id=latest.warehouse_id,
                status="available",
                reference_type="idol_stock",
                reference_id=idol.id,
            )
            skipped += 1
            continue
        _append_stock_in(
            db,
            item_id=idol_item.id,
            warehouse_id=latest.warehouse_id,
            qty=1,
            reference_type="idol_stock_sync",
            reference_id=idol.id,
            created_by=current_user.id,
            serial_no=idol.serial_no,
            remarks=f"Backfilled idol stock for {idol.serial_no}",
        )
        _ensure_idol_serial(
            db,
            idol=idol,
            item_id=idol_item.id,
            warehouse_id=latest.warehouse_id,
            status="available",
            reference_type="idol_stock",
            reference_id=idol.id,
        )
        synced += 1

    db.commit()
    return {"message": "Finished idol stock sync completed", "synced": synced, "skipped": skipped}


@mfg_router.post("/stock/sync-issued-stone-blocks")
def sync_completed_idol_stone_blocks_to_issued(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER, Role.PROJECT_MANAGER, Role.PRODUCTION_SUPERVISOR)),
):
    completed_idols = (
        db.query(IdolManufacturing)
        .filter(
            IdolManufacturing.is_deleted == False,
            IdolManufacturing.status == WIPStatus.COMPLETED,
        )
        .all()
    )

    block_ids = set()
    for idol in completed_idols:
        if idol.stone_block_id:
            block_ids.add(idol.stone_block_id)
    if completed_idols:
        material_rows = (
            db.query(IdolMaterial.stone_block_id)
            .filter(
                IdolMaterial.idol_id.in_([i.id for i in completed_idols]),
                IdolMaterial.stone_block_id.isnot(None),
            )
            .all()
        )
        for (bid,) in material_rows:
            if bid:
                block_ids.add(bid)

    if not block_ids:
        return {"message": "No stone blocks linked with completed idols", "updated": 0, "skipped": 0}

    updatable_statuses = {"available", "allocated", "dispatched", "split", "job_work"}
    updated = 0
    skipped = 0

    blocks = db.query(StoneBlock).filter(StoneBlock.id.in_(list(block_ids))).all()
    for block in blocks:
        current_status = (block.status or "").lower()
        if current_status in updatable_statuses:
            block.status = "issued"
            updated += 1
        else:
            skipped += 1

    db.commit()
    log_audit(
        db,
        current_user.id,
        "SYNC",
        "stone_blocks",
        None,
        f"Sync completed idol stone blocks to issued (updated={updated}, skipped={skipped})",
    )
    return {"message": "Stone block issued-status sync completed", "updated": updated, "skipped": skipped}


@mfg_router.post("/stages", response_model=StageOut, status_code=201)
def add_stage(
    payload: StageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    stage_cost = round((payload.labor_hours * payload.labor_rate) + payload.material_cost, 2)

    stage_master_id = payload.stage_master_id
    stage_name = payload.stage_name
    stage_order = payload.stage_order

    if stage_master_id:
        master = db.query(StageMaster).filter(
            StageMaster.id == stage_master_id,
            (StageMaster.is_deleted == False) | (StageMaster.is_deleted.is_(None))
        ).first()
        if not master:
            raise HTTPException(status_code=400, detail="Stage master not found")
        stage_name = master.name
        # Keep stage_order from payload for manufacturing
    else:
        # Link to existing master by name, or create it
        master = db.query(StageMaster).filter(
            func.lower(StageMaster.name) == stage_name.lower(),
            (StageMaster.is_deleted == False) | (StageMaster.is_deleted.is_(None))
        ).first()
        if not master:
            master = StageMaster(name=stage_name, stage_order=stage_order)
            db.add(master)
            db.flush()
        stage_master_id = master.id

    stage = ManufacturingStage(
        idol_id=payload.idol_id,
        stage_master_id=stage_master_id,
        stage_name=stage_name,
        stage_order=stage_order,
        labor_hours=payload.labor_hours,
        labor_rate=payload.labor_rate,
        material_cost=payload.material_cost,
        remarks=payload.remarks,
        stage_cost=stage_cost,
    )
    db.add(stage)

    # Update idol total cost
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == payload.idol_id).first()
    if idol:
        _recalc_idol_totals(db, idol.id)
        _recalc_idol_status(db, idol.id)

    db.commit()
    db.refresh(stage)
    return stage


@mfg_router.put("/stages/{stage_id}", response_model=StageOut)
def update_stage(
    stage_id: int,
    payload: StageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    stage = db.query(ManufacturingStage).filter(ManufacturingStage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    idol_before = db.query(IdolManufacturing).filter(IdolManufacturing.id == stage.idol_id).first()
    prev_idol_status = idol_before.status if idol_before else None
    for k, v in payload.dict(exclude_none=True).items():
        setattr(stage, k, v)
    if payload.labor_hours is not None or payload.labor_rate is not None or payload.material_cost is not None:
        stage.stage_cost = round(
            (stage.labor_hours * stage.labor_rate) + stage.material_cost, 2
        )
    _recalc_idol_totals(db, stage.idol_id)
    _recalc_idol_status(db, stage.idol_id)
    idol_after = db.query(IdolManufacturing).filter(IdolManufacturing.id == stage.idol_id).first()
    if idol_after and prev_idol_status != WIPStatus.COMPLETED and idol_after.status == WIPStatus.COMPLETED:
        _consume_idol_materials_from_stock(db, stage.idol_id, current_user)
    db.commit()
    db.refresh(stage)
    return stage


@mfg_router.delete("/stages/{stage_id}", status_code=204)
def delete_stage(
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    stage = db.query(ManufacturingStage).filter(ManufacturingStage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    _hard_delete_or_400(db, stage, "stage")


@mfg_router.get("/idols/{idol_id}/stages", response_model=List[StageOut])
def get_stages(idol_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ManufacturingStage).filter(ManufacturingStage.idol_id == idol_id).order_by(ManufacturingStage.stage_order).all()


@mfg_router.post("/idols/{idol_id}/photos")
def upload_idol_photo(
    idol_id: int,
    stage_id: Optional[int] = None,
    caption: Optional[str] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    idol = db.query(IdolManufacturing).filter(IdolManufacturing.id == idol_id).first()
    if not idol:
        raise HTTPException(status_code=404, detail="Idol not found")
    fpath = _save_upload(file, f"idol_{idol_id}")
    photo = ManufacturingPhoto(
        idol_id=idol_id, stage_id=stage_id, file_path=fpath,
        caption=caption, uploaded_by=current_user.id
    )
    db.add(photo)
    db.commit()
    return {"message": "Photo uploaded", "file_path": fpath}


@mfg_router.delete("/photos/{photo_id}", status_code=204)
def delete_idol_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    photo = db.query(ManufacturingPhoto).filter(ManufacturingPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.file_path and os.path.exists(photo.file_path):
        try:
            os.remove(photo.file_path)
        except OSError:
            pass
    _hard_delete_or_400(db, photo, "photo")


# ─── Structural Components ────────────────────────────────

@mfg_router.post("/components", status_code=201)
def create_component(
    payload: StructuralComponentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    position = db.query(BlueprintPosition).filter(BlueprintPosition.id == payload.position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Blueprint position not found")

    # Dimensional compliance check
    is_compliant = True
    if all([payload.actual_length, payload.actual_width, payload.actual_height,
            position.req_length, position.req_width, position.req_height]):
        tol = position.tolerance_pct / 100
        is_compliant = (
            abs(payload.actual_length - position.req_length) / position.req_length <= tol and
            abs(payload.actual_width - position.req_width) / position.req_width <= tol and
            abs(payload.actual_height - position.req_height) / position.req_height <= tol
        )

    stage_total = (
        db.query(func.coalesce(func.sum(PositionStage.stage_cost), 0))
        .filter(PositionStage.position_id == payload.position_id)
        .scalar()
    ) or 0

    comp_data = payload.dict()
    comp_data["cost"] = float(stage_total) if float(stage_total) > 0 else float(comp_data.get("cost") or 0)
    comp = StructuralComponent(**comp_data, is_dimension_compliant=is_compliant)
    db.add(comp)
    db.commit()
    db.refresh(comp)
    log_audit(db, current_user.id, "CREATE", "structural_components", comp.id)
    return {"id": comp.id, "is_dimension_compliant": is_compliant, "wip_status": comp.wip_status}


@mfg_router.put("/components/{comp_id}/status")
def update_component_status(
    comp_id: int,
    wip_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    comp = db.query(StructuralComponent).filter(StructuralComponent.id == comp_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")
    comp.wip_status = wip_status
    db.commit()
    return {"message": f"WIP status updated to {wip_status}"}


@mfg_router.get("/components")
def list_components(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(StructuralComponent).filter(StructuralComponent.is_deleted == False)
    if project_id:
        q = q.filter(StructuralComponent.project_id == project_id)
    rows = q.order_by(StructuralComponent.id.desc()).all()
    return [
        {
            "id": c.id,
            "stone_block_id": c.stone_block_id,
            "position_id": c.position_id,
            "project_id": c.project_id,
            "cost": float(c.cost or 0),
            "actual_length": c.actual_length,
            "actual_width": c.actual_width,
            "actual_height": c.actual_height,
            "is_dimension_compliant": c.is_dimension_compliant,
            "wip_status": c.wip_status,
            "created_at": c.created_at,
        }
        for c in rows
    ]


@mfg_router.delete("/components/{comp_id}", status_code=204)
def delete_component(
    comp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MFG_ROLES)),
):
    comp = db.query(StructuralComponent).filter(StructuralComponent.id == comp_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")
    comp.is_deleted = True
    db.commit()


# ════════════════════════════════════════════════════════════════
# ALLOCATION & STOCK TRANSFER
# ════════════════════════════════════════════════════════════════

alloc_router = APIRouter(prefix="/allocations", tags=["Multi-Project Allocation"])


@alloc_router.post("", status_code=201)
def allocate_block(
    payload: AllocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER, Role.STORE_MANAGER)),
):
    # Prevent double allocation
    existing = db.query(BlockAllocation).filter(
        BlockAllocation.stone_block_id == payload.stone_block_id,
        BlockAllocation.is_released == False
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Block already allocated to project {existing.project_id}")

    alloc = BlockAllocation(**payload.dict(), allocated_by=current_user.id)
    db.add(alloc)

    block = db.query(StoneBlock).filter(StoneBlock.id == payload.stone_block_id).first()
    if block:
        block.project_id = payload.project_id
        block.status = "allocated"

    db.commit()
    db.refresh(alloc)
    log_audit(db, current_user.id, "ALLOCATE", "block_allocations", alloc.id)
    return {"message": "Block allocated", "allocation_id": alloc.id}


@alloc_router.delete("/{alloc_id}")
def release_allocation(
    alloc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER)),
):
    from datetime import datetime
    alloc = db.query(BlockAllocation).filter(BlockAllocation.id == alloc_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
    alloc.is_released = True
    alloc.released_at = datetime.utcnow()
    block = db.query(StoneBlock).filter(StoneBlock.id == alloc.stone_block_id).first()
    if block:
        block.status = "available"
        block.project_id = None
    db.commit()
    return {"message": "Allocation released"}


@alloc_router.get("")
def list_allocations(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(BlockAllocation).filter(BlockAllocation.is_released == False)
    if project_id:
        q = q.filter(BlockAllocation.project_id == project_id)
    return q.all()


@alloc_router.post("/transfers", status_code=201)
def stock_transfer(
    payload: StockTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER)),
):
    from models.models import StockLedger

    # Check source balance
    last_out = (
        db.query(StockLedger)
        .filter(StockLedger.item_id == payload.item_id, StockLedger.warehouse_id == payload.from_warehouse_id)
        .order_by(StockLedger.id.desc()).first()
    )
    source_balance = last_out.balance_qty if last_out else 0
    if source_balance < payload.qty:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {source_balance}")

    # Deduct from source
    last_in = (
        db.query(StockLedger)
        .filter(StockLedger.item_id == payload.item_id, StockLedger.warehouse_id == payload.to_warehouse_id)
        .order_by(StockLedger.id.desc()).first()
    )
    dest_balance = last_in.balance_qty if last_in else 0

    db.add(StockLedger(
        item_id=payload.item_id, warehouse_id=payload.from_warehouse_id,
        movement_type=MovementType.TRANSFER, qty_in=0, qty_out=payload.qty,
        balance_qty=source_balance - payload.qty, serial_no=payload.serial_no,
        remarks=f"Transfer out to WH-{payload.to_warehouse_id}", created_by=current_user.id
    ))
    db.add(StockLedger(
        item_id=payload.item_id, warehouse_id=payload.to_warehouse_id,
        movement_type=MovementType.TRANSFER, qty_in=payload.qty, qty_out=0,
        balance_qty=dest_balance + payload.qty, serial_no=payload.serial_no,
        remarks=f"Transfer in from WH-{payload.from_warehouse_id}", created_by=current_user.id
    ))

    transfer = StockTransfer(**payload.dict(), transferred_by=current_user.id)
    db.add(transfer)
    db.commit()
    log_audit(db, current_user.id, "STOCK_TRANSFER", "stock_transfers", transfer.id)
    return {"message": "Transfer completed", "transfer_id": transfer.id}


@alloc_router.delete("/transfers/{transfer_id}", status_code=204)
def delete_stock_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER)),
):
    transfer = db.query(StockTransfer).filter(StockTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found")
    _hard_delete_or_400(db, transfer, "stock transfer")


# ════════════════════════════════════════════════════════════════
# JOB WORK
# ════════════════════════════════════════════════════════════════

jobwork_router = APIRouter(prefix="/job-work", tags=["Job Work Management"])


def _gen_challan() -> str:
    return f"JW-{uuid.uuid4().hex[:8].upper()}"


@jobwork_router.post("", response_model=JobWorkOut, status_code=201)
def create_job_work(
    payload: JobWorkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER, Role.PROJECT_MANAGER)),
):
    block = db.query(StoneBlock).filter(StoneBlock.id == payload.stone_block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Stone block not found")

    jw = JobWork(challan_no=_gen_challan(), **payload.dict(), created_by=current_user.id)
    db.add(jw)

    block.status = "job_work"
    if payload.job_work_warehouse_id:
        block.warehouse_id = payload.job_work_warehouse_id

    db.commit()
    db.refresh(jw)
    log_audit(db, current_user.id, "CREATE", "job_works", jw.id, f"Challan: {jw.challan_no}")
    return jw


@jobwork_router.get("", response_model=List[JobWorkOut])
def list_job_works(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(JobWork).filter(JobWork.is_deleted == False)
    if status:
        q = q.filter(JobWork.status == status)
    return q.all()


@jobwork_router.get("/{jw_id}", response_model=JobWorkOut)
def get_job_work(jw_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jw = db.query(JobWork).filter(JobWork.id == jw_id, JobWork.is_deleted == False).first()
    if not jw:
        raise HTTPException(status_code=404, detail="Job work not found")
    return jw


@jobwork_router.put("/{jw_id}/return", response_model=JobWorkOut)
def process_return(
    jw_id: int,
    payload: JobWorkReturnUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER)),
):
    jw = db.query(JobWork).filter(JobWork.id == jw_id, JobWork.is_deleted == False).first()
    if not jw:
        raise HTTPException(status_code=404, detail="Job work not found")
    if jw.status == "returned":
        raise HTTPException(status_code=400, detail="Already returned")

    jw.actual_return_date = payload.actual_return_date
    jw.return_length = payload.return_length
    jw.return_width = payload.return_width
    jw.return_height = payload.return_height
    jw.job_cost = payload.job_cost
    jw.status = "returned"

    # Wastage = original volume - return volume
    block = db.query(StoneBlock).filter(StoneBlock.id == jw.stone_block_id).first()
    if block:
        return_vol = round(payload.return_length * payload.return_width * payload.return_height, 4)
        jw.wastage_volume = round(block.total_volume - return_vol, 4)
        block.length = payload.return_length
        block.width = payload.return_width
        block.height = payload.return_height
        block.available_volume = return_vol
        block.status = "available"
        block.warehouse_id = jw.from_warehouse_id

    db.commit()
    db.refresh(jw)
    log_audit(db, current_user.id, "RETURN", "job_works", jw_id, f"Wastage: {jw.wastage_volume}")
    return jw


@jobwork_router.delete("/{jw_id}", status_code=204)
def delete_job_work(
    jw_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER)),
):
    jw = db.query(JobWork).filter(JobWork.id == jw_id).first()
    if not jw:
        raise HTTPException(status_code=404, detail="Job work not found")
    _hard_delete_or_400(db, jw, "job work")


# ════════════════════════════════════════════════════════════════
# SITE EXECUTION
# ════════════════════════════════════════════════════════════════

site_router = APIRouter(prefix="/site", tags=["Site Execution"])

SITE_ROLES = (Role.ADMIN, Role.PROJECT_MANAGER, Role.SITE_SUPERVISOR, Role.STORE_MANAGER)


def _gen_dispatch_no() -> str:
    return f"DN-{uuid.uuid4().hex[:8].upper()}"


def _gen_dispatch_draft_no() -> str:
    return f"DRF-{uuid.uuid4().hex[:8].upper()}"


def _dispatch_workflow_map(db: Session, dispatch_ids: List[int]):
    if not dispatch_ids:
        return {}
    rows = db.query(DispatchWorkflow).filter(DispatchWorkflow.dispatch_id.in_(dispatch_ids)).all()
    return {r.dispatch_id: r for r in rows}


def _ensure_dispatch_workflow(db: Session, dispatch_id: int) -> DispatchWorkflow:
    row = db.query(DispatchWorkflow).filter(DispatchWorkflow.dispatch_id == dispatch_id).first()
    if row:
        return row
    row = DispatchWorkflow(dispatch_id=dispatch_id, status="draft")
    db.add(row)
    db.flush()
    return row


def _serialize_dispatch_row(dispatch: Dispatch, workflow: Optional[DispatchWorkflow]):
    status = workflow.status if workflow else "draft"
    challan_no = workflow.challan_no if workflow else None
    return {
        "id": dispatch.id,
        "dispatch_note_no": dispatch.dispatch_note_no,
        "project_id": dispatch.project_id,
        "from_warehouse_id": dispatch.from_warehouse_id,
        "to_warehouse_id": dispatch.to_warehouse_id,
        "dispatch_date": dispatch.dispatch_date,
        "transporter_name": dispatch.transporter_name,
        "eway_bill_no": dispatch.eway_bill_no,
        "total_value": float(dispatch.total_value or 0),
        "status": status,
        "challan_no": challan_no,
        "is_editable": status == "draft",
        "created_at": dispatch.created_at,
    }


def _validate_dispatch_items_for_create(
    db: Session,
    *,
    project_id: int,
    from_warehouse_id: int,
    items,
):
    if not items:
        raise HTTPException(status_code=400, detail="Add at least one item in dispatch")
    for item in items:
        if not item.stone_block_id and not item.item_id:
            raise HTTPException(status_code=400, detail="Each dispatch row must have stone_block_id or item_id")
        if float(item.qty or 0) <= 0:
            raise HTTPException(status_code=400, detail="Dispatch quantity must be greater than 0")
        if item.stone_block_id:
            block = (
                db.query(StoneBlock)
                .filter(StoneBlock.id == item.stone_block_id, StoneBlock.is_deleted == False)
                .first()
            )
            if not block:
                raise HTTPException(status_code=404, detail=f"Stone block not found: {item.stone_block_id}")
            if block.project_id and int(block.project_id) != int(project_id):
                raise HTTPException(status_code=400, detail=f"Stone block {block.serial_no} is not linked to selected project")
            if int(block.warehouse_id or 0) != int(from_warehouse_id):
                raise HTTPException(status_code=400, detail=f"Stone block {block.serial_no} is not in selected source warehouse")
            if block.status not in {"available", "allocated", "in_stock"}:
                raise HTTPException(status_code=400, detail=f"Stone block {block.serial_no} is not dispatchable (status={block.status})")
            if float(item.qty) > 1:
                raise HTTPException(status_code=400, detail=f"Stone block {block.serial_no} can be dispatched with qty 1 only")
        if item.item_id:
            item_master = db.query(Item).filter(Item.id == item.item_id, Item.is_deleted == False).first()
            if not item_master:
                raise HTTPException(status_code=404, detail=f"Item not found: {item.item_id}")
            serial_ids = list(getattr(item, "serial_ids", None) or [])
            if not serial_ids and hasattr(item, "id"):
                serial_ids = [
                    r.serial_id
                    for r in db.query(DispatchItemSerial.serial_id).filter(DispatchItemSerial.dispatch_item_id == item.id).all()
                ]
            if item_master.has_serial_no:
                if not serial_ids:
                    raise HTTPException(status_code=400, detail=f"Select serial number(s) for item {item_master.name}")
                if abs(float(item.qty or 0) - float(len(serial_ids))) > 1e-9:
                    raise HTTPException(status_code=400, detail=f"Qty must match selected serial count for item {item_master.name}")
                serials = (
                    db.query(ItemSerial)
                    .filter(ItemSerial.id.in_(serial_ids))
                    .all()
                )
                if len(serials) != len(serial_ids):
                    raise HTTPException(status_code=400, detail=f"Invalid serial selection for item {item_master.name}")
                for s in serials:
                    if int(s.item_id) != int(item.item_id):
                        raise HTTPException(status_code=400, detail=f"Serial {s.serial_no} does not belong to selected item")
                    if int(s.warehouse_id) != int(from_warehouse_id):
                        raise HTTPException(status_code=400, detail=f"Serial {s.serial_no} is not in selected source warehouse")
                    if s.status not in {"available", "allocated"}:
                        raise HTTPException(status_code=400, detail=f"Serial {s.serial_no} is not dispatchable")
            else:
                available = _latest_stock_balance(db, item.item_id, from_warehouse_id)
                if available + 1e-9 < float(item.qty):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for item_id={item.item_id}. Available={round(available, 3)}, requested={item.qty}",
                    )


@site_router.post("/dispatches", response_model=DispatchOut, status_code=201)
def create_dispatch(
    payload: DispatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*SITE_ROLES)),
):
    total_value = sum(i.qty * i.rate for i in payload.items)
    dispatch = Dispatch(
        dispatch_note_no=_gen_dispatch_draft_no(),
        project_id=payload.project_id,
        from_warehouse_id=payload.from_warehouse_id,
        to_warehouse_id=payload.to_warehouse_id,
        dispatch_date=payload.dispatch_date,
        transporter_name=payload.transporter_name,
        vehicle_no=payload.vehicle_no,
        lr_no=payload.lr_no,
        eway_bill_no=payload.eway_bill_no,
        eway_bill_date=payload.eway_bill_date,
        total_value=total_value,
        remarks=payload.remarks,
        created_by=current_user.id,
    )
    db.add(dispatch)
    db.flush()
    _validate_dispatch_items_for_create(
        db,
        project_id=payload.project_id,
        from_warehouse_id=payload.from_warehouse_id,
        items=payload.items,
    )
    for item in payload.items:
        di = DispatchItem(
            dispatch_id=dispatch.id,
            stone_block_id=item.stone_block_id,
            item_id=item.item_id,
            qty=item.qty,
            rate=item.rate,
            value=item.qty * item.rate,
            hsn_code=item.hsn_code,
        )
        db.add(di)
        db.flush()
        for sid in (item.serial_ids or []):
            db.add(DispatchItemSerial(dispatch_item_id=di.id, serial_id=int(sid)))
    wf = _ensure_dispatch_workflow(db, dispatch.id)
    db.commit()
    db.refresh(dispatch)
    log_audit(db, current_user.id, "CREATE", "dispatches", dispatch.id, f"Draft {dispatch.dispatch_note_no}")
    return _serialize_dispatch_row(dispatch, wf)


@site_router.put("/dispatches/{dispatch_id}", response_model=DispatchOut)
def update_dispatch(
    dispatch_id: int,
    payload: DispatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*SITE_ROLES)),
):
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id, Dispatch.is_deleted == False).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    wf = _ensure_dispatch_workflow(db, dispatch.id)
    if wf.status != "draft":
        raise HTTPException(status_code=400, detail="Dispatched record is locked and cannot be edited")

    dispatch.project_id = payload.project_id
    dispatch.from_warehouse_id = payload.from_warehouse_id
    dispatch.to_warehouse_id = payload.to_warehouse_id
    dispatch.dispatch_date = payload.dispatch_date
    dispatch.transporter_name = payload.transporter_name
    dispatch.vehicle_no = payload.vehicle_no
    dispatch.lr_no = payload.lr_no
    dispatch.eway_bill_no = payload.eway_bill_no
    dispatch.eway_bill_date = payload.eway_bill_date
    dispatch.remarks = payload.remarks
    dispatch.total_value = sum(i.qty * i.rate for i in payload.items)

    old_ids = [r.id for r in db.query(DispatchItem.id).filter(DispatchItem.dispatch_id == dispatch.id).all()]
    if old_ids:
        db.query(DispatchItemSerial).filter(DispatchItemSerial.dispatch_item_id.in_(old_ids)).delete(synchronize_session=False)
    db.query(DispatchItem).filter(DispatchItem.dispatch_id == dispatch.id).delete()
    _validate_dispatch_items_for_create(
        db,
        project_id=payload.project_id,
        from_warehouse_id=payload.from_warehouse_id,
        items=payload.items,
    )
    for item in payload.items:
        di = DispatchItem(
            dispatch_id=dispatch.id,
            stone_block_id=item.stone_block_id,
            item_id=item.item_id,
            qty=item.qty,
            rate=item.rate,
            value=item.qty * item.rate,
            hsn_code=item.hsn_code,
        )
        db.add(di)
        db.flush()
        for sid in (item.serial_ids or []):
            db.add(DispatchItemSerial(dispatch_item_id=di.id, serial_id=int(sid)))
    db.commit()
    db.refresh(dispatch)
    log_audit(db, current_user.id, "UPDATE", "dispatches", dispatch.id, f"Updated draft {dispatch.dispatch_note_no}")
    return _serialize_dispatch_row(dispatch, wf)


@site_router.get("/dispatches/fg-inventory", response_model=List[DispatchFGInventoryOut])
def fg_inventory_for_dispatch(
    project_id: int,
    from_warehouse_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows: List[dict] = []
    blocks = (
        db.query(StoneBlock)
        .filter(
            StoneBlock.is_deleted == False,
            StoneBlock.project_id == project_id,
            StoneBlock.warehouse_id == from_warehouse_id,
            StoneBlock.status.in_(["available", "allocated", "in_stock"]),
        )
        .all()
    )
    item_rows = db.query(Item).filter(Item.is_deleted == False).all()
    item_map = {i.id: i for i in item_rows}
    item_name_map = {i.id: i.name for i in item_rows}
    for b in blocks:
        length = float(b.length or 0)
        width = float(b.width or 0)
        height = float(b.height or 0)
        cft = float(b.total_volume or (length * width * height))
        rows.append(
            {
                "row_type": "stone_block",
                "item_id": b.item_id,
                "item_name": item_name_map.get(b.item_id),
                "stone_block_id": b.id,
                "serial_no": b.serial_no,
                "warehouse_id": from_warehouse_id,
                "available_qty": 1.0,
                "uom": "block",
                "length": length,
                "width": width,
                "height": height,
                "cft": cft,
            }
        )

    serial_rows = (
        db.query(ItemSerial)
        .filter(
            ItemSerial.warehouse_id == from_warehouse_id,
            ItemSerial.status == "available",
        )
        .all()
    )
    for s in serial_rows:
        item_name = item_name_map.get(s.item_id)
        rows.append(
            {
                "row_type": "item_serial",
                "item_id": s.item_id,
                "item_name": item_name,
                "stone_block_id": None,
                "serial_id": s.id,
                "serial_no": s.serial_no,
                "warehouse_id": from_warehouse_id,
                "available_qty": 1.0,
                "uom": "serial",
                "length": None,
                "width": None,
                "height": None,
                "cft": None,
            }
        )

    latest_per_item = (
        db.query(StockLedger.item_id, func.max(StockLedger.id).label("max_id"))
        .filter(StockLedger.warehouse_id == from_warehouse_id)
        .group_by(StockLedger.item_id)
        .all()
    )
    if latest_per_item:
        latest_ids = [r.max_id for r in latest_per_item]
        balances = db.query(StockLedger).filter(StockLedger.id.in_(latest_ids)).all()
        for bal in balances:
            qty = float(bal.balance_qty or 0)
            if qty <= 0:
                continue
            item = item_map.get(bal.item_id)
            if item and item.has_serial_no:
                continue
            rows.append(
                {
                    "row_type": "item",
                    "item_id": bal.item_id,
                    "item_name": item_name_map.get(bal.item_id),
                    "stone_block_id": None,
                    "serial_no": None,
                    "warehouse_id": from_warehouse_id,
                    "available_qty": qty,
                    "uom": "qty",
                    "length": None,
                    "width": None,
                    "height": None,
                    "cft": None,
                }
            )
    return rows


@site_router.post("/dispatches/{dispatch_id}/confirm", response_model=DispatchOut)
def confirm_dispatch(
    dispatch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*SITE_ROLES)),
):
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id, Dispatch.is_deleted == False).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    wf = _ensure_dispatch_workflow(db, dispatch.id)
    if wf.status != "draft":
        raise HTTPException(status_code=400, detail="Dispatch is already confirmed")

    items = db.query(DispatchItem).filter(DispatchItem.dispatch_id == dispatch.id).all()
    _validate_dispatch_items_for_create(
        db,
        project_id=dispatch.project_id,
        from_warehouse_id=dispatch.from_warehouse_id,
        items=items,
    )

    for item in items:
        if item.stone_block_id:
            block = db.query(StoneBlock).filter(StoneBlock.id == item.stone_block_id).first()
            if block:
                _append_stock_out(
                    db,
                    item_id=block.item_id,
                    warehouse_id=dispatch.from_warehouse_id,
                    qty=1,
                    reference_type="dispatch",
                    reference_id=dispatch.id,
                    created_by=current_user.id,
                    serial_no=block.serial_no,
                    remarks=f"Dispatch {dispatch.dispatch_note_no}",
                )
                _append_stock_in(
                    db,
                    item_id=block.item_id,
                    warehouse_id=dispatch.to_warehouse_id,
                    qty=1,
                    reference_type="dispatch",
                    reference_id=dispatch.id,
                    created_by=current_user.id,
                    serial_no=block.serial_no,
                    remarks=f"Dispatch {dispatch.dispatch_note_no}",
                )
                block.status = "dispatched"
                block.warehouse_id = dispatch.to_warehouse_id
        elif item.item_id:
            serial_links = db.query(DispatchItemSerial).filter(DispatchItemSerial.dispatch_item_id == item.id).all()
            if serial_links:
                serials = db.query(ItemSerial).filter(ItemSerial.id.in_([s.serial_id for s in serial_links])).all()
                for s in serials:
                    _append_stock_out(
                        db,
                        item_id=item.item_id,
                        warehouse_id=dispatch.from_warehouse_id,
                        qty=1,
                        reference_type="dispatch",
                        reference_id=dispatch.id,
                        created_by=current_user.id,
                        serial_no=s.serial_no,
                        remarks=f"Dispatch {dispatch.dispatch_note_no}",
                    )
                    _append_stock_in(
                        db,
                        item_id=item.item_id,
                        warehouse_id=dispatch.to_warehouse_id,
                        qty=1,
                        reference_type="dispatch",
                        reference_id=dispatch.id,
                        created_by=current_user.id,
                        serial_no=s.serial_no,
                        remarks=f"Dispatch {dispatch.dispatch_note_no}",
                    )
                    s.warehouse_id = dispatch.to_warehouse_id
                    s.reference_type = "dispatch"
                    s.reference_id = dispatch.id
                    s.status = "available"
            else:
                _append_stock_out(
                    db,
                    item_id=item.item_id,
                    warehouse_id=dispatch.from_warehouse_id,
                    qty=float(item.qty or 0),
                    reference_type="dispatch",
                    reference_id=dispatch.id,
                    created_by=current_user.id,
                    remarks=f"Dispatch {dispatch.dispatch_note_no}",
                )
                _append_stock_in(
                    db,
                    item_id=item.item_id,
                    warehouse_id=dispatch.to_warehouse_id,
                    qty=float(item.qty or 0),
                    reference_type="dispatch",
                    reference_id=dispatch.id,
                    created_by=current_user.id,
                    remarks=f"Dispatch {dispatch.dispatch_note_no}",
                )

    wf.status = "dispatched"
    wf.challan_no = _gen_dispatch_no()
    wf.confirmed_at = datetime.now()
    wf.confirmed_by = current_user.id
    dispatch.dispatch_note_no = wf.challan_no

    db.commit()
    db.refresh(dispatch)
    log_audit(db, current_user.id, "DISPATCH", "dispatches", dispatch.id, wf.challan_no)
    return _serialize_dispatch_row(dispatch, wf)


@site_router.get("/dispatches", response_model=List[DispatchOut])
def list_dispatches(project_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Dispatch).filter(Dispatch.is_deleted == False)
    if project_id:
        q = q.filter(Dispatch.project_id == project_id)
    rows = q.order_by(Dispatch.id.desc()).all()
    wf_map = _dispatch_workflow_map(db, [r.id for r in rows])
    return [_serialize_dispatch_row(r, wf_map.get(r.id)) for r in rows]


@site_router.get("/dispatches/{dispatch_id}/eway-bill")
def get_eway_bill_data(dispatch_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    items = db.query(DispatchItem).filter(DispatchItem.dispatch_id == dispatch_id).all()
    return {
        "dispatch_note_no": d.dispatch_note_no,
        "dispatch_date": str(d.dispatch_date),
        "transporter_name": d.transporter_name,
        "vehicle_no": d.vehicle_no,
        "lr_no": d.lr_no,
        "eway_bill_no": d.eway_bill_no,
        "total_value": d.total_value,
        "items": [{"stone_block_id": i.stone_block_id, "qty": i.qty, "rate": i.rate, "hsn_code": i.hsn_code} for i in items],
    }


@site_router.get("/dispatches/{dispatch_id}/challan")
def get_delivery_challan_data(dispatch_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(Dispatch).filter(Dispatch.id == dispatch_id, Dispatch.is_deleted == False).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    wf = _ensure_dispatch_workflow(db, d.id)
    if wf.status != "dispatched":
        raise HTTPException(status_code=400, detail="Delivery challan is available only after dispatch confirmation")
    items = db.query(DispatchItem).filter(DispatchItem.dispatch_id == dispatch_id).all()
    block_map = {
        b.id: {
            "serial_no": b.serial_no,
            "length": float(b.length or 0),
            "width": float(b.width or 0),
            "height": float(b.height or 0),
            "cft": float(b.total_volume or 0),
        }
        for b in db.query(StoneBlock).filter(StoneBlock.is_deleted == False).all()
    }
    item_map = {it.id: it.name for it in db.query(Item).filter(Item.is_deleted == False).all()}
    links = db.query(DispatchItemSerial).join(DispatchItem, DispatchItem.id == DispatchItemSerial.dispatch_item_id).filter(DispatchItem.dispatch_id == dispatch_id).all()
    serial_map = {s.id: s.serial_no for s in db.query(ItemSerial).all()}
    serials_by_dispatch_item = {}
    for l in links:
        serials_by_dispatch_item.setdefault(l.dispatch_item_id, []).append(serial_map.get(l.serial_id))
    return {
        "dispatch_id": d.id,
        "challan_no": wf.challan_no or d.dispatch_note_no,
        "dispatch_date": str(d.dispatch_date),
        "project_id": d.project_id,
        "from_warehouse_id": d.from_warehouse_id,
        "to_warehouse_id": d.to_warehouse_id,
        "transporter_name": d.transporter_name,
        "vehicle_no": d.vehicle_no,
        "lr_no": d.lr_no,
        "eway_bill_no": d.eway_bill_no,
        "total_value": float(d.total_value or 0),
        "remarks": d.remarks,
        "items": [
            {
                "stone_block_id": i.stone_block_id,
                "stone_serial_no": block_map.get(i.stone_block_id, {}).get("serial_no") if i.stone_block_id else None,
                "length": block_map.get(i.stone_block_id, {}).get("length") if i.stone_block_id else None,
                "width": block_map.get(i.stone_block_id, {}).get("width") if i.stone_block_id else None,
                "height": block_map.get(i.stone_block_id, {}).get("height") if i.stone_block_id else None,
                "cft": block_map.get(i.stone_block_id, {}).get("cft") if i.stone_block_id else None,
                "item_id": i.item_id,
                "item_name": item_map.get(i.item_id) if i.item_id else None,
                "serial_no": ", ".join([s for s in serials_by_dispatch_item.get(i.id, []) if s]) or None,
                "qty": float(i.qty or 0),
                "rate": float(i.rate or 0),
                "value": float(i.value or 0),
                "hsn_code": i.hsn_code,
            }
            for i in items
        ],
    }


@site_router.delete("/dispatches/{dispatch_id}", status_code=204)
def delete_dispatch(
    dispatch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*SITE_ROLES)),
):
    d = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    wf = _ensure_dispatch_workflow(db, d.id)
    if wf.status != "draft":
        raise HTTPException(status_code=400, detail="Confirmed dispatch cannot be deleted")
    _hard_delete_or_400(db, d, "dispatch")


@site_router.post("/installations", response_model=InstallationOut, status_code=201)
def create_installation(
    payload: InstallationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*SITE_ROLES)),
):
    from routers.blueprints import _are_prerequisites_met
    # Validate dependency
    if not _are_prerequisites_met(db, payload.position_id):
        raise HTTPException(status_code=400, detail="Cannot install: predecessor positions are not completed")

    position = (
        db.query(BlueprintPosition)
        .filter(BlueprintPosition.id == payload.position_id, BlueprintPosition.is_deleted == False)
        .first()
    )
    if not position:
        raise HTTPException(status_code=404, detail="Blueprint position not found")

    layer = (
        db.query(StructureLayer)
        .filter(StructureLayer.id == position.layer_id, StructureLayer.is_deleted == False)
        .first()
    )
    struct = (
        db.query(StructureType)
        .filter(StructureType.id == layer.structure_type_id, StructureType.is_deleted == False)
        .first()
        if layer
        else None
    )
    blueprint_project_id = struct.project_id if struct else None
    if not blueprint_project_id or blueprint_project_id != payload.project_id:
        raise HTTPException(
            status_code=400,
            detail="Selected position does not belong to the selected project blueprint",
        )

    block = db.query(StoneBlock).filter(StoneBlock.id == payload.stone_block_id, StoneBlock.is_deleted == False).first()
    if not block:
        raise HTTPException(status_code=404, detail="Stone block not found")

    allowed_block_ids = set()
    if position.stone_block_id:
        allowed_block_ids.add(position.stone_block_id)
    comp_rows = (
        db.query(StructuralComponent.stone_block_id)
        .filter(StructuralComponent.position_id == payload.position_id, StructuralComponent.is_deleted == False)
        .all()
    )
    for (bid,) in comp_rows:
        if bid:
            allowed_block_ids.add(bid)

    if allowed_block_ids and payload.stone_block_id not in allowed_block_ids:
        raise HTTPException(
            status_code=400,
            detail="Selected stone block is not linked with this blueprint position",
        )

    if block.project_id and block.project_id != payload.project_id:
        raise HTTPException(status_code=400, detail="Stone block belongs to a different project")

    inst = Installation(**payload.dict(), installed_by=current_user.id, status="installed")
    db.add(inst)
    if block:
        block.status = "installed"

    if position:
        position.status = "completed"

    # Update project completion
    _update_project_completion(db, payload.project_id)

    db.commit()
    db.refresh(inst)
    log_audit(db, current_user.id, "INSTALL", "installations", inst.id)
    return inst


@site_router.put("/installations/{inst_id}", response_model=InstallationOut)
def update_installation(
    inst_id: int,
    payload: InstallationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*SITE_ROLES)),
):
    from routers.blueprints import _are_prerequisites_met

    inst = db.query(Installation).filter(Installation.id == inst_id, Installation.is_deleted == False).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Installation not found")
    if inst.status == "verified":
        raise HTTPException(status_code=400, detail="Verified installation cannot be edited")

    if not _are_prerequisites_met(db, payload.position_id):
        raise HTTPException(status_code=400, detail="Cannot install: predecessor positions are not completed")

    position = (
        db.query(BlueprintPosition)
        .filter(BlueprintPosition.id == payload.position_id, BlueprintPosition.is_deleted == False)
        .first()
    )
    if not position:
        raise HTTPException(status_code=404, detail="Blueprint position not found")

    layer = (
        db.query(StructureLayer)
        .filter(StructureLayer.id == position.layer_id, StructureLayer.is_deleted == False)
        .first()
    )
    struct = (
        db.query(StructureType)
        .filter(StructureType.id == layer.structure_type_id, StructureType.is_deleted == False)
        .first()
        if layer
        else None
    )
    blueprint_project_id = struct.project_id if struct else None
    if not blueprint_project_id or blueprint_project_id != payload.project_id:
        raise HTTPException(
            status_code=400,
            detail="Selected position does not belong to the selected project blueprint",
        )

    block = db.query(StoneBlock).filter(StoneBlock.id == payload.stone_block_id, StoneBlock.is_deleted == False).first()
    if not block:
        raise HTTPException(status_code=404, detail="Stone block not found")

    allowed_block_ids = set()
    if position.stone_block_id:
        allowed_block_ids.add(position.stone_block_id)
    comp_rows = (
        db.query(StructuralComponent.stone_block_id)
        .filter(StructuralComponent.position_id == payload.position_id, StructuralComponent.is_deleted == False)
        .all()
    )
    for (bid,) in comp_rows:
        if bid:
            allowed_block_ids.add(bid)
    if allowed_block_ids and payload.stone_block_id not in allowed_block_ids:
        raise HTTPException(
            status_code=400,
            detail="Selected stone block is not linked with this blueprint position",
        )
    if block.project_id and block.project_id != payload.project_id:
        raise HTTPException(status_code=400, detail="Stone block belongs to a different project")

    old_block = db.query(StoneBlock).filter(StoneBlock.id == inst.stone_block_id).first()
    if old_block and old_block.id != payload.stone_block_id and (old_block.status or "").lower() == "installed":
        old_block.status = "allocated"

    for k, v in payload.dict().items():
        setattr(inst, k, v)
    inst.status = "installed"
    block.status = "installed"
    position.status = "completed"
    _update_project_completion(db, payload.project_id)
    db.commit()
    db.refresh(inst)
    return inst


def _update_project_completion(db: Session, project_id: int):
    from sqlalchemy import func
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return
    # Count all positions in structures linked to this project
    from models.models import StructureType, StructureLayer
    layers = (
        db.query(StructureLayer)
        .join(StructureType, StructureLayer.structure_type_id == StructureType.id)
        .filter(StructureType.project_id == project_id, StructureLayer.is_deleted == False)
        .all()
    )
    layer_ids = [l.id for l in layers]
    if not layer_ids:
        return
    total = db.query(BlueprintPosition).filter(
        BlueprintPosition.layer_id.in_(layer_ids), BlueprintPosition.is_deleted == False
    ).count()
    completed = db.query(BlueprintPosition).filter(
        BlueprintPosition.layer_id.in_(layer_ids),
        BlueprintPosition.status == "completed",
        BlueprintPosition.is_deleted == False
    ).count()
    project.completion_pct = round((completed / total * 100) if total else 0, 1)


@site_router.get("/installations", response_model=List[InstallationOut])
def list_installations(project_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Installation).filter(Installation.is_deleted == False)
    if project_id:
        q = q.filter(Installation.project_id == project_id)
    return q.all()


@site_router.delete("/installations/{inst_id}", status_code=204)
def delete_installation(
    inst_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*SITE_ROLES)),
):
    inst = db.query(Installation).filter(Installation.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Installation not found")
    _hard_delete_or_400(db, inst, "installation")


@site_router.put("/installations/{inst_id}/verify")
def verify_installation(
    inst_id: int,
    payload: InstallationVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER, Role.STRUCTURAL_ENGINEER)),
):
    from datetime import datetime
    inst = db.query(Installation).filter(Installation.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Installation not found")
    inst.status = payload.status
    inst.verified_by = current_user.id
    inst.verified_at = datetime.utcnow()
    if payload.remarks:
        inst.remarks = payload.remarks
    db.commit()
    return {"message": "Installation verified"}


@site_router.post("/installations/{inst_id}/photos")
def upload_site_photo(
    inst_id: int,
    caption: Optional[str] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*SITE_ROLES)),
):
    inst = db.query(Installation).filter(Installation.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Installation not found")
    dest_dir = os.path.join(UPLOAD_DIR, f"site_{inst_id}")
    os.makedirs(dest_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    fname = f"{uuid.uuid4().hex}{ext}"
    fpath = os.path.join(dest_dir, fname)
    with open(fpath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    photo = InstallationPhoto(installation_id=inst_id, file_path=fpath, caption=caption, uploaded_by=current_user.id)
    db.add(photo)
    db.commit()
    return {"message": "Photo uploaded", "file_path": fpath}


@site_router.delete("/installations/photos/{photo_id}", status_code=204)
def delete_installation_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*SITE_ROLES)),
):
    photo = db.query(InstallationPhoto).filter(InstallationPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.file_path and os.path.exists(photo.file_path):
        try:
            os.remove(photo.file_path)
        except OSError:
            pass
    _hard_delete_or_400(db, photo, "installation photo")


# ════════════════════════════════════════════════════════════════
# CONTRACTORS
# ════════════════════════════════════════════════════════════════

contractor_router = APIRouter(prefix="/contractors", tags=["Contractor Management"])

ACCT_ROLES = (Role.ADMIN, Role.ACCOUNTS_MANAGER, Role.PROJECT_MANAGER)


@contractor_router.post("", response_model=ContractorOut, status_code=201)
def create_contractor(
    payload: ContractorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ACCT_ROLES)),
):
    c = Contractor(**payload.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    log_audit(db, current_user.id, "CREATE", "contractors", c.id)
    return c


@contractor_router.get("", response_model=List[ContractorOut])
def list_contractors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Contractor).filter(Contractor.is_deleted == False).all()


@contractor_router.get("/{contractor_id}", response_model=ContractorOut)
def get_contractor(contractor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Contractor).filter(Contractor.id == contractor_id, Contractor.is_deleted == False).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return c


@contractor_router.put("/{contractor_id}", response_model=ContractorOut)
def update_contractor(
    contractor_id: int, payload: ContractorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ACCT_ROLES)),
):
    c = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.dict().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@contractor_router.delete("/{contractor_id}", status_code=204)
def delete_contractor(contractor_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(Role.ADMIN))):
    c = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    c.is_deleted = True
    db.commit()


@contractor_router.post("/agreements", response_model=AgreementOut, status_code=201)
def create_agreement(
    payload: AgreementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ACCT_ROLES)),
):
    agr = ContractorAgreement(
        agreement_no=f"AGR-{uuid.uuid4().hex[:8].upper()}",
        **payload.dict(),
    )
    db.add(agr)
    db.commit()
    db.refresh(agr)
    log_audit(db, current_user.id, "CREATE", "contractor_agreements", agr.id)
    return agr


@contractor_router.get("/agreements", response_model=List[AgreementOut])
def list_agreements(
    contractor_id: Optional[int] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ContractorAgreement).filter(ContractorAgreement.is_deleted == False)
    if contractor_id:
        q = q.filter(ContractorAgreement.contractor_id == contractor_id)
    if project_id:
        q = q.filter(ContractorAgreement.project_id == project_id)
    return q.all()


@contractor_router.delete("/agreements/{agreement_id}", status_code=204)
def delete_agreement(
    agreement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ACCT_ROLES)),
):
    agr = db.query(ContractorAgreement).filter(ContractorAgreement.id == agreement_id).first()
    if not agr:
        raise HTTPException(status_code=404, detail="Agreement not found")
    _hard_delete_or_400(db, agr, "agreement")


@contractor_router.post("/invoices", response_model=ContractorInvoiceOut, status_code=201)
def create_contractor_invoice(
    payload: ContractorInvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ACCT_ROLES)),
):
    agr = db.query(ContractorAgreement).filter(ContractorAgreement.id == payload.agreement_id).first()
    if not agr:
        raise HTTPException(status_code=404, detail="Agreement not found")

    # Validate milestone completion if linked
    if payload.milestone_id:
        milestone = db.query(Milestone).filter(Milestone.id == payload.milestone_id).first()
        if not milestone or milestone.status != MilestoneStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Linked milestone is not completed")

    gst_amount = round(payload.gross_amount * agr.gst_pct / 100, 2)
    tds_amount = round(payload.gross_amount * agr.tds_pct / 100, 2)
    retention_amount = round(payload.gross_amount * agr.retention_pct / 100, 2)
    net_payable = round(payload.gross_amount + gst_amount - tds_amount - retention_amount, 2)

    inv = ContractorInvoice(
        invoice_no=f"CI-{uuid.uuid4().hex[:8].upper()}",
        agreement_id=payload.agreement_id,
        milestone_id=payload.milestone_id,
        invoice_date=payload.invoice_date,
        gross_amount=payload.gross_amount,
        gst_amount=gst_amount,
        tds_amount=tds_amount,
        retention_amount=retention_amount,
        net_payable=net_payable,
        remarks=payload.remarks,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    log_audit(db, current_user.id, "CREATE", "contractor_invoices", inv.id)
    return inv


@contractor_router.get("/invoices", response_model=List[ContractorInvoiceOut])
def list_contractor_invoices(
    agreement_id: Optional[int] = None,
    payment_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ContractorInvoice).filter(ContractorInvoice.is_deleted == False)
    if agreement_id:
        q = q.filter(ContractorInvoice.agreement_id == agreement_id)
    if payment_status:
        q = q.filter(ContractorInvoice.payment_status == payment_status)
    return q.all()


@contractor_router.delete("/invoices/{inv_id}", status_code=204)
def delete_contractor_invoice(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ACCT_ROLES)),
):
    inv = db.query(ContractorInvoice).filter(ContractorInvoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    _hard_delete_or_400(db, inv, "contractor invoice")


@contractor_router.put("/invoices/{inv_id}/payment")
def update_payment_status(
    inv_id: int, paid_amount: float, paid_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ACCT_ROLES)),
):
    inv = db.query(ContractorInvoice).filter(ContractorInvoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.paid_amount += paid_amount
    inv.paid_date = paid_date
    if inv.paid_amount >= inv.net_payable:
        inv.payment_status = PaymentStatus.PAID
    else:
        inv.payment_status = PaymentStatus.PARTIAL
    db.commit()
    return {"message": "Payment updated", "payment_status": inv.payment_status}


# ════════════════════════════════════════════════════════════════
# MILESTONES & BILLING
# ════════════════════════════════════════════════════════════════

billing_router = APIRouter(prefix="/billing", tags=["Milestone-Based Billing"])


def _ensure_invoice_workflow(db: Session, invoice_id: int) -> InvoiceWorkflow:
    row = db.query(InvoiceWorkflow).filter(InvoiceWorkflow.invoice_id == invoice_id).first()
    if row:
        return row
    row = InvoiceWorkflow(invoice_id=invoice_id, status="draft")
    db.add(row)
    db.flush()
    return row


def _invoice_workflow_map(db: Session, invoice_ids: List[int]):
    if not invoice_ids:
        return {}
    rows = db.query(InvoiceWorkflow).filter(InvoiceWorkflow.invoice_id.in_(invoice_ids)).all()
    return {r.invoice_id: r for r in rows}


def _serialize_invoice_row(inv: SalesInvoice, wf: Optional[InvoiceWorkflow]):
    status = wf.status if wf else "draft"
    row = {
        "id": inv.id,
        "invoice_no": inv.invoice_no,
        "project_id": inv.project_id,
        "invoice_date": inv.invoice_date,
        "taxable_amount": float(inv.taxable_amount or 0),
        "total_tax": float(inv.total_tax or 0),
        "gross_amount": float(inv.gross_amount or 0),
        "advance_adjustment": float(inv.advance_adjustment or 0),
        "net_payable": float(inv.net_payable or 0),
        "payment_status": inv.payment_status,
        "invoice_status": status,
        "is_editable": status == "draft",
        "is_interstate": inv.is_interstate,
        "created_at": inv.created_at,
    }
    return row


def _invoice_html_document(inv: SalesInvoice, line_items: List[InvoiceLineItem], project_name: str) -> str:
    line_rows = "".join([
        f"""
        <tr>
          <td>{idx + 1}</td>
          <td>{li.description or '-'}</td>
          <td>{li.hsn_code or '-'}</td>
          <td style='text-align:right'>{float(li.qty or 0):.3f}</td>
          <td style='text-align:right'>{float(li.rate or 0):.2f}</td>
          <td style='text-align:right'>{float(li.amount or 0):.2f}</td>
        </tr>
        """
        for idx, li in enumerate(line_items)
    ])
    if not line_rows:
        line_rows = "<tr><td colspan='6' style='text-align:center'>No line items</td></tr>"

    tax_name = "IGST" if inv.is_interstate else "CGST + SGST"
    tax_value = float(inv.total_tax or 0)
    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>{inv.invoice_no}</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 20px; color:#111827; }}
      .header {{ display:flex; justify-content:space-between; margin-bottom: 14px; }}
      .title {{ font-size:22px; font-weight:700; }}
      .meta {{ font-size:12px; line-height:1.6; }}
      table {{ width:100%; border-collapse: collapse; margin-top: 12px; }}
      th, td {{ border:1px solid #d1d5db; padding:8px; font-size:12px; }}
      th {{ background:#f8fafc; text-align:left; }}
      .totals {{ margin-top:12px; width:320px; margin-left:auto; }}
      .totals td {{ border:1px solid #d1d5db; padding:8px; font-size:12px; }}
      .totals tr:last-child td {{ font-weight:700; }}
      .footer {{ margin-top:20px; font-size:11px; color:#4b5563; }}
      @media print {{ body {{ margin: 10mm; }} }}
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="title">TAX INVOICE</div>
        <div class="meta">Invoice No: <b>{inv.invoice_no}</b></div>
        <div class="meta">Invoice Date: <b>{inv.invoice_date}</b></div>
      </div>
      <div class="meta" style="text-align:right">
        <div><b>Matru ERP</b></div>
        <div>Project: {project_name or '-'}</div>
        <div>Client: {inv.client_name or '-'}</div>
        <div>GSTIN: {inv.client_gstin or '-'}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>HSN</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {line_rows}
      </tbody>
    </table>
    <table class="totals">
      <tr><td>Taxable Amount</td><td style="text-align:right">{float(inv.taxable_amount or 0):.2f}</td></tr>
      <tr><td>{tax_name}</td><td style="text-align:right">{tax_value:.2f}</td></tr>
      <tr><td>Gross Amount</td><td style="text-align:right">{float(inv.gross_amount or 0):.2f}</td></tr>
      <tr><td>Advance Adjustment</td><td style="text-align:right">{float(inv.advance_adjustment or 0):.2f}</td></tr>
      <tr><td>Net Payable</td><td style="text-align:right">{float(inv.net_payable or 0):.2f}</td></tr>
    </table>
    <div class="footer">Generated by Matru ERP • Payment Status: {inv.payment_status}</div>
  </body>
</html>"""


def _invoice_pdf_document(inv: SalesInvoice, line_items: List[InvoiceLineItem], project_name: str) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    y = height - 40

    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, y, "TAX INVOICE")
    y -= 22

    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"Invoice No: {inv.invoice_no}")
    c.drawRightString(width - 40, y, f"Date: {inv.invoice_date}")
    y -= 14
    c.drawString(40, y, f"Project: {project_name or '-'}")
    y -= 14
    c.drawString(40, y, f"Client: {inv.client_name or '-'}")
    c.drawRightString(width - 40, y, f"GSTIN: {inv.client_gstin or '-'}")
    y -= 20

    # Header row
    headers = ["#", "Description", "HSN", "Qty", "Rate", "Amount"]
    col_x = [40, 65, 320, 390, 450, 520]
    c.setFont("Helvetica-Bold", 9)
    for i, h in enumerate(headers):
        c.drawString(col_x[i], y, h)
    y -= 12
    c.line(40, y, width - 40, y)
    y -= 10

    c.setFont("Helvetica", 9)
    for idx, li in enumerate(line_items):
        if y < 110:
            c.showPage()
            y = height - 40
            c.setFont("Helvetica-Bold", 9)
            for i, h in enumerate(headers):
                c.drawString(col_x[i], y, h)
            y -= 12
            c.line(40, y, width - 40, y)
            y -= 10
            c.setFont("Helvetica", 9)
        c.drawString(col_x[0], y, str(idx + 1))
        c.drawString(col_x[1], y, str(li.description or "-")[:48])
        c.drawString(col_x[2], y, str(li.hsn_code or "-"))
        c.drawRightString(col_x[4] - 10, y, f"{float(li.qty or 0):.3f}")
        c.drawRightString(col_x[5] - 10, y, f"{float(li.rate or 0):.2f}")
        c.drawRightString(width - 40, y, f"{float(li.amount or 0):.2f}")
        y -= 12

    y -= 8
    c.line(40, y, width - 40, y)
    y -= 16

    c.setFont("Helvetica", 10)
    c.drawRightString(500, y, "Taxable Amount")
    c.drawRightString(width - 40, y, f"{float(inv.taxable_amount or 0):.2f}")
    y -= 14
    c.drawRightString(500, y, "Total Tax")
    c.drawRightString(width - 40, y, f"{float(inv.total_tax or 0):.2f}")
    y -= 14
    c.drawRightString(500, y, "Gross Amount")
    c.drawRightString(width - 40, y, f"{float(inv.gross_amount or 0):.2f}")
    y -= 14
    c.drawRightString(500, y, "Advance Adjustment")
    c.drawRightString(width - 40, y, f"{float(inv.advance_adjustment or 0):.2f}")
    y -= 14
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(500, y, "Net Payable")
    c.drawRightString(width - 40, y, f"{float(inv.net_payable or 0):.2f}")

    c.setFont("Helvetica", 8)
    c.drawString(40, 35, f"Generated by Matru ERP | Payment Status: {inv.payment_status}")
    c.showPage()
    c.save()
    data = buf.getvalue()
    buf.close()
    return data


@billing_router.post("/milestones", response_model=MilestoneOut, status_code=201)
def create_milestone(
    payload: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER)),
):
    m = Milestone(**payload.dict())
    db.add(m)
    db.commit()
    db.refresh(m)
    log_audit(db, current_user.id, "CREATE", "milestones", m.id)
    return m


@billing_router.get("/milestones", response_model=List[MilestoneOut])
def list_milestones(
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Milestone).filter(Milestone.is_deleted == False)
    if project_id:
        q = q.filter(Milestone.project_id == project_id)
    if status:
        q = q.filter(Milestone.status == status)
    return q.all()


@billing_router.delete("/milestones/{milestone_id}", status_code=204)
def delete_milestone(
    milestone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER, Role.SITE_SUPERVISOR)),
):
    m = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")
    _hard_delete_or_400(db, m, "milestone")


@billing_router.put("/milestones/{milestone_id}", response_model=MilestoneOut)
def update_milestone(
    milestone_id: int,
    payload: MilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER, Role.SITE_SUPERVISOR)),
):
    m = db.query(Milestone).filter(Milestone.id == milestone_id, Milestone.is_deleted == False).first()
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for k, v in payload.dict(exclude_none=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@billing_router.post("/invoices", response_model=SalesInvoiceOut, status_code=201)
def create_sales_invoice(
    payload: SalesInvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ACCOUNTS_MANAGER)),
):
    # Block invoice if milestone incomplete
    if payload.milestone_id:
        ms = db.query(Milestone).filter(Milestone.id == payload.milestone_id).first()
        if not ms or ms.status != MilestoneStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Cannot invoice: milestone not completed")

    dispatch_allocs = payload.dispatch_allocations or []
    invoice_lines = list(payload.line_items or [])

    if dispatch_allocs:
        alloc_ids = [int(a.dispatch_item_id) for a in dispatch_allocs]
        d_items = db.query(DispatchItem).filter(DispatchItem.id.in_(alloc_ids)).all()
        d_item_map = {d.id: d for d in d_items}
        if len(d_item_map) != len(set(alloc_ids)):
            raise HTTPException(status_code=400, detail="Invalid dispatch item selection")

        dispatch_ids = {d.dispatch_id for d in d_items}
        dispatches = db.query(Dispatch).filter(Dispatch.id.in_(dispatch_ids), Dispatch.is_deleted == False).all()
        dispatch_map = {d.id: d for d in dispatches}
        wf_rows = db.query(DispatchWorkflow).filter(DispatchWorkflow.dispatch_id.in_(dispatch_ids)).all()
        wf_map = {w.dispatch_id: w for w in wf_rows}

        billed_rows = (
            db.query(InvoiceDispatchAllocation.dispatch_item_id, func.sum(InvoiceDispatchAllocation.billed_qty))
            .filter(InvoiceDispatchAllocation.dispatch_item_id.in_(alloc_ids))
            .group_by(InvoiceDispatchAllocation.dispatch_item_id)
            .all()
        )
        billed_map = {item_id: float(q or 0) for item_id, q in billed_rows}

        item_name_map = {i.id: i.name for i in db.query(Item).filter(Item.is_deleted == False).all()}
        block_map = {b.id: b.serial_no for b in db.query(StoneBlock).filter(StoneBlock.is_deleted == False).all()}

        auto_lines = []
        for alloc in dispatch_allocs:
            d_item = d_item_map[int(alloc.dispatch_item_id)]
            dispatch = dispatch_map.get(d_item.dispatch_id)
            wf = wf_map.get(d_item.dispatch_id)
            if not dispatch or dispatch.project_id != payload.project_id:
                raise HTTPException(status_code=400, detail="Dispatch item does not belong to selected project")
            if not wf or wf.status != "dispatched":
                raise HTTPException(status_code=400, detail="Only confirmed dispatch items can be invoiced")

            already_billed = float(billed_map.get(d_item.id, 0))
            unbilled = float(d_item.qty or 0) - already_billed
            req_qty = float(alloc.qty or 0)
            if req_qty <= 0:
                raise HTTPException(status_code=400, detail="Invoice qty must be > 0")
            if req_qty - unbilled > 1e-9:
                raise HTTPException(
                    status_code=400,
                    detail=f"Over billing not allowed for dispatch item {d_item.id}. Unbilled={round(unbilled, 3)}",
                )
            description = (
                f"Stone Block {block_map.get(d_item.stone_block_id) or d_item.stone_block_id}"
                if d_item.stone_block_id
                else item_name_map.get(d_item.item_id, f"Item {d_item.item_id}")
            )
            auto_lines.append({
                "description": description,
                "hsn_code": d_item.hsn_code,
                "qty": req_qty,
                "rate": float(d_item.rate or 0),
                "dispatch_item_id": d_item.id,
                "dispatch_id": d_item.dispatch_id,
            })

        if not invoice_lines:
            from types import SimpleNamespace
            invoice_lines = [SimpleNamespace(description=l["description"], hsn_code=l["hsn_code"], qty=l["qty"], rate=l["rate"]) for l in auto_lines]
    else:
        auto_lines = []

    if not invoice_lines:
        raise HTTPException(status_code=400, detail="Provide line items or dispatch allocations")

    # Calculate taxable amount
    taxable = sum(float(li.qty or 0) * float(li.rate or 0) for li in invoice_lines)

    # Determine interstate
    interstate = False
    if payload.from_state_code and payload.to_state_code:
        interstate = is_interstate_transaction(payload.from_state_code, payload.to_state_code)

    gst = calculate_gst(taxable, payload.gst_rate, interstate)
    gross = gst["gross_amount"]
    net_payable = round(gross - payload.advance_adjustment, 2)

    inv = SalesInvoice(
        invoice_no=f"INV-DRAFT-{uuid.uuid4().hex[:6].upper()}",
        project_id=payload.project_id,
        milestone_id=payload.milestone_id,
        invoice_date=payload.invoice_date,
        client_name=payload.client_name,
        client_gstin=payload.client_gstin,
        from_state=payload.from_state,
        to_state=payload.to_state,
        is_interstate=interstate,
        is_reverse_charge=payload.is_reverse_charge,
        taxable_amount=taxable,
        cgst_rate=gst["cgst_rate"], cgst_amount=gst["cgst_amount"],
        sgst_rate=gst["sgst_rate"], sgst_amount=gst["sgst_amount"],
        igst_rate=gst["igst_rate"], igst_amount=gst["igst_amount"],
        total_tax=gst["total_tax"],
        gross_amount=gross,
        advance_adjustment=payload.advance_adjustment,
        net_payable=net_payable,
        created_by=current_user.id,
    )
    db.add(inv)
    db.flush()

    for li in invoice_lines:
        db.add(InvoiceLineItem(
            invoice_id=inv.id,
            description=li.description,
            hsn_code=li.hsn_code,
            qty=float(li.qty or 0),
            rate=float(li.rate or 0),
            amount=float(li.qty or 0) * float(li.rate or 0),
        ))
    if dispatch_allocs:
        for l in auto_lines:
            db.add(InvoiceDispatchAllocation(
                invoice_id=inv.id,
                dispatch_id=int(l["dispatch_id"]),
                dispatch_item_id=int(l["dispatch_item_id"]),
                billed_qty=float(l["qty"]),
            ))

    # Adjust advance payment balance if applicable
    if payload.advance_adjustment > 0:
        advance = db.query(AdvancePayment).filter(
            AdvancePayment.project_id == payload.project_id,
        ).order_by(AdvancePayment.id.desc()).first()
        if advance and advance.balance >= payload.advance_adjustment:
            advance.adjusted_amount += payload.advance_adjustment
            advance.balance -= payload.advance_adjustment

    wf = _ensure_invoice_workflow(db, inv.id)
    db.commit()
    db.refresh(inv)
    log_audit(db, current_user.id, "CREATE", "sales_invoices", inv.id, inv.invoice_no)
    return _serialize_invoice_row(inv, wf)


@billing_router.get("/dispatch-items", response_model=List[DispatchInvoiceItemOut])
def list_dispatch_items_for_invoicing(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dispatches = (
        db.query(Dispatch)
        .join(DispatchWorkflow, DispatchWorkflow.dispatch_id == Dispatch.id)
        .filter(
            Dispatch.project_id == project_id,
            Dispatch.is_deleted == False,
            DispatchWorkflow.status == "dispatched",
        )
        .all()
    )
    if not dispatches:
        return []
    d_map = {d.id: d for d in dispatches}
    d_ids = list(d_map.keys())
    d_items = db.query(DispatchItem).filter(DispatchItem.dispatch_id.in_(d_ids)).all()
    if not d_items:
        return []
    d_item_ids = [i.id for i in d_items]
    billed_rows = (
        db.query(InvoiceDispatchAllocation.dispatch_item_id, func.sum(InvoiceDispatchAllocation.billed_qty))
        .filter(InvoiceDispatchAllocation.dispatch_item_id.in_(d_item_ids))
        .group_by(InvoiceDispatchAllocation.dispatch_item_id)
        .all()
    )
    billed_map = {item_id: float(q or 0) for item_id, q in billed_rows}
    link_rows = db.query(DispatchItemSerial).filter(DispatchItemSerial.dispatch_item_id.in_(d_item_ids)).all()
    serial_ids = [l.serial_id for l in link_rows]
    serial_no_map = {s.id: s.serial_no for s in db.query(ItemSerial).filter(ItemSerial.id.in_(serial_ids)).all()} if serial_ids else {}
    serials_by_item = {}
    for l in link_rows:
        serials_by_item.setdefault(l.dispatch_item_id, []).append(serial_no_map.get(l.serial_id))
    item_name_map = {i.id: i.name for i in db.query(Item).filter(Item.is_deleted == False).all()}
    block_map = {
        b.id: {
            "serial_no": b.serial_no,
            "length": float(b.length or 0),
            "width": float(b.width or 0),
            "height": float(b.height or 0),
            "cft": float(b.total_volume or 0),
        }
        for b in db.query(StoneBlock).filter(StoneBlock.is_deleted == False).all()
    }
    result = []
    for row in d_items:
        d = d_map.get(row.dispatch_id)
        billed = float(billed_map.get(row.id, 0))
        dispatched = float(row.qty or 0)
        unbilled = round(dispatched - billed, 6)
        if unbilled <= 0:
            continue
        serial_no = block_map.get(row.stone_block_id, {}).get("serial_no") if row.stone_block_id else None
        if not serial_no:
            serial_no = ", ".join([s for s in serials_by_item.get(row.id, []) if s]) or None
        description = (
            f"Stone Block {serial_no or row.stone_block_id}"
            if row.stone_block_id
            else item_name_map.get(row.item_id, f"Item {row.item_id}")
        )
        result.append({
            "dispatch_id": d.id,
            "dispatch_note_no": d.dispatch_note_no,
            "dispatch_date": d.dispatch_date,
            "dispatch_item_id": row.id,
            "item_id": row.item_id,
            "stone_block_id": row.stone_block_id,
            "serial_no": serial_no,
            "length": block_map.get(row.stone_block_id, {}).get("length") if row.stone_block_id else None,
            "width": block_map.get(row.stone_block_id, {}).get("width") if row.stone_block_id else None,
            "height": block_map.get(row.stone_block_id, {}).get("height") if row.stone_block_id else None,
            "cft": block_map.get(row.stone_block_id, {}).get("cft") if row.stone_block_id else None,
            "description": description,
            "rate": float(row.rate or 0),
            "dispatched_qty": dispatched,
            "billed_qty": billed,
            "unbilled_qty": unbilled,
        })
    return result


@billing_router.get("/invoices", response_model=List[SalesInvoiceOut])
def list_invoices(
    project_id: Optional[int] = None,
    payment_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(SalesInvoice).filter(SalesInvoice.is_deleted == False)
    if project_id:
        q = q.filter(SalesInvoice.project_id == project_id)
    if payment_status:
        q = q.filter(SalesInvoice.payment_status == payment_status)
    rows = q.order_by(SalesInvoice.id.desc()).all()
    wf_map = _invoice_workflow_map(db, [r.id for r in rows])
    return [_serialize_invoice_row(r, wf_map.get(r.id)) for r in rows]


@billing_router.get("/invoices/{inv_id}", response_model=SalesInvoiceOut)
def get_invoice(inv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inv = db.query(SalesInvoice).filter(SalesInvoice.id == inv_id, SalesInvoice.is_deleted == False).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    wf = _ensure_invoice_workflow(db, inv.id)
    return _serialize_invoice_row(inv, wf)


@billing_router.get("/invoices/{inv_id}/pdf")
def invoice_pdf(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(SalesInvoice).filter(SalesInvoice.id == inv_id, SalesInvoice.is_deleted == False).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    items = db.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv.id).all()
    project = db.query(Project).filter(Project.id == inv.project_id).first()
    pdf_bytes = _invoice_pdf_document(inv, items, project.name if project else "")
    filename = f"{inv.invoice_no or f'invoice-{inv.id}'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@billing_router.post("/invoices/{inv_id}/issue", response_model=SalesInvoiceOut)
def issue_invoice(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ACCOUNTS_MANAGER)),
):
    inv = db.query(SalesInvoice).filter(SalesInvoice.id == inv_id, SalesInvoice.is_deleted == False).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    wf = _ensure_invoice_workflow(db, inv.id)
    if wf.status == "issued":
        raise HTTPException(status_code=400, detail="Invoice is already issued")
    wf.status = "issued"
    wf.issued_at = datetime.utcnow()
    wf.issued_by = current_user.id
    if not inv.invoice_no or str(inv.invoice_no).startswith("INV-DRAFT-"):
        inv.invoice_no = f"INV-{uuid.uuid4().hex[:8].upper()}"
    db.commit()
    db.refresh(inv)
    log_audit(db, current_user.id, "ISSUE", "sales_invoices", inv.id, inv.invoice_no)
    return _serialize_invoice_row(inv, wf)


@billing_router.delete("/invoices/{inv_id}", status_code=204)
def delete_invoice(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ACCOUNTS_MANAGER)),
):
    inv = db.query(SalesInvoice).filter(SalesInvoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    wf = _ensure_invoice_workflow(db, inv.id)
    if wf.status == "issued":
        raise HTTPException(status_code=400, detail="Issued invoice cannot be deleted")
    _hard_delete_or_400(db, inv, "invoice")


@billing_router.put("/invoices/{inv_id}/payment")
def record_invoice_payment(
    inv_id: int, paid_amount: float, paid_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ACCOUNTS_MANAGER)),
):
    inv = db.query(SalesInvoice).filter(SalesInvoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    wf = _ensure_invoice_workflow(db, inv.id)
    if wf.status != "issued":
        raise HTTPException(status_code=400, detail="Issue invoice before recording payment")
    inv.paid_amount += paid_amount
    inv.paid_date = paid_date
    if inv.paid_amount >= inv.net_payable:
        inv.payment_status = PaymentStatus.PAID
    else:
        inv.payment_status = PaymentStatus.PARTIAL
    db.commit()
    return {"message": "Payment recorded", "payment_status": inv.payment_status}


@billing_router.post("/advance-payments", response_model=AdvancePaymentOut, status_code=201)
def create_advance_payment(
    payload: AdvancePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ACCOUNTS_MANAGER)),
):
    adv = AdvancePayment(**payload.dict(), balance=payload.amount, adjusted_amount=0)
    db.add(adv)
    db.commit()
    db.refresh(adv)
    return adv


@billing_router.get("/advance-payments", response_model=List[AdvancePaymentOut])
def list_advance_payments(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AdvancePayment)
    if project_id:
        q = q.filter(AdvancePayment.project_id == project_id)
    return q.all()


@billing_router.delete("/advance-payments/{adv_id}", status_code=204)
def delete_advance_payment(
    adv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ACCOUNTS_MANAGER)),
):
    adv = db.query(AdvancePayment).filter(AdvancePayment.id == adv_id).first()
    if not adv:
        raise HTTPException(status_code=404, detail="Advance payment not found")
    _hard_delete_or_400(db, adv, "advance payment")


# ════════════════════════════════════════════════════════════════
# GST & FINANCE
# ════════════════════════════════════════════════════════════════

gst_router = APIRouter(prefix="/gst", tags=["GST & Finance"])


@gst_router.get("/calculate")
def calculate_gst_endpoint(
    amount: float,
    gst_rate: float,
    is_interstate: bool = False,
    current_user: User = Depends(get_current_user),
):
    return calculate_gst(amount, gst_rate, is_interstate)


@gst_router.get("/gstr1")
def export_gstr1(
    project_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ACCOUNTS_MANAGER)),
):
    """Export GSTR-1 data for the given period."""
    q = db.query(SalesInvoice).filter(SalesInvoice.is_deleted == False)
    if project_id:
        q = q.filter(SalesInvoice.project_id == project_id)
    if from_date:
        q = q.filter(SalesInvoice.invoice_date >= from_date)
    if to_date:
        q = q.filter(SalesInvoice.invoice_date <= to_date)
    invoices = q.all()

    records = []
    for inv in invoices:
        records.append({
            "invoice_no": inv.invoice_no,
            "invoice_date": str(inv.invoice_date),
            "client_name": inv.client_name,
            "client_gstin": inv.client_gstin,
            "taxable_amount": inv.taxable_amount,
            "cgst": inv.cgst_amount,
            "sgst": inv.sgst_amount,
            "igst": inv.igst_amount,
            "total_tax": inv.total_tax,
            "gross_amount": inv.gross_amount,
            "is_interstate": inv.is_interstate,
            "is_reverse_charge": inv.is_reverse_charge,
        })
    return {"period": {"from": str(from_date), "to": str(to_date)}, "count": len(records), "records": records}


@gst_router.post("/project-costs", response_model=ProjectCostOut, status_code=201)
def add_project_cost(
    payload: ProjectCostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ACCOUNTS_MANAGER, Role.PROJECT_MANAGER)),
):
    cost = ProjectCost(**payload.dict(), created_by=current_user.id)
    db.add(cost)
    db.commit()
    db.refresh(cost)
    return cost


@gst_router.get("/project-costs", response_model=List[ProjectCostOut])
def list_project_costs(
    project_id: Optional[int] = None,
    cost_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ProjectCost)
    if project_id:
        q = q.filter(ProjectCost.project_id == project_id)
    if cost_type:
        q = q.filter(ProjectCost.cost_type == cost_type)
    return q.all()


@gst_router.delete("/project-costs/{cost_id}", status_code=204)
def delete_project_cost(
    cost_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.ACCOUNTS_MANAGER, Role.PROJECT_MANAGER)),
):
    cost = db.query(ProjectCost).filter(ProjectCost.id == cost_id).first()
    if not cost:
        raise HTTPException(status_code=404, detail="Project cost not found")
    _hard_delete_or_400(db, cost, "project cost")


@gst_router.get("/project-margin/{project_id}", response_model=ProjectMarginOut)
def get_project_margin(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    costs = db.query(ProjectCost).filter(ProjectCost.project_id == project_id).all()
    material = sum(c.amount for c in costs if c.cost_type == "material")
    labor = sum(c.amount for c in costs if c.cost_type == "labor")
    contractor = sum(c.amount for c in costs if c.cost_type == "contractor")
    site_expense = sum(c.amount for c in costs if c.cost_type == "site_expense")
    total_cost = material + labor + contractor + site_expense
    gross_margin = project.total_value - total_cost
    margin_pct = round((gross_margin / project.total_value * 100) if project.total_value else 0, 2)

    return {
        "project_id": project_id,
        "project_name": project.name,
        "total_value": project.total_value,
        "material_cost": material,
        "labor_cost": labor,
        "contractor_cost": contractor,
        "site_expense": site_expense,
        "total_cost": total_cost,
        "gross_margin": gross_margin,
        "margin_pct": margin_pct,
    }


# ════════════════════════════════════════════════════════════════
# AUDIT LOGS
# ════════════════════════════════════════════════════════════════

audit_router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@audit_router.get("/logs", response_model=List[AuditLogOut])
def get_audit_logs(
    module: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN)),
):
    q = db.query(AuditLog)
    if module:
        q = q.filter(AuditLog.module == module)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    return q.order_by(AuditLog.id.desc()).limit(limit).all()
