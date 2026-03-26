from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from database import get_db
from models.models import StoneBlock, User
from schemas import StoneBlockCreate, StoneSplitRequest, StoneBlockOut
from utils.auth import get_current_user, require_roles, log_audit
from config import Role

router = APIRouter(prefix="/stones", tags=["Stone Block Engine"])

STONE_ROLES = (Role.ADMIN, Role.STORE_MANAGER, Role.PRODUCTION_SUPERVISOR)


def _gen_serial() -> str:
    return f"SB-{uuid.uuid4().hex[:10].upper()}"


def _calc_volume(l: float, w: float, h: float) -> float:
    return round(l * w * h, 4)


@router.post("/blocks", response_model=StoneBlockOut, status_code=201)
def register_block(
    payload: StoneBlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*STONE_ROLES)),
):
    vol = _calc_volume(payload.length, payload.width, payload.height)
    block = StoneBlock(
        serial_no=_gen_serial(),
        item_id=payload.item_id,
        warehouse_id=payload.warehouse_id,
        project_id=payload.project_id,
        length=payload.length,
        width=payload.width,
        height=payload.height,
        total_volume=vol,
        available_volume=vol,
        stone_type=payload.stone_type,
        quarry_source=payload.quarry_source,
        rate_per_cft=payload.rate_per_cft,
        created_by=current_user.id,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    log_audit(db, current_user.id, "CREATE", "stone_blocks", block.id, f"Registered {block.serial_no}")
    return block


@router.get("/blocks", response_model=List[StoneBlockOut])
def list_blocks(
    status: Optional[str] = None,
    project_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(StoneBlock).filter(StoneBlock.is_deleted == False)
    if status:
        q = q.filter(StoneBlock.status == status)
    if project_id:
        q = q.filter(StoneBlock.project_id == project_id)
    if warehouse_id:
        q = q.filter(StoneBlock.warehouse_id == warehouse_id)
    return q.all()


@router.get("/blocks/{block_id}", response_model=StoneBlockOut)
def get_block(block_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    block = db.query(StoneBlock).filter(StoneBlock.id == block_id, StoneBlock.is_deleted == False).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block


@router.post("/blocks/{block_id}/split", response_model=List[StoneBlockOut])
def split_block(
    block_id: int,
    payload: StoneSplitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*STONE_ROLES)),
):
    parent = db.query(StoneBlock).filter(StoneBlock.id == block_id, StoneBlock.is_deleted == False).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent block not found")
    if parent.available_volume is not None and round(parent.available_volume, 4) <= 0:
        raise HTTPException(status_code=400, detail="No available volume left to split")

    # Validate total child volume
    children_data = payload.children
    total_child_vol = sum(_calc_volume(c["length"], c["width"], c["height"]) for c in children_data)
    if round(total_child_vol, 4) > round(parent.available_volume, 4):
        raise HTTPException(
            status_code=400,
            detail=f"Total child volume ({total_child_vol:.4f}) exceeds parent available volume ({parent.available_volume:.4f})"
        )

    created_children = []
    for c in children_data:
        child_vol = _calc_volume(c["length"], c["width"], c["height"])
        child = StoneBlock(
            serial_no=_gen_serial(),
            parent_id=parent.id,
            item_id=parent.item_id,
            warehouse_id=parent.warehouse_id,
            project_id=parent.project_id,
            length=c["length"],
            width=c["width"],
            height=c["height"],
            total_volume=child_vol,
            available_volume=child_vol,
            stone_type=parent.stone_type,
            quarry_source=parent.quarry_source,
            rate_per_cft=parent.rate_per_cft,
            created_by=current_user.id,
        )
        db.add(child)
        created_children.append(child)

    residual = round(parent.available_volume - total_child_vol, 4)
    parent.available_volume = residual
    parent.status = "split"
    # Calculate yield (total carved vs original)
    parent.yield_pct = round(((parent.total_volume - residual) / parent.total_volume) * 100, 2)

    db.commit()
    for c in created_children:
        db.refresh(c)
    log_audit(db, current_user.id, "SPLIT", "stone_blocks", block_id,
              f"Split into {len(created_children)} children. Residual: {residual}")
    return created_children


@router.get("/blocks/{block_id}/genealogy")
def get_genealogy(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns full parent → child genealogy tree."""
    def build_tree(bid: int) -> dict:
        block = db.query(StoneBlock).filter(StoneBlock.id == bid).first()
        if not block:
            return {}
        return {
            "id": block.id,
            "serial_no": block.serial_no,
            "status": block.status,
            "total_volume": block.total_volume,
            "available_volume": block.available_volume,
            "yield_pct": block.yield_pct,
            "children": [build_tree(c.id) for c in block.children],
        }

    block = db.query(StoneBlock).filter(StoneBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    # Walk up to root
    root = block
    while root.parent_id:
        root = db.query(StoneBlock).filter(StoneBlock.id == root.parent_id).first()

    return build_tree(root.id)


@router.get("/blocks/{block_id}/children", response_model=List[StoneBlockOut])
def get_children(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(StoneBlock).filter(StoneBlock.parent_id == block_id, StoneBlock.is_deleted == False).all()


@router.delete("/blocks/{block_id}", status_code=204)
def delete_block(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN)),
):
    block = db.query(StoneBlock).filter(StoneBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    block.is_deleted = True
    db.commit()
