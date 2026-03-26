from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, UniqueConstraint, JSON, Date
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from database import Base
from config import (
    MovementType, ValuationMethod, StageStatus, WIPStatus,
    PaymentStatus, MilestoneStatus, InstallationStatus, ALL_ROLES
)
import enum


# ─────────────────────────────────────────
# USERS & AUTH
# ─────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    audit_logs = relationship("AuditLog", back_populates="user")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    module = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=func.now())

    user = relationship("User", back_populates="audit_logs")


# ─────────────────────────────────────────
# INVENTORY
# ─────────────────────────────────────────

class ItemCategory(Base):
    __tablename__ = "item_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)
    item_type = Column(String(30), nullable=False)  # serialized, batch, dimensional
    hsn_code = Column(String(20), nullable=True)
    gst_rate = Column(Float, default=18.0)
    description = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    items = relationship("Item", back_populates="category")


class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("item_categories.id"), nullable=False)
    uom = Column(String(20), default="pcs")
    valuation_method = Column(String(20), default=ValuationMethod.WEIGHTED_AVG)
    reorder_level = Column(Float, default=0)
    has_serial_no = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    category = relationship("ItemCategory", back_populates="items")
    stock_ledger = relationship("StockLedger", back_populates="item")


class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    code = Column(String(30), unique=True, nullable=False)
    warehouse_type = Column(String(30), default="main")  # main, site, job_work
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    address = Column(Text, nullable=True)
    gstin = Column(String(20), nullable=True)
    state_code = Column(String(5), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    project = relationship("Project", back_populates="warehouses")
    stock_ledger = relationship("StockLedger", back_populates="warehouse")


class StockLedger(Base):
    __tablename__ = "stock_ledger"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    movement_type = Column(String(30), nullable=False)
    qty_in = Column(Float, default=0)
    qty_out = Column(Float, default=0)
    balance_qty = Column(Float, nullable=False)
    rate = Column(Float, default=0)
    value = Column(Float, default=0)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)
    serial_no = Column(String(60), nullable=True)
    batch_no = Column(String(60), nullable=True)
    remarks = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())

    item = relationship("Item", back_populates="stock_ledger")
    warehouse = relationship("Warehouse", back_populates="stock_ledger")


# ─────────────────────────────────────────
# STONE BLOCK ENGINE
# ─────────────────────────────────────────

class StoneBlock(Base):
    __tablename__ = "stone_blocks"
    id = Column(Integer, primary_key=True, index=True)
    serial_no = Column(String(60), unique=True, nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Dimensions
    length = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    total_volume = Column(Float, nullable=False)
    available_volume = Column(Float, nullable=False)
    yield_pct = Column(Float, default=100.0)

    # Status
    status = Column(String(30), default="available")  # available, split, allocated, dispatched, installed
    stone_type = Column(String(60), nullable=True)
    quarry_source = Column(String(120), nullable=True)
    rate_per_cft = Column(Float, default=0)

    is_deleted = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    parent = relationship("StoneBlock", remote_side=[id], back_populates="children")
    children = relationship("StoneBlock", back_populates="parent")
    project = relationship("Project", back_populates="stone_blocks")


# ─────────────────────────────────────────
# PROJECTS
# ─────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(30), unique=True, nullable=False)
    location = Column(String(200), nullable=True)
    state = Column(String(60), nullable=True)
    state_code = Column(String(5), nullable=True)
    client_name = Column(String(120), nullable=True)
    client_gstin = Column(String(20), nullable=True)
    start_date = Column(Date, nullable=True)
    expected_end_date = Column(Date, nullable=True)
    total_value = Column(Float, default=0)
    status = Column(String(30), default="active")  # active, completed, on_hold
    completion_pct = Column(Float, default=0)
    is_deleted = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    warehouses = relationship("Warehouse", back_populates="project")
    stone_blocks = relationship("StoneBlock", back_populates="project")
    milestones = relationship("Milestone", back_populates="project")
    project_costs = relationship("ProjectCost", back_populates="project")
    allocations = relationship("BlockAllocation", back_populates="project")
    materials = relationship("ProjectMaterial", back_populates="project", cascade="all, delete-orphan")


# ─────────────────────────────────────────
# BLUEPRINT & DEPENDENCY ENGINE
# ─────────────────────────────────────────

class StructureType(Base):
    __tablename__ = "structure_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    layers = relationship("StructureLayer", back_populates="structure_type")


class StructureLayer(Base):
    __tablename__ = "structure_layers"
    id = Column(Integer, primary_key=True, index=True)
    structure_type_id = Column(Integer, ForeignKey("structure_types.id"), nullable=False)
    name = Column(String(120), nullable=False)
    layer_order = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    structure_type = relationship("StructureType", back_populates="layers")
    positions = relationship("BlueprintPosition", back_populates="layer")


class BlueprintPosition(Base):
    __tablename__ = "blueprint_positions"
    id = Column(Integer, primary_key=True, index=True)
    layer_id = Column(Integer, ForeignKey("structure_layers.id"), nullable=False)
    position_code = Column(String(30), nullable=False)
    description = Column(Text, nullable=True)
    stone_item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    stone_block_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=True)

    # Required dimensions
    req_length = Column(Float, nullable=True)
    req_width = Column(Float, nullable=True)
    req_height = Column(Float, nullable=True)
    tolerance_pct = Column(Float, default=2.0)

    status = Column(String(30), default="pending")  # pending, in_progress, completed
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    layer = relationship("StructureLayer", back_populates="positions")
    dependencies = relationship(
        "PositionDependency", foreign_keys="PositionDependency.position_id",
        back_populates="position"
    )
    stages = relationship("PositionStage", back_populates="position", cascade="all, delete-orphan")


class StageMaster(Base):
    __tablename__ = "stage_master"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())


class PositionStage(Base):
    __tablename__ = "position_stages"
    id = Column(Integer, primary_key=True, index=True)
    position_id = Column(Integer, ForeignKey("blueprint_positions.id"), nullable=False)
    stage_id = Column(Integer, ForeignKey("stage_master.id"), nullable=False)
    stage_order = Column(Integer, nullable=True)
    labor_hours = Column(Float, default=0)
    labor_rate = Column(Float, default=0)
    material_cost = Column(Float, default=0)
    stage_cost = Column(Float, default=0)
    status = Column(String(30), default="pending")  # pending, in_progress, completed
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    position = relationship("BlueprintPosition", back_populates="stages")
    stage = relationship("StageMaster")

    __table_args__ = (UniqueConstraint("position_id", "stage_id"),)


class PositionDependency(Base):
    __tablename__ = "position_dependencies"
    id = Column(Integer, primary_key=True, index=True)
    position_id = Column(Integer, ForeignKey("blueprint_positions.id"), nullable=False)
    depends_on_id = Column(Integer, ForeignKey("blueprint_positions.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

    position = relationship("BlueprintPosition", foreign_keys=[position_id], back_populates="dependencies")
    depends_on = relationship("BlueprintPosition", foreign_keys=[depends_on_id])

    __table_args__ = (UniqueConstraint("position_id", "depends_on_id"),)


# ─────────────────────────────────────────
# MANUFACTURING
# ─────────────────────────────────────────

class IdolManufacturing(Base):
    __tablename__ = "idol_manufacturing"
    id = Column(Integer, primary_key=True, index=True)
    serial_no = Column(String(60), unique=True, nullable=False)
    stone_block_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    idol_name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    total_labor_hours = Column(Float, default=0)
    total_stage_cost = Column(Float, default=0)
    total_manufacturing_cost = Column(Float, default=0)
    status = Column(String(30), default=WIPStatus.PENDING)
    is_deleted = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    stages = relationship("ManufacturingStage", back_populates="idol")
    photos = relationship("ManufacturingPhoto", back_populates="idol")
    materials = relationship("IdolMaterial", back_populates="idol", cascade="all, delete-orphan")


class IdolMaterial(Base):
    __tablename__ = "idol_materials"
    id = Column(Integer, primary_key=True, index=True)
    idol_id = Column(Integer, ForeignKey("idol_manufacturing.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    stone_block_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=True)
    qty = Column(Float, nullable=False)
    created_at = Column(DateTime, default=func.now())

    idol = relationship("IdolManufacturing", back_populates="materials")


class ManufacturingStage(Base):
    __tablename__ = "manufacturing_stages"
    id = Column(Integer, primary_key=True, index=True)
    idol_id = Column(Integer, ForeignKey("idol_manufacturing.id"), nullable=False)
    stage_master_id = Column(Integer, ForeignKey("stage_master.id"), nullable=True)
    stage_name = Column(String(120), nullable=False)
    stage_order = Column(Integer, nullable=False)
    labor_hours = Column(Float, default=0)
    labor_rate = Column(Float, default=0)
    material_cost = Column(Float, default=0)
    stage_cost = Column(Float, default=0)
    status = Column(String(30), default=StageStatus.PENDING)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    idol = relationship("IdolManufacturing", back_populates="stages")


class ManufacturingPhoto(Base):
    __tablename__ = "manufacturing_photos"
    id = Column(Integer, primary_key=True, index=True)
    idol_id = Column(Integer, ForeignKey("idol_manufacturing.id"), nullable=False)
    stage_id = Column(Integer, ForeignKey("manufacturing_stages.id"), nullable=True)
    file_path = Column(String(300), nullable=False)
    caption = Column(String(200), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())

    idol = relationship("IdolManufacturing", back_populates="photos")


class IdolStockMovement(Base):
    __tablename__ = "idol_stock_movements"
    id = Column(Integer, primary_key=True, index=True)
    idol_id = Column(Integer, ForeignKey("idol_manufacturing.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    movement_type = Column(String(30), nullable=False)  # inward, outward, transfer
    qty_in = Column(Float, default=0)
    qty_out = Column(Float, default=0)
    balance_qty = Column(Float, nullable=False)
    reference_type = Column(String(50), nullable=True)  # idol_completion, idol_transfer, idol_sale
    reference_id = Column(Integer, nullable=True)
    remarks = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())


class IdolSale(Base):
    __tablename__ = "idol_sales"
    id = Column(Integer, primary_key=True, index=True)
    idol_id = Column(Integer, ForeignKey("idol_manufacturing.id"), nullable=False, unique=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    customer_name = Column(String(150), nullable=False)
    customer_gstin = Column(String(20), nullable=True)
    sale_date = Column(Date, nullable=False)
    sale_amount = Column(Float, default=0)
    remarks = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())


class StructuralComponent(Base):
    __tablename__ = "structural_components"
    id = Column(Integer, primary_key=True, index=True)
    stone_block_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=False)
    position_id = Column(Integer, ForeignKey("blueprint_positions.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    cost = Column(Float, default=0)
    actual_length = Column(Float, nullable=True)
    actual_width = Column(Float, nullable=True)
    actual_height = Column(Float, nullable=True)
    is_dimension_compliant = Column(Boolean, default=False)
    wip_status = Column(String(30), default=WIPStatus.PENDING)
    remarks = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ─────────────────────────────────────────
# MULTI-PROJECT ALLOCATION
# ─────────────────────────────────────────

class BlockAllocation(Base):
    __tablename__ = "block_allocations"
    id = Column(Integer, primary_key=True, index=True)
    stone_block_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    allocated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    allocation_date = Column(Date, nullable=True)
    is_released = Column(Boolean, default=False)
    released_at = Column(DateTime, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    project = relationship("Project", back_populates="allocations")

    __table_args__ = (UniqueConstraint("stone_block_id"),)  # prevent double allocation


class StockTransfer(Base):
    __tablename__ = "stock_transfers"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    qty = Column(Float, nullable=False)
    serial_no = Column(String(60), nullable=True)
    transfer_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)
    transferred_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())


class ItemReservation(Base):
    __tablename__ = "item_reservations"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    qty = Column(Float, nullable=False)
    is_released = Column(Boolean, default=False)
    released_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())


class ItemSerial(Base):
    __tablename__ = "item_serials"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    serial_no = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(30), default="available")  # available, allocated, issued, returned
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=func.now())


class ScrapEntry(Base):
    __tablename__ = "scrap_entries"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    stone_block_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    qty = Column(Float, nullable=False)
    reason = Column(String(30), nullable=False)  # incorrect, damaged, process_loss
    source_type = Column(String(60), nullable=True)  # manufacturing_stage, position_stage, etc.
    source_id = Column(Integer, nullable=True)
    stage_id = Column(Integer, nullable=True)
    remarks = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())

    item = relationship("Item")
    warehouse = relationship("Warehouse")
    stone_block = relationship("StoneBlock")

# ─────────────────────────────────────────
# JOB WORK
# ─────────────────────────────────────────

class JobWork(Base):
    __tablename__ = "job_works"
    id = Column(Integer, primary_key=True, index=True)
    challan_no = Column(String(60), unique=True, nullable=False)
    stone_block_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=False)
    vendor_name = Column(String(150), nullable=False)
    vendor_gstin = Column(String(20), nullable=True)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    job_work_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    dispatch_date = Column(Date, nullable=False)
    expected_return_date = Column(Date, nullable=True)
    actual_return_date = Column(Date, nullable=True)
    job_description = Column(Text, nullable=True)
    job_cost = Column(Float, default=0)
    status = Column(String(30), default="dispatched")  # dispatched, returned, cancelled
    # Return validation
    return_length = Column(Float, nullable=True)
    return_width = Column(Float, nullable=True)
    return_height = Column(Float, nullable=True)
    wastage_volume = Column(Float, default=0)
    is_deleted = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ─────────────────────────────────────────
# SITE EXECUTION
# ─────────────────────────────────────────

class Dispatch(Base):
    __tablename__ = "dispatches"
    id = Column(Integer, primary_key=True, index=True)
    dispatch_note_no = Column(String(60), unique=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    from_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    to_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    dispatch_date = Column(Date, nullable=False)
    transporter_name = Column(String(150), nullable=True)
    vehicle_no = Column(String(30), nullable=True)
    lr_no = Column(String(60), nullable=True)
    eway_bill_no = Column(String(30), nullable=True)
    eway_bill_date = Column(Date, nullable=True)
    total_value = Column(Float, default=0)
    remarks = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())

    items = relationship("DispatchItem", back_populates="dispatch")


class DispatchWorkflow(Base):
    __tablename__ = "dispatch_workflows"
    id = Column(Integer, primary_key=True, index=True)
    dispatch_id = Column(Integer, ForeignKey("dispatches.id"), nullable=False, unique=True, index=True)
    status = Column(String(30), default="draft", nullable=False)  # draft, dispatched
    challan_no = Column(String(60), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class DispatchItem(Base):
    __tablename__ = "dispatch_items"
    id = Column(Integer, primary_key=True, index=True)
    dispatch_id = Column(Integer, ForeignKey("dispatches.id"), nullable=False)
    stone_block_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    qty = Column(Float, default=1)
    rate = Column(Float, default=0)
    value = Column(Float, default=0)
    hsn_code = Column(String(20), nullable=True)

    dispatch = relationship("Dispatch", back_populates="items")


class DispatchItemSerial(Base):
    __tablename__ = "dispatch_item_serials"
    id = Column(Integer, primary_key=True, index=True)
    dispatch_item_id = Column(Integer, ForeignKey("dispatch_items.id"), nullable=False, index=True)
    serial_id = Column(Integer, ForeignKey("item_serials.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())


class Installation(Base):
    __tablename__ = "installations"
    id = Column(Integer, primary_key=True, index=True)
    stone_block_id = Column(Integer, ForeignKey("stone_blocks.id"), nullable=False)
    position_id = Column(Integer, ForeignKey("blueprint_positions.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    installation_date = Column(Date, nullable=True)
    installed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(30), default=InstallationStatus.PENDING)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    remarks = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    photos = relationship("InstallationPhoto", back_populates="installation")


class InstallationPhoto(Base):
    __tablename__ = "installation_photos"
    id = Column(Integer, primary_key=True, index=True)
    installation_id = Column(Integer, ForeignKey("installations.id"), nullable=False)
    file_path = Column(String(300), nullable=False)
    caption = Column(String(200), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())

    installation = relationship("Installation", back_populates="photos")


# ─────────────────────────────────────────
# CONTRACTORS
# ─────────────────────────────────────────

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# VENDORS
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, unique=True)
    gstin = Column(String(20), nullable=True)
    pan = Column(String(10), nullable=True)
    phone = Column(String(15), nullable=True)
    email = Column(String(150), nullable=True)
    address = Column(Text, nullable=True)
    state = Column(String(60), nullable=True)
    state_code = Column(String(5), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# CONTRACTORS
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class Contractor(Base):
    __tablename__ = "contractors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    gstin = Column(String(20), nullable=True)
    pan = Column(String(10), nullable=True)
    phone = Column(String(15), nullable=True)
    email = Column(String(150), nullable=True)
    address = Column(Text, nullable=True)
    state = Column(String(60), nullable=True)
    state_code = Column(String(5), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    agreements = relationship("ContractorAgreement", back_populates="contractor")


class ContractorAgreement(Base):
    __tablename__ = "contractor_agreements"
    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    agreement_no = Column(String(60), unique=True, nullable=False)
    contract_value = Column(Float, nullable=False)
    gst_pct = Column(Float, default=18.0)
    tds_pct = Column(Float, default=2.0)
    retention_pct = Column(Float, default=5.0)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    scope_of_work = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    contractor = relationship("Contractor", back_populates="agreements")
    invoices = relationship("ContractorInvoice", back_populates="agreement")


class ContractorInvoice(Base):
    __tablename__ = "contractor_invoices"
    id = Column(Integer, primary_key=True, index=True)
    agreement_id = Column(Integer, ForeignKey("contractor_agreements.id"), nullable=False)
    milestone_id = Column(Integer, ForeignKey("milestones.id"), nullable=True)
    invoice_no = Column(String(60), unique=True, nullable=False)
    invoice_date = Column(Date, nullable=False)
    gross_amount = Column(Float, nullable=False)
    gst_amount = Column(Float, default=0)
    tds_amount = Column(Float, default=0)
    retention_amount = Column(Float, default=0)
    net_payable = Column(Float, nullable=False)
    payment_status = Column(String(30), default=PaymentStatus.PENDING)
    paid_amount = Column(Float, default=0)
    paid_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    agreement = relationship("ContractorAgreement", back_populates="invoices")


# ─────────────────────────────────────────
# MILESTONES & BILLING
# ─────────────────────────────────────────

class Milestone(Base):
    __tablename__ = "milestones"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    milestone_value = Column(Float, default=0)
    completion_pct = Column(Float, default=0)
    status = Column(String(30), default=MilestoneStatus.PENDING)
    due_date = Column(Date, nullable=True)
    completed_date = Column(Date, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="milestones")
    invoices = relationship("SalesInvoice", back_populates="milestone")


class SalesInvoice(Base):
    __tablename__ = "sales_invoices"
    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String(60), unique=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    milestone_id = Column(Integer, ForeignKey("milestones.id"), nullable=True)
    invoice_date = Column(Date, nullable=False)
    client_name = Column(String(120), nullable=True)
    client_gstin = Column(String(20), nullable=True)
    from_state = Column(String(60), nullable=True)
    to_state = Column(String(60), nullable=True)
    is_interstate = Column(Boolean, default=False)

    # Amounts
    taxable_amount = Column(Float, nullable=False)
    cgst_rate = Column(Float, default=0)
    cgst_amount = Column(Float, default=0)
    sgst_rate = Column(Float, default=0)
    sgst_amount = Column(Float, default=0)
    igst_rate = Column(Float, default=0)
    igst_amount = Column(Float, default=0)
    total_tax = Column(Float, default=0)
    gross_amount = Column(Float, nullable=False)
    advance_adjustment = Column(Float, default=0)
    net_payable = Column(Float, nullable=False)
    is_reverse_charge = Column(Boolean, default=False)

    payment_status = Column(String(30), default=PaymentStatus.PENDING)
    paid_amount = Column(Float, default=0)
    paid_date = Column(Date, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    milestone = relationship("Milestone", back_populates="invoices")
    line_items = relationship("InvoiceLineItem", back_populates="invoice")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("sales_invoices.id"), nullable=False)
    description = Column(String(200), nullable=False)
    hsn_code = Column(String(20), nullable=True)
    qty = Column(Float, default=1)
    rate = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)

    invoice = relationship("SalesInvoice", back_populates="line_items")


class InvoiceDispatchAllocation(Base):
    __tablename__ = "invoice_dispatch_allocations"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("sales_invoices.id"), nullable=False, index=True)
    dispatch_id = Column(Integer, ForeignKey("dispatches.id"), nullable=False, index=True)
    dispatch_item_id = Column(Integer, ForeignKey("dispatch_items.id"), nullable=False, index=True)
    billed_qty = Column(Float, nullable=False)
    created_at = Column(DateTime, default=func.now())


class InvoiceWorkflow(Base):
    __tablename__ = "invoice_workflows"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("sales_invoices.id"), nullable=False, unique=True, index=True)
    status = Column(String(30), default="draft", nullable=False)  # draft, issued
    issued_at = Column(DateTime, nullable=True)
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ─────────────────────────────────────────
# PROJECT COSTING
# ─────────────────────────────────────────

class ProjectCost(Base):
    __tablename__ = "project_costs"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    cost_type = Column(String(30), nullable=False)  # material, labor, contractor, site_expense
    description = Column(String(200), nullable=True)
    amount = Column(Float, nullable=False)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)
    date = Column(Date, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())

    project = relationship("Project", back_populates="project_costs")


# ─────────────────────────────────────────
# ADVANCE PAYMENTS
# ─────────────────────────────────────────

class AdvancePayment(Base):
    __tablename__ = "advance_payments"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    client_name = Column(String(120), nullable=True)
    amount = Column(Float, nullable=False)
    receipt_date = Column(Date, nullable=False)
    adjusted_amount = Column(Float, default=0)
    balance = Column(Float, nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())


# Ensure ProjectMaterial is registered with the mapper
from models.project_materials import ProjectMaterial  # noqa: E402,F401
