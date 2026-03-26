"""
Sample data seed script for Matru Construction ERP.
Run from the backend directory:
    python -m backend.seed_data
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, datetime, timedelta
from backend.database import SessionLocal
from backend.models.models import (
    User, ItemCategory, Item, Warehouse, StockLedger,
    StoneBlock, Project, StructureType, StructureLayer,
    BlueprintPosition, PositionDependency, IdolManufacturing,
    ManufacturingStage, StructuralComponent, BlockAllocation,
    JobWork, Dispatch, DispatchItem, Installation,
    Contractor, ContractorAgreement, ContractorInvoice,
    Milestone, SalesInvoice, InvoiceLineItem,
    ProjectCost, AdvancePayment, AuditLog,
)
from backend.utils.auth import hash_password
from backend.config import (
    Role, MovementType, ValuationMethod, StageStatus, WIPStatus,
    PaymentStatus, MilestoneStatus, InstallationStatus,
)


def seed():
    db = SessionLocal()
    try:
        # ── Guard: skip if already seeded ─────────────────────────────────────
        if db.query(User).filter(User.email == "pm@temple.com").first():
            print("[!] Sample data already exists. Skipping.")
            return

        print("[*] Seeding sample data...")

        # ─────────────────────────────────────────────────────────────────────
        # 1. USERS
        # ─────────────────────────────────────────────────────────────────────
        admin = db.query(User).filter(User.email == "admin@temple.com").first()
        if not admin:
            admin = User(name="Admin User", email="admin@temple.com",
                         hashed_password=hash_password("admin123"),
                         role=Role.ADMIN, is_active=True)
            db.add(admin)

        pm = User(name="Ramesh Sharma", email="pm@temple.com",
                  hashed_password=hash_password("pass123"),
                  role=Role.PROJECT_MANAGER, is_active=True)
        eng = User(name="Suresh Verma", email="eng@temple.com",
                   hashed_password=hash_password("pass123"),
                   role=Role.STRUCTURAL_ENGINEER, is_active=True)
        prod = User(name="Mahesh Patel", email="prod@temple.com",
                    hashed_password=hash_password("pass123"),
                    role=Role.PRODUCTION_SUPERVISOR, is_active=True)
        store = User(name="Dinesh Gupta", email="store@temple.com",
                     hashed_password=hash_password("pass123"),
                     role=Role.STORE_MANAGER, is_active=True)
        accounts = User(name="Neha Joshi", email="accounts@temple.com",
                        hashed_password=hash_password("pass123"),
                        role=Role.ACCOUNTS_MANAGER, is_active=True)
        site_sup = User(name="Rajesh Kumar", email="site@temple.com",
                        hashed_password=hash_password("pass123"),
                        role=Role.SITE_SUPERVISOR, is_active=True)

        db.add_all([pm, eng, prod, store, accounts, site_sup])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 2. PROJECTS
        # ─────────────────────────────────────────────────────────────────────
        proj1 = Project(
            name="Shiva Temple - Pushkar", code="STP-001",
            location="Pushkar, Rajasthan", state="Rajasthan", state_code="08",
            client_name="Shri Pushkar Devasthan Trust",
            client_gstin="08AAABT1234A1ZB",
            start_date=date(2024, 1, 15), expected_end_date=date(2026, 6, 30),
            total_value=12500000.0, status="active", completion_pct=42.0,
            created_by=pm.id,
        )
        proj2 = Project(
            name="Durga Mata Mandir - Ahmedabad", code="DMM-002",
            location="Ahmedabad, Gujarat", state="Gujarat", state_code="24",
            client_name="Mata Durga Seva Samiti",
            client_gstin="24BBBCS5678B2ZC",
            start_date=date(2024, 6, 1), expected_end_date=date(2027, 3, 31),
            total_value=8750000.0, status="active", completion_pct=18.0,
            created_by=pm.id,
        )
        db.add_all([proj1, proj2])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 3. WAREHOUSES
        # ─────────────────────────────────────────────────────────────────────
        wh_main = Warehouse(
            name="Main Workshop - Jaipur", code="WH-MAIN",
            warehouse_type="main",
            address="Plot 45, RIICO Industrial Area, Jaipur, Rajasthan 302013",
            gstin="08AABCM1234A1ZZ", state_code="08",
        )
        wh_site1 = Warehouse(
            name="Pushkar Site Store", code="WH-STP001",
            warehouse_type="site", project_id=proj1.id,
            address="Temple Site, Pushkar, Ajmer, Rajasthan 305022",
            state_code="08",
        )
        wh_site2 = Warehouse(
            name="Ahmedabad Site Store", code="WH-DMM002",
            warehouse_type="site", project_id=proj2.id,
            address="Sector 12, Gandhinagar Road, Ahmedabad, Gujarat 380015",
            state_code="24",
        )
        wh_jw = Warehouse(
            name="Job Work Store - Makrana", code="WH-JW01",
            warehouse_type="job_work",
            address="Makrana, Nagaur, Rajasthan 341505",
            state_code="08",
        )
        db.add_all([wh_main, wh_site1, wh_site2, wh_jw])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 4. ITEM CATEGORIES
        # ─────────────────────────────────────────────────────────────────────
        cat_stone = ItemCategory(
            name="Stone Blocks", item_type="dimensional",
            hsn_code="2515", gst_rate=5.0,
            description="Marble and granite blocks for carving",
        )
        cat_tools = ItemCategory(
            name="Carving Tools", item_type="serialized",
            hsn_code="8205", gst_rate=18.0,
            description="Chisels, hammers and pneumatic tools",
        )
        cat_chem = ItemCategory(
            name="Chemicals & Consumables", item_type="batch",
            hsn_code="3814", gst_rate=18.0,
            description="Polishing compounds, adhesives, sealants",
        )
        cat_hardware = ItemCategory(
            name="Hardware & Fixtures", item_type="batch",
            hsn_code="7317", gst_rate=18.0,
            description="Anchors, dowels, clamps",
        )
        db.add_all([cat_stone, cat_tools, cat_chem, cat_hardware])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 5. ITEMS
        # ─────────────────────────────────────────────────────────────────────
        item_marble = Item(
            name="White Makrana Marble Block", code="STN-WMM-001",
            category_id=cat_stone.id, uom="cft",
            valuation_method=ValuationMethod.WEIGHTED_AVG,
            reorder_level=50,
        )
        item_granite = Item(
            name="Black Granite Block", code="STN-BLK-002",
            category_id=cat_stone.id, uom="cft",
            valuation_method=ValuationMethod.WEIGHTED_AVG,
            reorder_level=30,
        )
        item_chisel = Item(
            name="Pneumatic Chisel Set", code="TOOL-PCH-001",
            category_id=cat_tools.id, uom="set",
            valuation_method=ValuationMethod.FIFO,
            reorder_level=2,
        )
        item_polish = Item(
            name="Diamond Polishing Compound", code="CHM-DPC-001",
            category_id=cat_chem.id, uom="kg",
            valuation_method=ValuationMethod.WEIGHTED_AVG,
            reorder_level=10,
        )
        item_anchor = Item(
            name="SS Anchor Bolt M12x150", code="HW-ANB-001",
            category_id=cat_hardware.id, uom="pcs",
            valuation_method=ValuationMethod.WEIGHTED_AVG,
            reorder_level=100,
        )
        db.add_all([item_marble, item_granite, item_chisel, item_polish, item_anchor])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 6. STONE BLOCKS
        # ─────────────────────────────────────────────────────────────────────
        sb1 = StoneBlock(
            serial_no="BLK-2024-001", item_id=item_marble.id,
            warehouse_id=wh_main.id, project_id=proj1.id,
            length=6.0, width=4.0, height=3.0,
            total_volume=72.0, available_volume=72.0,
            stone_type="White Makrana", quarry_source="Makrana Mines, Nagaur",
            rate_per_cft=1800.0, status="available", created_by=store.id,
        )
        sb2 = StoneBlock(
            serial_no="BLK-2024-002", item_id=item_marble.id,
            warehouse_id=wh_main.id, project_id=proj1.id,
            length=5.0, width=3.5, height=2.5,
            total_volume=43.75, available_volume=43.75,
            stone_type="White Makrana", quarry_source="Makrana Mines, Nagaur",
            rate_per_cft=1800.0, status="available", created_by=store.id,
        )
        sb3 = StoneBlock(
            serial_no="BLK-2024-003", item_id=item_marble.id,
            warehouse_id=wh_main.id, project_id=proj1.id,
            length=4.0, width=4.0, height=4.0,
            total_volume=64.0, available_volume=50.0,
            stone_type="White Makrana", quarry_source="Makrana Mines, Nagaur",
            rate_per_cft=1800.0, status="split", created_by=store.id,
        )
        # Child block from split of sb3
        sb3a = StoneBlock(
            serial_no="BLK-2024-003A", item_id=item_marble.id,
            warehouse_id=wh_main.id, project_id=proj1.id,
            length=2.0, width=4.0, height=4.0,
            total_volume=32.0, available_volume=32.0,
            stone_type="White Makrana", quarry_source="Makrana Mines, Nagaur",
            rate_per_cft=1800.0, status="allocated", created_by=store.id,
        )
        sb4 = StoneBlock(
            serial_no="BLK-2024-004", item_id=item_granite.id,
            warehouse_id=wh_main.id, project_id=proj2.id,
            length=5.0, width=3.0, height=2.0,
            total_volume=30.0, available_volume=30.0,
            stone_type="Black Granite", quarry_source="Rajasthan Granite Quarry",
            rate_per_cft=2200.0, status="available", created_by=store.id,
        )
        sb5 = StoneBlock(
            serial_no="BLK-2024-005", item_id=item_marble.id,
            warehouse_id=wh_site1.id, project_id=proj1.id,
            length=3.0, width=2.5, height=2.0,
            total_volume=15.0, available_volume=15.0,
            stone_type="White Makrana", quarry_source="Makrana Mines, Nagaur",
            rate_per_cft=1800.0, status="dispatched", created_by=store.id,
        )
        sb6 = StoneBlock(
            serial_no="BLK-2024-006", item_id=item_marble.id,
            warehouse_id=wh_main.id, project_id=proj1.id,
            length=2.5, width=2.0, height=1.5,
            total_volume=7.5, available_volume=7.5,
            stone_type="Pink Sandstone", quarry_source="Dholpur Mines",
            rate_per_cft=950.0, status="available", created_by=store.id,
        )
        db.add_all([sb1, sb2, sb3, sb3a, sb4, sb5, sb6])
        db.flush()

        # Set parent reference for split child
        sb3a.parent_id = sb3.id
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 7. STOCK LEDGER
        # ─────────────────────────────────────────────────────────────────────
        sl_entries = [
            StockLedger(item_id=item_marble.id, warehouse_id=wh_main.id,
                        movement_type=MovementType.INWARD, qty_in=200, qty_out=0,
                        balance_qty=200, rate=1800, value=360000,
                        reference_type="purchase", remarks="Initial purchase - WMM batch",
                        created_by=store.id),
            StockLedger(item_id=item_granite.id, warehouse_id=wh_main.id,
                        movement_type=MovementType.INWARD, qty_in=80, qty_out=0,
                        balance_qty=80, rate=2200, value=176000,
                        reference_type="purchase", remarks="Black granite - first lot",
                        created_by=store.id),
            StockLedger(item_id=item_chisel.id, warehouse_id=wh_main.id,
                        movement_type=MovementType.INWARD, qty_in=5, qty_out=0,
                        balance_qty=5, rate=12000, value=60000,
                        reference_type="purchase", remarks="Pneumatic chisel sets",
                        created_by=store.id),
            StockLedger(item_id=item_polish.id, warehouse_id=wh_main.id,
                        movement_type=MovementType.INWARD, qty_in=50, qty_out=0,
                        balance_qty=50, rate=450, value=22500,
                        reference_type="purchase", remarks="Polishing compound stock",
                        created_by=store.id),
            StockLedger(item_id=item_anchor.id, warehouse_id=wh_main.id,
                        movement_type=MovementType.INWARD, qty_in=500, qty_out=0,
                        balance_qty=500, rate=35, value=17500,
                        reference_type="purchase", remarks="Anchor bolts - SS M12",
                        created_by=store.id),
            StockLedger(item_id=item_anchor.id, warehouse_id=wh_main.id,
                        movement_type=MovementType.SITE_DISPATCH, qty_in=0, qty_out=120,
                        balance_qty=380, rate=35, value=4200,
                        reference_type="dispatch", remarks="Sent to Pushkar site",
                        created_by=store.id),
        ]
        db.add_all(sl_entries)
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 8. BLUEPRINTS
        # ─────────────────────────────────────────────────────────────────────
        struct1 = StructureType(
            name="Main Shikhara", project_id=proj1.id,
            description="Primary tower structure of the Shiva temple",
        )
        struct2 = StructureType(
            name="Mandapa (Assembly Hall)", project_id=proj1.id,
            description="Pillared assembly hall in front of sanctum",
        )
        struct3 = StructureType(
            name="Garbhagriha (Sanctum)", project_id=proj1.id,
            description="Inner sanctum housing the main deity",
        )
        db.add_all([struct1, struct2, struct3])
        db.flush()

        # Layers for Shikhara
        layer_foundation = StructureLayer(
            structure_type_id=struct1.id, name="Foundation Plinth",
            layer_order=1, description="Base foundation layer",
        )
        layer_base = StructureLayer(
            structure_type_id=struct1.id, name="Base Platform (Pitha)",
            layer_order=2, description="Elevated stone platform",
        )
        layer_wall = StructureLayer(
            structure_type_id=struct1.id, name="Wall Body (Jangha)",
            layer_order=3, description="Main wall section with carvings",
        )
        layer_neck = StructureLayer(
            structure_type_id=struct1.id, name="Neck (Griva)",
            layer_order=4, description="Transitional neck section",
        )
        layer_crown = StructureLayer(
            structure_type_id=struct1.id, name="Crown (Shikhara Top)",
            layer_order=5, description="Topmost crown section",
        )
        # Layers for Mandapa
        layer_m_pillar = StructureLayer(
            structure_type_id=struct2.id, name="Pillar Set",
            layer_order=1, description="16 carved stone pillars",
        )
        layer_m_beam = StructureLayer(
            structure_type_id=struct2.id, name="Beam & Lintel",
            layer_order=2, description="Cross beams connecting pillars",
        )
        db.add_all([layer_foundation, layer_base, layer_wall, layer_neck, layer_crown,
                    layer_m_pillar, layer_m_beam])
        db.flush()

        # Blueprint positions
        pos_f1 = BlueprintPosition(layer_id=layer_foundation.id, position_code="F-01",
            description="NE Corner foundation stone",
            req_length=4.0, req_width=4.0, req_height=1.5, tolerance_pct=3.0,
            status="completed")
        pos_f2 = BlueprintPosition(layer_id=layer_foundation.id, position_code="F-02",
            description="NW Corner foundation stone",
            req_length=4.0, req_width=4.0, req_height=1.5, tolerance_pct=3.0,
            status="completed")
        pos_f3 = BlueprintPosition(layer_id=layer_foundation.id, position_code="F-03",
            description="SE Corner foundation stone",
            req_length=4.0, req_width=4.0, req_height=1.5, tolerance_pct=3.0,
            status="completed")
        pos_f4 = BlueprintPosition(layer_id=layer_foundation.id, position_code="F-04",
            description="SW Corner foundation stone",
            req_length=4.0, req_width=4.0, req_height=1.5, tolerance_pct=3.0,
            status="completed")
        pos_b1 = BlueprintPosition(layer_id=layer_base.id, position_code="B-01",
            description="Front base slab - center",
            req_length=5.0, req_width=2.0, req_height=1.0, tolerance_pct=2.0,
            status="in_progress")
        pos_b2 = BlueprintPosition(layer_id=layer_base.id, position_code="B-02",
            description="Rear base slab - center",
            req_length=5.0, req_width=2.0, req_height=1.0, tolerance_pct=2.0,
            status="pending")
        pos_w1 = BlueprintPosition(layer_id=layer_wall.id, position_code="W-01",
            description="Front wall panel with Nataraj carving",
            req_length=3.0, req_width=0.8, req_height=4.0, tolerance_pct=1.5,
            status="pending")
        pos_w2 = BlueprintPosition(layer_id=layer_wall.id, position_code="W-02",
            description="Side wall panel - East with floral motif",
            req_length=2.5, req_width=0.8, req_height=4.0, tolerance_pct=1.5,
            status="pending")
        pos_p1 = BlueprintPosition(layer_id=layer_m_pillar.id, position_code="P-01",
            description="Pillar 1 - Front left",
            req_length=0.6, req_width=0.6, req_height=3.5, tolerance_pct=1.0,
            status="completed")
        pos_p2 = BlueprintPosition(layer_id=layer_m_pillar.id, position_code="P-02",
            description="Pillar 2 - Front right",
            req_length=0.6, req_width=0.6, req_height=3.5, tolerance_pct=1.0,
            status="in_progress")
        db.add_all([pos_f1, pos_f2, pos_f3, pos_f4, pos_b1, pos_b2,
                    pos_w1, pos_w2, pos_p1, pos_p2])
        db.flush()

        # Dependencies: base depends on foundation; wall depends on base
        dep1 = PositionDependency(position_id=pos_b1.id, depends_on_id=pos_f1.id)
        dep2 = PositionDependency(position_id=pos_b1.id, depends_on_id=pos_f2.id)
        dep3 = PositionDependency(position_id=pos_b2.id, depends_on_id=pos_f3.id)
        dep4 = PositionDependency(position_id=pos_b2.id, depends_on_id=pos_f4.id)
        dep5 = PositionDependency(position_id=pos_w1.id, depends_on_id=pos_b1.id)
        dep6 = PositionDependency(position_id=pos_w2.id, depends_on_id=pos_b1.id)
        db.add_all([dep1, dep2, dep3, dep4, dep5, dep6])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 9. MILESTONES
        # ─────────────────────────────────────────────────────────────────────
        ms1 = Milestone(project_id=proj1.id, name="Foundation & Plinth Completion",
            description="All foundation stones placed and verified",
            milestone_value=1875000, completion_pct=100,
            status=MilestoneStatus.COMPLETED,
            due_date=date(2024, 6, 30), completed_date=date(2024, 6, 15))
        ms2 = Milestone(project_id=proj1.id, name="Base Platform (Pitha) Complete",
            description="Elevated platform fully installed",
            milestone_value=2500000, completion_pct=60,
            status=MilestoneStatus.IN_PROGRESS,
            due_date=date(2024, 12, 31))
        ms3 = Milestone(project_id=proj1.id, name="Wall Carvings & Mandapa Pillars",
            description="All decorative wall panels and pillars installed",
            milestone_value=3125000, completion_pct=0,
            status=MilestoneStatus.PENDING,
            due_date=date(2025, 8, 31))
        ms4 = Milestone(project_id=proj1.id, name="Shikhara Crown & Finials",
            description="Top sections and kalasha installed",
            milestone_value=2500000, completion_pct=0,
            status=MilestoneStatus.PENDING,
            due_date=date(2026, 3, 31))
        ms5 = Milestone(project_id=proj2.id, name="Site Preparation & Foundation",
            description="Site leveling, foundation stone work",
            milestone_value=1312500, completion_pct=100,
            status=MilestoneStatus.COMPLETED,
            due_date=date(2024, 9, 30), completed_date=date(2024, 9, 20))
        ms6 = Milestone(project_id=proj2.id, name="Mandapa & Entrance Gate",
            description="Mandapa pillars and entrance gopuram",
            milestone_value=2625000, completion_pct=20,
            status=MilestoneStatus.IN_PROGRESS,
            due_date=date(2025, 6, 30))
        db.add_all([ms1, ms2, ms3, ms4, ms5, ms6])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 10. BLOCK ALLOCATIONS
        # ─────────────────────────────────────────────────────────────────────
        alloc1 = BlockAllocation(
            stone_block_id=sb3a.id, project_id=proj1.id,
            allocated_by=store.id, allocation_date=date(2024, 3, 10),
            remarks="Allocated for front wall panel W-01",
        )
        db.add(alloc1)
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 11. MANUFACTURING - IDOLS
        # ─────────────────────────────────────────────────────────────────────
        idol1 = IdolManufacturing(
            serial_no="IDL-2024-001", stone_block_id=sb1.id,
            project_id=proj1.id, idol_name="Lord Shiva (Nataraja) - Main Deity",
            description="5ft seated Nataraja idol in Makrana white marble",
            total_labor_hours=420, total_stage_cost=186000,
            total_manufacturing_cost=316000,
            status=WIPStatus.IN_PROGRESS, created_by=prod.id,
        )
        idol2 = IdolManufacturing(
            serial_no="IDL-2024-002", stone_block_id=sb2.id,
            project_id=proj1.id, idol_name="Nandi Bull - Entrance Idol",
            description="Life-size Nandi idol for temple entrance",
            total_labor_hours=180, total_stage_cost=72000,
            total_manufacturing_cost=150750,
            status=WIPStatus.COMPLETED, created_by=prod.id,
        )
        idol3 = IdolManufacturing(
            serial_no="IDL-2024-003", stone_block_id=sb4.id,
            project_id=proj2.id, idol_name="Durga Mata - Main Deity",
            description="4ft standing Durga idol in black granite",
            total_labor_hours=290, total_stage_cost=128000,
            total_manufacturing_cost=194000,
            status=WIPStatus.IN_PROGRESS, created_by=prod.id,
        )
        db.add_all([idol1, idol2, idol3])
        db.flush()

        # Manufacturing stages
        stages = [
            ManufacturingStage(idol_id=idol1.id, stage_name="Rough Shaping", stage_order=1,
                labor_hours=80, labor_rate=350, material_cost=5000,
                stage_cost=33000, status=StageStatus.COMPLETED,
                started_at=datetime(2024, 2, 1), completed_at=datetime(2024, 2, 20),
                remarks="Rough outline chiseled"),
            ManufacturingStage(idol_id=idol1.id, stage_name="Detailed Carving - Body", stage_order=2,
                labor_hours=150, labor_rate=400, material_cost=8000,
                stage_cost=68000, status=StageStatus.COMPLETED,
                started_at=datetime(2024, 2, 21), completed_at=datetime(2024, 4, 10),
                remarks="Body proportions completed"),
            ManufacturingStage(idol_id=idol1.id, stage_name="Face & Ornament Carving", stage_order=3,
                labor_hours=120, labor_rate=500, material_cost=12000,
                stage_cost=72000, status=StageStatus.IN_PROGRESS,
                started_at=datetime(2024, 4, 11),
                remarks="Facial features 70% done"),
            ManufacturingStage(idol_id=idol1.id, stage_name="Final Finishing & Polish", stage_order=4,
                labor_hours=70, labor_rate=450, material_cost=3000,
                stage_cost=34500, status=StageStatus.PENDING,
                remarks="Pending completion of face"),
            # Nandi stages (completed)
            ManufacturingStage(idol_id=idol2.id, stage_name="Rough Shaping", stage_order=1,
                labor_hours=60, labor_rate=350, material_cost=3000,
                stage_cost=24000, status=StageStatus.COMPLETED,
                started_at=datetime(2024, 1, 20), completed_at=datetime(2024, 2, 5)),
            ManufacturingStage(idol_id=idol2.id, stage_name="Detailed Carving", stage_order=2,
                labor_hours=90, labor_rate=400, material_cost=6000,
                stage_cost=42000, status=StageStatus.COMPLETED,
                started_at=datetime(2024, 2, 6), completed_at=datetime(2024, 3, 15)),
            ManufacturingStage(idol_id=idol2.id, stage_name="Polish & Finish", stage_order=3,
                labor_hours=30, labor_rate=450, material_cost=1500,
                stage_cost=15000, status=StageStatus.COMPLETED,
                started_at=datetime(2024, 3, 16), completed_at=datetime(2024, 3, 25)),
            # Durga stages
            ManufacturingStage(idol_id=idol3.id, stage_name="Rough Shaping", stage_order=1,
                labor_hours=60, labor_rate=400, material_cost=4000,
                stage_cost=28000, status=StageStatus.COMPLETED,
                started_at=datetime(2024, 7, 1), completed_at=datetime(2024, 7, 20)),
            ManufacturingStage(idol_id=idol3.id, stage_name="Body Carving", stage_order=2,
                labor_hours=130, labor_rate=450, material_cost=8000,
                stage_cost=66500, status=StageStatus.IN_PROGRESS,
                started_at=datetime(2024, 7, 21),
                remarks="8 arms being carved"),
        ]
        db.add_all(stages)
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 12. STRUCTURAL COMPONENTS
        # ─────────────────────────────────────────────────────────────────────
        comp1 = StructuralComponent(
            stone_block_id=sb3a.id, position_id=pos_f1.id, project_id=proj1.id,
            cost=125000,
            actual_length=4.05, actual_width=3.98, actual_height=1.48,
            is_dimension_compliant=True, wip_status=WIPStatus.COMPLETED,
            remarks="Within 3% tolerance - approved",
        )
        comp2 = StructuralComponent(
            stone_block_id=sb5.id, position_id=pos_p1.id, project_id=proj1.id,
            cost=98000,
            actual_length=0.61, actual_width=0.60, actual_height=3.52,
            is_dimension_compliant=True, wip_status=WIPStatus.COMPLETED,
            remarks="Pillar 1 fabricated and installed",
        )
        db.add_all([comp1, comp2])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 13. JOB WORK
        # ─────────────────────────────────────────────────────────────────────
        jw1 = JobWork(
            challan_no="JW-2024-001", stone_block_id=sb6.id,
            vendor_name="Makrana Marble Works Pvt Ltd",
            vendor_gstin="08AAACM5678A1ZC",
            from_warehouse_id=wh_main.id, job_work_warehouse_id=wh_jw.id,
            dispatch_date=date(2024, 5, 1), expected_return_date=date(2024, 6, 15),
            actual_return_date=date(2024, 6, 10),
            job_description="Rough cutting and squaring of pink sandstone block",
            job_cost=8500, status="returned",
            return_length=2.45, return_width=1.95, return_height=1.48,
            wastage_volume=0.56,
            created_by=store.id,
        )
        jw2 = JobWork(
            challan_no="JW-2024-002", stone_block_id=sb2.id,
            vendor_name="Makrana Marble Works Pvt Ltd",
            vendor_gstin="08AAACM5678A1ZC",
            from_warehouse_id=wh_main.id, job_work_warehouse_id=wh_jw.id,
            dispatch_date=date(2024, 8, 5), expected_return_date=date(2024, 9, 20),
            job_description="Surface finishing and fluting for pillar blocks",
            job_cost=12000, status="dispatched",
            created_by=store.id,
        )
        db.add_all([jw1, jw2])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 14. DISPATCHES
        # ─────────────────────────────────────────────────────────────────────
        disp1 = Dispatch(
            dispatch_note_no="DN-2024-001", project_id=proj1.id,
            from_warehouse_id=wh_main.id, to_warehouse_id=wh_site1.id,
            dispatch_date=date(2024, 4, 10),
            transporter_name="Rajasthan Roadways Transport",
            vehicle_no="RJ14GC4532", lr_no="LR-2024-4532",
            eway_bill_no="0812345678901", eway_bill_date=date(2024, 4, 10),
            total_value=27000, remarks="Foundation stone components - batch 1",
            created_by=site_sup.id,
        )
        disp2 = Dispatch(
            dispatch_note_no="DN-2024-002", project_id=proj1.id,
            from_warehouse_id=wh_main.id, to_warehouse_id=wh_site1.id,
            dispatch_date=date(2024, 7, 22),
            transporter_name="Shree Ram Logistics",
            vehicle_no="RJ01CB9871", lr_no="LR-2024-9871",
            eway_bill_no="0898765432101", eway_bill_date=date(2024, 7, 22),
            total_value=45500, remarks="Mandapa pillar P-01 and hardware",
            created_by=site_sup.id,
        )
        db.add_all([disp1, disp2])
        db.flush()

        di1 = DispatchItem(dispatch_id=disp1.id, stone_block_id=sb5.id,
            qty=1, rate=27000, value=27000, hsn_code="2515")
        di2 = DispatchItem(dispatch_id=disp2.id, stone_block_id=sb5.id,
            qty=1, rate=43750, value=43750, hsn_code="2515")
        di3 = DispatchItem(dispatch_id=disp2.id, item_id=item_anchor.id,
            qty=50, rate=35, value=1750, hsn_code="7317")
        db.add_all([di1, di2, di3])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 15. INSTALLATIONS
        # ─────────────────────────────────────────────────────────────────────
        inst1 = Installation(
            stone_block_id=sb5.id, position_id=pos_p1.id, project_id=proj1.id,
            installation_date=date(2024, 8, 5),
            installed_by=site_sup.id, status=InstallationStatus.VERIFIED,
            verified_by=eng.id, verified_at=datetime(2024, 8, 6, 10, 30),
            remarks="Pillar P-01 installed and plumb verified",
        )
        inst2 = Installation(
            stone_block_id=sb3a.id, position_id=pos_f1.id, project_id=proj1.id,
            installation_date=date(2024, 5, 20),
            installed_by=site_sup.id, status=InstallationStatus.VERIFIED,
            verified_by=eng.id, verified_at=datetime(2024, 5, 21, 9, 0),
            remarks="NE foundation stone installed",
        )
        db.add_all([inst1, inst2])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 16. CONTRACTORS
        # ─────────────────────────────────────────────────────────────────────
        cont1 = Contractor(
            name="Shilp Kala Stone Works", gstin="08ABCSS1234A1ZQ",
            pan="ABCSS1234A", phone="9876543210",
            email="info@shilpkala.com",
            address="12, Kalawad Road, Rajkot, Gujarat 360005",
            state="Gujarat", state_code="24",
        )
        cont2 = Contractor(
            name="Raj Murti Kala Kendra", gstin="08AACCR9876B1ZP",
            pan="AACCR9876B", phone="9988776655",
            email="rajmurti@gmail.com",
            address="Old City, Near Chandpol, Jaipur, Rajasthan 302001",
            state="Rajasthan", state_code="08",
        )
        cont3 = Contractor(
            name="Gujarat Carving Specialists", gstin="24AADCG4567C1ZM",
            pan="AADCG4567C", phone="9123456789",
            email="gcs@carving.co.in",
            address="Ring Road, Surat, Gujarat 395002",
            state="Gujarat", state_code="24",
        )
        db.add_all([cont1, cont2, cont3])
        db.flush()

        # Contractor Agreements
        agr1 = ContractorAgreement(
            contractor_id=cont1.id, project_id=proj1.id,
            agreement_no="AGR-STP-001",
            contract_value=1800000, gst_pct=18.0, tds_pct=2.0, retention_pct=5.0,
            start_date=date(2024, 2, 1), end_date=date(2025, 1, 31),
            scope_of_work="Supply and carving of decorative wall panels for Jangha section. "
                          "Includes all finishing work and site installation of 12 panels.",
        )
        agr2 = ContractorAgreement(
            contractor_id=cont2.id, project_id=proj1.id,
            agreement_no="AGR-STP-002",
            contract_value=950000, gst_pct=18.0, tds_pct=2.0, retention_pct=5.0,
            start_date=date(2024, 3, 1), end_date=date(2024, 12, 31),
            scope_of_work="Carving of 16 mandapa pillars with traditional motifs.",
        )
        agr3 = ContractorAgreement(
            contractor_id=cont3.id, project_id=proj2.id,
            agreement_no="AGR-DMM-001",
            contract_value=1200000, gst_pct=18.0, tds_pct=2.0, retention_pct=5.0,
            start_date=date(2024, 7, 1), end_date=date(2026, 6, 30),
            scope_of_work="Complete stone carving and installation for Durga Mandir gopuram and mandapa.",
        )
        db.add_all([agr1, agr2, agr3])
        db.flush()

        # Contractor Invoices
        ci1 = ContractorInvoice(
            agreement_id=agr1.id, milestone_id=ms1.id,
            invoice_no="CINV-2024-001", invoice_date=date(2024, 7, 5),
            gross_amount=450000, gst_amount=81000, tds_amount=9000,
            retention_amount=22500, net_payable=499500,
            payment_status=PaymentStatus.PAID,
            paid_amount=499500, paid_date=date(2024, 7, 20),
            remarks="1st running bill for wall panels supply",
        )
        ci2 = ContractorInvoice(
            agreement_id=agr1.id,
            invoice_no="CINV-2024-002", invoice_date=date(2024, 10, 10),
            gross_amount=600000, gst_amount=108000, tds_amount=12000,
            retention_amount=30000, net_payable=666000,
            payment_status=PaymentStatus.PARTIAL,
            paid_amount=350000,
            remarks="2nd running bill - partial payment received",
        )
        ci3 = ContractorInvoice(
            agreement_id=agr2.id, milestone_id=ms2.id,
            invoice_no="CINV-2024-003", invoice_date=date(2024, 9, 1),
            gross_amount=380000, gst_amount=68400, tds_amount=7600,
            retention_amount=19000, net_payable=421800,
            payment_status=PaymentStatus.PAID,
            paid_amount=421800, paid_date=date(2024, 9, 15),
            remarks="Pillar carving - 8 of 16 pillars completed",
        )
        db.add_all([ci1, ci2, ci3])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 17. SALES INVOICES (Billing to Client)
        # ─────────────────────────────────────────────────────────────────────
        # Same-state invoice for Pushkar project (Rajasthan to Rajasthan = CGST+SGST)
        inv1 = SalesInvoice(
            invoice_no="INV-STP-2024-001",
            project_id=proj1.id, milestone_id=ms1.id,
            invoice_date=date(2024, 7, 15),
            client_name="Shri Pushkar Devasthan Trust",
            client_gstin="08AAABT1234A1ZB",
            from_state="Rajasthan", to_state="Rajasthan", is_interstate=False,
            taxable_amount=1875000,
            cgst_rate=9.0, cgst_amount=168750,
            sgst_rate=9.0, sgst_amount=168750,
            igst_rate=0, igst_amount=0,
            total_tax=337500, gross_amount=2212500,
            advance_adjustment=500000, net_payable=1712500,
            payment_status=PaymentStatus.PAID,
            paid_amount=1712500, paid_date=date(2024, 7, 30),
            created_by=accounts.id,
        )
        # Interstate invoice for Ahmedabad project (Rajasthan to Gujarat = IGST)
        inv2 = SalesInvoice(
            invoice_no="INV-DMM-2024-001",
            project_id=proj2.id, milestone_id=ms5.id,
            invoice_date=date(2024, 10, 10),
            client_name="Mata Durga Seva Samiti",
            client_gstin="24BBBCS5678B2ZC",
            from_state="Rajasthan", to_state="Gujarat", is_interstate=True,
            taxable_amount=1312500,
            cgst_rate=0, cgst_amount=0,
            sgst_rate=0, sgst_amount=0,
            igst_rate=18.0, igst_amount=236250,
            total_tax=236250, gross_amount=1548750,
            advance_adjustment=200000, net_payable=1348750,
            payment_status=PaymentStatus.PARTIAL,
            paid_amount=800000,
            created_by=accounts.id,
        )
        db.add_all([inv1, inv2])
        db.flush()

        # Invoice line items
        ili1 = InvoiceLineItem(invoice_id=inv1.id,
            description="Foundation plinth - Makrana marble stone supply & installation",
            hsn_code="2515", qty=1, rate=1875000, amount=1875000)
        ili2 = InvoiceLineItem(invoice_id=inv2.id,
            description="Site preparation, foundation excavation & plinth stone work",
            hsn_code="2515", qty=1, rate=1000000, amount=1000000)
        ili3 = InvoiceLineItem(invoice_id=inv2.id,
            description="Temporary site infrastructure and tool setup",
            hsn_code="9954", qty=1, rate=312500, amount=312500)
        db.add_all([ili1, ili2, ili3])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 18. ADVANCE PAYMENTS
        # ─────────────────────────────────────────────────────────────────────
        adv1 = AdvancePayment(
            project_id=proj1.id, client_name="Shri Pushkar Devasthan Trust",
            amount=500000, receipt_date=date(2024, 1, 20),
            adjusted_amount=500000, balance=0,
            remarks="Mobilization advance - adjusted in INV-STP-2024-001",
        )
        adv2 = AdvancePayment(
            project_id=proj1.id, client_name="Shri Pushkar Devasthan Trust",
            amount=750000, receipt_date=date(2024, 7, 1),
            adjusted_amount=0, balance=750000,
            remarks="2nd advance payment for ongoing work",
        )
        adv3 = AdvancePayment(
            project_id=proj2.id, client_name="Mata Durga Seva Samiti",
            amount=200000, receipt_date=date(2024, 5, 15),
            adjusted_amount=200000, balance=0,
            remarks="Initial mobilization advance - adjusted in INV-DMM-2024-001",
        )
        adv4 = AdvancePayment(
            project_id=proj2.id, client_name="Mata Durga Seva Samiti",
            amount=400000, receipt_date=date(2024, 11, 1),
            adjusted_amount=0, balance=400000,
            remarks="Advance for Durga idol manufacturing",
        )
        db.add_all([adv1, adv2, adv3, adv4])
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 19. PROJECT COSTS
        # ─────────────────────────────────────────────────────────────────────
        costs = [
            ProjectCost(project_id=proj1.id, cost_type="material",
                description="Makrana marble blocks - first purchase",
                amount=360000, date=date(2024, 1, 25), created_by=accounts.id),
            ProjectCost(project_id=proj1.id, cost_type="contractor",
                description="Contractor invoice CINV-2024-001",
                amount=499500, date=date(2024, 7, 20),
                reference_type="contractor_invoice", reference_id=ci1.id,
                created_by=accounts.id),
            ProjectCost(project_id=proj1.id, cost_type="labor",
                description="Idol manufacturing - labor cost for Nataraja",
                amount=186000, date=date(2024, 9, 30), created_by=accounts.id),
            ProjectCost(project_id=proj1.id, cost_type="site_expense",
                description="Scaffolding and site equipment hire",
                amount=45000, date=date(2024, 4, 15), created_by=accounts.id),
            ProjectCost(project_id=proj1.id, cost_type="site_expense",
                description="Site transportation and logistics",
                amount=28500, date=date(2024, 7, 25), created_by=accounts.id),
            ProjectCost(project_id=proj2.id, cost_type="material",
                description="Black granite blocks purchase",
                amount=176000, date=date(2024, 6, 10), created_by=accounts.id),
            ProjectCost(project_id=proj2.id, cost_type="labor",
                description="Durga idol manufacturing cost",
                amount=128000, date=date(2024, 11, 30), created_by=accounts.id),
            ProjectCost(project_id=proj2.id, cost_type="site_expense",
                description="Ahmedabad site setup and boundary wall",
                amount=62000, date=date(2024, 6, 20), created_by=accounts.id),
        ]
        db.add_all(costs)
        db.flush()

        # ─────────────────────────────────────────────────────────────────────
        # 20. AUDIT LOG SAMPLES
        # ─────────────────────────────────────────────────────────────────────
        audit_entries = [
            AuditLog(user_id=pm.id, action="CREATE", module="projects",
                record_id=proj1.id,
                description=f"Created project: {proj1.name}",
                ip_address="192.168.1.10"),
            AuditLog(user_id=pm.id, action="CREATE", module="projects",
                record_id=proj2.id,
                description=f"Created project: {proj2.name}",
                ip_address="192.168.1.10"),
            AuditLog(user_id=store.id, action="CREATE", module="stone_blocks",
                record_id=sb1.id,
                description="Registered stone block BLK-2024-001",
                ip_address="192.168.1.15"),
            AuditLog(user_id=store.id, action="SPLIT", module="stone_blocks",
                record_id=sb3.id,
                description="Block BLK-2024-003 split → child BLK-2024-003A",
                ip_address="192.168.1.15"),
            AuditLog(user_id=accounts.id, action="CREATE", module="sales_invoices",
                record_id=inv1.id,
                description=f"Invoice {inv1.invoice_no} created for {inv1.taxable_amount}",
                ip_address="192.168.1.20"),
            AuditLog(user_id=eng.id, action="VERIFY", module="installations",
                record_id=inst1.id,
                description="Installation verified: Pillar P-01",
                ip_address="192.168.1.25"),
        ]
        db.add_all(audit_entries)
        db.commit()

        print("\n[OK] Sample data seeded successfully!\n")
        print("=" * 55)
        print("  USERS CREATED")
        print("=" * 55)
        print("  admin@temple.com      / admin123  (Admin)")
        print("  pm@temple.com         / pass123   (Project Manager)")
        print("  eng@temple.com        / pass123   (Structural Engineer)")
        print("  prod@temple.com       / pass123   (Production Supervisor)")
        print("  store@temple.com      / pass123   (Store Manager)")
        print("  accounts@temple.com   / pass123   (Accounts Manager)")
        print("  site@temple.com       / pass123   (Site Supervisor)")
        print("=" * 55)
        print("\n  PROJECTS")
        print("  - STP-001: Shiva Temple, Pushkar    Rs.1.25 Cr  (42%)")
        print("  - DMM-002: Durga Mandir, Ahmedabad  Rs.87.5 L   (18%)")
        print("\n  DATA SUMMARY")
        print("  - 4 Warehouses  (main / 2 site / job-work)")
        print("  - 5 Items across 4 categories")
        print("  - 6 Stone blocks (1 parent-child split pair)")
        print("  - 10 Blueprint positions with dependencies")
        print("  - 3 Idols in manufacturing (9 stages)")
        print("  - 3 Contractors with 3 agreements, 3 invoices")
        print("  - 2 Sales invoices (1 intra-state, 1 inter-state)")
        print("  - 4 Advance payments")
        print("  - 2 Dispatches, 2 Job works, 2 Installations")
        print("  - 8 Project cost entries")
        print("=" * 55)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
