from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from database import get_db
from models.models import User, StockLedger, Item, ItemCategory, StoneBlock, ItemSerial, Vendor
from models.purchase_orders import (
    PurchaseOrder, PurchaseOrderItem,
    PurchaseReceipt, PurchaseReceiptItem,
    PurchasePayment,
    PurchaseReturn, PurchaseReturnItem,
)
from schemas import (
    PurchaseOrderCreate, PurchaseOrderOut,
    PurchaseReceiptCreate, PurchaseReceiptOut,
    PurchasePaymentCreate, PurchasePaymentOut,
    PurchaseReturnCreate, PurchaseReturnOut,
)
from utils.auth import get_current_user, require_roles
from config import Role, MovementType
from datetime import datetime
import uuid

router = APIRouter(prefix="/purchase", tags=["Purchase Orders"])


def _hard_delete_or_400(db: Session, obj, label: str):
    try:
        db.delete(obj)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Cannot delete {label} because it is linked. Delete related records first.")

PO_ROLES = (Role.ADMIN, Role.STORE_MANAGER, Role.PROJECT_MANAGER)

def generate_po_number(db: Session) -> str:
    last_po = db.query(PurchaseOrder).order_by(PurchaseOrder.id.desc()).first()
    next_num = (last_po.id + 1) if last_po else 1
    return f"PO-GEN-{datetime.now().year}-{next_num:03d}"


def _gen_stone_serial() -> str:
    return f"SB-{uuid.uuid4().hex[:10].upper()}"

def _gen_item_serial(item: Item) -> str:
    prefix = item.code or "ITEM"
    return f"{prefix}-SN-{uuid.uuid4().hex[:8].upper()}"


def _calc_volume(l: float, w: float, h: float) -> float:
    return round(l * w * h, 4)


def _sanitize_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    val = value.strip()
    if val == "" or val.lower() == "string":
        return None
    return value


def _get_po_paid_amount(db: Session, po_id: int) -> float:
    total = (
        db.query(func.coalesce(func.sum(PurchasePayment.amount), 0))
        .filter(PurchasePayment.po_id == po_id)
        .scalar()
    )
    return float(total or 0)


def _get_current_balance(db: Session, item_id: int, warehouse_id: int) -> float:
    last = (
        db.query(StockLedger)
        .filter(StockLedger.item_id == item_id, StockLedger.warehouse_id == warehouse_id)
        .order_by(StockLedger.id.desc())
        .first()
    )
    return float(last.balance_qty) if last else 0.0


def _payment_status(total_amount: float, paid_amount: float) -> str:
    if paid_amount <= 0:
        return "unpaid"
    if paid_amount + 0.0001 >= total_amount:
        return "paid"
    return "partial"

@router.post("/orders", response_model=PurchaseOrderOut, status_code=201)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*PO_ROLES)),
):
    total_amount = 0.0
    vendor = None
    if payload.vendor_id:
        vendor = db.query(Vendor).filter(Vendor.id == payload.vendor_id, Vendor.is_deleted == False).first()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
    if not vendor and not payload.vendor_name:
        raise HTTPException(status_code=400, detail="Provide vendor_id or vendor_name")
    vendor_name = vendor.name if vendor else payload.vendor_name
    vendor_gstin = vendor.gstin if (vendor and vendor.gstin) else _sanitize_optional_text(payload.vendor_gstin)

    po = PurchaseOrder(
        po_number=generate_po_number(db),
        vendor_id=vendor.id if vendor else None,
        vendor_name=vendor_name,
        vendor_gstin=vendor_gstin,
        po_date=payload.po_date,
        expected_delivery=payload.expected_delivery,
        total_amount=total_amount,
        remarks=_sanitize_optional_text(payload.remarks),
        created_by=current_user.id,
    )
    db.add(po)
    db.flush()
    
    for item_data in payload.items:
        item = (
            db.query(Item)
            .filter(Item.id == item_data.item_id, Item.is_deleted == False)
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail=f"Item not found: {item_data.item_id}")

        category = db.query(ItemCategory).filter(ItemCategory.id == item.category_id).first()
        item_type = category.item_type if category else None

        length = item_data.length
        width = item_data.width
        height = item_data.height
        cft = None

        if item_type == "dimensional":
            if length is None or width is None or height is None:
                raise HTTPException(
                    status_code=422,
                    detail=f"Length, width, height are required for dimensional items (item_id={item.id})",
                )
            cft = round(length * width * height * item_data.qty, 4)
            amount = round(cft * item_data.rate, 2)
        else:
            amount = round(item_data.qty * item_data.rate, 2)

        po_item = PurchaseOrderItem(
            po_id=po.id,
            item_id=item_data.item_id,
            qty=item_data.qty,
            rate=item_data.rate,
            amount=amount,
            length=length if item_type == "dimensional" else None,
            width=width if item_type == "dimensional" else None,
            height=height if item_type == "dimensional" else None,
            cft=cft,
        )
        db.add(po_item)
        total_amount += amount
    
    po.total_amount = total_amount
    db.commit()
    po = (
        db.query(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .filter(PurchaseOrder.id == po.id)
        .first()
    )
    po.paid_amount = 0.0
    po.payment_status = "unpaid"
    return po

@router.get("/orders", response_model=List[PurchaseOrderOut])
def list_purchase_orders(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(PurchaseOrder).options(selectinload(PurchaseOrder.items)).filter(PurchaseOrder.is_deleted == False)
    if status:
        q = q.filter(PurchaseOrder.status == status)
    rows = q.order_by(PurchaseOrder.id.desc()).all()
    for po in rows:
        paid = _get_po_paid_amount(db, po.id)
        po.paid_amount = paid
        po.payment_status = _payment_status(po.total_amount, paid)
    return rows


@router.get("/orders/{po_id}", response_model=PurchaseOrderOut)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    po = (
        db.query(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .filter(PurchaseOrder.id == po_id, PurchaseOrder.is_deleted == False)
        .first()
    )
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    paid = _get_po_paid_amount(db, po.id)
    po.paid_amount = paid
    po.payment_status = _payment_status(po.total_amount, paid)
    return po


@router.delete("/orders/{po_id}", status_code=204)
def delete_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    _hard_delete_or_400(db, po, "purchase order")

@router.put("/orders/{po_id}/approve")
def approve_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.PROJECT_MANAGER)),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if po.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft POs can be approved")
    
    po.status = "approved"
    db.commit()
    return {"message": "Purchase order approved"}

@router.post("/receipts")
def receive_purchase_order(
    payload: PurchaseReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*PO_ROLES)),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == payload.po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if po.status not in ["approved", "sent"]:
        raise HTTPException(status_code=400, detail="PO must be approved to receive")
    
    receipt = PurchaseReceipt(
        po_id=payload.po_id,
        warehouse_id=payload.warehouse_id,
        receipt_date=payload.receipt_date,
        remarks=_sanitize_optional_text(payload.remarks),
        created_by=current_user.id,
    )
    db.add(receipt)
    db.flush()

    for item_receipt in payload.items:
        po_item = db.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.po_id == payload.po_id,
            PurchaseOrderItem.item_id == item_receipt["item_id"]
        ).first()
        
        if not po_item:
            continue
            
        received_qty = item_receipt["received_qty"]
        po_item.received_qty += received_qty
        db.add(PurchaseReceiptItem(
            receipt_id=receipt.id,
            item_id=po_item.item_id,
            received_qty=received_qty,
        ))
        
        target_warehouse = payload.warehouse_id

        item = db.query(Item).filter(Item.id == po_item.item_id, Item.is_deleted == False).first()
        category = db.query(ItemCategory).filter(ItemCategory.id == item.category_id).first() if item else None
        item_type = category.item_type if category else None
        receipt_value = received_qty * po_item.rate
        if item_type == "dimensional" and po_item.length and po_item.width and po_item.height:
            receipt_cft = po_item.length * po_item.width * po_item.height * received_qty
            receipt_value = receipt_cft * po_item.rate
        
        # Create stock ledger entries (serial or non-serial)
        current_balance = db.query(StockLedger).filter(
            StockLedger.item_id == po_item.item_id,
            StockLedger.warehouse_id == target_warehouse
        ).order_by(StockLedger.id.desc()).first()

        balance_qty = current_balance.balance_qty if current_balance else 0

        if item and item.has_serial_no:
            if float(received_qty).is_integer() is False:
                raise HTTPException(
                    status_code=422,
                    detail=f"Received quantity must be a whole number for serial items (item_id={po_item.item_id})",
                )
            unit_count = int(received_qty)

            serials = []
            # For dimensional items, create stone blocks and use their serials
            if item_type == "dimensional":
                if not po_item.length or not po_item.width or not po_item.height:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Dimensional item missing length/width/height (item_id={po_item.item_id})",
                    )
                vol = _calc_volume(po_item.length, po_item.width, po_item.height)
                for _ in range(unit_count):
                    serial = _gen_stone_serial()
                    serials.append(serial)
                    db.add(StoneBlock(
                        serial_no=serial,
                        item_id=po_item.item_id,
                        warehouse_id=target_warehouse,
                        project_id=None,
                        length=po_item.length,
                        width=po_item.width,
                        height=po_item.height,
                        total_volume=vol,
                        available_volume=vol,
                        status="available",
                        rate_per_cft=po_item.rate,
                        created_by=current_user.id,
                    ))
            else:
                serials = [_gen_item_serial(item) for _ in range(unit_count)]
                for serial in serials:
                    db.add(ItemSerial(
                        item_id=po_item.item_id,
                        warehouse_id=target_warehouse,
                        serial_no=serial,
                        status="available",
                        reference_type="purchase_order",
                        reference_id=po.id,
                    ))

            per_unit_value = receipt_value / unit_count if unit_count else 0
            for serial in serials:
                balance_qty += 1
                db.add(StockLedger(
                    item_id=po_item.item_id,
                    warehouse_id=target_warehouse,
                    movement_type="inward",
                    qty_in=1,
                    qty_out=0,
                    balance_qty=balance_qty,
                    rate=po_item.rate,
                    value=per_unit_value,
                    reference_type="purchase_order",
                    reference_id=po.id,
                    serial_no=serial,
                    remarks=f"PO Receipt: {po.po_number}",
                    created_by=current_user.id,
                ))
        else:
            new_balance = balance_qty + received_qty
            stock_entry = StockLedger(
                item_id=po_item.item_id,
                warehouse_id=target_warehouse,
                movement_type="inward",
                qty_in=received_qty,
                qty_out=0,
                balance_qty=new_balance,
                rate=po_item.rate,
                value=receipt_value,
                reference_type="purchase_order",
                reference_id=po.id,
                remarks=f"PO Receipt: {po.po_number}",
                created_by=current_user.id,
            )
            db.add(stock_entry)

            # Auto-create stone blocks for dimensional items
            if item_type == "dimensional":
                if not po_item.length or not po_item.width or not po_item.height:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Dimensional item missing length/width/height (item_id={po_item.item_id})",
                    )
                if float(received_qty).is_integer() is False:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Received quantity must be a whole number to create stone blocks (item_id={po_item.item_id})",
                    )

                block_count = int(received_qty)
                vol = _calc_volume(po_item.length, po_item.width, po_item.height)
                for _ in range(block_count):
                    db.add(StoneBlock(
                        serial_no=_gen_stone_serial(),
                        item_id=po_item.item_id,
                        warehouse_id=target_warehouse,
                        project_id=None,
                        length=po_item.length,
                        width=po_item.width,
                        height=po_item.height,
                        total_volume=vol,
                        available_volume=vol,
                        status="available",
                        rate_per_cft=po_item.rate,
                        created_by=current_user.id,
                    ))
    
    # Check if PO is fully received
    po_items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == payload.po_id).all()
    if all(item.received_qty >= item.qty for item in po_items):
        po.status = "received"

    db.commit()
    return {"message": "Purchase receipt recorded"}


@router.get("/receipts", response_model=List[PurchaseReceiptOut])
def list_purchase_receipts(
    po_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(PurchaseReceipt)
        .options(
            selectinload(PurchaseReceipt.items),
            selectinload(PurchaseReceipt.returns).selectinload(PurchaseReturn.items),
            selectinload(PurchaseReceipt.purchase_order),
        )
    )
    if po_id:
        q = q.filter(PurchaseReceipt.po_id == po_id)
    receipts = q.order_by(PurchaseReceipt.id.desc()).all()
    for r in receipts:
        paid = _get_po_paid_amount(db, r.po_id)
        r.purchase_order.paid_amount = paid
        r.purchase_order.payment_status = _payment_status(r.purchase_order.total_amount, paid)
    return receipts


@router.get("/receipts/{receipt_id}", response_model=PurchaseReceiptOut)
def get_purchase_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    receipt = (
        db.query(PurchaseReceipt)
        .options(
            selectinload(PurchaseReceipt.items),
            selectinload(PurchaseReceipt.returns).selectinload(PurchaseReturn.items),
            selectinload(PurchaseReceipt.purchase_order),
        )
        .filter(PurchaseReceipt.id == receipt_id)
        .first()
    )
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    paid = _get_po_paid_amount(db, receipt.po_id)
    receipt.purchase_order.paid_amount = paid
    receipt.purchase_order.payment_status = _payment_status(receipt.purchase_order.total_amount, paid)
    return receipt


@router.post("/receipts/{receipt_id}/returns", response_model=PurchaseReturnOut, status_code=201)
def create_purchase_return(
    receipt_id: int,
    payload: PurchaseReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*PO_ROLES)),
):
    receipt = (
        db.query(PurchaseReceipt)
        .options(selectinload(PurchaseReceipt.items))
        .filter(PurchaseReceipt.id == receipt_id)
        .first()
    )
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == receipt.po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    return_doc = PurchaseReturn(
        receipt_id=receipt.id,
        po_id=receipt.po_id,
        warehouse_id=receipt.warehouse_id,
        remarks=_sanitize_optional_text(payload.remarks),
        created_by=current_user.id,
    )
    db.add(return_doc)
    db.flush()

    allowed_reasons = {"incorrect", "damaged"}

    for line in payload.items:
        if line.qty <= 0:
            raise HTTPException(status_code=400, detail="Return quantity must be greater than 0")
        if line.reason not in allowed_reasons:
            raise HTTPException(status_code=400, detail="Invalid reason. Use incorrect or damaged.")

        po_item = db.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.po_id == receipt.po_id,
            PurchaseOrderItem.item_id == line.item_id,
        ).first()
        if not po_item:
            raise HTTPException(status_code=404, detail=f"PO item not found for item_id={line.item_id}")

        if po_item.received_qty < line.qty:
            raise HTTPException(status_code=400, detail=f"Return qty exceeds received qty for item_id={line.item_id}")

        current_balance = _get_current_balance(db, line.item_id, receipt.warehouse_id)
        if current_balance < line.qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock to return for item_id={line.item_id}. Available: {current_balance}")

        item = db.query(Item).filter(Item.id == line.item_id, Item.is_deleted == False).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item not found: {line.item_id}")
        category = db.query(ItemCategory).filter(ItemCategory.id == item.category_id).first() if item else None
        item_type = category.item_type if category else None

        po_item.received_qty = max(0, po_item.received_qty - line.qty)
        db.add(PurchaseReturnItem(
            return_id=return_doc.id,
            item_id=line.item_id,
            qty=line.qty,
            reason=line.reason,
        ))

        if item.has_serial_no:
            if float(line.qty).is_integer() is False:
                raise HTTPException(status_code=422, detail=f"Return quantity must be whole number for serial item (item_id={line.item_id})")
            unit_count = int(line.qty)

            per_unit_value = po_item.rate
            if item_type == "dimensional" and po_item.length and po_item.width and po_item.height:
                per_unit_value = po_item.length * po_item.width * po_item.height * po_item.rate

            if item_type == "dimensional":
                blocks = (
                    db.query(StoneBlock)
                    .filter(
                        StoneBlock.item_id == line.item_id,
                        StoneBlock.warehouse_id == receipt.warehouse_id,
                        StoneBlock.is_deleted == False,
                        StoneBlock.status == "available",
                    )
                    .limit(unit_count)
                    .all()
                )
                if len(blocks) < unit_count:
                    raise HTTPException(status_code=400, detail=f"Not enough available stone blocks to return for item_id={line.item_id}")
                for block in blocks:
                    block.is_deleted = True
                    block.status = "returned"
                    current_balance -= 1
                    db.add(StockLedger(
                        item_id=line.item_id,
                        warehouse_id=receipt.warehouse_id,
                        movement_type=MovementType.OUTWARD,
                        qty_in=0,
                        qty_out=1,
                        balance_qty=current_balance,
                        rate=po_item.rate,
                        value=per_unit_value,
                        reference_type="purchase_return",
                        reference_id=return_doc.id,
                        serial_no=block.serial_no,
                        remarks=f"PO Return ({line.reason})",
                        created_by=current_user.id,
                    ))
            else:
                serials = (
                    db.query(ItemSerial)
                    .filter(
                        ItemSerial.item_id == line.item_id,
                        ItemSerial.warehouse_id == receipt.warehouse_id,
                        ItemSerial.status == "available",
                    )
                    .limit(unit_count)
                    .all()
                )
                if len(serials) < unit_count:
                    raise HTTPException(status_code=400, detail=f"Not enough available serials to return for item_id={line.item_id}")
                for serial in serials:
                    serial.status = "returned"
                    serial.reference_type = "purchase_return"
                    serial.reference_id = return_doc.id
                    current_balance -= 1
                    db.add(StockLedger(
                        item_id=line.item_id,
                        warehouse_id=receipt.warehouse_id,
                        movement_type=MovementType.OUTWARD,
                        qty_in=0,
                        qty_out=1,
                        balance_qty=current_balance,
                        rate=po_item.rate,
                        value=per_unit_value,
                        reference_type="purchase_return",
                        reference_id=return_doc.id,
                        serial_no=serial.serial_no,
                        remarks=f"PO Return ({line.reason})",
                        created_by=current_user.id,
                    ))
        else:
            receipt_value = line.qty * po_item.rate
            if item_type == "dimensional" and po_item.length and po_item.width and po_item.height:
                receipt_value = po_item.length * po_item.width * po_item.height * line.qty * po_item.rate
                if float(line.qty).is_integer() is False:
                    raise HTTPException(status_code=422, detail=f"Return quantity must be whole number to remove stone blocks (item_id={line.item_id})")
                block_count = int(line.qty)
                blocks = (
                    db.query(StoneBlock)
                    .filter(
                        StoneBlock.item_id == line.item_id,
                        StoneBlock.warehouse_id == receipt.warehouse_id,
                        StoneBlock.is_deleted == False,
                        StoneBlock.status == "available",
                    )
                    .limit(block_count)
                    .all()
                )
                if len(blocks) < block_count:
                    raise HTTPException(status_code=400, detail=f"Not enough available stone blocks to return for item_id={line.item_id}")
                for block in blocks:
                    block.is_deleted = True
                    block.status = "returned"

            new_balance = current_balance - line.qty
            db.add(StockLedger(
                item_id=line.item_id,
                warehouse_id=receipt.warehouse_id,
                movement_type=MovementType.OUTWARD,
                qty_in=0,
                qty_out=line.qty,
                balance_qty=new_balance,
                rate=po_item.rate,
                value=receipt_value,
                reference_type="purchase_return",
                reference_id=return_doc.id,
                remarks=f"PO Return ({line.reason})",
                created_by=current_user.id,
            ))

    po_items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == receipt.po_id).all()
    if any(it.received_qty < it.qty for it in po_items):
        po.status = "approved"

    db.commit()
    db.refresh(return_doc)
    return return_doc


@router.delete("/receipts/{receipt_id}", status_code=204)
def delete_purchase_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    receipt = db.query(PurchaseReceipt).filter(PurchaseReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    _hard_delete_or_400(db, receipt, "purchase receipt")


@router.post("/payments", response_model=PurchasePaymentOut, status_code=201)
def create_purchase_payment(
    payload: PurchasePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*PO_ROLES)),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == payload.po_id).first()
    if not po or po.is_deleted:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if po.status != "received":
        raise HTTPException(status_code=400, detail="Payment allowed only after PO is received")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    paid = _get_po_paid_amount(db, po.id)
    if paid + payload.amount > po.total_amount + 0.0001:
        raise HTTPException(status_code=400, detail="Payment exceeds PO total amount")

    payment = PurchasePayment(
        po_id=payload.po_id,
        amount=payload.amount,
        payment_date=payload.payment_date,
        mode=payload.mode,
        reference_no=_sanitize_optional_text(payload.reference_no),
        remarks=_sanitize_optional_text(payload.remarks),
        created_by=current_user.id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/payments", response_model=List[PurchasePaymentOut])
def list_purchase_payments(
    po_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(PurchasePayment)
    if po_id:
        q = q.filter(PurchasePayment.po_id == po_id)
    return q.order_by(PurchasePayment.id.desc()).all()


@router.get("/payments/{payment_id}", response_model=PurchasePaymentOut)
def get_purchase_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(PurchasePayment).filter(PurchasePayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.delete("/payments/{payment_id}", status_code=204)
def delete_purchase_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(PurchasePayment).filter(PurchasePayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    _hard_delete_or_400(db, payment, "purchase payment")
