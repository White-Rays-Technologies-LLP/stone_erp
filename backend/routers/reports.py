from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
from database import get_db
from models.models import (
    Project, StructureType, StructureLayer, BlueprintPosition,
    IdolManufacturing, ProjectCost, StockLedger, Item, Warehouse,
    StoneBlock, ManufacturingStage, IdolMaterial, ItemSerial, BlockAllocation, StructuralComponent, ScrapEntry,
    PositionStage, PositionDependency, Installation, IdolSale,
    StageMaster
)
from models.project_materials import ProjectMaterial, ProjectMaterialSerial
from schemas import (
    ProjectSummaryOut, ProjectCostingOut, StockBalanceReportOut,
    IdolSummaryOut, StoneBlockAvailabilityOut, IdolStageProgressOut, IdolMaterialConsumptionOut,
    SerializedStockReportOut, ProjectProfitabilityOut, ProjectProfitabilityIdolOut, ProjectProfitabilityStructureOut,
    ScrapReportOut, BlueprintPositionProgressOut, PositionDependencyHealthOut, InstallationReportOut
)
from utils.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/project-summary", response_model=List[ProjectSummaryOut])
def project_summary(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Projects
    pq = db.query(Project).filter(Project.is_deleted == False)
    if project_id:
        pq = pq.filter(Project.id == project_id)
    projects = pq.all()
    if not projects:
        return []

    project_ids = [p.id for p in projects]

    # Structures count
    struct_counts = dict(db.query(StructureType.project_id, func.count(StructureType.id))
                         .filter(StructureType.project_id.in_(project_ids), StructureType.is_deleted == False)
                         .group_by(StructureType.project_id).all())

    # Layers count via join
    layer_counts = dict(db.query(StructureType.project_id, func.count(StructureLayer.id))
                        .join(StructureLayer, StructureLayer.structure_type_id == StructureType.id)
                        .filter(StructureType.project_id.in_(project_ids), StructureType.is_deleted == False, StructureLayer.is_deleted == False)
                        .group_by(StructureType.project_id).all())

    # Positions total/completed
    pos_counts = db.query(StructureType.project_id,
                          func.count(BlueprintPosition.id),
                          func.sum(case((BlueprintPosition.status == "completed", 1), else_=0)))
    pos_counts = (pos_counts
                  .join(StructureLayer, StructureLayer.structure_type_id == StructureType.id)
                  .join(BlueprintPosition, BlueprintPosition.layer_id == StructureLayer.id)
                  .filter(StructureType.project_id.in_(project_ids),
                          StructureType.is_deleted == False,
                          StructureLayer.is_deleted == False,
                          BlueprintPosition.is_deleted == False)
                  .group_by(StructureType.project_id).all())
    pos_total = {pid: int(total or 0) for pid, total, _ in pos_counts}
    pos_completed = {pid: int(comp or 0) for pid, _, comp in pos_counts}

    # Idols total/completed
    idol_counts = db.query(IdolManufacturing.project_id,
                           func.count(IdolManufacturing.id),
                           func.sum(case((IdolManufacturing.status == "completed", 1), else_=0)))
    idol_counts = (idol_counts
                   .filter(IdolManufacturing.project_id.in_(project_ids), IdolManufacturing.is_deleted == False)
                   .group_by(IdolManufacturing.project_id).all())
    idol_total = {pid: int(total or 0) for pid, total, _ in idol_counts}
    idol_completed = {pid: int(comp or 0) for pid, _, comp in idol_counts}

    result = []
    for p in projects:
        result.append({
            "project_id": p.id,
            "name": p.name,
            "code": p.code,
            "status": p.status,
            "completion_pct": p.completion_pct,
            "start_date": p.start_date,
            "expected_end_date": p.expected_end_date,
            "total_value": p.total_value,
            "structures": struct_counts.get(p.id, 0),
            "layers": layer_counts.get(p.id, 0),
            "positions_total": pos_total.get(p.id, 0),
            "positions_completed": pos_completed.get(p.id, 0),
            "idols_total": idol_total.get(p.id, 0),
            "idols_completed": idol_completed.get(p.id, 0),
        })
    return result


@router.get("/project-costing", response_model=List[ProjectCostingOut])
def project_costing(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pq = db.query(Project).filter(Project.is_deleted == False)
    if project_id:
        pq = pq.filter(Project.id == project_id)
    projects = pq.all()
    if not projects:
        return []
    project_ids = [p.id for p in projects]

    rows = (db.query(ProjectCost.project_id, ProjectCost.cost_type, func.sum(ProjectCost.amount))
            .filter(ProjectCost.project_id.in_(project_ids))
            .group_by(ProjectCost.project_id, ProjectCost.cost_type).all())
    cost_map = {}
    for pid, ctype, amt in rows:
        cost_map.setdefault(pid, {})
        cost_map[pid][ctype] = float(amt or 0)

    result = []
    for p in projects:
        costs = cost_map.get(p.id, {})
        material = costs.get("material", 0)
        labor = costs.get("labor", 0)
        contractor = costs.get("contractor", 0)
        site = costs.get("site_expense", 0)
        total = material + labor + contractor + site
        result.append({
            "project_id": p.id,
            "name": p.name,
            "material_cost": material,
            "labor_cost": labor,
            "contractor_cost": contractor,
            "site_expense": site,
            "total_cost": total,
        })
    return result


@router.get("/scrap-report", response_model=List[ScrapReportOut])
def scrap_report(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = (
        db.query(
            ScrapEntry,
            Item.name.label("item_name"),
            Item.uom.label("item_uom"),
            Warehouse.name.label("warehouse_name"),
            StoneBlock.serial_no.label("stone_serial_no"),
        )
        .outerjoin(Item, Item.id == ScrapEntry.item_id)
        .outerjoin(Warehouse, Warehouse.id == ScrapEntry.warehouse_id)
        .outerjoin(StoneBlock, StoneBlock.id == ScrapEntry.stone_block_id)
        .order_by(ScrapEntry.id.desc())
        .all()
    )

    scrap_entries = [r[0] for r in rows]
    scrap_ids = [e.id for e in scrap_entries]
    ledger_rows = (
        db.query(StockLedger.reference_id, StockLedger.serial_no)
        .filter(
            StockLedger.reference_type == "scrap",
            StockLedger.reference_id.in_(scrap_ids) if scrap_ids else False,
            StockLedger.serial_no.isnot(None),
        )
        .order_by(StockLedger.id.asc())
        .all()
    ) if scrap_ids else []
    serials_by_scrap = {}
    for rid, serial_no in ledger_rows:
        if not serial_no:
            continue
        serials_by_scrap.setdefault(rid, [])
        if serial_no not in serials_by_scrap[rid]:
            serials_by_scrap[rid].append(serial_no)

    mfg_ids = {e.source_id for e in scrap_entries if e.source_type == "manufacturing_stage" and e.source_id}
    pos_ids = {e.source_id for e in scrap_entries if e.source_type == "position_stage" and e.source_id}
    mfg_stage_ids = {e.stage_id for e in scrap_entries if e.source_type == "manufacturing_stage" and e.stage_id}
    pos_stage_ids = {e.stage_id for e in scrap_entries if e.source_type == "position_stage" and e.stage_id}

    idol_rows = db.query(IdolManufacturing.id, IdolManufacturing.idol_name, IdolManufacturing.project_id).filter(IdolManufacturing.id.in_(mfg_ids)).all() if mfg_ids else []
    idol_map = {i: (name, pid) for i, name, pid in idol_rows}

    mfg_stage_rows = db.query(ManufacturingStage.id, ManufacturingStage.stage_name).filter(ManufacturingStage.id.in_(mfg_stage_ids)).all() if mfg_stage_ids else []
    mfg_stage_map = {sid: name for sid, name in mfg_stage_rows}

    pos_rows = (
        db.query(BlueprintPosition.id, BlueprintPosition.position_code, StructureType.project_id)
        .join(StructureLayer, StructureLayer.id == BlueprintPosition.layer_id)
        .join(StructureType, StructureType.id == StructureLayer.structure_type_id)
        .filter(BlueprintPosition.id.in_(pos_ids))
        .all()
    ) if pos_ids else []
    pos_map = {pid: (code, project_id) for pid, code, project_id in pos_rows}

    pos_stage_rows = db.query(StageMaster.id, StageMaster.name).filter(StageMaster.id.in_(pos_stage_ids)).all() if pos_stage_ids else []
    pos_stage_map = {sid: name for sid, name in pos_stage_rows}

    project_ids = {pid for _, pid in idol_map.values() if pid} | {pid for _, pid in pos_map.values() if pid}
    project_rows = db.query(Project.id, Project.name).filter(Project.id.in_(project_ids)).all() if project_ids else []
    project_map = {pid: name for pid, name in project_rows}
    result = []
    for entry, item_name, item_uom, warehouse_name, stone_serial_no in rows:
        project_id = None
        project_name = None
        stage_name = None
        idol_name = None
        position_name = None

        if entry.source_type == "manufacturing_stage":
            idol_name, project_id = idol_map.get(entry.source_id, (None, None))
            stage_name = mfg_stage_map.get(entry.stage_id)
        elif entry.source_type == "position_stage":
            position_name, project_id = pos_map.get(entry.source_id, (None, None))
            stage_name = pos_stage_map.get(entry.stage_id)

        if project_id:
            project_name = project_map.get(project_id)

        serial_no = stone_serial_no
        if not serial_no:
            serial_list = serials_by_scrap.get(entry.id, [])
            serial_no = ", ".join(serial_list) if serial_list else None

        result.append({
            "id": entry.id,
            "item_id": entry.item_id,
            "item_name": item_name,
            "stone_block_id": entry.stone_block_id,
            "stone_serial_no": stone_serial_no,
            "serial_no": serial_no,
            "warehouse_id": entry.warehouse_id,
            "warehouse_name": warehouse_name,
            "project_id": project_id,
            "project_name": project_name,
            "stage_name": stage_name,
            "idol_name": idol_name,
            "position_name": position_name,
            "qty": float(entry.qty or 0),
            "qty_unit": "cft" if entry.stone_block_id else (item_uom or "qty"),
            "scrap_volume_cft": float(entry.qty or 0) if entry.stone_block_id else None,
            "reason": entry.reason,
            "source_type": entry.source_type,
            "source_id": entry.source_id,
            "stage_id": entry.stage_id,
            "remarks": entry.remarks,
            "created_at": entry.created_at,
        })
    return result


@router.get("/project-profitability", response_model=List[ProjectProfitabilityOut])
def project_profitability(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pq = db.query(Project).filter(Project.is_deleted == False)
    if project_id:
        pq = pq.filter(Project.id == project_id)
    projects = pq.all()
    if not projects:
        return []
    project_ids = [p.id for p in projects]

    idol_rows = (
        db.query(IdolManufacturing.project_id, func.sum(IdolManufacturing.total_manufacturing_cost))
        .filter(IdolManufacturing.project_id.in_(project_ids), IdolManufacturing.is_deleted == False)
        .group_by(IdolManufacturing.project_id).all()
    )
    # Better structure invested cost:
    # per position -> use structural component cost if present (>0), else fallback to position stage cost.
    pos_rows = (
        db.query(StructureType.project_id, BlueprintPosition.id)
        .join(StructureLayer, StructureLayer.structure_type_id == StructureType.id)
        .join(BlueprintPosition, BlueprintPosition.layer_id == StructureLayer.id)
        .filter(
            StructureType.project_id.in_(project_ids),
            StructureType.is_deleted == False,
            StructureLayer.is_deleted == False,
            BlueprintPosition.is_deleted == False,
        )
        .all()
    )
    positions_by_project = {}
    all_position_ids = set()
    for pid, pos_id in pos_rows:
        positions_by_project.setdefault(pid, []).append(pos_id)
        all_position_ids.add(pos_id)

    comp_by_pos_rows = (
        db.query(StructuralComponent.position_id, func.sum(StructuralComponent.cost))
        .filter(
            StructuralComponent.project_id.in_(project_ids),
            StructuralComponent.is_deleted == False,
            StructuralComponent.position_id.isnot(None),
        )
        .group_by(StructuralComponent.position_id)
        .all()
    )
    comp_by_pos = {pos_id: float(amt or 0) for pos_id, amt in comp_by_pos_rows}

    stage_by_pos_rows = (
        db.query(PositionStage.position_id, func.sum(PositionStage.stage_cost))
        .filter(PositionStage.position_id.in_(list(all_position_ids)))
        .group_by(PositionStage.position_id)
        .all()
    ) if all_position_ids else []
    stage_by_pos = {pos_id: float(amt or 0) for pos_id, amt in stage_by_pos_rows}

    idol_map = {pid: float(amt or 0) for pid, amt in idol_rows}

    result = []
    for p in projects:
        estimated = float(p.total_value or 0)
        idol_cost = float(idol_map.get(p.id, 0))
        structure_cost = 0.0
        for pos_id in positions_by_project.get(p.id, []):
            pos_comp_cost = float(comp_by_pos.get(pos_id, 0))
            pos_stage_cost = float(stage_by_pos.get(pos_id, 0))
            structure_cost += pos_comp_cost if pos_comp_cost > 0 else pos_stage_cost
        invested = float(idol_cost + structure_cost)
        profit = estimated - invested
        profit_pct = (profit / estimated * 100.0) if estimated > 0 else 0.0
        result.append({
            "project_id": p.id,
            "name": p.name,
            "estimated_cost": estimated,
            "invested_cost": invested,
            "idol_invested_cost": idol_cost,
            "structure_invested_cost": structure_cost,
            "profit_amount": profit,
            "profit_pct": round(profit_pct, 2),
        })
    return result


@router.get("/project-profitability-idols", response_model=List[ProjectProfitabilityIdolOut])
def project_profitability_idols(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pq = db.query(Project).filter(Project.is_deleted == False)
    if project_id:
        pq = pq.filter(Project.id == project_id)
    projects = pq.all()
    if not projects:
        return []
    project_ids = [p.id for p in projects]
    project_map = {p.id: p.name for p in projects}
    sales_rows = (
        db.query(IdolSale.idol_id, IdolSale.sale_amount)
        .join(IdolManufacturing, IdolManufacturing.id == IdolSale.idol_id)
        .filter(IdolManufacturing.project_id.in_(project_ids))
        .all()
    )
    sale_map = {int(iid): float(amt or 0) for iid, amt in sales_rows}

    idols = (db.query(IdolManufacturing)
             .filter(IdolManufacturing.project_id.in_(project_ids), IdolManufacturing.is_deleted == False)
             .all())
    result = []
    for i in idols:
        cost = float(i.total_manufacturing_cost or 0)
        sale_amount = sale_map.get(i.id)
        result.append({
            "project_id": i.project_id,
            "project_name": project_map.get(i.project_id, ""),
            "idol_id": i.id,
            "idol_name": i.idol_name,
            "serial_no": i.serial_no,
            "status": i.status,
            "cost": cost,
            "sale_amount": float(sale_amount or 0),
            "profit_amount": float(sale_amount - cost) if sale_amount is not None else 0.0,
        })
    return result


@router.get("/project-profitability-structures", response_model=List[ProjectProfitabilityStructureOut])
def project_profitability_structures(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pq = db.query(Project).filter(Project.is_deleted == False)
    if project_id:
        pq = pq.filter(Project.id == project_id)
    projects = pq.all()
    if not projects:
        return []
    project_ids = [p.id for p in projects]
    project_map = {p.id: p.name for p in projects}

    components = (
        db.query(StructuralComponent)
        .filter(StructuralComponent.project_id.in_(project_ids), StructuralComponent.is_deleted == False)
        .all()
    )
    block_map = {b.id: b.serial_no for b in db.query(StoneBlock).filter(StoneBlock.is_deleted == False).all()}

    # Position metadata for fallback rows when structural components are not yet created.
    pos_rows = (
        db.query(BlueprintPosition, StructureType)
        .join(StructureLayer, StructureLayer.id == BlueprintPosition.layer_id)
        .join(StructureType, StructureType.id == StructureLayer.structure_type_id)
        .filter(
            BlueprintPosition.is_deleted == False,
            StructureLayer.is_deleted == False,
            StructureType.is_deleted == False,
            StructureType.project_id.in_(project_ids),
        )
        .all()
    )
    position_map = {p.id: p for p, _ in pos_rows}
    pos_project_map = {p.id: st.project_id for p, st in pos_rows}

    # Position total cost = sum of position stage costs.
    pos_cost_rows = (
        db.query(PositionStage.position_id, func.sum(PositionStage.stage_cost))
        .filter(PositionStage.position_id.in_(list(position_map.keys())))
        .group_by(PositionStage.position_id)
        .all()
    ) if position_map else []
    pos_cost_map = {pid: float(cost or 0) for pid, cost in pos_cost_rows}

    result = []
    component_position_ids = set()
    for c in components:
        component_position_ids.add(c.position_id)
        result.append({
            "project_id": c.project_id,
            "project_name": project_map.get(c.project_id, ""),
            "component_id": c.id,
            "position_name": position_map.get(c.position_id).position_code if position_map.get(c.position_id) else f"Position #{c.position_id}",
            "stone_serial_no": block_map.get(c.stone_block_id),
            "status": c.wip_status,
            "cost": float(c.cost or 0),
        })

    # Add fallback lines for positions that have stage cost but no structural component row.
    for pos_id, pos in position_map.items():
        if pos_id in component_position_ids:
            continue
        cost = float(pos_cost_map.get(pos_id, 0))
        if cost <= 0:
            continue
        pid = pos_project_map.get(pos_id)
        result.append({
            "project_id": pid,
            "project_name": project_map.get(pid, ""),
            "component_id": pos_id,
            "position_name": pos.position_code,
            "stone_serial_no": block_map.get(pos.stone_block_id),
            "status": pos.status,
            "cost": cost,
        })

    return result


@router.get("/blueprint-position-progress", response_model=List[BlueprintPositionProgressOut])
def blueprint_position_progress(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = (
        db.query(BlueprintPosition, StructureLayer, StructureType, Project)
        .join(StructureLayer, BlueprintPosition.layer_id == StructureLayer.id)
        .join(StructureType, StructureLayer.structure_type_id == StructureType.id)
        .outerjoin(Project, StructureType.project_id == Project.id)
        .filter(
            BlueprintPosition.is_deleted == False,
            StructureLayer.is_deleted == False,
            StructureType.is_deleted == False,
        )
    )
    if project_id:
        q = q.filter(StructureType.project_id == project_id)
    rows = q.order_by(StructureType.id, StructureLayer.layer_order, BlueprintPosition.id).all()
    if not rows:
        return []

    pos_ids = [p.id for p, _, _, _ in rows]
    stage_rows = db.query(PositionStage).filter(PositionStage.position_id.in_(pos_ids)).all()
    stage_name_map = {s.id: s.name for s in db.query(StageMaster).all()}

    by_pos = {}
    for s in stage_rows:
        by_pos.setdefault(s.position_id, []).append(s)

    result = []
    for p, layer, struct, proj in rows:
        stages = by_pos.get(p.id, [])
        stage_total = len(stages)
        stage_completed = sum(1 for s in stages if s.status == "completed")
        stage_in_progress = sum(1 for s in stages if s.status == "in_progress")
        stage_pending = max(stage_total - stage_completed - stage_in_progress, 0)
        total_stage_cost = float(sum(float(s.stage_cost or 0) for s in stages))

        current = None
        if stages:
            ordered = sorted(stages, key=lambda s: (s.stage_order is None, s.stage_order or 0))
            for s in ordered:
                if s.status != "completed":
                    current = s
                    break
            if current is None:
                current = ordered[-1]

        result.append({
            "project_id": proj.id if proj else struct.project_id,
            "project_name": proj.name if proj else None,
            "structure_id": struct.id,
            "structure_name": struct.name,
            "layer_id": layer.id,
            "layer_name": layer.name,
            "layer_order": layer.layer_order,
            "position_id": p.id,
            "position_code": p.position_code,
            "position_status": p.status,
            "req_length": p.req_length,
            "req_width": p.req_width,
            "req_height": p.req_height,
            "tolerance_pct": p.tolerance_pct,
            "stage_total": stage_total,
            "stage_completed": stage_completed,
            "stage_in_progress": stage_in_progress,
            "stage_pending": stage_pending,
            "current_stage_name": stage_name_map.get(current.stage_id) if current else None,
            "current_stage_status": current.status if current else None,
            "total_stage_cost": total_stage_cost,
        })
    return result


@router.get("/position-dependency-health", response_model=List[PositionDependencyHealthOut])
def position_dependency_health(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = (
        db.query(BlueprintPosition, StructureLayer, StructureType, Project)
        .join(StructureLayer, BlueprintPosition.layer_id == StructureLayer.id)
        .join(StructureType, StructureLayer.structure_type_id == StructureType.id)
        .outerjoin(Project, StructureType.project_id == Project.id)
        .filter(
            BlueprintPosition.is_deleted == False,
            StructureLayer.is_deleted == False,
            StructureType.is_deleted == False,
        )
    )
    if project_id:
        q = q.filter(StructureType.project_id == project_id)
    rows = q.order_by(StructureType.id, StructureLayer.layer_order, BlueprintPosition.id).all()
    if not rows:
        return []

    pos_ids = [p.id for p, _, _, _ in rows]
    dep_rows = db.query(PositionDependency).filter(PositionDependency.position_id.in_(pos_ids)).all()
    dep_by_pos = {}
    depends_on_ids = set()
    for d in dep_rows:
        dep_by_pos.setdefault(d.position_id, []).append(d.depends_on_id)
        depends_on_ids.add(d.depends_on_id)

    pred_rows = (
        db.query(BlueprintPosition.id, BlueprintPosition.position_code, BlueprintPosition.status)
        .filter(BlueprintPosition.id.in_(depends_on_ids))
        .all()
    ) if depends_on_ids else []
    pred_map = {pid: (code, status) for pid, code, status in pred_rows}

    result = []
    for p, layer, struct, proj in rows:
        deps = dep_by_pos.get(p.id, [])
        dependency_count = len(deps)
        completed_dependencies = sum(1 for d in deps if pred_map.get(d, (None, None))[1] == "completed")
        blocked_by_codes = [pred_map[d][0] for d in deps if pred_map.get(d, (None, None))[1] != "completed" and pred_map.get(d, (None, None))[0]]
        blocked_count = len(blocked_by_codes)

        if dependency_count == 0:
            health = "no_dependencies"
        elif blocked_count > 0:
            health = "blocked"
        else:
            health = "ready"

        result.append({
            "project_id": proj.id if proj else struct.project_id,
            "project_name": proj.name if proj else None,
            "structure_id": struct.id,
            "structure_name": struct.name,
            "layer_id": layer.id,
            "layer_name": layer.name,
            "layer_order": layer.layer_order,
            "position_id": p.id,
            "position_code": p.position_code,
            "position_status": p.status,
            "dependency_count": dependency_count,
            "completed_dependencies": completed_dependencies,
            "blocked_count": blocked_count,
            "blocked_by": ", ".join(blocked_by_codes) if blocked_by_codes else None,
            "health_status": health,
        })
    return result


@router.get("/installation-report", response_model=List[InstallationReportOut])
def installation_report(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = (
        db.query(Installation, BlueprintPosition, StructureLayer, StructureType, Project, StoneBlock)
        .join(BlueprintPosition, Installation.position_id == BlueprintPosition.id)
        .join(StructureLayer, BlueprintPosition.layer_id == StructureLayer.id)
        .join(StructureType, StructureLayer.structure_type_id == StructureType.id)
        .outerjoin(Project, Installation.project_id == Project.id)
        .outerjoin(StoneBlock, Installation.stone_block_id == StoneBlock.id)
        .filter(Installation.is_deleted == False)
    )
    if project_id:
        q = q.filter(Installation.project_id == project_id)
    rows = q.order_by(Installation.id.desc()).all()

    result = []
    for inst, pos, layer, struct, proj, block in rows:
        result.append({
            "installation_id": inst.id,
            "project_id": inst.project_id,
            "project_name": proj.name if proj else None,
            "position_id": inst.position_id,
            "position_code": pos.position_code if pos else None,
            "structure_name": struct.name if struct else None,
            "layer_name": layer.name if layer else None,
            "stone_block_id": inst.stone_block_id,
            "stone_serial_no": block.serial_no if block else None,
            "installation_date": inst.installation_date,
            "installation_status": inst.status,
            "verified_at": inst.verified_at,
            "remarks": inst.remarks,
        })
    return result


@router.get("/stock-balance", response_model=List[StockBalanceReportOut])
def stock_balance(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # latest ledger row per item+warehouse
    sub = (db.query(StockLedger.item_id, StockLedger.warehouse_id, func.max(StockLedger.id).label("max_id"))
           .group_by(StockLedger.item_id, StockLedger.warehouse_id).subquery())
    rows = (db.query(StockLedger.item_id, StockLedger.warehouse_id, StockLedger.balance_qty)
            .join(sub, StockLedger.id == sub.c.max_id).all())

    item_map = {i.id: i.name for i in db.query(Item).filter(Item.is_deleted == False).all()}
    warehouse_name_map = {w.id: w.name for w in db.query(Warehouse).filter(Warehouse.is_deleted == False).all()}
    wh_map = {w.id: w.name for w in db.query(Warehouse).filter(Warehouse.is_deleted == False).all()}

    return [{
        "item_id": item_id,
        "item_name": item_map.get(item_id, ""),
        "warehouse_id": wh_id,
        "warehouse_name": wh_map.get(wh_id, ""),
        "balance_qty": float(balance or 0),
    } for item_id, wh_id, balance in rows]


@router.get("/serialized-stock", response_model=SerializedStockReportOut)
def serialized_stock_report(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Summary counts by item and status
    count_rows = (
        db.query(ItemSerial.item_id, ItemSerial.status, func.count(ItemSerial.id))
        .group_by(ItemSerial.item_id, ItemSerial.status)
        .all()
    )
    item_map = {i.id: i.name for i in db.query(Item).filter(Item.is_deleted == False).all()}
    warehouse_name_map = {w.id: w.name for w in db.query(Warehouse).filter(Warehouse.is_deleted == False).all()}
    summary_map = {}
    for item_id, status, cnt in count_rows:
        summary_map.setdefault(item_id, {"available": 0, "allocated": 0, "issued": 0, "returned": 0})
        summary_map[item_id][status or "available"] = int(cnt or 0)

    summary = []
    for item_id, counts in summary_map.items():
        available = counts.get("available", 0)
        allocated = counts.get("allocated", 0)
        issued = counts.get("issued", 0)
        returned = counts.get("returned", 0)
        total = available + allocated + issued + returned
        free_count = available + returned
        allocated_count = allocated + issued
        summary.append({
            "item_id": item_id,
            "item_name": item_map.get(item_id, ""),
            "total_serials": total,
            "allocated_count": allocated_count,
            "free_count": free_count,
            "issued_count": issued,
            "available_count": available,
            "returned_count": returned,
        })

    # Details for allocated/issued serials with stage info (if issued to idol)
    serials = (
        db.query(ItemSerial)
        .filter(ItemSerial.status.in_(["allocated", "issued"]))
        .order_by(ItemSerial.item_id, ItemSerial.serial_no)
        .all()
    )

    # Map serial -> project via project material allocation
    pm_rows = (
        db.query(ProjectMaterialSerial.item_serial_id, ProjectMaterial.project_id)
        .join(ProjectMaterial, ProjectMaterialSerial.project_material_id == ProjectMaterial.id)
        .all()
    )
    serial_project_map = {sid: pid for sid, pid in pm_rows}
    project_ids = {pid for pid in serial_project_map.values() if pid}

    # Map idols and stages for issued serials
    idol_ids = {s.reference_id for s in serials if s.reference_type == "idol" and s.reference_id}
    idol_map = {}
    if idol_ids:
        idols = db.query(IdolManufacturing).filter(IdolManufacturing.id.in_(idol_ids)).all()
        idol_map = {i.id: i for i in idols}
        project_ids.update({i.project_id for i in idols if i.project_id})

    project_map = {p.id: p.name for p in db.query(Project).filter(Project.id.in_(project_ids)).all()} if project_ids else {}

    stage_map = {}
    if idol_ids:
        stages = db.query(ManufacturingStage).filter(ManufacturingStage.idol_id.in_(idol_ids)).all()
        stages_by_idol = {}
        for s in stages:
            stages_by_idol.setdefault(s.idol_id, []).append(s)
        for idol_id, st_list in stages_by_idol.items():
            ordered = sorted(st_list, key=lambda s: s.stage_order)
            current = None
            for s in ordered:
                if s.status != "completed":
                    current = s
                    break
            if current is None and ordered:
                current = ordered[-1]
            stage_map[idol_id] = current

    allocated_details = []
    for s in serials:
        item_name = item_map.get(s.item_id, "")
        allocation_type = None
        project_id = serial_project_map.get(s.id)
        idol_id = None
        idol_obj = None
        idol_serial_no = None
        idol_status = None
        stage_name = None
        stage_status = None

        if s.reference_type == "idol" and s.reference_id:
            allocation_type = "idol"
            idol_id = s.reference_id
            idol_obj = idol_map.get(idol_id)
            if idol_obj:
                idol_serial_no = idol_obj.serial_no
                idol_status = idol_obj.status
                project_id = idol_obj.project_id or project_id
            stage = stage_map.get(idol_id)
            if stage:
                stage_name = stage.stage_name
                stage_status = stage.status
        else:
            allocation_type = "project" if project_id else None

        allocated_details.append({
            "item_id": s.item_id,
            "item_name": item_name,
            "serial_id": s.id,
            "serial_no": s.serial_no,
            "status": s.status,
            "allocation_type": allocation_type,
            "project_id": project_id,
            "project_name": project_map.get(project_id) if project_id else None,
            "idol_id": idol_id,
            "idol_name": idol_obj.idol_name if idol_obj else None,
            "idol_serial_no": idol_serial_no,
            "idol_status": idol_status,
            "current_stage_name": stage_name,
            "current_stage_status": stage_status,
            "warehouse_id": s.warehouse_id,
            "warehouse_name": warehouse_name_map.get(s.warehouse_id),
        })

    # Stone block allocation summary/details
    stone_blocks = db.query(StoneBlock).filter(StoneBlock.is_deleted == False).all()
    stone_item_map = {i.id: i.name for i in db.query(Item).filter(Item.is_deleted == False).all()}
    warehouse_map = {w.id: w.name for w in db.query(Warehouse).filter(Warehouse.is_deleted == False).all()}

    total_blocks_by_item = {}
    for b in stone_blocks:
        total_blocks_by_item[b.item_id] = total_blocks_by_item.get(b.item_id, 0) + 1

    allocated_blocks = (
        db.query(BlockAllocation)
        .filter(BlockAllocation.is_released == False)
        .all()
    )
    allocated_by_block = {a.stone_block_id: a.project_id for a in allocated_blocks}

    # Also treat idol + structural component usage as allocated
    idol_rows = db.query(IdolManufacturing).filter(IdolManufacturing.is_deleted == False).all()
    idol_by_block = {i.stone_block_id: i for i in idol_rows if i.stone_block_id}
    for i in idol_rows:
        if i.stone_block_id and i.project_id:
            allocated_by_block.setdefault(i.stone_block_id, i.project_id)

    comp_rows = db.query(StructuralComponent).filter(StructuralComponent.is_deleted == False).all()
    comp_by_block = {c.stone_block_id: c for c in comp_rows if c.stone_block_id}
    for c in comp_rows:
        if c.stone_block_id and c.project_id:
            allocated_by_block.setdefault(c.stone_block_id, c.project_id)

    # Also treat blueprint position's directly linked stone block as allocated
    position_block_rows = (
        db.query(BlueprintPosition.stone_block_id, StructureType.project_id)
        .join(StructureLayer, StructureLayer.id == BlueprintPosition.layer_id)
        .join(StructureType, StructureType.id == StructureLayer.structure_type_id)
        .filter(
            BlueprintPosition.is_deleted == False,
            BlueprintPosition.stone_block_id.isnot(None),
        )
        .all()
    )
    for block_id, project_id in position_block_rows:
        if block_id:
            allocated_by_block.setdefault(block_id, project_id)

    # Structural components are the preferred source of position allocation;
    # fallback to blueprint position block assignment when component is not created yet.
    pos_by_block = {
        p.stone_block_id: p.id
        for p in db.query(BlueprintPosition)
        .filter(
            BlueprintPosition.is_deleted == False,
            BlueprintPosition.stone_block_id.isnot(None),
        )
        .all()
    }

    allocated_count_by_item = {}
    for b in stone_blocks:
        if b.id in allocated_by_block:
            allocated_count_by_item[b.item_id] = allocated_count_by_item.get(b.item_id, 0) + 1

    stone_summary = []
    for item_id, total in total_blocks_by_item.items():
        allocated_cnt = allocated_count_by_item.get(item_id, 0)
        free_cnt = max(int(total) - int(allocated_cnt), 0)
        stone_summary.append({
            "item_id": item_id,
            "item_name": stone_item_map.get(item_id, ""),
            "total_blocks": int(total),
            "allocated_count": int(allocated_cnt),
            "free_count": int(free_cnt),
        })

    project_ids = {pid for pid in allocated_by_block.values() if pid}
    project_map = {p.id: p.name for p in db.query(Project).filter(Project.id.in_(project_ids)).all()} if project_ids else {}

    pos_rows = db.query(BlueprintPosition).filter(BlueprintPosition.is_deleted == False).all()
    position_map = {p.id: p.position_code for p in pos_rows}
    pos_req_map = {p.id: (p.req_length, p.req_width, p.req_height, p.status) for p in pos_rows}
    pos_meta_rows = (
        db.query(
            BlueprintPosition.id,
            StructureLayer.name,
            StructureType.name,
        )
        .join(StructureLayer, StructureLayer.id == BlueprintPosition.layer_id)
        .join(StructureType, StructureType.id == StructureLayer.structure_type_id)
        .filter(
            BlueprintPosition.is_deleted == False,
            StructureLayer.is_deleted == False,
            StructureType.is_deleted == False,
        )
        .all()
    )
    pos_meta_map = {
        pid: {"layer_name": layer_name, "structure_name": structure_name}
        for pid, layer_name, structure_name in pos_meta_rows
    }

    stage_name_map = {s.id: s.name for s in db.query(StageMaster).all()}
    pos_stage_map = {}
    if pos_rows:
        pos_ids = [p.id for p in pos_rows]
        stage_rows = db.query(PositionStage).filter(PositionStage.position_id.in_(pos_ids)).all()
        stages_by_pos = {}
        for s in stage_rows:
            stages_by_pos.setdefault(s.position_id, []).append(s)
        for pos_id, st_list in stages_by_pos.items():
            ordered = sorted(st_list, key=lambda s: (s.stage_order is None, s.stage_order or 0))
            current = None
            for s in ordered:
                if s.status != "completed":
                    current = s
                    break
            if current is None and ordered:
                current = ordered[-1]
            if current:
                pos_stage_map[pos_id] = current

    idol_ids_for_blocks = {i.id for i in idol_by_block.values()} if idol_by_block else set()
    stage_map = {}
    if idol_ids_for_blocks:
        stages = db.query(ManufacturingStage).filter(ManufacturingStage.idol_id.in_(idol_ids_for_blocks)).all()
        stages_by_idol = {}
        for s in stages:
            stages_by_idol.setdefault(s.idol_id, []).append(s)
        for idol_id, st_list in stages_by_idol.items():
            ordered = sorted(st_list, key=lambda s: s.stage_order)
            current = None
            for s in ordered:
                if s.status != "completed":
                    current = s
                    break
            if current is None and ordered:
                current = ordered[-1]
            stage_map[idol_id] = current

    stone_allocated = []
    for b in stone_blocks:
        if b.id not in allocated_by_block:
            continue
        pid = allocated_by_block.get(b.id)
        idol = idol_by_block.get(b.id)
        comp = comp_by_block.get(b.id)
        stage = stage_map.get(idol.id) if idol else None
        pos_id = comp.position_id if comp and comp.position_id else pos_by_block.get(b.id)
        pos_req = pos_req_map.get(pos_id) if pos_id else None
        pos_stage = pos_stage_map.get(pos_id) if pos_id else None
        stone_allocated.append({
            "block_id": b.id,
            "serial_no": b.serial_no,
            "item_id": b.item_id,
            "item_name": stone_item_map.get(b.item_id),
            "status": b.status,
            "length": b.length,
            "width": b.width,
            "height": b.height,
            "total_volume": b.total_volume,
            "available_volume": b.available_volume,
            "warehouse_id": b.warehouse_id,
            "warehouse_name": warehouse_map.get(b.warehouse_id),
            "project_id": pid,
            "project_name": project_map.get(pid) if pid else None,
            "idol_id": idol.id if idol else None,
            "idol_serial_no": idol.serial_no if idol else None,
            "idol_name": idol.idol_name if idol else None,
            "idol_status": idol.status if idol else None,
            "position_id": pos_id,
            "position_name": position_map.get(pos_id) if pos_id else None,
            "position_status": pos_req[3] if pos_req else None,
            "position_stage_name": stage_name_map.get(pos_stage.stage_id) if pos_stage else None,
            "position_stage_status": pos_stage.status if pos_stage else None,
            "component_status": comp.wip_status if comp else None,
            "actual_length": comp.actual_length if comp else None,
            "actual_width": comp.actual_width if comp else None,
            "actual_height": comp.actual_height if comp else None,
            "req_length": pos_req[0] if pos_req else None,
            "req_width": pos_req[1] if pos_req else None,
            "req_height": pos_req[2] if pos_req else None,
            "current_stage_name": stage.stage_name if stage else None,
            "current_stage_status": stage.status if stage else None,
        })

    # Unified allocation rows (single-table frontend use)
    allocated_items = []

    # 1) Serialized item allocations
    for row in allocated_details:
        allocated_items.append({
            "item_id": row.get("item_id"),
            "item_name": row.get("item_name"),
            "serial_no": row.get("serial_no"),
            "allocated_qty": 1.0,
            "allocation_type": row.get("allocation_type"),
            "project_id": row.get("project_id"),
            "project_name": row.get("project_name"),
            "idol_id": row.get("idol_id"),
            "idol_name": row.get("idol_name"),
            "position_id": None,
            "position_name": None,
            "structure_name": None,
            "layer_name": None,
            "stage_name": row.get("current_stage_name"),
            "stage_status": row.get("current_stage_status"),
            "warehouse_id": row.get("warehouse_id"),
            "warehouse_name": row.get("warehouse_name"),
            "status": row.get("status"),
        })

    # 2) Non-serialized item allocations to idols (qty-based)
    non_serial_rows = (
        db.query(
            IdolMaterial.item_id,
            IdolMaterial.idol_id,
            func.coalesce(func.sum(IdolMaterial.qty), 0).label("qty"),
        )
        .join(IdolManufacturing, IdolMaterial.idol_id == IdolManufacturing.id)
        .join(Item, IdolMaterial.item_id == Item.id)
        .filter(
            IdolManufacturing.is_deleted == False,
            IdolMaterial.item_id.isnot(None),
            IdolMaterial.stone_block_id.is_(None),
            Item.has_serial_no == False,
        )
        .group_by(IdolMaterial.item_id, IdolMaterial.idol_id)
        .all()
    )
    for item_id, idol_id, qty in non_serial_rows:
        idol_obj = idol_map.get(idol_id) if idol_id else None
        stage = stage_map.get(idol_id) if idol_id else None
        allocated_items.append({
            "item_id": item_id,
            "item_name": item_map.get(item_id),
            "serial_no": None,
            "allocated_qty": float(qty or 0),
            "allocation_type": "idol",
            "project_id": idol_obj.project_id if idol_obj else None,
            "project_name": project_map.get(idol_obj.project_id) if idol_obj and idol_obj.project_id else None,
            "idol_id": idol_id,
            "idol_name": idol_obj.idol_name if idol_obj else None,
            "position_id": None,
            "position_name": None,
            "structure_name": None,
            "layer_name": None,
            "stage_name": stage.stage_name if stage else None,
            "stage_status": stage.status if stage else None,
            "warehouse_id": None,
            "warehouse_name": None,
            "status": idol_obj.status if idol_obj else None,
        })

    # 3) Position item allocations (from blueprint positions)
    pos_item_rows = (
        db.query(
            BlueprintPosition.id,
            BlueprintPosition.position_code,
            BlueprintPosition.stone_item_id,
            BlueprintPosition.stone_block_id,
            BlueprintPosition.status,
            StructureType.project_id,
        )
        .join(StructureLayer, StructureLayer.id == BlueprintPosition.layer_id)
        .join(StructureType, StructureType.id == StructureLayer.structure_type_id)
        .filter(
            BlueprintPosition.is_deleted == False,
            BlueprintPosition.stone_item_id.isnot(None),
        )
        .all()
    )
    block_serial_map = {b.id: b.serial_no for b in stone_blocks}
    for pos_id, pos_code, item_id, stone_block_id, pos_status, pid in pos_item_rows:
        pos_stage = pos_stage_map.get(pos_id)
        allocated_items.append({
            "item_id": item_id,
            "item_name": item_map.get(item_id),
            "serial_no": block_serial_map.get(stone_block_id) if stone_block_id else None,
            "allocated_qty": 1.0,
            "allocation_type": "position",
            "project_id": pid,
            "project_name": project_map.get(pid) if pid else None,
            "idol_id": None,
            "idol_name": None,
            "position_id": pos_id,
            "position_name": pos_code,
            "structure_name": pos_meta_map.get(pos_id, {}).get("structure_name"),
            "layer_name": pos_meta_map.get(pos_id, {}).get("layer_name"),
            "stage_name": stage_name_map.get(pos_stage.stage_id) if pos_stage else None,
            "stage_status": pos_stage.status if pos_stage else pos_status,
            "warehouse_id": None,
            "warehouse_name": None,
            "status": pos_status,
        })

    # 4) Stone blocks allocations
    for row in stone_allocated:
        alloc_type = "position" if row.get("position_id") else ("idol" if row.get("idol_id") else "project")
        allocated_items.append({
            "item_id": row.get("item_id"),
            "item_name": row.get("item_name"),
            "serial_no": row.get("serial_no"),
            "allocated_qty": 1.0,
            "allocation_type": alloc_type,
            "project_id": row.get("project_id"),
            "project_name": row.get("project_name"),
            "idol_id": row.get("idol_id"),
            "idol_name": row.get("idol_name"),
            "position_id": row.get("position_id"),
            "position_name": row.get("position_name"),
            "structure_name": pos_meta_map.get(row.get("position_id"), {}).get("structure_name") if row.get("position_id") else None,
            "layer_name": pos_meta_map.get(row.get("position_id"), {}).get("layer_name") if row.get("position_id") else None,
            "stage_name": row.get("position_stage_name") or row.get("current_stage_name"),
            "stage_status": row.get("position_stage_status") or row.get("current_stage_status") or row.get("status"),
            "warehouse_id": row.get("warehouse_id"),
            "warehouse_name": row.get("warehouse_name"),
            "status": row.get("status"),
        })

    return {
        "summary": summary,
        "allocated": allocated_details,
        "stone_summary": stone_summary,
        "stone_allocated": stone_allocated,
        "allocated_items": allocated_items,
    }


@router.get("/idol-summary", response_model=List[IdolSummaryOut])
def idol_summary(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(IdolManufacturing).filter(IdolManufacturing.is_deleted == False)
    if project_id:
        q = q.filter(IdolManufacturing.project_id == project_id)
    idols = q.all()
    project_ids = {i.project_id for i in idols if i.project_id}
    project_map = {}
    if project_ids:
        project_rows = db.query(Project.id, Project.name).filter(Project.id.in_(project_ids)).all()
        project_map = {int(pid): name for pid, name in project_rows}

    idol_ids = [i.id for i in idols]
    sale_map = {}
    if idol_ids:
        sale_rows = db.query(IdolSale.idol_id, IdolSale.sale_amount).filter(IdolSale.idol_id.in_(idol_ids)).all()
        sale_map = {int(iid): float(amt or 0) for iid, amt in sale_rows}

    result = []
    for i in idols:
        cost = float(i.total_manufacturing_cost or 0)
        sale_amount = sale_map.get(i.id)
        result.append({
            "idol_id": i.id,
            "project_id": i.project_id,
            "project_name": project_map.get(i.project_id) if i.project_id else None,
            "serial_no": i.serial_no,
            "idol_name": i.idol_name,
            "status": i.status,
            "total_manufacturing_cost": cost,
            "sale_amount": float(sale_amount or 0),
            "profit_amount": float(sale_amount - cost) if sale_amount is not None else 0.0,
            "created_at": i.created_at,
        })
    return result


@router.get("/idol-stage-progress", response_model=List[IdolStageProgressOut])
def idol_stage_progress(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(ManufacturingStage, IdolManufacturing).join(IdolManufacturing, ManufacturingStage.idol_id == IdolManufacturing.id)
    q = q.filter(IdolManufacturing.is_deleted == False)
    if project_id:
        q = q.filter(IdolManufacturing.project_id == project_id)
    rows = q.order_by(ManufacturingStage.idol_id, ManufacturingStage.stage_order).all()
    result = []
    for s, idol in rows:
        result.append({
            "idol_id": idol.id,
            "serial_no": idol.serial_no,
            "idol_name": idol.idol_name,
            "stage_id": s.id,
            "stage_name": s.stage_name,
            "stage_order": s.stage_order,
            "status": s.status,
            "labor_hours": float(s.labor_hours or 0),
            "labor_rate": float(s.labor_rate or 0),
            "material_cost": float(s.material_cost or 0),
            "stage_cost": float(s.stage_cost or 0),
        })
    return result


@router.get("/idol-material-consumption", response_model=List[IdolMaterialConsumptionOut])
def idol_material_consumption(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(IdolMaterial, IdolManufacturing).join(IdolManufacturing, IdolMaterial.idol_id == IdolManufacturing.id)
    q = q.filter(IdolManufacturing.is_deleted == False)
    if project_id:
        q = q.filter(IdolManufacturing.project_id == project_id)
    rows = q.all()
    item_map = {i.id: i.name for i in db.query(Item).filter(Item.is_deleted == False).all()}
    stone_map = {b.id: b.serial_no for b in db.query(StoneBlock).filter(StoneBlock.is_deleted == False).all()}
    result = []
    for m, idol in rows:
        result.append({
            "idol_id": idol.id,
            "serial_no": idol.serial_no,
            "idol_name": idol.idol_name,
            "item_id": m.item_id,
            "item_name": item_map.get(m.item_id),
            "stone_block_id": m.stone_block_id,
            "stone_serial_no": stone_map.get(m.stone_block_id),
            "qty": float(m.qty or 0),
        })
    return result


@router.get("/stone-block-availability", response_model=List[StoneBlockAvailabilityOut])
def stone_block_availability(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(StoneBlock).filter(StoneBlock.is_deleted == False)
    if project_id is not None:
        q = q.filter(StoneBlock.project_id == project_id)
    blocks = q.order_by(StoneBlock.id.desc()).all()

    item_map = {i.id: i.name for i in db.query(Item).filter(Item.is_deleted == False).all()}
    result = []
    for b in blocks:
        total_vol = float(b.total_volume or 0)
        avail_vol = float(b.available_volume or 0)
        result.append({
            "item_id": b.item_id,
            "item_name": item_map.get(b.item_id, ""),
            "status": b.status,
            "serial_no": b.serial_no,
            "total_volume": f"{round(total_vol, 4)} CFT",
            "available_volume": f"{round(avail_vol, 4)} CFT",
        })
    return result
