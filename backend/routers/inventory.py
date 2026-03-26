from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import math
from database import get_db
from models.models import Item, ItemCategory, Warehouse, StockLedger, User, ItemReservation, BlockAllocation, StoneBlock, ItemSerial, ScrapEntry
from models.project_materials import ProjectMaterialSerial
from schemas import (
    ItemCreate, ItemOut, ItemCategoryCreate, ItemCategoryOut,
    WarehouseCreate, WarehouseOut, StockMovementCreate, StockLedgerOut, StockBalanceOut,
    ItemSerialOut, ScrapCreate, ScrapOut
)
from utils.auth import get_current_user, require_roles, log_audit
from config import Role, MovementType

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

STORE_ROLES = (Role.ADMIN, Role.STORE_MANAGER, Role.PROJECT_MANAGER)


# ── Item Categories ──────────────────────────────────────

@router.post("/categories", response_model=ItemCategoryOut, status_code=201)
def create_category(
    payload: ItemCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*STORE_ROLES)),
):
    cat = ItemCategory(**payload.dict())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    log_audit(db, current_user.id, "CREATE", "item_categories", cat.id)
    return cat


@router.get("/categories", response_model=List[ItemCategoryOut])
def list_categories(
    item_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ItemCategory).filter(ItemCategory.is_deleted == False)
    if item_type:
        q = q.filter(ItemCategory.item_type == item_type)
    return q.all()


@router.put("/categories/{cat_id}", response_model=ItemCategoryOut)
def update_category(
    cat_id: int,
    payload: ItemCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*STORE_ROLES)),
):
    cat = db.query(ItemCategory).filter(ItemCategory.id == cat_id, ItemCategory.is_deleted == False).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for k, v in payload.dict().items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{cat_id}", status_code=204)
def delete_category(
    cat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN)),
):
    cat = db.query(ItemCategory).filter(ItemCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.is_deleted = True
    db.commit()


# ── Items ────────────────────────────────────────────────

@router.post("/items", response_model=ItemOut, status_code=201)
def create_item(
    payload: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*STORE_ROLES)),
):
    existing = db.query(Item).filter(Item.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Item code already exists")
    item = Item(**payload.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    log_audit(db, current_user.id, "CREATE", "items", item.id)
    return item


@router.get("/items", response_model=List[ItemOut])
def list_items(
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Item).filter(Item.is_deleted == False)
    if category_id:
        q = q.filter(Item.category_id == category_id)
    return q.all()


@router.get("/items/{item_id}", response_model=ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Item).filter(Item.id == item_id, Item.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/items/{item_id}", response_model=ItemOut)
def update_item(
    item_id: int,
    payload: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*STORE_ROLES)),
):
    item = db.query(Item).filter(Item.id == item_id, Item.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for k, v in payload.dict().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER)),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_deleted = True
    db.commit()


# ── Warehouses ──────────────────────────────────────────

@router.post("/warehouses", response_model=WarehouseOut, status_code=201)
def create_warehouse(
    payload: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER)),
):
    wh = Warehouse(**payload.dict())
    db.add(wh)
    db.commit()
    db.refresh(wh)
    log_audit(db, current_user.id, "CREATE", "warehouses", wh.id)
    return wh


@router.get("/warehouses", response_model=List[WarehouseOut])
def list_warehouses(
    warehouse_type: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Warehouse).filter(Warehouse.is_deleted == False)
    if warehouse_type:
        q = q.filter(Warehouse.warehouse_type == warehouse_type)
    if project_id:
        q = q.filter(Warehouse.project_id == project_id)
    return q.all()


@router.put("/warehouses/{wh_id}", response_model=WarehouseOut)
def update_warehouse(
    wh_id: int,
    payload: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER)),
):
    wh = db.query(Warehouse).filter(Warehouse.id == wh_id, Warehouse.is_deleted == False).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    for k, v in payload.dict().items():
        setattr(wh, k, v)
    db.commit()
    db.refresh(wh)
    return wh


@router.delete("/warehouses/{wh_id}", status_code=204)
def delete_warehouse(
    wh_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN)),
):
    wh = db.query(Warehouse).filter(Warehouse.id == wh_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    wh.is_deleted = True
    db.commit()


# ── Stock Movements ─────────────────────────────────────

def _get_current_balance(db: Session, item_id: int, warehouse_id: int) -> float:
    last = (
        db.query(StockLedger)
        .filter(StockLedger.item_id == item_id, StockLedger.warehouse_id == warehouse_id)
        .order_by(StockLedger.id.desc())
        .first()
    )
    return last.balance_qty if last else 0.0


@router.post("/stock/movement", response_model=StockLedgerOut, status_code=201)
def record_movement(
    payload: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*STORE_ROLES)),
):
    current_balance = _get_current_balance(db, payload.item_id, payload.warehouse_id)

    qty_in, qty_out = 0.0, 0.0
    if payload.movement_type in (MovementType.INWARD,):
        qty_in = payload.qty
    else:
        qty_out = payload.qty
        if current_balance < qty_out:
            raise HTTPException(status_code=400, detail=f"Negative stock not allowed. Current balance: {current_balance}")

    new_balance = current_balance + qty_in - qty_out
    entry = StockLedger(
        item_id=payload.item_id,
        warehouse_id=payload.warehouse_id,
        movement_type=payload.movement_type,
        qty_in=qty_in,
        qty_out=qty_out,
        balance_qty=new_balance,
        rate=payload.rate,
        value=payload.qty * payload.rate,
        serial_no=payload.serial_no,
        batch_no=payload.batch_no,
        reference_type=payload.reference_type,
        reference_id=payload.reference_id,
        remarks=payload.remarks,
        created_by=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    log_audit(db, current_user.id, "STOCK_MOVEMENT", "stock_ledger", entry.id,
              f"{payload.movement_type} qty={payload.qty}")
    return entry


@router.get("/stock/balance", response_model=List[StockBalanceOut])
def get_stock_balance(
    item_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns latest balance per item per warehouse."""
    subq = (
        db.query(
            StockLedger.item_id,
            StockLedger.warehouse_id,
            func.max(StockLedger.id).label("max_id"),
        )
        .group_by(StockLedger.item_id, StockLedger.warehouse_id)
        .subquery()
    )
    q = db.query(StockLedger).join(
        subq,
        (StockLedger.item_id == subq.c.item_id) &
        (StockLedger.warehouse_id == subq.c.warehouse_id) &
        (StockLedger.id == subq.c.max_id),
    )
    if item_id:
        q = q.filter(StockLedger.item_id == item_id)
    if warehouse_id:
        q = q.filter(StockLedger.warehouse_id == warehouse_id)
    rows = q.all()

    # Reserved quantities per item/warehouse (items + stone block allocations treated as items)
    reserved = (
        db.query(ItemReservation.item_id, ItemReservation.warehouse_id, func.sum(ItemReservation.qty).label("qty"))
        .filter(ItemReservation.is_released == False)
        .group_by(ItemReservation.item_id, ItemReservation.warehouse_id)
        .all()
    )
    reserved_map = {(r.item_id, r.warehouse_id): float(r.qty or 0) for r in reserved}

    block_reserved = (
        db.query(StoneBlock.item_id, StoneBlock.warehouse_id, func.count(StoneBlock.id).label("qty"))
        .join(BlockAllocation, BlockAllocation.stone_block_id == StoneBlock.id)
        .filter(BlockAllocation.is_released == False, StoneBlock.item_id != None, StoneBlock.warehouse_id != None)
        .group_by(StoneBlock.item_id, StoneBlock.warehouse_id)
        .all()
    )
    for r in block_reserved:
        key = (r.item_id, r.warehouse_id)
        reserved_map[key] = float(reserved_map.get(key, 0) + (r.qty or 0))

    result = []
    row_keys = set()
    for r in rows:
        key = (r.item_id, r.warehouse_id)
        row_keys.add(key)
        reserved_qty = reserved_map.get(key, 0.0)
        available_qty = float(r.balance_qty or 0) - reserved_qty
        result.append({
            "item_id": r.item_id,
            "warehouse_id": r.warehouse_id,
            "balance_qty": r.balance_qty,
            "reserved_qty": reserved_qty,
            "available_qty": available_qty,
        })

    # Include reserved items without any stock ledger row
    for key, reserved_qty in reserved_map.items():
        if key in row_keys:
            continue
        item_id, warehouse_id = key
        result.append({
            "item_id": item_id,
            "warehouse_id": warehouse_id,
            "balance_qty": 0.0,
            "reserved_qty": reserved_qty,
            "available_qty": 0.0 - reserved_qty,
        })
    return result


@router.get("/stock/ledger", response_model=List[StockLedgerOut])
def get_stock_ledger(
    item_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(StockLedger)
    if item_id:
        q = q.filter(StockLedger.item_id == item_id)
    if warehouse_id:
        q = q.filter(StockLedger.warehouse_id == warehouse_id)
    return q.order_by(StockLedger.id.desc()).offset(offset).limit(limit).all()


# --- Item Serials ---

@router.get("/serials", response_model=List[ItemSerialOut])
def list_item_serials(
    item_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ItemSerial)
    if item_id:
        q = q.filter(ItemSerial.item_id == item_id)
    if warehouse_id:
        q = q.filter(ItemSerial.warehouse_id == warehouse_id)
    if status:
        q = q.filter(ItemSerial.status == status)
    return q.order_by(ItemSerial.id.desc()).all()


@router.put("/serials/{serial_id}/status", response_model=ItemSerialOut)
def update_item_serial_status(
    serial_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER, Role.PROJECT_MANAGER)),
):
    allowed = {"available", "allocated", "issued", "returned"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(list(allowed))}")
    serial = db.query(ItemSerial).filter(ItemSerial.id == serial_id).first()
    if not serial:
        raise HTTPException(status_code=404, detail="Serial not found")
    serial.status = status
    db.commit()
    db.refresh(serial)
    return serial


@router.delete("/serials/{serial_id}", status_code=204)
def delete_item_serial(
    serial_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER)),
):
    serial = db.query(ItemSerial).filter(ItemSerial.id == serial_id).first()
    if not serial:
        raise HTTPException(status_code=404, detail="Serial not found")
    if serial.status in ("allocated", "issued"):
        raise HTTPException(status_code=400, detail="Serial is allocated or issued. Release it first.")
    linked = db.query(ProjectMaterialSerial).filter(ProjectMaterialSerial.item_serial_id == serial_id).first()
    if linked:
        raise HTTPException(status_code=400, detail="Serial is linked to project materials. Remove allocations first.")
    db.delete(serial)
    db.commit()
    log_audit(db, current_user.id, "DELETE", "item_serials", serial_id)


@router.delete("/stock/balance", status_code=204)
def delete_stock_balance(
    item_id: int = Query(...),
    warehouse_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STORE_MANAGER)),
):
    reserved_qty = (
        db.query(func.sum(ItemReservation.qty))
        .filter(
            ItemReservation.item_id == item_id,
            ItemReservation.warehouse_id == warehouse_id,
            ItemReservation.is_released == False,
        )
        .scalar()
        or 0
    )
    block_reserved = (
        db.query(func.count(StoneBlock.id))
        .join(BlockAllocation, BlockAllocation.stone_block_id == StoneBlock.id)
        .filter(
            BlockAllocation.is_released == False,
            StoneBlock.item_id == item_id,
            StoneBlock.warehouse_id == warehouse_id,
        )
        .scalar()
        or 0
    )
    if (reserved_qty + block_reserved) > 0:
        raise HTTPException(status_code=400, detail="Stock is reserved for projects. Release reservations first.")

    serial_exists = db.query(ItemSerial).filter(
        ItemSerial.item_id == item_id,
        ItemSerial.warehouse_id == warehouse_id,
    ).first()
    if serial_exists:
        raise HTTPException(status_code=400, detail="Serials exist for this item and warehouse. Delete serials first.")

    q = db.query(StockLedger).filter(
        StockLedger.item_id == item_id,
        StockLedger.warehouse_id == warehouse_id,
    )
    if not q.first():
        raise HTTPException(status_code=404, detail="No stock ledger entries found for this item and warehouse.")

    q.delete(synchronize_session=False)
    db.commit()
    log_audit(db, current_user.id, "DELETE", "stock_ledger", None, f"item_id={item_id}, warehouse_id={warehouse_id}")


@router.get("/scrap", response_model=List[ScrapOut])
def list_scrap_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(ScrapEntry).order_by(ScrapEntry.id.desc()).all()


@router.post("/scrap", response_model=ScrapOut, status_code=201)
def create_scrap_entry(
    payload: ScrapCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*STORE_ROLES)),
):
    if payload.qty <= 0:
        raise HTTPException(status_code=400, detail="Scrap qty must be greater than 0")
    if payload.reason not in {"incorrect", "damaged", "process_loss"}:
        raise HTTPException(status_code=400, detail="Invalid reason. Use incorrect, damaged, or process_loss.")
    serial_ids = payload.serial_ids or []
    if serial_ids:
        if payload.stone_block_id:
            raise HTTPException(status_code=400, detail="Do not provide stone_block_id when scrapping serials")
        if payload.item_id is None:
            raise HTTPException(status_code=400, detail="Provide item_id when scrapping serials")
        if float(payload.qty).is_integer() is False:
            raise HTTPException(status_code=400, detail="Scrap qty must be a whole number when selecting serials")
        if int(payload.qty) != len(serial_ids):
            raise HTTPException(status_code=400, detail="Qty must match the number of selected serials")
    entry_qty = len(serial_ids) if serial_ids else payload.qty

    if payload.stone_block_id:
        block = db.query(StoneBlock).filter(StoneBlock.id == payload.stone_block_id, StoneBlock.is_deleted == False).first()
        if not block:
            raise HTTPException(status_code=404, detail="Stone block not found")
        if (block.status or "").lower() in {"scrapped", "installed"}:
            raise HTTPException(status_code=400, detail=f"Stone block cannot be scrapped in status: {block.status}")
        if block.warehouse_id != payload.warehouse_id:
            raise HTTPException(status_code=400, detail="Stone block warehouse mismatch")

    if payload.item_id is None and payload.stone_block_id is None:
        raise HTTPException(status_code=400, detail="Provide item_id or stone_block_id")

    entry = ScrapEntry(
        item_id=payload.item_id,
        stone_block_id=payload.stone_block_id,
        warehouse_id=payload.warehouse_id,
        qty=entry_qty,
        reason=payload.reason,
        source_type=payload.source_type,
        source_id=payload.source_id,
        stage_id=payload.stage_id,
        remarks=payload.remarks,
        created_by=current_user.id,
    )
    db.add(entry)
    db.flush()

    if payload.stone_block_id:
        block = db.query(StoneBlock).filter(StoneBlock.id == payload.stone_block_id).first()
        if not block:
            raise HTTPException(status_code=404, detail="Stone block not found")
        if block.is_deleted:
            raise HTTPException(status_code=400, detail="Stone block is already deleted")
        if float(entry_qty) <= 0:
            raise HTTPException(status_code=400, detail="Qty must be greater than 0")
        block_available_volume = float(block.available_volume or 0)
        if entry_qty > block_available_volume:
            raise HTTPException(status_code=400, detail=f"Scrap qty exceeds block available volume ({block_available_volume})")
        current_balance = _get_current_balance(db, block.item_id, payload.warehouse_id)
        if current_balance < entry_qty:
            raise HTTPException(status_code=400, detail="Insufficient stock balance to scrap this block")
        remaining_volume = max(block_available_volume - entry_qty, 0)
        block.available_volume = remaining_volume
        if remaining_volume == 0:
            block.is_deleted = True
            block.status = "scrapped"
        new_balance = current_balance - entry_qty
        db.add(StockLedger(
            item_id=block.item_id,
            warehouse_id=payload.warehouse_id,
            movement_type=MovementType.OUTWARD,
            qty_in=0,
            qty_out=entry_qty,
            balance_qty=new_balance,
            rate=block.rate_per_cft or 0,
            value=(block.rate_per_cft or 0) * entry_qty,
            serial_no=block.serial_no,
            reference_type="scrap",
            reference_id=entry.id,
            remarks="Scrap",
            created_by=current_user.id,
        ))
    else:
        item = db.query(Item).filter(Item.id == payload.item_id, Item.is_deleted == False).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        category = db.query(ItemCategory).filter(ItemCategory.id == item.category_id).first() if item else None
        item_type = category.item_type if category else None
        if serial_ids and not item.has_serial_no:
            raise HTTPException(status_code=400, detail="Selected item does not use serial numbers")

        current_balance = _get_current_balance(db, payload.item_id, payload.warehouse_id)
        if current_balance < entry_qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {current_balance}")

        if item.has_serial_no:
            if entry_qty <= 0:
                raise HTTPException(status_code=400, detail="Qty must be greater than 0")
            if item_type == "dimensional":
                if serial_ids:
                    raise HTTPException(status_code=400, detail="Use stone_block_id for dimensional items")
                unit_count = max(int(math.ceil(entry_qty)), 1)
                blocks = (
                    db.query(StoneBlock)
                    .filter(
                        StoneBlock.item_id == payload.item_id,
                        StoneBlock.warehouse_id == payload.warehouse_id,
                        StoneBlock.is_deleted == False,
                        StoneBlock.status == "available",
                    )
                    .limit(unit_count)
                    .all()
                )
                if len(blocks) < unit_count:
                    raise HTTPException(status_code=400, detail="Not enough available stone blocks to scrap")
                qty_per_block = entry_qty / unit_count
                for block in blocks:
                    block.is_deleted = True
                    block.status = "scrapped"
                    current_balance -= qty_per_block
                    db.add(StockLedger(
                        item_id=payload.item_id,
                        warehouse_id=payload.warehouse_id,
                        movement_type=MovementType.OUTWARD,
                        qty_in=0,
                        qty_out=qty_per_block,
                        balance_qty=current_balance,
                        rate=block.rate_per_cft or 0,
                        value=(block.rate_per_cft or 0) * qty_per_block,
                        serial_no=block.serial_no,
                        reference_type="scrap",
                        reference_id=entry.id,
                        remarks="Scrap",
                        created_by=current_user.id,
                    ))
            else:
                if serial_ids:
                    serials = (
                        db.query(ItemSerial)
                        .filter(
                            ItemSerial.id.in_(serial_ids),
                            ItemSerial.item_id == payload.item_id,
                            ItemSerial.warehouse_id == payload.warehouse_id,
                            ItemSerial.status == "available",
                        )
                        .all()
                    )
                    if len(serials) != len(serial_ids):
                        raise HTTPException(status_code=400, detail="One or more selected serials are not available")
                else:
                    unit_count = max(int(math.ceil(entry_qty)), 1)
                    serials = (
                        db.query(ItemSerial)
                        .filter(
                            ItemSerial.item_id == payload.item_id,
                            ItemSerial.warehouse_id == payload.warehouse_id,
                            ItemSerial.status == "available",
                        )
                        .limit(unit_count)
                        .all()
                    )
                    if len(serials) < unit_count:
                        raise HTTPException(status_code=400, detail="Not enough available serials to scrap")
                if entry_qty > len(serials):
                    raise HTTPException(status_code=400, detail=f"Scrap qty exceeds selected serial count ({len(serials)})")
                qty_per_serial = entry_qty / len(serials)
                for serial in serials:
                    serial.status = "scrapped"
                    serial.reference_type = "scrap"
                    serial.reference_id = entry.id
                    current_balance -= qty_per_serial
                    db.add(StockLedger(
                        item_id=payload.item_id,
                        warehouse_id=payload.warehouse_id,
                        movement_type=MovementType.OUTWARD,
                        qty_in=0,
                        qty_out=qty_per_serial,
                        balance_qty=current_balance,
                        rate=0,
                        value=0,
                        serial_no=serial.serial_no,
                        reference_type="scrap",
                        reference_id=entry.id,
                        remarks="Scrap",
                        created_by=current_user.id,
                    ))
        else:
            new_balance = current_balance - entry_qty
            db.add(StockLedger(
                item_id=payload.item_id,
                warehouse_id=payload.warehouse_id,
                movement_type=MovementType.OUTWARD,
                qty_in=0,
                qty_out=entry_qty,
                balance_qty=new_balance,
                rate=0,
                value=0,
                reference_type="scrap",
                reference_id=entry.id,
                remarks="Scrap",
                created_by=current_user.id,
            ))

    db.commit()
    db.refresh(entry)
    log_audit(db, current_user.id, "CREATE", "scrap_entries", entry.id)
    return entry
