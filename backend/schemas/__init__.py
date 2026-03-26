from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import date, datetime
from config import ALL_ROLES


# ─── AUTH ───────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str

    @validator("role")
    def validate_role(cls, v):
        if v not in ALL_ROLES:
            raise ValueError(f"Role must be one of {ALL_ROLES}")
        return v


class UserUpdate(BaseModel):
    name: Optional[str]
    email: Optional[EmailStr]
    role: Optional[str]
    is_active: Optional[bool]


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── ITEM CATEGORY ──────────────────────
class ItemCategoryCreate(BaseModel):
    name: str
    item_type: str  # serialized, batch, dimensional
    hsn_code: Optional[str]
    gst_rate: float = 18.0
    description: Optional[str]


class ItemCategoryOut(ItemCategoryCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ─── ITEM ───────────────────────────────
class ItemCreate(BaseModel):
    name: str
    code: str
    category_id: int
    uom: str = "pcs"
    valuation_method: str = "weighted_avg"
    reorder_level: float = 0
    has_serial_no: bool = False


class ItemOut(ItemCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ─── WAREHOUSE ──────────────────────────
class WarehouseCreate(BaseModel):
    name: str
    code: str
    warehouse_type: str = "main"
    project_id: Optional[int] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    state_code: Optional[str] = None


class WarehouseOut(WarehouseCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# â”€â”€â”€ VENDOR â”€â”€â”€
class VendorCreate(BaseModel):
    name: str
    gstin: Optional[str]
    pan: Optional[str]
    phone: Optional[str]
    email: Optional[EmailStr]
    address: Optional[str]
    state: Optional[str]
    state_code: Optional[str]


class VendorOut(VendorCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ─── STOCK LEDGER ───────────────────────
class StockMovementCreate(BaseModel):
    item_id: int
    warehouse_id: int
    movement_type: str
    qty: float
    rate: float = 0
    serial_no: Optional[str]
    batch_no: Optional[str]
    reference_type: Optional[str]
    reference_id: Optional[int]
    remarks: Optional[str]


class StockLedgerOut(BaseModel):
    id: int
    item_id: int
    warehouse_id: int
    movement_type: str
    qty_in: float
    qty_out: float
    balance_qty: float
    rate: float
    value: float
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    serial_no: Optional[str] = None
    batch_no: Optional[str] = None
    remarks: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True


class ScrapCreate(BaseModel):
    item_id: Optional[int] = None
    stone_block_id: Optional[int] = None
    serial_ids: Optional[List[int]] = None
    warehouse_id: int
    qty: float
    reason: str
    source_type: Optional[str] = None
    source_id: Optional[int] = None
    stage_id: Optional[int] = None
    remarks: Optional[str]


class ScrapOut(BaseModel):
    id: int
    item_id: Optional[int]
    stone_block_id: Optional[int]
    warehouse_id: int
    qty: float
    reason: str
    source_type: Optional[str]
    source_id: Optional[int]
    stage_id: Optional[int]
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ScrapReportOut(BaseModel):
    id: int
    item_id: Optional[int]
    item_name: Optional[str]
    stone_block_id: Optional[int]
    stone_serial_no: Optional[str]
    warehouse_id: int
    warehouse_name: Optional[str]
    project_id: Optional[int]
    project_name: Optional[str]
    stage_name: Optional[str]
    idol_name: Optional[str]
    position_name: Optional[str]
    qty: float
    qty_unit: Optional[str] = None
    scrap_volume_cft: Optional[float] = None
    serial_no: Optional[str] = None
    reason: str
    source_type: Optional[str]
    source_id: Optional[int]
    stage_id: Optional[int]
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class StockBalanceOut(BaseModel):
    item_id: int
    warehouse_id: int
    balance_qty: float
    reserved_qty: float = 0
    available_qty: float = 0


class ItemSerialOut(BaseModel):
    id: int
    item_id: int
    warehouse_id: int
    serial_no: str
    status: str
    reference_type: Optional[str]
    reference_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── STONE BLOCK ────────────────────────
class StoneBlockCreate(BaseModel):
    item_id: Optional[int]
    warehouse_id: Optional[int]
    project_id: Optional[int]
    length: float
    width: float
    height: float
    stone_type: Optional[str]
    quarry_source: Optional[str]
    rate_per_cft: float = 0


class StoneSplitRequest(BaseModel):
    children: List[dict]  # [{length, width, height}, ...]


class StoneBlockOut(BaseModel):
    id: int
    serial_no: str
    parent_id: Optional[int]
    item_id: Optional[int]
    warehouse_id: Optional[int]
    project_id: Optional[int]
    qty: float = 1.0
    length: float
    width: float
    height: float
    total_volume: float
    available_volume: float
    yield_pct: float
    status: str
    stone_type: Optional[str]
    quarry_source: Optional[str]
    rate_per_cft: float
    created_at: datetime
    class Config:
        from_attributes = True


# ─── PROJECT ────────────────────────────
class ProjectMaterialIn(BaseModel):
    item_id: Optional[int] = None
    stone_block_id: Optional[int] = None
    required_qty: float
    serial_ids: Optional[List[int]] = []
    
    @validator("required_qty")
    def validate_required_qty(cls, v):
        if v is None or v <= 0:
            raise ValueError("required_qty must be greater than 0")
        return v

    @validator("item_id", "stone_block_id", always=True)
    def _noop(cls, v):
        return v

    @classmethod
    def __get_validators__(cls):
        for v in super().__get_validators__():
            yield v
        yield cls.validate_material_type

    @classmethod
    def validate_material_type(cls, values):
        item_id = values.get("item_id")
        stone_block_id = values.get("stone_block_id")
        if not item_id and not stone_block_id:
            raise ValueError("Either item_id or stone_block_id must be provided")
        return values

class ProjectCreate(BaseModel):
    name: str
    code: str
    location: Optional[str]
    state: Optional[str]
    state_code: Optional[str]
    client_name: Optional[str]
    client_gstin: Optional[str]
    start_date: Optional[date]
    expected_end_date: Optional[date]
    total_value: float = 0
    materials: List[ProjectMaterialIn] = []

class ProjectMaterialSerialOut(BaseModel):
    id: int
    item_serial_id: int

    class Config:
        from_attributes = True


class ProjectMaterialOut(BaseModel):
    id: int
    item_id: Optional[int]
    stone_block_id: Optional[int]
    required_qty: float
    serials: List[ProjectMaterialSerialOut] = []

    class Config:
        from_attributes = True


class ProjectOut(BaseModel):
    id: int
    name: str
    code: str
    location: Optional[str]
    state: Optional[str]
    state_code: Optional[str]
    client_name: Optional[str]
    client_gstin: Optional[str]
    start_date: Optional[date]
    expected_end_date: Optional[date]
    total_value: float = 0
    status: str
    completion_pct: float
    created_at: datetime
    materials: List[ProjectMaterialOut] = []

    class Config:
        from_attributes = True


# ─── STRUCTURE TYPE ─────────────────────
class StructureTypeCreate(BaseModel):
    name: str
    description: Optional[str]
    project_id: Optional[int]


class StructureTypeOut(StructureTypeCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ─── LAYER ──────────────────────────────
class LayerCreate(BaseModel):
    structure_type_id: int
    name: str
    layer_order: int
    description: Optional[str]


class LayerOut(LayerCreate):
    id: int
    class Config:
        from_attributes = True


# ─── BLUEPRINT POSITION ─────────────────
class PositionCreate(BaseModel):
    layer_id: int
    position_code: str
    description: Optional[str]
    stone_item_id: Optional[int] = None
    stone_block_id: Optional[int] = None
    req_length: Optional[float]
    req_width: Optional[float]
    req_height: Optional[float]
    tolerance_pct: float = 2.0


class PositionOut(PositionCreate):
    id: int
    status: str
    total_cost: float = 0
    stage_total: int = 0
    stage_completed: int = 0
    stage_in_progress: int = 0
    stage_pending: int = 0
    stage_status: Optional[str] = None
    class Config:
        from_attributes = True


class StageMasterCreate(BaseModel):
    name: str
    description: Optional[str]


class StageMasterOut(StageMasterCreate):
    id: int
    class Config:
        from_attributes = True


class PositionStageIn(BaseModel):
    stage_id: int
    stage_order: Optional[int] = None
    status: str = "pending"
    labor_hours: float = 0
    labor_rate: float = 0
    material_cost: float = 0
    remarks: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class PositionStageOut(BaseModel):
    stage_id: int
    name: str
    stage_order: Optional[int]
    description: Optional[str]
    status: str
    labor_hours: float = 0
    labor_rate: float = 0
    material_cost: float = 0
    stage_cost: float = 0
    remarks: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class DependencyCreate(BaseModel):
    position_id: int
    depends_on_id: int


# ─── MANUFACTURING ──────────────────────
class IdolMaterialIn(BaseModel):
    item_id: Optional[int] = None
    stone_block_id: Optional[int] = None
    qty: float
    serial_ids: Optional[List[int]] = []

    @validator("qty")
    def validate_qty(cls, v):
        if v is None or v <= 0:
            raise ValueError("qty must be greater than 0")
        return v

    @validator("item_id", "stone_block_id", always=True)
    def _noop(cls, v):
        return v

    @classmethod
    def __get_validators__(cls):
        for v in super().__get_validators__():
            yield v
        yield cls.validate_material_type

    @classmethod
    def validate_material_type(cls, values):
        item_id = values.get("item_id")
        stone_block_id = values.get("stone_block_id")
        if not item_id and not stone_block_id:
            raise ValueError("Either item_id or stone_block_id must be provided")
        return values


class IdolCreate(BaseModel):
    project_id: int
    idol_name: str
    description: Optional[str]
    materials: List[IdolMaterialIn] = []


class IdolUpdate(BaseModel):
    idol_name: Optional[str]
    description: Optional[str]
    materials: Optional[List[IdolMaterialIn]] = None


class IdolMaterialOut(BaseModel):
    id: int
    item_id: Optional[int]
    stone_block_id: Optional[int]
    qty: float

    class Config:
        from_attributes = True


class IdolOut(IdolCreate):
    id: int
    serial_no: str
    status: str
    total_labor_hours: float
    total_stage_cost: float
    total_manufacturing_cost: float
    stage_total: int = 0
    stage_completed: int = 0
    stage_in_progress: int = 0
    stage_pending: int = 0
    stage_status: Optional[str] = None
    stock_balance: float = 0
    stock_warehouse_id: Optional[int] = None
    stock_warehouse_name: Optional[str] = None
    stock_state: Optional[str] = None
    is_sold: bool = False
    sold_to_customer: Optional[str] = None
    sold_date: Optional[date] = None
    created_at: datetime
    materials: List[IdolMaterialOut] = []
    class Config:
        from_attributes = True


class StageCreate(BaseModel):
    idol_id: int
    stage_name: str
    stage_order: int
    labor_hours: float = 0
    labor_rate: float = 0
    material_cost: float = 0
    remarks: Optional[str]
    stage_master_id: Optional[int] = None


class StageUpdate(BaseModel):
    status: Optional[str]
    labor_hours: Optional[float]
    labor_rate: Optional[float]
    material_cost: Optional[float]
    remarks: Optional[str]


class StageOut(StageCreate):
    id: int
    stage_cost: float
    status: str
    class Config:
        from_attributes = True


class IdolStockPlaceIn(BaseModel):
    warehouse_id: int
    remarks: Optional[str] = None


class IdolStockTransferIn(BaseModel):
    to_warehouse_id: int
    remarks: Optional[str] = None


class IdolSellIn(BaseModel):
    customer_name: str
    customer_gstin: Optional[str] = None
    sale_date: date
    sale_amount: float = 0
    remarks: Optional[str] = None


class IdolStockMovementOut(BaseModel):
    id: int
    idol_id: int
    warehouse_id: int
    movement_type: str
    qty_in: float
    qty_out: float
    balance_qty: float
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StructuralComponentCreate(BaseModel):
    stone_block_id: int
    position_id: int
    project_id: Optional[int]
    cost: Optional[float] = 0
    actual_length: Optional[float]
    actual_width: Optional[float]
    actual_height: Optional[float]
    remarks: Optional[str]


# ─── ALLOCATION ─────────────────────────
class AllocationCreate(BaseModel):
    stone_block_id: int
    project_id: int
    allocation_date: Optional[date]
    remarks: Optional[str]


class StockTransferCreate(BaseModel):
    item_id: int
    from_warehouse_id: int
    to_warehouse_id: int
    qty: float
    serial_no: Optional[str]
    transfer_date: Optional[date]
    remarks: Optional[str]


# ─── JOB WORK ───────────────────────────
class JobWorkCreate(BaseModel):
    stone_block_id: int
    vendor_name: str
    vendor_gstin: Optional[str]
    from_warehouse_id: int
    job_work_warehouse_id: Optional[int]
    dispatch_date: date
    expected_return_date: Optional[date]
    job_description: Optional[str]


class JobWorkReturnUpdate(BaseModel):
    actual_return_date: date
    return_length: float
    return_width: float
    return_height: float
    job_cost: float
    remarks: Optional[str]


class JobWorkOut(BaseModel):
    id: int
    challan_no: str
    stone_block_id: int
    vendor_name: str
    dispatch_date: date
    expected_return_date: Optional[date]
    status: str
    job_cost: float
    wastage_volume: float
    created_at: datetime
    class Config:
        from_attributes = True


# ─── DISPATCH ───────────────────────────
class DispatchItemIn(BaseModel):
    stone_block_id: Optional[int]
    item_id: Optional[int]
    qty: float = 1
    rate: float = 0
    hsn_code: Optional[str]
    serial_ids: Optional[List[int]] = None


class DispatchCreate(BaseModel):
    project_id: int
    from_warehouse_id: int
    to_warehouse_id: int
    dispatch_date: date
    transporter_name: Optional[str]
    vehicle_no: Optional[str]
    lr_no: Optional[str]
    eway_bill_no: Optional[str]
    eway_bill_date: Optional[date]
    items: List[DispatchItemIn]
    remarks: Optional[str]


class DispatchUpdate(DispatchCreate):
    pass


class DispatchOut(BaseModel):
    id: int
    dispatch_note_no: str
    project_id: int
    from_warehouse_id: int
    to_warehouse_id: int
    dispatch_date: date
    transporter_name: Optional[str]
    eway_bill_no: Optional[str]
    total_value: float
    status: str = "draft"
    challan_no: Optional[str] = None
    is_editable: bool = True
    created_at: datetime
    class Config:
        from_attributes = True


class DispatchFGInventoryOut(BaseModel):
    row_type: str  # stone_block, item, item_serial
    item_id: Optional[int] = None
    item_name: Optional[str] = None
    stone_block_id: Optional[int] = None
    serial_id: Optional[int] = None
    serial_no: Optional[str] = None
    warehouse_id: int
    available_qty: float
    uom: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    cft: Optional[float] = None


# ─── INSTALLATION ───────────────────────
class InstallationCreate(BaseModel):
    stone_block_id: int
    position_id: int
    project_id: int
    installation_date: Optional[date]
    remarks: Optional[str]


class InstallationVerify(BaseModel):
    status: str  # verified
    remarks: Optional[str]


class InstallationOut(BaseModel):
    id: int
    stone_block_id: int
    position_id: int
    project_id: int
    installation_date: Optional[date]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ─── CONTRACTOR ─────────────────────────
class ContractorCreate(BaseModel):
    name: str
    gstin: Optional[str]
    pan: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    state: Optional[str]
    state_code: Optional[str]


class ContractorOut(ContractorCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


class AgreementCreate(BaseModel):
    contractor_id: int
    project_id: int
    contract_value: float
    gst_pct: float = 18.0
    tds_pct: float = 2.0
    retention_pct: float = 5.0
    start_date: Optional[date]
    end_date: Optional[date]
    scope_of_work: Optional[str]


class AgreementOut(AgreementCreate):
    id: int
    agreement_no: str
    created_at: datetime
    class Config:
        from_attributes = True


class ContractorInvoiceCreate(BaseModel):
    agreement_id: int
    milestone_id: Optional[int]
    invoice_date: date
    gross_amount: float
    remarks: Optional[str]


class ContractorInvoiceOut(BaseModel):
    id: int
    invoice_no: str
    agreement_id: int
    gross_amount: float
    gst_amount: float
    tds_amount: float
    retention_amount: float
    net_payable: float
    payment_status: str
    created_at: datetime
    class Config:
        from_attributes = True


# ─── MILESTONE ──────────────────────────
class MilestoneCreate(BaseModel):
    project_id: int
    name: str
    description: Optional[str]
    milestone_value: float = 0
    due_date: Optional[date]


class MilestoneUpdate(BaseModel):
    status: Optional[str]
    completion_pct: Optional[float]
    completed_date: Optional[date]


class MilestoneOut(MilestoneCreate):
    id: int
    status: str
    completion_pct: float
    created_at: datetime
    class Config:
        from_attributes = True


# ─── SALES INVOICE ──────────────────────
class InvoiceLineItemIn(BaseModel):
    description: str
    hsn_code: Optional[str]
    qty: float = 1
    rate: float


class InvoiceDispatchAllocationIn(BaseModel):
    dispatch_item_id: int
    qty: float


class DispatchInvoiceItemOut(BaseModel):
    dispatch_id: int
    dispatch_note_no: str
    dispatch_date: date
    dispatch_item_id: int
    item_id: Optional[int]
    stone_block_id: Optional[int]
    serial_no: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    cft: Optional[float] = None
    description: str
    rate: float
    dispatched_qty: float
    billed_qty: float
    unbilled_qty: float


class SalesInvoiceCreate(BaseModel):
    project_id: int
    milestone_id: Optional[int]
    invoice_date: date
    client_name: Optional[str]
    client_gstin: Optional[str]
    from_state: Optional[str]
    to_state: Optional[str]
    from_state_code: Optional[str]
    to_state_code: Optional[str]
    gst_rate: float = 18.0
    is_reverse_charge: bool = False
    advance_adjustment: float = 0
    line_items: List[InvoiceLineItemIn] = []
    dispatch_allocations: List[InvoiceDispatchAllocationIn] = []


class SalesInvoiceOut(BaseModel):
    id: int
    invoice_no: str
    project_id: int
    invoice_date: date
    taxable_amount: float
    total_tax: float
    gross_amount: float
    advance_adjustment: float
    net_payable: float
    payment_status: str
    invoice_status: str = "draft"
    is_editable: bool = True
    is_interstate: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ─── PROJECT COST ────────────────────────
class ProjectCostCreate(BaseModel):
    project_id: int
    cost_type: str  # material, labor, contractor, site_expense
    description: Optional[str]
    amount: float
    date: Optional[date]


class ProjectCostOut(ProjectCostCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


class ProjectMarginOut(BaseModel):
    project_id: int
    project_name: str
    total_value: float
    material_cost: float
    labor_cost: float
    contractor_cost: float
    site_expense: float
    total_cost: float
    gross_margin: float
    margin_pct: float


class ReserveMaterialItem(BaseModel):
    item_id: int
    warehouse_id: Optional[int] = None


class ReserveMaterialsRequest(BaseModel):
    items: List[ReserveMaterialItem] = []


# ─── ADVANCE PAYMENT ─────────────────────
class AdvancePaymentCreate(BaseModel):
    project_id: int
    client_name: Optional[str]
    amount: float
    receipt_date: date
    remarks: Optional[str]


class AdvancePaymentOut(AdvancePaymentCreate):
    id: int
    adjusted_amount: float
    balance: float
    created_at: datetime
    class Config:
        from_attributes = True


# ─── PURCHASE ORDER ─────────────────────
class PurchaseOrderItemIn(BaseModel):
    item_id: int
    qty: float
    rate: float
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None

class PurchaseOrderCreate(BaseModel):
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    vendor_gstin: Optional[str] = None
    po_date: date
    expected_delivery: Optional[date]
    items: List[PurchaseOrderItemIn]
    remarks: Optional[str]


class PurchaseOrderSummary(BaseModel):
    id: int
    po_number: str
    vendor_id: Optional[int]
    vendor_name: str
    total_amount: float
    paid_amount: float
    payment_status: str

    class Config:
        from_attributes = True


class PurchaseOrderItemOut(BaseModel):
    id: int
    item_id: int
    qty: float
    rate: float
    amount: float
    length: Optional[float]
    width: Optional[float]
    height: Optional[float]
    cft: Optional[float]
    received_qty: float

    class Config:
        from_attributes = True


class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    vendor_id: Optional[int]
    vendor_name: str
    vendor_gstin: Optional[str]
    po_date: date
    expected_delivery: Optional[date]
    total_amount: float
    status: str
    paid_amount: float
    payment_status: str
    remarks: Optional[str]
    created_at: datetime
    items: List[PurchaseOrderItemOut]
    class Config:
        from_attributes = True

class PurchaseReceiptCreate(BaseModel):
    po_id: int
    warehouse_id: int
    receipt_date: date
    items: List[dict]  # [{"item_id": int, "received_qty": float}]
    remarks: Optional[str]


class PurchaseReceiptItemOut(BaseModel):
    id: int
    item_id: int
    received_qty: float

    class Config:
        from_attributes = True


class PurchaseReturnItemCreate(BaseModel):
    item_id: int
    qty: float
    reason: str  # incorrect, damaged


class PurchaseReturnCreate(BaseModel):
    items: List[PurchaseReturnItemCreate]
    remarks: Optional[str]


class PurchaseReturnItemOut(BaseModel):
    id: int
    item_id: int
    qty: float
    reason: str

    class Config:
        from_attributes = True


class PurchaseReturnOut(BaseModel):
    id: int
    receipt_id: int
    po_id: int
    warehouse_id: int
    remarks: Optional[str]
    created_at: datetime
    items: List[PurchaseReturnItemOut]

    class Config:
        from_attributes = True


class PurchaseReceiptOut(BaseModel):
    id: int
    po_id: int
    warehouse_id: int
    receipt_date: date
    remarks: Optional[str]
    created_at: datetime
    purchase_order: PurchaseOrderSummary
    items: List[PurchaseReceiptItemOut]
    returns: List[PurchaseReturnOut] = []

    class Config:
        from_attributes = True


class PurchasePaymentCreate(BaseModel):
    po_id: int
    amount: float
    payment_date: date
    mode: str  # cash, bank, upi
    reference_no: Optional[str]
    remarks: Optional[str]


class PurchasePaymentOut(BaseModel):
    id: int
    po_id: int
    amount: float
    payment_date: date
    mode: str
    reference_no: Optional[str]
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ─── AUDIT LOG ───────────────────────────
class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    module: str
    record_id: Optional[int]
    description: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


# REPORTS
class ProjectSummaryOut(BaseModel):
    project_id: int
    name: str
    code: str
    status: str
    completion_pct: float
    start_date: Optional[date]
    expected_end_date: Optional[date]
    total_value: float
    structures: int
    layers: int
    positions_total: int
    positions_completed: int
    idols_total: int
    idols_completed: int


class ProjectCostingOut(BaseModel):
    project_id: int
    name: str
    material_cost: float
    labor_cost: float
    contractor_cost: float
    site_expense: float
    total_cost: float


class ProjectProfitabilityOut(BaseModel):
    project_id: int
    name: str
    estimated_cost: float
    invested_cost: float
    idol_invested_cost: float
    structure_invested_cost: float
    profit_amount: float
    profit_pct: float


class ProjectProfitabilityIdolOut(BaseModel):
    project_id: int
    project_name: str
    idol_id: int
    idol_name: str
    serial_no: str
    status: str
    cost: float
    sale_amount: float
    profit_amount: float


class ProjectProfitabilityStructureOut(BaseModel):
    project_id: int
    project_name: str
    component_id: int
    position_name: str
    stone_serial_no: Optional[str]
    status: Optional[str]
    cost: float


class StockBalanceReportOut(BaseModel):
    item_id: int
    item_name: str
    warehouse_id: int
    warehouse_name: str
    balance_qty: float


class SerializedStockSummaryOut(BaseModel):
    item_id: int
    item_name: str
    total_serials: int
    allocated_count: int
    free_count: int
    issued_count: int
    available_count: int
    returned_count: int


class SerializedStockAllocatedOut(BaseModel):
    item_id: int
    item_name: str
    serial_id: int
    serial_no: str
    status: str
    allocation_type: Optional[str]
    project_id: Optional[int]
    project_name: Optional[str]
    idol_id: Optional[int]
    idol_serial_no: Optional[str]
    idol_status: Optional[str]
    current_stage_name: Optional[str]
    current_stage_status: Optional[str]


class StoneBlockStockSummaryOut(BaseModel):
    item_id: Optional[int]
    item_name: str
    total_blocks: int
    allocated_count: int
    free_count: int


class StoneBlockAllocatedOut(BaseModel):
    block_id: int
    serial_no: str
    item_id: Optional[int]
    item_name: Optional[str]
    status: str
    length: Optional[float]
    width: Optional[float]
    height: Optional[float]
    total_volume: Optional[float]
    available_volume: Optional[float]
    warehouse_id: Optional[int]
    warehouse_name: Optional[str]
    project_id: Optional[int]
    project_name: Optional[str]
    idol_id: Optional[int]
    idol_serial_no: Optional[str]
    idol_name: Optional[str]
    idol_status: Optional[str]
    position_name: Optional[str]
    position_status: Optional[str]
    position_stage_name: Optional[str]
    position_stage_status: Optional[str]
    component_status: Optional[str]
    actual_length: Optional[float]
    actual_width: Optional[float]
    actual_height: Optional[float]
    req_length: Optional[float]
    req_width: Optional[float]
    req_height: Optional[float]
    current_stage_name: Optional[str]
    current_stage_status: Optional[str]


class StockAllocatedFreeRowOut(BaseModel):
    item_id: Optional[int]
    item_name: Optional[str]
    serial_no: Optional[str]
    allocated_qty: float
    allocation_type: Optional[str]
    project_id: Optional[int]
    project_name: Optional[str]
    idol_id: Optional[int]
    idol_name: Optional[str]
    position_id: Optional[int]
    position_name: Optional[str]
    structure_name: Optional[str]
    layer_name: Optional[str]
    stage_name: Optional[str]
    stage_status: Optional[str]
    warehouse_id: Optional[int]
    warehouse_name: Optional[str]
    status: Optional[str]


class SerializedStockReportOut(BaseModel):
    summary: List[SerializedStockSummaryOut]
    allocated: List[SerializedStockAllocatedOut]
    stone_summary: List[StoneBlockStockSummaryOut]
    stone_allocated: List[StoneBlockAllocatedOut]
    allocated_items: List[StockAllocatedFreeRowOut] = []


class IdolSummaryOut(BaseModel):
    idol_id: int
    project_id: Optional[int]
    project_name: Optional[str] = None
    serial_no: str
    idol_name: str
    status: str
    total_manufacturing_cost: float
    sale_amount: float = 0
    profit_amount: float = 0
    created_at: datetime


class StoneBlockAvailabilityOut(BaseModel):
    item_id: Optional[int]
    item_name: str
    status: str
    serial_no: Optional[str]
    total_volume: Optional[str]
    available_volume: Optional[str]


class BlueprintPositionProgressOut(BaseModel):
    project_id: Optional[int]
    project_name: Optional[str]
    structure_id: Optional[int]
    structure_name: Optional[str]
    layer_id: Optional[int]
    layer_name: Optional[str]
    layer_order: Optional[int]
    position_id: int
    position_code: str
    position_status: Optional[str]
    req_length: Optional[float]
    req_width: Optional[float]
    req_height: Optional[float]
    tolerance_pct: Optional[float]
    stage_total: int
    stage_completed: int
    stage_in_progress: int
    stage_pending: int
    current_stage_name: Optional[str]
    current_stage_status: Optional[str]
    total_stage_cost: float


class PositionDependencyHealthOut(BaseModel):
    project_id: Optional[int]
    project_name: Optional[str]
    structure_id: Optional[int]
    structure_name: Optional[str]
    layer_id: Optional[int]
    layer_name: Optional[str]
    layer_order: Optional[int]
    position_id: int
    position_code: str
    position_status: Optional[str]
    dependency_count: int
    completed_dependencies: int
    blocked_count: int
    blocked_by: Optional[str]
    health_status: str


class InstallationReportOut(BaseModel):
    installation_id: int
    project_id: Optional[int]
    project_name: Optional[str]
    position_id: int
    position_code: Optional[str]
    structure_name: Optional[str]
    layer_name: Optional[str]
    stone_block_id: Optional[int]
    stone_serial_no: Optional[str]
    installation_date: Optional[date]
    installation_status: Optional[str]
    verified_at: Optional[datetime]
    remarks: Optional[str]


class IdolStageProgressOut(BaseModel):
    idol_id: int
    serial_no: str
    idol_name: str
    stage_id: int
    stage_name: str
    stage_order: int
    status: str
    labor_hours: float
    labor_rate: float
    material_cost: float
    stage_cost: float


class IdolMaterialConsumptionOut(BaseModel):
    idol_id: int
    serial_no: str
    idol_name: str
    item_id: Optional[int]
    item_name: Optional[str]
    stone_block_id: Optional[int]
    stone_serial_no: Optional[str]
    qty: float
