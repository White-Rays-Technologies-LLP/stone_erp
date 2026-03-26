from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Set, Dict
from sqlalchemy import func
from database import get_db
from models.models import (
    StructureType, StructureLayer, BlueprintPosition,
    PositionDependency, User, StoneBlock, Item,
    StageMaster, PositionStage, BlockAllocation, StructuralComponent,
    StockLedger, ItemReservation
)
from schemas import (
    StructureTypeCreate, StructureTypeOut,
    LayerCreate, LayerOut,
    PositionCreate, PositionOut,
    DependencyCreate,
    StageMasterCreate, StageMasterOut,
    PositionStageIn, PositionStageOut
)
from utils.auth import get_current_user, require_roles, log_audit
from config import Role, MovementType

router = APIRouter(prefix="/blueprints", tags=["Blueprint & Dependency Engine"])

BLUEPRINT_ROLES = (Role.ADMIN, Role.STRUCTURAL_ENGINEER, Role.PROJECT_MANAGER)


def _summarize_position_stages(db: Session, pos_ids: List[int]) -> Dict[int, dict]:
    if not pos_ids:
        return {}
    rows = (
        db.query(PositionStage.position_id, PositionStage.status, func.count(PositionStage.id))
        .filter(PositionStage.position_id.in_(pos_ids))
        .group_by(PositionStage.position_id, PositionStage.status)
        .all()
    )
    summary = {pid: {"stage_total": 0, "stage_completed": 0, "stage_in_progress": 0, "stage_pending": 0, "stage_status": "pending"} for pid in pos_ids}
    for pid, status, count in rows:
        if pid not in summary:
            summary[pid] = {"stage_total": 0, "stage_completed": 0, "stage_in_progress": 0, "stage_pending": 0, "stage_status": "pending"}
        summary[pid]["stage_total"] += int(count or 0)
        if status == "completed":
            summary[pid]["stage_completed"] += int(count or 0)
        elif status == "in_progress":
            summary[pid]["stage_in_progress"] += int(count or 0)
        else:
            summary[pid]["stage_pending"] += int(count or 0)

    for pid, s in summary.items():
        if s["stage_total"] == 0:
            s["stage_status"] = "pending"
        elif s["stage_completed"] == s["stage_total"]:
            s["stage_status"] = "completed"
        elif s["stage_in_progress"] > 0 or s["stage_completed"] > 0:
            s["stage_status"] = "in_progress"
        else:
            s["stage_status"] = "pending"
    return summary


def _position_total_costs(db: Session, pos_ids: List[int]) -> Dict[int, float]:
    if not pos_ids:
        return {}
    rows = (
        db.query(
            PositionStage.position_id,
            func.coalesce(func.sum(PositionStage.stage_cost), 0)
        )
        .filter(PositionStage.position_id.in_(pos_ids))
        .group_by(PositionStage.position_id)
        .all()
    )
    return {pid: float(total or 0) for pid, total in rows}


def _recalc_position_status(db: Session, pos_id: int) -> str:
    summary = _summarize_position_stages(db, [pos_id]).get(pos_id, {})
    status = summary.get("stage_status", "pending")
    pos = db.query(BlueprintPosition).filter(BlueprintPosition.id == pos_id).first()
    if pos:
        pos.status = status
    return status


def _recalc_component_cost_for_position(db: Session, pos_id: int):
    total_cost = (
        db.query(func.coalesce(func.sum(PositionStage.stage_cost), 0))
        .filter(PositionStage.position_id == pos_id)
        .scalar()
    ) or 0
    db.query(StructuralComponent).filter(
        StructuralComponent.position_id == pos_id,
        StructuralComponent.is_deleted == False
    ).update({"cost": float(total_cost)}, synchronize_session=False)


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


def _consume_item_qty_for_position(
    db: Session,
    *,
    project_id: Optional[int],
    position_id: int,
    item_id: int,
    qty: float,
    created_by: int,
) -> None:
    remaining = float(qty)
    if remaining <= 0:
        return

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
            reference_type="position_material_issue",
            reference_id=position_id,
            created_by=created_by,
            remarks=f"Material issued for position {position_id}",
        )
        res.qty = round(res_qty - take, 6)
        if res.qty <= 0:
            res.qty = 0
            res.is_released = True
        remaining = round(remaining - take, 6)

    if remaining <= 0:
        return

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
            reference_type="position_material_issue",
            reference_id=position_id,
            created_by=created_by,
            remarks=f"Material issued for position {position_id}",
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
            detail=f"Insufficient stock to complete position for item_id={item_id}. Short by {round(remaining, 3)}",
        )


def _consume_position_materials_from_stock(db: Session, pos_id: int, current_user: User):
    pos = db.query(BlueprintPosition).filter(BlueprintPosition.id == pos_id, BlueprintPosition.is_deleted == False).first()
    if not pos:
        return

    project_id = _get_project_id_for_layer(db, pos.layer_id)
    block_ids = set()
    if pos.stone_block_id:
        block_ids.add(pos.stone_block_id)
    component_blocks = (
        db.query(StructuralComponent.stone_block_id)
        .filter(StructuralComponent.position_id == pos_id, StructuralComponent.is_deleted == False)
        .all()
    )
    for (bid,) in component_blocks:
        if bid:
            block_ids.add(bid)

    for bid in block_ids:
        block = db.query(StoneBlock).filter(StoneBlock.id == bid).first()
        if not block:
            continue
        if not block.item_id or not block.warehouse_id:
            continue
        already = (
            db.query(StockLedger.id)
            .filter(
                StockLedger.reference_type == "position_material_issue",
                StockLedger.reference_id == pos_id,
                StockLedger.serial_no == block.serial_no,
            )
            .first()
        )
        if already:
            continue
        _append_stock_out(
            db,
            item_id=block.item_id,
            warehouse_id=block.warehouse_id,
            qty=1,
            reference_type="position_material_issue",
            reference_id=pos_id,
            serial_no=block.serial_no,
            remarks=f"Stone block issued for position {pos.position_code}",
            created_by=current_user.id,
        )
        _decrement_project_reservation(
            db,
            project_id=project_id,
            item_id=block.item_id,
            warehouse_id=block.warehouse_id,
            qty=1,
        )
        block.status = "issued"

    if pos.stone_item_id and not block_ids:
        generic_done = (
            db.query(StockLedger.id)
            .filter(
                StockLedger.reference_type == "position_material_issue",
                StockLedger.reference_id == pos_id,
                StockLedger.item_id == pos.stone_item_id,
            )
            .first()
        )
        if not generic_done:
            _consume_item_qty_for_position(
                db,
                project_id=project_id,
                position_id=pos_id,
                item_id=pos.stone_item_id,
                qty=1,
                created_by=current_user.id,
            )


def _get_project_id_for_layer(db: Session, layer_id: int) -> Optional[int]:
    layer = db.query(StructureLayer).filter(StructureLayer.id == layer_id, StructureLayer.is_deleted == False).first()
    if not layer:
        return None
    struct = db.query(StructureType).filter(StructureType.id == layer.structure_type_id, StructureType.is_deleted == False).first()
    return struct.project_id if struct else None


def _allocate_block_to_project(db: Session, block_id: int, project_id: int, user_id: int):
    existing = db.query(BlockAllocation).filter(
        BlockAllocation.stone_block_id == block_id,
        BlockAllocation.is_released == False
    ).first()
    if existing and existing.project_id != project_id:
        raise HTTPException(status_code=400, detail=f"Block already allocated to project {existing.project_id}")
    if not existing:
        alloc = BlockAllocation(stone_block_id=block_id, project_id=project_id, allocated_by=user_id)
        db.add(alloc)
    block = db.query(StoneBlock).filter(StoneBlock.id == block_id).first()
    if block:
        block.project_id = project_id
        block.status = "allocated"


def _release_block_if_allocated(db: Session, block_id: int, project_id: int):
    alloc = db.query(BlockAllocation).filter(
        BlockAllocation.stone_block_id == block_id,
        BlockAllocation.project_id == project_id,
        BlockAllocation.is_released == False
    ).first()
    if alloc:
        from datetime import datetime
        alloc.is_released = True
        alloc.released_at = datetime.utcnow()
        block = db.query(StoneBlock).filter(StoneBlock.id == block_id).first()
        if block:
            block.status = "available"
            block.project_id = None


# ── Structure Types ──────────────────────────────────────

@router.post("/structures", response_model=StructureTypeOut, status_code=201)
def create_structure(
    payload: StructureTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*BLUEPRINT_ROLES)),
):
    s = StructureType(**payload.dict())
    db.add(s)
    db.commit()
    db.refresh(s)
    log_audit(db, current_user.id, "CREATE", "structure_types", s.id)
    return s


@router.get("/structures")
def list_structures(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import func
    q = (
        db.query(StructureType, func.count(StructureLayer.id).label("layer_count"))
        .outerjoin(StructureLayer, (StructureLayer.structure_type_id == StructureType.id) & (StructureLayer.is_deleted == False))
        .filter(StructureType.is_deleted == False)
        .group_by(StructureType.id)
    )
    if project_id:
        q = q.filter(StructureType.project_id == project_id)
    results = []
    for structure, layer_count in q.all():
        row = StructureTypeOut.from_orm(structure).dict()
        row["layer_count"] = layer_count
        results.append(row)
    return results


@router.get("/structures/{struct_id}", response_model=StructureTypeOut)
def get_structure(struct_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(StructureType).filter(StructureType.id == struct_id, StructureType.is_deleted == False).first()
    if not s:
        raise HTTPException(status_code=404, detail="Structure not found")
    return s


@router.put("/structures/{struct_id}", response_model=StructureTypeOut)
def update_structure(
    struct_id: int,
    payload: StructureTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*BLUEPRINT_ROLES)),
):
    s = db.query(StructureType).filter(StructureType.id == struct_id, StructureType.is_deleted == False).first()
    if not s:
        raise HTTPException(status_code=404, detail="Structure not found")
    for k, v in payload.dict().items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    log_audit(db, current_user.id, "UPDATE", "structure_types", s.id)
    return s


@router.delete("/structures/{struct_id}", status_code=204)
def delete_structure(struct_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(Role.ADMIN))):
    s = db.query(StructureType).filter(StructureType.id == struct_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    s.is_deleted = True
    db.commit()


# ── Layers ───────────────────────────────────────────────

@router.post("/layers", response_model=LayerOut, status_code=201)
def create_layer(
    payload: LayerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*BLUEPRINT_ROLES)),
):
    layer = StructureLayer(**payload.dict())
    db.add(layer)
    db.commit()
    db.refresh(layer)
    return layer


@router.get("/layers", response_model=List[LayerOut])
def list_layers(
    structure_type_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(StructureLayer).filter(StructureLayer.is_deleted == False)
    if structure_type_id:
        q = q.filter(StructureLayer.structure_type_id == structure_type_id)
    return q.order_by(StructureLayer.layer_order).all()


@router.put("/layers/{layer_id}", response_model=LayerOut)
def update_layer(
    layer_id: int,
    payload: LayerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*BLUEPRINT_ROLES)),
):
    layer = db.query(StructureLayer).filter(StructureLayer.id == layer_id, StructureLayer.is_deleted == False).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    for k, v in payload.dict().items():
        setattr(layer, k, v)
    db.commit()
    db.refresh(layer)
    return layer


@router.delete("/layers/{layer_id}", status_code=204)
def delete_layer(layer_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(*BLUEPRINT_ROLES))):
    layer = db.query(StructureLayer).filter(StructureLayer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Not found")
    layer.is_deleted = True
    db.commit()


# ── Positions ────────────────────────────────────────────

@router.post("/positions", response_model=PositionOut, status_code=201)
def create_position(
    payload: PositionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*BLUEPRINT_ROLES)),
):
    if payload.stone_item_id:
        item = db.query(Item).filter(Item.id == payload.stone_item_id, Item.is_deleted == False).first()
        if not item:
            raise HTTPException(status_code=400, detail="Stone item not found")
    if payload.stone_block_id:
        block = db.query(StoneBlock).filter(StoneBlock.id == payload.stone_block_id, StoneBlock.is_deleted == False).first()
        if not block:
            raise HTTPException(status_code=400, detail="Stone block not found")
        project_id = _get_project_id_for_layer(db, payload.layer_id)
        if not project_id:
            raise HTTPException(status_code=400, detail="Structure has no project; cannot allocate block")
        _allocate_block_to_project(db, payload.stone_block_id, project_id, current_user.id)
    pos = BlueprintPosition(**payload.dict())
    db.add(pos)
    db.commit()
    db.refresh(pos)
    log_audit(db, current_user.id, "CREATE", "blueprint_positions", pos.id)
    return pos


@router.get("/positions", response_model=List[PositionOut])
def list_positions(
    layer_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(BlueprintPosition).filter(BlueprintPosition.is_deleted == False)
    if layer_id:
        q = q.filter(BlueprintPosition.layer_id == layer_id)
    if status:
        q = q.filter(BlueprintPosition.status == status)
    positions = q.all()
    summaries = _summarize_position_stages(db, [p.id for p in positions])
    cost_map = _position_total_costs(db, [p.id for p in positions])
    result = []
    for p in positions:
        row = PositionOut.from_orm(p).dict()
        row.update(summaries.get(p.id, {}))
        row["total_cost"] = float(cost_map.get(p.id, 0))
        result.append(row)
    return result


@router.get("/stages", response_model=List[StageMasterOut])
def list_blueprint_stages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(StageMaster).filter((StageMaster.is_deleted == False) | (StageMaster.is_deleted.is_(None))).order_by(StageMaster.name).all()


@router.post("/stages", response_model=StageMasterOut, status_code=201)
def create_blueprint_stage(
    payload: StageMasterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*BLUEPRINT_ROLES)),
):
    stage = StageMaster(**payload.dict())
    db.add(stage)
    db.commit()
    db.refresh(stage)
    log_audit(db, current_user.id, "CREATE", "stage_master", stage.id)
    return stage


@router.get("/positions/{pos_id}/stages", response_model=List[PositionStageOut])
def get_position_stages(
    pos_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pos = db.query(BlueprintPosition).filter(BlueprintPosition.id == pos_id, BlueprintPosition.is_deleted == False).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")

    stages = db.query(StageMaster).filter((StageMaster.is_deleted == False) | (StageMaster.is_deleted.is_(None))).order_by(StageMaster.name).all()
    pos_stages = db.query(PositionStage).filter(PositionStage.position_id == pos_id).all()
    stage_map = {ps.stage_id: ps for ps in pos_stages}

    result = []
    for s in stages:
        result.append({
            "stage_id": s.id,
            "name": s.name,
            "stage_order": stage_map.get(s.id).stage_order if stage_map.get(s.id) else None,
            "description": s.description,
            "status": stage_map.get(s.id).status if stage_map.get(s.id) else "pending",
            "labor_hours": float(stage_map.get(s.id).labor_hours or 0) if stage_map.get(s.id) else 0,
            "labor_rate": float(stage_map.get(s.id).labor_rate or 0) if stage_map.get(s.id) else 0,
            "material_cost": float(stage_map.get(s.id).material_cost or 0) if stage_map.get(s.id) else 0,
            "stage_cost": float(stage_map.get(s.id).stage_cost or 0) if stage_map.get(s.id) else 0,
            "remarks": stage_map.get(s.id).remarks if stage_map.get(s.id) else None,
            "started_at": stage_map.get(s.id).started_at if stage_map.get(s.id) else None,
            "completed_at": stage_map.get(s.id).completed_at if stage_map.get(s.id) else None,
        })
    return result


@router.put("/positions/{pos_id}/stages", response_model=List[PositionStageOut])
def update_position_stages(
    pos_id: int,
    payload: List[PositionStageIn],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*BLUEPRINT_ROLES)),
):
    pos = db.query(BlueprintPosition).filter(BlueprintPosition.id == pos_id, BlueprintPosition.is_deleted == False).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    prev_status = pos.status

    # Validate stage ids
    stage_ids = [p.stage_id for p in payload]
    existing = db.query(StageMaster).filter(
        StageMaster.id.in_(stage_ids),
        (StageMaster.is_deleted == False) | (StageMaster.is_deleted.is_(None))
    ).all() if stage_ids else []
    existing_ids = {s.id for s in existing}
    missing = [sid for sid in stage_ids if sid not in existing_ids]
    if missing:
        raise HTTPException(status_code=400, detail=f"Stage(s) not found: {missing}")

    # Upsert statuses
    existing_pos_stages = db.query(PositionStage).filter(PositionStage.position_id == pos_id).all()
    existing_map = {ps.stage_id: ps for ps in existing_pos_stages}

    incoming_ids = set(stage_ids)
    for ps in existing_pos_stages:
        if ps.stage_id not in incoming_ids:
            db.delete(ps)

    for item in payload:
        stage_cost = round((float(item.labor_hours or 0) * float(item.labor_rate or 0)) + float(item.material_cost or 0), 2)
        if item.stage_id in existing_map:
            row = existing_map[item.stage_id]
            row.status = item.status
            row.stage_order = item.stage_order
            row.labor_hours = item.labor_hours
            row.labor_rate = item.labor_rate
            row.material_cost = item.material_cost
            row.stage_cost = stage_cost
            row.remarks = item.remarks
            row.started_at = item.started_at
            row.completed_at = item.completed_at
        else:
            db.add(PositionStage(
                position_id=pos_id,
                stage_id=item.stage_id,
                status=item.status,
                stage_order=item.stage_order,
                labor_hours=item.labor_hours,
                labor_rate=item.labor_rate,
                material_cost=item.material_cost,
                stage_cost=stage_cost,
                remarks=item.remarks,
                started_at=item.started_at,
                completed_at=item.completed_at,
            ))

    _recalc_position_status(db, pos_id)
    if prev_status != "completed" and pos.status == "completed":
        _consume_position_materials_from_stock(db, pos_id, current_user)
    _recalc_component_cost_for_position(db, pos_id)
    db.commit()
    return get_position_stages(pos_id, db, current_user)


@router.get("/positions/{pos_id}", response_model=PositionOut)
def get_position(pos_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pos = db.query(BlueprintPosition).filter(BlueprintPosition.id == pos_id, BlueprintPosition.is_deleted == False).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    row = PositionOut.from_orm(pos).dict()
    row.update(_summarize_position_stages(db, [pos.id]).get(pos.id, {}))
    row["total_cost"] = float(_position_total_costs(db, [pos.id]).get(pos.id, 0))
    return row


@router.put("/positions/{pos_id}", response_model=PositionOut)
def update_position(
    pos_id: int,
    payload: PositionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*BLUEPRINT_ROLES)),
):
    pos = db.query(BlueprintPosition).filter(BlueprintPosition.id == pos_id, BlueprintPosition.is_deleted == False).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    project_id = _get_project_id_for_layer(db, pos.layer_id)
    old_block_id = pos.stone_block_id
    if payload.stone_item_id:
        item = db.query(Item).filter(Item.id == payload.stone_item_id, Item.is_deleted == False).first()
        if not item:
            raise HTTPException(status_code=400, detail="Stone item not found")
    if payload.stone_block_id:
        block = db.query(StoneBlock).filter(StoneBlock.id == payload.stone_block_id, StoneBlock.is_deleted == False).first()
        if not block:
            raise HTTPException(status_code=400, detail="Stone block not found")
        if not project_id:
            raise HTTPException(status_code=400, detail="Structure has no project; cannot allocate block")
    for k, v in payload.dict().items():
        setattr(pos, k, v)
    # handle allocation changes
    new_block_id = payload.stone_block_id
    if old_block_id and (not new_block_id or new_block_id != old_block_id):
        if project_id:
            _release_block_if_allocated(db, old_block_id, project_id)
    if new_block_id:
        _allocate_block_to_project(db, new_block_id, project_id, current_user.id)
    db.commit()
    db.refresh(pos)
    return pos


@router.delete("/positions/{pos_id}", status_code=204)
def delete_position(pos_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(*BLUEPRINT_ROLES))):
    pos = db.query(BlueprintPosition).filter(BlueprintPosition.id == pos_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Not found")
    pos.is_deleted = True
    db.commit()


# ── Dependencies (DAG) ───────────────────────────────────

def _has_circular_dependency(db: Session, position_id: int, depends_on_id: int) -> bool:
    """Check if adding position_id → depends_on_id creates a cycle via DFS."""
    visited: Set[int] = set()

    def dfs(current: int) -> bool:
        if current == position_id:
            return True  # cycle detected
        if current in visited:
            return False
        visited.add(current)
        deps = db.query(PositionDependency).filter(PositionDependency.position_id == current).all()
        return any(dfs(d.depends_on_id) for d in deps)

    return dfs(depends_on_id)


@router.post("/dependencies", status_code=201)
def add_dependency(
    payload: DependencyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*BLUEPRINT_ROLES)),
):
    if payload.position_id == payload.depends_on_id:
        raise HTTPException(status_code=400, detail="A position cannot depend on itself")

    # Check circular
    if _has_circular_dependency(db, payload.position_id, payload.depends_on_id):
        raise HTTPException(status_code=400, detail="Adding this dependency would create a circular dependency (DAG violation)")

    existing = db.query(PositionDependency).filter(
        PositionDependency.position_id == payload.position_id,
        PositionDependency.depends_on_id == payload.depends_on_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Dependency already exists")

    dep = PositionDependency(**payload.dict())
    db.add(dep)
    db.commit()
    log_audit(db, current_user.id, "ADD_DEPENDENCY", "position_dependencies", dep.id,
              f"{payload.position_id} depends on {payload.depends_on_id}")
    return {"message": "Dependency added", "id": dep.id}


@router.get("/dependencies")
def list_all_dependencies(
    structure_type_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all position dependencies, optionally filtered by structure type."""
    q = db.query(PositionDependency)
    if structure_type_id:
        # Join through positions → layers → structure_type
        q = (
            q.join(BlueprintPosition, PositionDependency.position_id == BlueprintPosition.id)
             .join(StructureLayer, BlueprintPosition.layer_id == StructureLayer.id)
             .filter(StructureLayer.structure_type_id == structure_type_id)
        )
    deps = q.all()
    return [{"id": d.id, "position_id": d.position_id, "depends_on_id": d.depends_on_id} for d in deps]


@router.get("/dependencies/{position_id}")
def get_dependencies(
    position_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deps = db.query(PositionDependency).filter(PositionDependency.position_id == position_id).all()
    return [{"id": d.id, "position_id": d.position_id, "depends_on_id": d.depends_on_id} for d in deps]


@router.delete("/dependencies/{position_id}/{depends_on_id}", status_code=204)
def remove_dependency(
    position_id: int,
    depends_on_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*BLUEPRINT_ROLES)),
):
    dep = db.query(PositionDependency).filter(
        PositionDependency.position_id == position_id,
        PositionDependency.depends_on_id == depends_on_id,
    ).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")
    db.delete(dep)
    db.commit()


def _are_prerequisites_met(db: Session, position_id: int) -> bool:
    deps = db.query(PositionDependency).filter(PositionDependency.position_id == position_id).all()
    for dep in deps:
        predecessor = db.query(BlueprintPosition).filter(BlueprintPosition.id == dep.depends_on_id).first()
        if not predecessor or predecessor.status != "completed":
            return False
    return True


@router.get("/dependency-gap/{structure_type_id}")
def dependency_gap_report(
    structure_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns dependency gap report for all positions in a structure."""
    layers = db.query(StructureLayer).filter(
        StructureLayer.structure_type_id == structure_type_id,
        StructureLayer.is_deleted == False
    ).order_by(StructureLayer.layer_order).all()

    report = []
    for layer in layers:
        positions = db.query(BlueprintPosition).filter(
            BlueprintPosition.layer_id == layer.id,
            BlueprintPosition.is_deleted == False
        ).all()
        total = len(positions)
        completed = sum(1 for p in positions if p.status == "completed")
        completion_pct = round((completed / total * 100) if total else 0, 1)

        pos_list = []
        for p in positions:
            prerequisites_met = _are_prerequisites_met(db, p.id)
            blocked_by = []
            if not prerequisites_met:
                deps = db.query(PositionDependency).filter(PositionDependency.position_id == p.id).all()
                for d in deps:
                    pred = db.query(BlueprintPosition).filter(BlueprintPosition.id == d.depends_on_id).first()
                    if pred and pred.status != "completed":
                        blocked_by.append({"id": pred.id, "code": pred.position_code, "status": pred.status})
            pos_list.append({
                "id": p.id,
                "position_code": p.position_code,
                "status": p.status,
                "prerequisites_met": prerequisites_met,
                "blocked_by": blocked_by,
            })

        report.append({
            "layer_id": layer.id,
            "layer_name": layer.name,
            "layer_order": layer.layer_order,
            "total_positions": total,
            "completed_positions": completed,
            "completion_pct": completion_pct,
            "positions": pos_list,
        })
    return {"structure_type_id": structure_type_id, "layers": report}


@router.put("/positions/{pos_id}/status")
def update_position_status(
    pos_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.STRUCTURAL_ENGINEER, Role.SITE_SUPERVISOR)),
):
    pos = db.query(BlueprintPosition).filter(BlueprintPosition.id == pos_id, BlueprintPosition.is_deleted == False).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    prev_status = pos.status

    if status == "in_progress" or status == "completed":
        if not _are_prerequisites_met(db, pos_id):
            raise HTTPException(status_code=400, detail="Cannot proceed: predecessor positions not completed")

    pos.status = status
    if prev_status != "completed" and status == "completed":
        _consume_position_materials_from_stock(db, pos_id, current_user)
    db.commit()
    return {"message": f"Position {pos.position_code} status updated to {status}"}
