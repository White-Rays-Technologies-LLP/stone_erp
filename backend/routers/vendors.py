from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.models import Vendor, User
from schemas import VendorCreate, VendorOut
from utils.auth import get_current_user, require_roles, log_audit
from config import Role

router = APIRouter(prefix="/vendors", tags=["Vendors"])

VENDOR_ROLES = (Role.ADMIN, Role.STORE_MANAGER, Role.PROJECT_MANAGER)


@router.get("", response_model=List[VendorOut])
def list_vendors(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Vendor).filter(Vendor.is_deleted == False)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(Vendor.name.ilike(like))
    return query.order_by(Vendor.id.desc()).all()


@router.post("", response_model=VendorOut, status_code=201)
def create_vendor(
    payload: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*VENDOR_ROLES)),
):
    existing = db.query(Vendor).filter(Vendor.name == payload.name, Vendor.is_deleted == False).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor name already exists")
    vendor = Vendor(**payload.dict())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    log_audit(db, current_user.id, "CREATE", "vendors", vendor.id)
    return vendor


@router.put("/{vendor_id}", response_model=VendorOut)
def update_vendor(
    vendor_id: int,
    payload: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*VENDOR_ROLES)),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id, Vendor.is_deleted == False).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for k, v in payload.dict().items():
        setattr(vendor, k, v)
    db.commit()
    db.refresh(vendor)
    log_audit(db, current_user.id, "UPDATE", "vendors", vendor.id)
    return vendor


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN)),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id, Vendor.is_deleted == False).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.is_deleted = True
    db.commit()
    log_audit(db, current_user.id, "DELETE", "vendors", vendor.id)
