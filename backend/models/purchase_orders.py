from sqlalchemy import Column, Integer, String, Float, Date, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(60), unique=True, nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    vendor_name = Column(String(150), nullable=False)
    vendor_gstin = Column(String(20))
    po_date = Column(Date, nullable=False)
    expected_delivery = Column(Date)
    total_amount = Column(Float, nullable=False)
    status = Column(String(30), default="draft")  # draft, approved, sent, received, closed
    remarks = Column(Text)
    is_deleted = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    items = relationship("PurchaseOrderItem", back_populates="purchase_order")
    vendor = relationship("Vendor")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    qty = Column(Float, nullable=False)
    rate = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    length = Column(Float, nullable=True)
    width = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    cft = Column(Float, nullable=True)
    received_qty = Column(Float, default=0)
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    item = relationship("Item")


class PurchaseReceipt(Base):
    __tablename__ = "purchase_receipts"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    receipt_date = Column(Date, nullable=False)
    remarks = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())

    purchase_order = relationship("PurchaseOrder")
    items = relationship("PurchaseReceiptItem", back_populates="receipt")
    returns = relationship("PurchaseReturn", back_populates="receipt")


class PurchaseReceiptItem(Base):
    __tablename__ = "purchase_receipt_items"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("purchase_receipts.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    received_qty = Column(Float, nullable=False)

    receipt = relationship("PurchaseReceipt", back_populates="items")
    item = relationship("Item")


class PurchaseReturn(Base):
    __tablename__ = "purchase_returns"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("purchase_receipts.id"), nullable=False)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    remarks = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())

    receipt = relationship("PurchaseReceipt", back_populates="returns")
    purchase_order = relationship("PurchaseOrder")
    items = relationship("PurchaseReturnItem", back_populates="return_doc")


class PurchaseReturnItem(Base):
    __tablename__ = "purchase_return_items"

    id = Column(Integer, primary_key=True, index=True)
    return_id = Column(Integer, ForeignKey("purchase_returns.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    qty = Column(Float, nullable=False)
    reason = Column(String(30), nullable=False)  # incorrect, damaged

    return_doc = relationship("PurchaseReturn", back_populates="items")
    item = relationship("Item")


class PurchasePayment(Base):
    __tablename__ = "purchase_payments"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    mode = Column(String(20), nullable=False)  # cash, bank, upi
    reference_no = Column(String(60))
    remarks = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())

    purchase_order = relationship("PurchaseOrder")
