import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { reportsAPI, projectsAPI, inventoryAPI, billingAPI } from '../services/api';

const REPORT_LABELS = {
  'project-summary': 'Project Summary',
  'project-material-plan-vs-usage': 'Project Material Plan vs Usage',
  'project-costing': 'Project Costing',
  'project-profitability': 'Project Profitability',
  'project-margins': 'Project Margins',
  'idol-manufacturing-summary': 'Idol Manufacturing Summary',
  'idol-stage-progress': 'Idol Stage Progress',
  'idol-material-consumption': 'Idol Material Consumption',
  'blueprint-position-progress': 'Blueprint Position Progress',
  'position-dependency-health': 'Position Dependency Health',
  'installation-report': 'Installation Report',
  'stock-balance': 'Stock Balance',
  'stock-ledger-movement': 'Stock Ledger / Movement',
  'serialized-stock': 'Stock Allocated vs Free',
  'stone-block-availability': 'Stone Block Availability',
  'scrap-report': 'Scrap Report',
  'purchase-orders': 'Purchase Orders',
  'purchase-receipts': 'Purchase Receipts',
  'purchase-payments': 'Purchase Payments',
  'contractor-agreements': 'Contractor Agreements',
  'contractor-invoices-payments': 'Contractor Invoices & Payments',
  'sales-invoices': 'Sales Invoices',
  'advance-payments': 'Advance Payments',
  'audit-log': 'Audit Log',
};

const REPORT_COLUMN_ORDER = {
  'project-summary': ['project_name', 'project_code', 'status', 'total_value', 'completion_pct', 'positions_total', 'positions_completed', 'idols_total', 'idols_completed'],
  'project-costing': ['project_name', 'total_project_value', 'idol_invested_cost', 'structure_invested_cost', 'total_invested_cost', 'total_sales', 'profit_loss'],
  'project-profitability': ['name', 'estimated_cost', 'idol_invested_cost', 'structure_invested_cost', 'invested_cost', 'profit_amount', 'profit_pct'],
  'blueprint-position-progress': ['project_name', 'structure_name', 'layer_name', 'position_code', 'position_status', 'stage_total', 'stage_completed', 'stage_in_progress', 'stage_pending', 'current_stage_name', 'current_stage_status', 'total_cost', 'stone_serial_no'],
  'position-dependency-health': ['project_name', 'structure_name', 'layer_name', 'position_code', 'position_status', 'dependency_count', 'completed_dependencies', 'blocked_by', 'prerequisites_met'],
  'installation-report': ['project_name', 'structure_name', 'layer_name', 'position_code', 'stone_serial_no', 'installation_date', 'installation_status', 'verified_at', 'remarks'],
  'stock-balance': ['item_name', 'warehouse_name', 'balance_qty'],
  'stock-ledger-movement': ['created_at', 'item_name', 'warehouse_name', 'movement_type', 'qty_in', 'qty_out', 'balance_qty', 'rate', 'value', 'serial_no', 'batch_no', 'reference_type', 'reference_id', 'remarks', 'created_by'],
  'serialized-stock': ['item_name', 'serial_no', 'status', 'allocation_type', 'project_name', 'structure_name', 'layer_name', 'position_name', 'stage_name', 'stage_status', 'warehouse_name', 'allocated_qty', 'issued_qty'],
  'idol-manufacturing-summary': ['project_name', 'serial_no', 'idol_name', 'status', 'total_manufacturing_cost', 'sale_amount', 'profit_amount', 'created_at'],
  'idol-stage-progress': ['project_name', 'serial_no', 'idol_name', 'stage_order', 'stage_name', 'status', 'labor_hours', 'labor_rate', 'material_cost', 'stage_cost', 'started_at', 'completed_at'],
  'idol-material-consumption': ['project_name', 'serial_no', 'idol_name', 'item_name', 'stone_serial_no', 'qty'],
  'stone-block-availability': ['serial_no', 'item_name', 'warehouse_name', 'status', 'length', 'width', 'height', 'total_volume', 'available_volume'],
  'scrap-report': ['date', 'project_name', 'source', 'idol_name', 'position_name', 'stage_name', 'item_name', 'serial_no', 'qty', 'scrap_volume_cft', 'qty_unit', 'warehouse_name', 'reason', 'remarks'],
  'purchase-orders': ['po_number', 'po_date', 'expected_delivery', 'vendor_name', 'vendor_gstin', 'status', 'payment_status', 'total_amount', 'paid_amount', 'pending_amount', 'item_count', 'items_summary', 'remarks', 'created_at'],
  'purchase-receipts': ['receipt_date', 'po_number', 'vendor_name', 'warehouse_name', 'receipt_items', 'returns_summary', 'remarks', 'created_at'],
  'purchase-payments': ['payment_date', 'po_number', 'vendor_name', 'mode', 'reference_no', 'amount', 'remarks', 'created_at'],
  'sales-invoices': ['invoice_no', 'invoice_date', 'project_name', 'taxable_amount', 'total_tax', 'gross_amount', 'advance_adjustment', 'net_payable', 'payment_status', 'created_at'],
  'advance-payments': ['receipt_date', 'project_name', 'client_name', 'amount', 'adjusted_amount', 'balance', 'remarks', 'created_at'],
};

export default function ReportDetail() {
  const { slug } = useParams();
  const label = REPORT_LABELS[slug] || 'Report';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [serializedReport, setSerializedReport] = useState(null);
  const [profitIdols, setProfitIdols] = useState([]);
  const [profitStructures, setProfitStructures] = useState([]);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [itemMap, setItemMap] = useState({});
  const [warehouseMap, setWarehouseMap] = useState({});
  const [purchaseOrderMeta, setPurchaseOrderMeta] = useState({});
  const [projectId, setProjectId] = useState('');
  const [serialSearch, setSerialSearch] = useState('');
  const [serialStatus, setSerialStatus] = useState('all');
  const [serialAllocType, setSerialAllocType] = useState('all');
  const [stoneSearch, setStoneSearch] = useState('');
  const [stoneStatus, setStoneStatus] = useState('all');
  const [stoneProjectId, setStoneProjectId] = useState('all');
  const [profitTab, setProfitTab] = useState('summary');
  const [serialPage, setSerialPage] = useState(1);
  const [stonePage, setStonePage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(50);
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = projectId ? { project_id: Number(projectId) } : undefined;
        let res;
        if (slug === 'project-profitability') {
          const [profitRes, idolRes, structureRes] = await Promise.all([
            reportsAPI.projectProfitability(params),
            reportsAPI.projectProfitabilityIdols(params),
            reportsAPI.projectProfitabilityStructures(params),
          ]);
          res = profitRes;
          if (active) {
            setProfitIdols(idolRes.data || []);
            setProfitStructures(structureRes.data || []);
          }
        } else if (slug === 'project-summary') res = await reportsAPI.projectSummary(params);
        else if (slug === 'project-costing') res = await reportsAPI.projectCosting(params);
        else if (slug === 'blueprint-position-progress') res = await reportsAPI.blueprintPositionProgress(params);
        else if (slug === 'position-dependency-health') res = await reportsAPI.positionDependencyHealth(params);
        else if (slug === 'installation-report') res = await reportsAPI.installationReport(params);
        else if (slug === 'stock-balance') res = await reportsAPI.stockBalance();
        else if (slug === 'stock-ledger-movement') {
          const allRows = [];
          const limit = 500;
          let offset = 0;
          while (true) {
            const chunk = await reportsAPI.stockLedgerMovement({ limit, offset });
            const rows = chunk.data || [];
            allRows.push(...rows);
            if (rows.length < limit) break;
            offset += limit;
            if (offset > 100000) break;
          }
          res = { data: allRows };
        }
        else if (slug === 'serialized-stock') res = await reportsAPI.serializedStock();
        else if (slug === 'idol-manufacturing-summary') res = await reportsAPI.idolSummary(params);
        else if (slug === 'idol-stage-progress') res = await reportsAPI.idolStageProgress(params);
        else if (slug === 'idol-material-consumption') res = await reportsAPI.idolMaterialConsumption(params);
        else if (slug === 'stone-block-availability') res = await reportsAPI.stoneBlockAvailability(params);
        else if (slug === 'scrap-report') res = await reportsAPI.scrapReport();
        else if (slug === 'purchase-orders') {
          res = await reportsAPI.purchaseOrders();
          if (active) {
            const rows = res.data || [];
            setPurchaseOrderMeta(
              Object.fromEntries(
                rows.map((po) => [Number(po.id), { po_number: po.po_number, vendor_name: po.vendor_name }])
              )
            );
          }
        }
        else if (slug === 'purchase-receipts') {
          const [receiptRes, orderRes] = await Promise.all([
            reportsAPI.purchaseReceipts(),
            reportsAPI.purchaseOrders(),
          ]);
          res = receiptRes;
          if (active) {
            const orders = orderRes.data || [];
            setPurchaseOrderMeta(
              Object.fromEntries(
                orders.map((po) => [Number(po.id), { po_number: po.po_number, vendor_name: po.vendor_name }])
              )
            );
          }
        }
        else if (slug === 'purchase-payments') {
          const [paymentRes, orderRes] = await Promise.all([
            reportsAPI.purchasePayments(),
            reportsAPI.purchaseOrders(),
          ]);
          res = paymentRes;
          if (active) {
            const orders = orderRes.data || [];
            setPurchaseOrderMeta(
              Object.fromEntries(
                orders.map((po) => [Number(po.id), { po_number: po.po_number, vendor_name: po.vendor_name }])
              )
            );
          }
        }
        else if (slug === 'sales-invoices') res = await billingAPI.invoices(params);
        else if (slug === 'advance-payments') res = await billingAPI.advancePayments(params);
        else res = { data: [] };
        if (active) {
          if (slug === 'serialized-stock') {
            setSerializedReport(res.data || { summary: [], allocated: [], stone_summary: [], stone_allocated: [] });
            setData([]);
            setProfitIdols([]);
            setProfitStructures([]);
          } else {
            setSerializedReport(null);
            setData(res.data || []);
            if (slug !== 'project-profitability') {
              setProfitIdols([]);
              setProfitStructures([]);
            }
          }
        }
      } catch (e) {
        if (active) setError(e.response?.data?.detail || 'Failed to load report');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [slug, projectId]);

  useEffect(() => {
    let active = true;
    const loadMeta = async () => {
      try {
        const [projRes, itemsRes, whRes] = await Promise.all([
          projectsAPI.list(),
          inventoryAPI.items(),
          inventoryAPI.warehouses(),
        ]);
        if (!active) return;
        setProjects(projRes.data || []);
        const items = itemsRes.data || [];
        const whs = whRes.data || [];
        setItemMap(Object.fromEntries(items.map(i => [Number(i.id), i.name || `Item #${i.id}`])));
        setWarehouseMap(Object.fromEntries(whs.map(w => [Number(w.id), w.name || `Warehouse #${w.id}`])));
      } catch {
        if (!active) return;
        setProjects([]);
        setItemMap({});
        setWarehouseMap({});
      }
    };
    loadMeta();
    return () => { active = false; };
  }, []);

  const purchaseRows = slug === 'purchase-orders'
    ? (data || []).map((po) => {
      const itemsSummary = (po.items || [])
        .map((line) => {
          const itemName = itemMap[Number(line.item_id)] || 'Item';
          const qty = Number(line.qty || 0);
          const received = Number(line.received_qty || 0);
          return `${itemName}: ${qty} (received ${received})`;
        })
        .join(' | ');
      const totalAmount = Number(po.total_amount || 0);
      const paidAmount = Number(po.paid_amount || 0);
      return {
        po_number: po.po_number || '-',
        po_date: po.po_date || '-',
        expected_delivery: po.expected_delivery || '-',
        vendor_name: po.vendor_name || '-',
        vendor_gstin: po.vendor_gstin || '-',
        status: po.status || '-',
        payment_status: po.payment_status || '-',
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: Math.max(0, totalAmount - paidAmount),
        item_count: (po.items || []).length,
        items_summary: itemsSummary || '-',
        remarks: po.remarks || '-',
        created_at: po.created_at || '-',
      };
    })
    : [];
  const purchaseReceiptRows = slug === 'purchase-receipts'
    ? (data || []).map((r) => {
      const receiptItems = (r.items || [])
        .map((line) => {
          const itemName = itemMap[Number(line.item_id)] || 'Item';
          return `${itemName}: ${Number(line.received_qty || 0)}`;
        })
        .join(' | ');
      const returnsSummary = (r.returns || [])
        .flatMap((ret) => (ret.items || []).map((line) => {
          const itemName = itemMap[Number(line.item_id)] || 'Item';
          return `${itemName}: ${Number(line.qty || 0)} (${line.reason || '-'})`;
        }))
        .join(' | ');
      return {
        receipt_date: r.receipt_date || '-',
        po_number: r.purchase_order?.po_number || purchaseOrderMeta[Number(r.po_id)]?.po_number || '-',
        vendor_name: r.purchase_order?.vendor_name || purchaseOrderMeta[Number(r.po_id)]?.vendor_name || '-',
        warehouse_name: warehouseMap[Number(r.warehouse_id)] || '-',
        receipt_items: receiptItems || '-',
        returns_summary: returnsSummary || '-',
        remarks: r.remarks || '-',
        created_at: r.created_at || '-',
      };
    })
    : [];
  const purchasePaymentRows = slug === 'purchase-payments'
    ? (data || []).map((p) => ({
      payment_date: p.payment_date || '-',
      po_number: purchaseOrderMeta[Number(p.po_id)]?.po_number || '-',
      vendor_name: purchaseOrderMeta[Number(p.po_id)]?.vendor_name || '-',
      mode: p.mode || '-',
      reference_no: p.reference_no || '-',
      amount: Number(p.amount || 0),
      remarks: p.remarks || '-',
      created_at: p.created_at || '-',
    }))
    : [];
  const projectNameMap = Object.fromEntries((projects || []).map((p) => [Number(p.id), p.name || '-']));
  const salesInvoiceRows = slug === 'sales-invoices'
    ? (data || []).map((r) => ({
      invoice_no: r.invoice_no || '-',
      invoice_date: r.invoice_date || '-',
      project_name: projectNameMap[Number(r.project_id)] || '-',
      taxable_amount: Number(r.taxable_amount || 0),
      total_tax: Number(r.total_tax || 0),
      gross_amount: Number(r.gross_amount || 0),
      advance_adjustment: Number(r.advance_adjustment || 0),
      net_payable: Number(r.net_payable || 0),
      payment_status: r.payment_status || '-',
      created_at: r.created_at || '-',
    }))
    : [];
  const advancePaymentRows = slug === 'advance-payments'
    ? (data || []).map((r) => ({
      receipt_date: r.receipt_date || '-',
      project_name: projectNameMap[Number(r.project_id)] || '-',
      client_name: r.client_name || '-',
      amount: Number(r.amount || 0),
      adjusted_amount: Number(r.adjusted_amount || 0),
      balance: Number(r.balance || 0),
      remarks: r.remarks || '-',
      created_at: r.created_at || '-',
    }))
    : [];
  const scrapRows = (slug === 'scrap-report' ? (data || []).map((r) => ({
    date: r.created_at ? new Date(r.created_at).toLocaleString() : '',
    project_name: r.project_name || '-',
    source: r.source_type === 'manufacturing_stage' ? 'Idol Stage' : r.source_type === 'position_stage' ? 'Position Stage' : (r.source_type || '-'),
    idol_name: r.idol_name || '-',
    position_name: r.position_name || '-',
    stage_name: r.stage_name || '-',
    item_name: r.item_name || '-',
    serial_no: r.serial_no || r.stone_serial_no || '-',
    qty: r.stone_block_id ? '-' : Number(r.qty || 0),
    scrap_volume_cft: r.stone_block_id ? Number(r.scrap_volume_cft ?? r.qty ?? 0) : '-',
    qty_unit: r.qty_unit || '-',
    warehouse_name: r.warehouse_name || '-',
    reason: r.reason || '-',
    remarks: r.remarks || '-',
  })) : []);
  
  const renderTable = (rows, options = {}) => {
    const { hideColumns = [], columns = null } = options;
    const configuredCols = columns || REPORT_COLUMN_ORDER[slug] || [];
    let cols = configuredCols.filter(Boolean);
    if (rows.length > 0) {
      const rowKeys = new Set(Object.keys(rows[0]));
      cols = cols.filter((c) => rowKeys.has(c));
    }
    cols = cols.filter((c) => c !== 'id' && c !== 'serial_id' && c !== 'block_id' && !c.endsWith('_id'));
    if (hideColumns.length > 0) {
      cols = cols.filter((c) => !hideColumns.includes(c));
    }
    if (rows.length === 0) return <div className="empty-state">No data</div>;
    if (cols.length === 0) return <div className="empty-state">No columns configured for this report</div>;

    const sortedRows = [...rows].sort((a, b) => {
      if (!sortBy || !cols.includes(sortBy)) return 0;
      const av = a?.[sortBy];
      const bv = b?.[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return sortDir === 'asc' ? -1 : 1;
      if (bv == null) return sortDir === 'asc' ? 1 : -1;
      const an = Number(av);
      const bn = Number(bv);
      const bothNumeric = !Number.isNaN(an) && !Number.isNaN(bn);
      const result = bothNumeric
        ? (an - bn)
        : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? result : -result;
    });

    const formatCellValue = (col, value) => {
      if (value == null) return '';
      if (col.endsWith('_at')) {
        const dt = new Date(value);
        if (!Number.isNaN(dt.getTime())) {
          return dt.toLocaleString('en-IN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          });
        }
      }
      return String(value);
    };

    return (
      <div className="report-table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map(c => (
                <th
                  key={c}
                  onClick={() => {
                    if (sortBy === c) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortBy(c);
                      setSortDir('asc');
                    }
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort"
                >
                  {c.replace(/_/g, ' ').toUpperCase()} {sortBy === c ? (sortDir === 'asc' ? '^' : 'v') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr key={idx}>
                {cols.map(c => (
                  <td key={c}>{formatCellValue(c, row[c])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const allocatedSerials = serializedReport?.allocated || [];
  const stoneAllocated = serializedReport?.stone_allocated || [];
  const serialSummary = serializedReport?.summary || [];
  const stoneSummary = serializedReport?.stone_summary || [];

  const serialTotals = serialSummary.reduce((acc, r) => ({
    total: acc.total + Number(r.total_serials || 0),
    allocated: acc.allocated + Number(r.allocated_count || 0),
    free: acc.free + Number(r.free_count || 0),
    issued: acc.issued + Number(r.issued_count || 0),
    available: acc.available + Number(r.available_count || 0),
    returned: acc.returned + Number(r.returned_count || 0),
  }), { total: 0, allocated: 0, free: 0, issued: 0, available: 0, returned: 0 });

  const stoneTotals = stoneSummary.reduce((acc, r) => ({
    total: acc.total + Number(r.total_blocks || 0),
    allocated: acc.allocated + Number(r.allocated_count || 0),
    free: acc.free + Number(r.free_count || 0),
  }), { total: 0, allocated: 0, free: 0 });

  const unifiedStockRows = serializedReport?.allocated_items || [];

  const filteredSerials = allocatedSerials.filter((row) => {
    const statusMatch = serialStatus === 'all' ? true : row.status === serialStatus;
    const typeMatch = serialAllocType === 'all' ? true : row.allocation_type === serialAllocType;
    const text = `${row.serial_no || ''} ${row.item_name || ''} ${row.project_name || ''} ${row.idol_serial_no || ''} ${row.current_stage_name || ''}`.toLowerCase();
    const searchMatch = serialSearch.trim() === '' ? true : text.includes(serialSearch.trim().toLowerCase());
    return statusMatch && typeMatch && searchMatch;
  });

  const filteredStone = stoneAllocated.filter((row) => {
    const statusMatch = stoneStatus === 'all' ? true : row.status === stoneStatus;
    const projectMatch = stoneProjectId === 'all' ? true : String(row.project_id || '') === stoneProjectId;
    const text = `${row.serial_no || ''} ${row.item_name || ''} ${row.project_name || ''} ${row.position_name || ''} ${row.status || ''}`.toLowerCase();
    const searchMatch = stoneSearch.trim() === '' ? true : text.includes(stoneSearch.trim().toLowerCase());
    return statusMatch && projectMatch && searchMatch;
  });

  const stoneStatusOptions = Array.from(new Set(stoneAllocated.map((r) => r.status).filter(Boolean)));

  const ledgerRows = slug === 'stock-ledger-movement' ? (data || []) : [];
  const filteredLedger = ledgerRows.filter((row) => {
    const text = Object.values(row || {}).map((v) => String(v ?? '')).join(' ').toLowerCase();
    return ledgerSearch.trim() === '' ? true : text.includes(ledgerSearch.trim().toLowerCase());
  });
  const ledgerTotalPages = Math.max(1, Math.ceil(filteredLedger.length / ledgerPageSize));
  const ledgerStart = (ledgerPage - 1) * ledgerPageSize;
  const pagedLedger = filteredLedger.slice(ledgerStart, ledgerStart + ledgerPageSize);
  const ledgerDisplayRows = pagedLedger.map((r) => ({
    ...r,
    item_name: itemMap[Number(r.item_id)] || '',
    warehouse_name: warehouseMap[Number(r.warehouse_id)] || '',
  }));

  const serialTotalPages = Math.max(1, Math.ceil(filteredSerials.length / pageSize));
  const stoneTotalPages = Math.max(1, Math.ceil(filteredStone.length / pageSize));
  const serialStart = (serialPage - 1) * pageSize;
  const stoneStart = (stonePage - 1) * pageSize;
  const pagedSerials = filteredSerials.slice(serialStart, serialStart + pageSize);
  const pagedStone = filteredStone.slice(stoneStart, stoneStart + pageSize);

  useEffect(() => {
    setSerialPage(1);
  }, [serialSearch, serialStatus, serialAllocType, pageSize]);

  useEffect(() => {
    setStonePage(1);
  }, [stoneSearch, stoneStatus, stoneProjectId, pageSize]);

  useEffect(() => {
    setLedgerPage(1);
  }, [ledgerSearch, ledgerPageSize, slug]);

  useEffect(() => {
    setSortBy('');
    setSortDir('asc');
  }, [slug]);

  useEffect(() => {
    if (ledgerPage > ledgerTotalPages) setLedgerPage(ledgerTotalPages);
  }, [ledgerPage, ledgerTotalPages]);

  return (
    <div className="report-detail">
      <div className="page-header">
        <div>
          <div className="page-title">{label}</div>
          <div className="page-subtitle">
            {slug === 'blueprint-position-progress' && 'Position-wise stage progress, current stage, and total stage cost'}
            {slug === 'position-dependency-health' && 'Dependency readiness and blocked-by analysis for blueprint positions'}
            {slug === 'installation-report' && 'Installed blocks against blueprint positions with verification status'}
            {!['blueprint-position-progress', 'position-dependency-health', 'installation-report'].includes(slug) && 'Report details'}
          </div>
        </div>
        <Link to="/reports" className="btn btn-ghost">Back to Reports</Link>
      </div>

      <div className="card report-page-card">
        {!['serialized-stock', 'stock-ledger-movement', 'purchase-orders', 'purchase-receipts', 'purchase-payments'].includes(slug) && (
          <div className="report-filters">
            <div className="filter-group">
              <label className="form-label">Project</label>
              <select
                className="form-select"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name || `Project #${p.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : slug === 'serialized-stock' ? (
          <div className="report-stack">
            <div className="report-tab-panel">
              <div className="report-title">Stock Allocated vs Free (Single Table)</div>
              {renderTable(unifiedStockRows)}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>No data available</p>
          </div>
        ) : (
          <div className="report-stack">
            {slug === 'project-profitability' ? (
              <div className="report-stack">
                <div className="report-tabs">
                  <button
                    className={`report-tab ${profitTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setProfitTab('summary')}
                  >
                    Summary
                  </button>
                  <button
                    className={`report-tab ${profitTab === 'idols' ? 'active' : ''}`}
                    onClick={() => setProfitTab('idols')}
                  >
                    Idols
                  </button>
                  <button
                    className={`report-tab ${profitTab === 'structures' ? 'active' : ''}`}
                    onClick={() => setProfitTab('structures')}
                  >
                    Structures
                  </button>
                </div>
                {profitTab === 'summary' && (
                  <div className="report-tab-panel">
                    {renderTable(data)}
                  </div>
                )}
                {profitTab === 'idols' && (
                  <div className="report-tab-panel">
                    <div className="report-title">Idol Cost Breakdown</div>
                    {renderTable(profitIdols, {
                      columns: ['project_name', 'idol_name', 'serial_no', 'status', 'cost', 'sale_amount', 'profit_amount'],
                    })}
                  </div>
                )}
                {profitTab === 'structures' && (
                  <div className="report-tab-panel">
                    <div className="report-title">Structure Cost Breakdown</div>
                    {renderTable(profitStructures, {
                      columns: ['project_name', 'position_name', 'stone_serial_no', 'status', 'cost'],
                    })}
                  </div>
                )}
              </div>
            ) : slug === 'scrap-report' ? (
              <div className="report-tab-panel">
                <div className="report-title">Scrap Entries</div>
                {renderTable(scrapRows)}
              </div>
            ) : slug === 'stock-ledger-movement' ? (
              <div className="report-tab-panel">
                <div className="report-title">Stock Ledger Entries</div>
                <div className="report-filters" style={{ marginBottom: '12px' }}>
                  <div className="filter-group">
                    <label className="form-label">Search</label>
                    <input
                      className="form-input"
                      placeholder="Item, serial, warehouse, reference..."
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                    />
                  </div>
                  <div className="filter-group" style={{ minWidth: '140px' }}>
                    <label className="form-label">Page Size</label>
                    <select className="form-select" value={ledgerPageSize} onChange={(e) => setLedgerPageSize(Number(e.target.value))}>
                      {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                {renderTable(ledgerDisplayRows)}
                {filteredLedger.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Showing {ledgerStart + 1}-{Math.min(ledgerStart + ledgerPageSize, filteredLedger.length)} of {filteredLedger.length}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="btn btn-ghost btn-sm" disabled={ledgerPage <= 1} onClick={() => setLedgerPage(p => Math.max(1, p - 1))}>Prev</button>
                      <span style={{ fontSize: '12px', color: '#334155' }}>Page {ledgerPage} / {ledgerTotalPages}</span>
                      <button className="btn btn-ghost btn-sm" disabled={ledgerPage >= ledgerTotalPages} onClick={() => setLedgerPage(p => Math.min(ledgerTotalPages, p + 1))}>Next</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="report-tab-panel">
                {renderTable(
                  slug === 'purchase-orders'
                    ? purchaseRows
                    : slug === 'purchase-receipts'
                      ? purchaseReceiptRows
                      : slug === 'purchase-payments'
                        ? purchasePaymentRows
                        : slug === 'sales-invoices'
                          ? salesInvoiceRows
                          : slug === 'advance-payments'
                            ? advancePaymentRows
                        : data
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

