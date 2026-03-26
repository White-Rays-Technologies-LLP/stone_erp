import { useState, useEffect } from 'react';
import { manufacturingAPI, stonesAPI, projectsAPI, inventoryAPI, blueprintsAPI, reportsAPI } from '../services/api';

export default function Manufacturing() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [idols, setIdols] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [allBlocks, setAllBlocks] = useState([]);
  const [projectMaterials, setProjectMaterials] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableSerials, setAvailableSerials] = useState([]);
  const [availableQtyByItem, setAvailableQtyByItem] = useState({});
  const [stockBalances, setStockBalances] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [reserveStatus, setReserveStatus] = useState({ reservations: [], allocations: [] });
  const [blueprintStructures, setBlueprintStructures] = useState([]);
  const [blueprintSummary, setBlueprintSummary] = useState({});
  const [blueprintsLoading, setBlueprintsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [idolMaterials, setIdolMaterials] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [stageModalId, setStageModalId] = useState(null);
  const [stages, setStages] = useState([]);
  const [stageUpdatingId, setStageUpdatingId] = useState(null);
  const [stageEdits, setStageEdits] = useState({});
  const [stageIdolMaterials, setStageIdolMaterials] = useState([]);
  const [viewModalId, setViewModalId] = useState(null);
  const [viewIdol, setViewIdol] = useState(null);
  const [viewStages, setViewStages] = useState([]);
  const [viewStockMovements, setViewStockMovements] = useState([]);
  const [stockActionLoading, setStockActionLoading] = useState(false);
  const [placeForm, setPlaceForm] = useState({ warehouse_id: '', remarks: '' });
  const [transferForm, setTransferForm] = useState({ to_warehouse_id: '', remarks: '' });
  const [sellForm, setSellForm] = useState({ customer_name: '', customer_gstin: '', sale_date: new Date().toISOString().slice(0, 10), sale_amount: '', remarks: '' });
  const [stageForm, setStageForm] = useState({ stage_master_id: '', stage_name: '', stage_order: 1, labor_hours: 0, labor_rate: 0, material_cost: 0, remarks: '' });
  const [stageMaster, setStageMaster] = useState([]);
  const [stageMasterLoading, setStageMasterLoading] = useState(false);
  const [stageScrapRows, setStageScrapRows] = useState([]);
  const [addStageModal, setAddStageModal] = useState(false);
  const [createStageModal, setCreateStageModal] = useState(false);
  const [newMaster, setNewMaster] = useState({ name: '', description: '' });
  const [scrapModal, setScrapModal] = useState(false);
  const [scrapSaving, setScrapSaving] = useState(false);
  const [scrapForm, setScrapForm] = useState({ item_id: '', stone_block_id: '', serial_id: '', warehouse_id: '', qty: '', reason: 'incorrect', stage_id: '', remarks: '' });
  // component UI removed; blueprints shown instead

  const groupProjectMaterialsForDisplay = (materials) => {
    const rows = [];
    const stoneGroups = new Map();
    (materials || []).forEach((m) => {
      const item = items.find(i => i.id === m.item_id);
      const category = categories.find(c => c.id === item?.category_id);
      const categoryName = (category?.name || '').toLowerCase();
      const isStone = categoryName.includes('stone');

      if (isStone && m.stone_block_id) {
        const key = `${category?.id || 'stone'}|${item?.id || m.item_id || ''}`;
        if (!stoneGroups.has(key)) {
          stoneGroups.set(key, { category, item, serials: [] });
        }
        const block = allBlocks.find(b => b.id === m.stone_block_id);
        const dims = block && [block.length, block.width, block.height].every(v => v !== undefined && v !== null)
          ? `L:${block.length} W:${block.width} H:${block.height}`
          : '';
        const label = block?.serial_no || `#${m.stone_block_id}`;
        stoneGroups.get(key).serials.push(dims ? `${label} • ${dims}` : label);
        return;
      }

      const serials = (m.serials || []).map(s => s.item_serial_id);
      const serialLabels = serials.length
        ? serials.map(sid => availableSerials.find(a => a.id === sid)?.serial_no || String(sid))
        : [];
      rows.push({
        key: m.id || `${m.item_id}-${m.stone_block_id}-${rows.length}`,
        categoryName: category?.name || (item ? '—' : ''),
        itemName: item?.name || (m.item_id ? m.item_id : ''),
        uom: item?.uom || '',
        serials: serialLabels.length ? serialLabels : [m.stone_block_id ? String(m.stone_block_id) : '—'],
        qty: m.required_qty,
      });
    });

    stoneGroups.forEach((g, key) => {
      rows.push({
        key: `stone-${key}`,
        categoryName: g.category?.name || 'Stone',
        itemName: g.item?.name || 'Stone Block',
        uom: g.item?.uom || '',
        serials: g.serials,
        qty: g.serials.length,
      });
    });

    return rows;
  };

  const load = (pid) => {
    setLoading(true);
    if (!pid) {
      setIdols([]); setBlocks([]); setLoading(false);
      return;
    }
    Promise.allSettled([
      manufacturingAPI.idols({ project_id: pid }),
      stonesAPI.list({ project_id: pid }),
    ]).then(([i, b]) => {
      setIdols(i.value?.data || []);
      setBlocks(b.value?.data || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    projectsAPI.list().then(r => setProjects(r.data || []));
    stonesAPI.list().then(r => setAllBlocks(r.data || []));
    inventoryAPI.items().then(r => setItems(r.data || []));
    inventoryAPI.categories().then(r => setCategories(r.data || []));
    inventoryAPI.serials().then(r => setAvailableSerials(r.data || []));
    inventoryAPI.stockBalance()
      .then(r => {
        const rows = r.data || [];
        setStockBalances(rows);
        const qtyMap = {};
        rows.forEach(row => {
          const itemId = Number(row.item_id);
          qtyMap[itemId] = (qtyMap[itemId] || 0) + Number(row.balance_qty || 0);
        });
        setAvailableQtyByItem(qtyMap);
      })
      .catch(() => { setAvailableQtyByItem({}); setStockBalances([]); });
    inventoryAPI.warehouses().then(r => setWarehouses(r.data || []));
  }, []);

  useEffect(() => {
    if (!projectId) { setProjectMaterials([]); return; }
    projectsAPI.get(projectId).then(r => setProjectMaterials(r.data?.materials || [])).catch(() => setProjectMaterials([]));
  }, [projectId]);
  useEffect(() => {
    if (!projectId) { setReserveStatus({ reservations: [], allocations: [] }); return; }
    projectsAPI.reserveStatus(projectId)
      .then(r => setReserveStatus(r.data || { reservations: [], allocations: [] }))
      .catch(() => setReserveStatus({ reservations: [], allocations: [] }));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setBlueprintStructures([]); setBlueprintSummary({}); return; }
    setBlueprintsLoading(true);
    blueprintsAPI.structures({ project_id: Number(projectId) })
      .then(async (res) => {
        const structures = res.data || [];
        setBlueprintStructures(structures);
        const summary = {};
        await Promise.all(structures.map(async (s) => {
          try {
            const layersRes = await blueprintsAPI.layers(s.id);
            const layers = layersRes.data || [];
            let positionsCount = 0;
            await Promise.all(layers.map(async (l) => {
              try {
                const posRes = await blueprintsAPI.positions(l.id);
                positionsCount += (posRes.data || []).length;
              } catch {
                // ignore per-layer failures
              }
            }));
            summary[s.id] = { layers: layers.length, positions: positionsCount };
          } catch {
            summary[s.id] = { layers: 0, positions: 0 };
          }
        }));
        setBlueprintSummary(summary);
      })
      .catch(() => {
        setBlueprintStructures([]);
        setBlueprintSummary({});
      })
      .finally(() => setBlueprintsLoading(false));
  }, [projectId]);

  const allowedItemIds = new Set((stageIdolMaterials || []).map(m => m.item_id).filter(Boolean));
  const allowedItems = items.filter(i => allowedItemIds.has(i.id));
  const allowedBlockIds = new Set((stageIdolMaterials || []).map(m => m.stone_block_id).filter(Boolean));
  const allocatedBlockIds = new Set(
    (reserveStatus.allocations || [])
      .filter(a => a && a.stone_block_id && a.is_released === false)
      .map(a => a.stone_block_id),
  );
  const allowedBlocks = allBlocks.filter(b =>
    allowedBlockIds.has(b.id) && (allocatedBlockIds.size === 0 || allocatedBlockIds.has(b.id)),
  );
  const isStoneItem = (item) => {
    const category = categories.find(c => c.id === item?.category_id);
    return (category?.name || '').toLowerCase().includes('stone');
  };
  const selectedScrapItemId = scrapForm.item_id ? Number(scrapForm.item_id) : null;
  const selectedScrapItem = selectedScrapItemId ? items.find(i => i.id === selectedScrapItemId) : null;
  const selectedScrapItemHasSerial = !!selectedScrapItem?.has_serial_no;
  const selectedScrapItemIsStone = selectedScrapItem ? isStoneItem(selectedScrapItem) : false;
  const selectedScrapBlock = scrapForm.stone_block_id
    ? allBlocks.find(b => b.id === Number(scrapForm.stone_block_id))
    : null;
  const idolAllocatedQtyByItem = (stageIdolMaterials || []).reduce((acc, m) => {
    if (!m?.item_id || m.stone_block_id) return acc;
    acc[m.item_id] = (acc[m.item_id] || 0) + Number(m.qty || 0);
    return acc;
  }, {});
  const selectedIdolAllocatedQty = selectedScrapItemId ? Number(idolAllocatedQtyByItem[selectedScrapItemId] || 0) : 0;
  const scrapQtyLimit = scrapForm.stone_block_id
    ? Number(selectedScrapBlock?.available_volume || 0)
    : (scrapForm.item_id && selectedScrapItemHasSerial)
      ? 1
      : selectedIdolAllocatedQty;
  const scrapSerialIds = new Set(
    (stageIdolMaterials || [])
      .filter(m => selectedScrapItemId && m.item_id === selectedScrapItemId)
      .flatMap(m => (m.serials || []).map(s => s.item_serial_id ?? s.id ?? s))
      .filter(Boolean),
  );
  const reservedQtyMap = new Map();
  (reserveStatus.reservations || [])
    .filter(r => r && r.is_released === false)
    .forEach(r => {
      const key = `${r.item_id}-${r.warehouse_id}`;
      reservedQtyMap.set(key, (reservedQtyMap.get(key) || 0) + Number(r.qty || 0));
    });
  const reservedQty = selectedScrapItemId && scrapForm.warehouse_id
    ? (reservedQtyMap.get(`${selectedScrapItemId}-${Number(scrapForm.warehouse_id)}`) || 0)
    : 0;
  const scrapItemSerials = selectedScrapItemId && !selectedScrapItemIsStone
    ? availableSerials.filter(s => s.item_id === selectedScrapItemId)
      .filter(s => !scrapForm.warehouse_id || s.warehouse_id === Number(scrapForm.warehouse_id))
      .filter(s => scrapSerialIds.size === 0 || scrapSerialIds.has(s.id))
    : [];
  const selectedScrapSerial = scrapForm.serial_id
    ? availableSerials.find(s => s.id === Number(scrapForm.serial_id))
    : null;
  const serialWarehouseCandidates = selectedScrapItemId && selectedScrapItemHasSerial
    ? Array.from(new Set(
      availableSerials
        .filter(s => s.item_id === selectedScrapItemId)
        .filter(s => !s.status || s.status === 'available')
        .filter(s => scrapSerialIds.size === 0 || scrapSerialIds.has(s.id))
        .map(s => Number(s.warehouse_id))
        .filter(Boolean),
    ))
    : [];
  const nonSerialWarehouseCandidates = selectedScrapItemId && !selectedScrapItemHasSerial
    ? Array.from(new Set(
      stockBalances
        .filter(r => Number(r.item_id) === selectedScrapItemId && Number(r.balance_qty || 0) > 0)
        .map(r => Number(r.warehouse_id))
        .filter(Boolean),
    ))
    : [];
  const scrapItemSerialLabels = scrapItemSerials.map(s => s.serial_no || `#${s.id}`);
  const scrapItemSerialDisplay = !scrapForm.warehouse_id
    ? 'Select warehouse to see serials'
    : (scrapItemSerialLabels.length > 8
      ? `${scrapItemSerialLabels.slice(0, 8).join(', ')} +${scrapItemSerialLabels.length - 8} more`
      : (scrapItemSerialLabels.join(', ') || '—'));

  useEffect(() => {
    if (!selectedScrapBlock) return;
    const whId = selectedScrapBlock.warehouse_id;
    if (!whId) return;
    setScrapForm(prev => (String(prev.warehouse_id || '') === String(whId) ? prev : { ...prev, warehouse_id: String(whId) }));
  }, [selectedScrapBlock?.id, selectedScrapBlock?.warehouse_id]);
  useEffect(() => {
    if (!selectedScrapSerial?.warehouse_id) return;
    const whId = selectedScrapSerial.warehouse_id;
    setScrapForm(prev => (String(prev.warehouse_id || '') === String(whId) ? prev : { ...prev, warehouse_id: String(whId) }));
  }, [selectedScrapSerial?.id, selectedScrapSerial?.warehouse_id]);
  useEffect(() => {
    if (scrapForm.stone_block_id || !scrapForm.item_id) return;
    if (selectedScrapItemHasSerial && !scrapForm.serial_id && serialWarehouseCandidates.length === 1) {
      const whId = serialWarehouseCandidates[0];
      setScrapForm(prev => (String(prev.warehouse_id || '') === String(whId) ? prev : { ...prev, warehouse_id: String(whId) }));
      return;
    }
    if (!selectedScrapItemHasSerial && nonSerialWarehouseCandidates.length === 1) {
      const whId = nonSerialWarehouseCandidates[0];
      setScrapForm(prev => (String(prev.warehouse_id || '') === String(whId) ? prev : { ...prev, warehouse_id: String(whId) }));
    }
  }, [
    scrapForm.stone_block_id,
    scrapForm.item_id,
    scrapForm.serial_id,
    selectedScrapItemHasSerial,
    serialWarehouseCandidates.join(','),
    nonSerialWarehouseCandidates.join(','),
  ]);

  useEffect(() => { load(projectId ? Number(projectId) : null); }, [projectId]);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const selectedMaterials = [];
      let serialError = null;
      (idolMaterials || []).forEach(m => {
        if (!m.selected) return;
        const item = items.find(i => i.id === m.item_id);
        if (!item && m.item_id) {
          serialError = `Item data not loaded for item ${m.item_id}. Please refresh.`;
          return;
        }
        const isStone = categories.find(c => c.id === item?.category_id)?.name?.toLowerCase().includes('stone');
        if (isStone) {
          const blockIds = (m.serial_ids || []).map(Number);
          if (blockIds.length === 0) {
            serialError = `Select stone blocks for item ${item?.name || m.item_id}`;
            return;
          }
          selectedMaterials.push({
            item_id: m.item_id,
            stone_block_id: null,
            qty: blockIds.length,
            serial_ids: blockIds,
          });
        } else if (item?.has_serial_no) {
          const serialIds = m.serial_ids || [];
          if (serialIds.length === 0) {
            serialError = `Select serials for item ${item?.name || m.item_id}`;
            return;
          }
          selectedMaterials.push({
            item_id: m.item_id,
            stone_block_id: m.stone_block_id,
            qty: serialIds.length,
            serial_ids: serialIds,
          });
        } else if (Number(m.qty) > 0) {
          selectedMaterials.push({
            item_id: m.item_id,
            stone_block_id: m.stone_block_id,
            qty: Number(m.qty),
            serial_ids: m.serial_ids || [],
          });
        }
      });
      if (serialError) {
        setError(serialError);
        setSaving(false);
        return;
      }
      if (!selectedMaterials.length) {
        setError('Select at least one material');
        setSaving(false);
        return;
      }
      const payload = { ...form, project_id: Number(projectId), materials: selectedMaterials };
      if (editMode) await manufacturingAPI.updateIdol(editId, payload);
      else await manufacturingAPI.createIdol(payload);
      setShowModal(false); setEditMode(false); setEditId(null); setForm({}); load(Number(projectId));
    } catch (e) { setError(e.response?.data?.detail || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this idol?')) return;
    try { await manufacturingAPI.deleteIdol(id); load(Number(projectId)); } catch (e) { alert('Delete failed: ' + (e.response?.data?.detail || 'Error')); }
  };

  const openEdit = async (idol) => {
    setForm(idol);
    setEditMode(true);
    setEditId(idol.id);
    setError(null);
    try {
      const res = await manufacturingAPI.getIdol(idol.id);
      const mats = res.data?.materials || [];
      if (mats.length) {
        setIdolMaterials(mats.map(m => {
          const match = (projectMaterials || []).find(pm =>
            (pm.item_id && pm.item_id === m.item_id) ||
            (pm.stone_block_id && pm.stone_block_id === m.stone_block_id)
          );
          const item = items.find(i => i.id === m.item_id);
          const isSerialized = item?.has_serial_no;
          return ({
            item_id: m.item_id || null,
            stone_block_id: m.stone_block_id || null,
            qty: isSerialized ? (match?.serials?.length || 0) : (m.qty || 0),
            selected: true,
            serials: match?.serials || [],
            serial_ids: match?.serials?.map(s => s.item_serial_id) || [],
            filter_length: '',
            filter_width: '',
            filter_height: '',
          });
        }));
      } else {
      const mapped = (projectMaterials || []).map(m => {
        const item = items.find(i => i.id === m.item_id);
        const isSerialized = item?.has_serial_no;
        return ({
          item_id: m.item_id || null,
          stone_block_id: m.stone_block_id || null,
          qty: isSerialized ? 0 : (m.required_qty || 0),
          selected: false,
          serials: m.serials || [],
          serial_ids: [],
          filter_length: '',
          filter_width: '',
          filter_height: '',
        });
      });
        setIdolMaterials(mapped);
      }
    } catch {
      const mapped = (projectMaterials || []).map(m => ({
        item_id: m.item_id || null,
        stone_block_id: m.stone_block_id || null,
        qty: m.required_qty || 0,
        selected: false,
      }));
      setIdolMaterials(mapped);
    }
    setShowModal(true);
  };
  const openCreate = () => {
    const mapped = (projectMaterials || []).map(m => {
      const item = items.find(i => i.id === m.item_id);
      const isSerialized = item?.has_serial_no;
      return ({
        item_id: m.item_id || null,
        stone_block_id: m.stone_block_id || null,
        qty: isSerialized ? 0 : (m.required_qty || 0),
        selected: false,
        serials: m.serials || [],
        serial_ids: [],
        filter_length: '',
        filter_width: '',
        filter_height: '',
      });
    });
    setIdolMaterials(mapped);
    setForm({});
    setEditMode(false);
    setEditId(null);
    setError(null);
    setShowModal(true);
  };

  const openStages = async (idolId) => {
    setStageModalId(idolId);
    setAddStageModal(false);
    setStages([]);
    setStageEdits({});
    setStageMaster([]);
    setStageIdolMaterials([]);
    setStageScrapRows([]);
    try {
      setStageMasterLoading(true);
      const [res, masterRes, idolRes, scrapRes] = await Promise.all([
        manufacturingAPI.stages(idolId),
        blueprintsAPI.stages(),
        manufacturingAPI.getIdol(idolId),
        reportsAPI.scrapReport(),
      ]);
      const data = res.data || [];
      setStages(data);
      setStageMaster(masterRes.data || []);
      setStageIdolMaterials(idolRes.data?.materials || []);
      const scrapRows = (scrapRes.data || []).filter(r => r.source_type === 'manufacturing_stage' && Number(r.source_id) === Number(idolId));
      setStageScrapRows(scrapRows);
      const edits = {};
      data.forEach(s => {
        edits[s.id] = {
          status: s.status || 'pending',
          labor_hours: s.labor_hours ?? 0,
          labor_rate: s.labor_rate ?? 0,
          material_cost: s.material_cost ?? 0,
          remarks: s.remarks || '',
        };
      });
      setStageEdits(edits);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to load stages');
    } finally {
      setStageMasterLoading(false);
    }
  };

  const openView = async (idolId) => {
    setViewModalId(idolId);
    setViewIdol(null);
    setViewStages([]);
    setViewStockMovements([]);
    try {
      const [idolRes, stagesRes, stockRes] = await Promise.all([
        manufacturingAPI.getIdol(idolId),
        manufacturingAPI.stages(idolId),
        manufacturingAPI.idolStockMovements(idolId),
      ]);
      setViewIdol(idolRes.data || null);
      setViewStages(stagesRes.data || []);
      setViewStockMovements(stockRes.data || []);
      const idolData = idolRes.data || {};
      setPlaceForm({ warehouse_id: idolData.stock_warehouse_id ? String(idolData.stock_warehouse_id) : '', remarks: '' });
      setTransferForm({ to_warehouse_id: '', remarks: '' });
      setSellForm(prev => ({ ...prev, customer_name: '', customer_gstin: '', sale_amount: '', remarks: '' }));
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to load idol');
    }
  };

  const refreshView = async (idolId) => {
    if (!idolId) return;
    try {
      const [idolRes, stagesRes, stockRes] = await Promise.all([
        manufacturingAPI.getIdol(idolId),
        manufacturingAPI.stages(idolId),
        manufacturingAPI.idolStockMovements(idolId),
      ]);
      setViewIdol(idolRes.data || null);
      setViewStages(stagesRes.data || []);
      setViewStockMovements(stockRes.data || []);
    } catch {
      // ignore
    }
  };

  const placeIdolInStock = async (e) => {
    e.preventDefault();
    if (!viewIdol?.id || !placeForm.warehouse_id) {
      alert('Select warehouse');
      return;
    }
    try {
      setStockActionLoading(true);
      await manufacturingAPI.placeStock(viewIdol.id, {
        warehouse_id: Number(placeForm.warehouse_id),
        remarks: placeForm.remarks || null,
      });
      await refreshView(viewIdol.id);
      if (projectId) load(Number(projectId));
      alert('Idol placed in warehouse stock');
    } catch (e2) {
      alert(e2.response?.data?.detail || 'Failed to place idol in stock');
    } finally {
      setStockActionLoading(false);
    }
  };

  const transferIdolStock = async (e) => {
    e.preventDefault();
    if (!viewIdol?.id || !transferForm.to_warehouse_id) {
      alert('Select destination warehouse');
      return;
    }
    try {
      setStockActionLoading(true);
      await manufacturingAPI.transferStock(viewIdol.id, {
        to_warehouse_id: Number(transferForm.to_warehouse_id),
        remarks: transferForm.remarks || null,
      });
      await refreshView(viewIdol.id);
      if (projectId) load(Number(projectId));
      setTransferForm({ to_warehouse_id: '', remarks: '' });
      alert('Idol stock transferred');
    } catch (e2) {
      alert(e2.response?.data?.detail || 'Failed to transfer idol stock');
    } finally {
      setStockActionLoading(false);
    }
  };

  const sellIdolFromStock = async (e) => {
    e.preventDefault();
    if (!viewIdol?.id || !sellForm.customer_name || !sellForm.sale_date) {
      alert('Customer name and sale date are required');
      return;
    }
    try {
      setStockActionLoading(true);
      await manufacturingAPI.sellStock(viewIdol.id, {
        customer_name: sellForm.customer_name,
        customer_gstin: sellForm.customer_gstin || null,
        sale_date: sellForm.sale_date,
        sale_amount: Number(sellForm.sale_amount || 0),
        remarks: sellForm.remarks || null,
      });
      await refreshView(viewIdol.id);
      if (projectId) load(Number(projectId));
      alert('Idol sold successfully');
    } catch (e2) {
      alert(e2.response?.data?.detail || 'Failed to sell idol');
    } finally {
      setStockActionLoading(false);
    }
  };

  const addStage = async (e) => {
    e.preventDefault();
    try {
      if (!stageForm.stage_master_id) {
        alert('Select a stage');
        return;
      }
      setStageUpdatingId('new');
      const master = stageMaster.find(s => s.id === Number(stageForm.stage_master_id));
      const stageName = master ? master.name : stageForm.stage_name;
      await manufacturingAPI.addStage({
        idol_id: stageModalId,
        stage_master_id: Number(stageForm.stage_master_id),
        stage_name: stageName,
        stage_order: Number(stageForm.stage_order),
        labor_hours: Number(stageForm.labor_hours || 0),
        labor_rate: Number(stageForm.labor_rate || 0),
        material_cost: Number(stageForm.material_cost || 0),
        remarks: stageForm.remarks || null,
      });
      setStageForm({ stage_master_id: '', stage_name: '', stage_order: Number(stageForm.stage_order) + 1, labor_hours: 0, labor_rate: 0, material_cost: 0, remarks: '' });
      const res = await manufacturingAPI.stages(stageModalId);
      const data = res.data || [];
      setStages(data);
      const edits = {};
      data.forEach(s => {
        edits[s.id] = {
          status: s.status || 'pending',
          labor_hours: s.labor_hours ?? 0,
          labor_rate: s.labor_rate ?? 0,
          material_cost: s.material_cost ?? 0,
          remarks: s.remarks || '',
        };
      });
      setStageEdits(edits);
      setAddStageModal(false);
      load(Number(projectId));
      if (viewModalId === stageModalId) refreshView(stageModalId);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to add stage');
    } finally {
      setStageUpdatingId(null);
    }
  };

  const createStageMaster = async () => {
    if (!newMaster.name.trim()) {
      alert('Stage name is required');
      return;
    }
    try {
      setStageUpdatingId('create-master');
      const r = await blueprintsAPI.createStage({
        name: newMaster.name.trim(),
        description: newMaster.description || null,
      });
      const created = r.data;
      setStageMaster(prev => [...prev, created]);
      setStageForm(p => ({ ...p, stage_master_id: String(created.id), stage_name: created.name }));
      setNewMaster({ name: '', description: '' });
      setCreateStageModal(false);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to create stage');
    } finally {
      setStageUpdatingId(null);
    }
  };

  const updateStage = async (stageId) => {
    try {
      setStageUpdatingId(stageId);
      const payload = stageEdits[stageId] || {};
      await manufacturingAPI.updateStage(stageId, {
        status: payload.status,
        labor_hours: Number(payload.labor_hours || 0),
        labor_rate: Number(payload.labor_rate || 0),
        material_cost: Number(payload.material_cost || 0),
        remarks: payload.remarks || null,
      });
      const res = await manufacturingAPI.stages(stageModalId);
      const data = res.data || [];
      setStages(data);
      const edits = {};
      data.forEach(s => {
        edits[s.id] = {
          status: s.status || 'pending',
          labor_hours: s.labor_hours ?? 0,
          labor_rate: s.labor_rate ?? 0,
          material_cost: s.material_cost ?? 0,
          remarks: s.remarks || '',
        };
      });
      setStageEdits(edits);
      if (projectId) load(Number(projectId));
      if (viewModalId === stageModalId) refreshView(stageModalId);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to update stage');
    } finally {
      setStageUpdatingId(null);
    }
  };

  const deleteStage = async (stageId) => {
    if (!window.confirm('Delete this stage?')) return;
    try {
      await manufacturingAPI.deleteStage(stageId);
      const res = await manufacturingAPI.stages(stageModalId);
      setStages(res.data || []);
      if (viewModalId === stageModalId) refreshView(stageModalId);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to delete stage');
    }
  };

  const submitScrap = async (e) => {
    e.preventDefault();
    if ((!scrapForm.item_id && !scrapForm.stone_block_id) || !scrapForm.warehouse_id || !scrapForm.qty) {
      alert('Select item or stone block, warehouse, and qty');
      return;
    }
    if (scrapForm.item_id && selectedScrapItemHasSerial && !scrapForm.stone_block_id && !scrapForm.serial_id) {
      alert('Select a serial number for this item');
      return;
    }
    const qtyNum = Number(scrapForm.qty || 0);
    if (qtyNum <= 0) {
      alert('Qty must be greater than 0');
      return;
    }
    if (scrapQtyLimit > 0 && qtyNum > scrapQtyLimit) {
      alert(`You can scrap only allocated qty for this idol. Max allowed: ${scrapQtyLimit}`);
      return;
    }
    setScrapSaving(true);
    try {
      await inventoryAPI.createScrap({
        item_id: scrapForm.item_id ? Number(scrapForm.item_id) : null,
        stone_block_id: scrapForm.stone_block_id ? Number(scrapForm.stone_block_id) : null,
        serial_ids: scrapForm.serial_id ? [Number(scrapForm.serial_id)] : null,
        warehouse_id: Number(scrapForm.warehouse_id),
        qty: Number(scrapForm.qty),
        reason: scrapForm.reason,
        source_type: 'manufacturing_stage',
        source_id: stageModalId || null,
        stage_id: scrapForm.stage_id ? Number(scrapForm.stage_id) : null,
        remarks: scrapForm.remarks || null,
      });
      try {
        const scrapRes = await reportsAPI.scrapReport();
        const scrapRows = (scrapRes.data || []).filter(r => r.source_type === 'manufacturing_stage' && Number(r.source_id) === Number(stageModalId));
        setStageScrapRows(scrapRows);
      } catch {
        // ignore refresh errors
      }
      setScrapModal(false);
      setScrapForm({ item_id: '', stone_block_id: '', serial_id: '', warehouse_id: '', qty: '', reason: 'incorrect', stage_id: '', remarks: '' });
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to record scrap');
    } finally {
      setScrapSaving(false);
    }
  };

  // component modal removed

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🔨 Manufacturing</div>
          <div className="page-subtitle">Pick a project, then create idols, stages, and components</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px' }}>
            
            <select className="form-input" value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={openCreate} disabled={!projectId}>+ New Idol</button>
          </div>
        </div>
      </div>
      <div className="card">
        {!projectId ? (
          <div className="empty-state"><div className="empty-icon">🔨</div><p>Select a project to manage manufacturing</p></div>
        ) : loading ? <div className="loading">Loading...</div> : idols.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔨</div><p>No idols in manufacturing for this project</p></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Serial No</th><th>Name</th><th>Stone Block</th><th>Status</th><th>Stock</th><th>Mfg Cost</th><th>Actions</th></tr></thead>
            <tbody>
              {idols.map(idol => (<tr key={idol.id}>
                <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{idol.serial_no}</code></td>
                <td><strong>{idol.idol_name}</strong></td>
                <td>{idol.stone_block_id || '—'}</td>
                <td>
                  <span className={`badge badge-${idol.status === 'completed' ? 'green' : idol.status === 'in_progress' ? 'orange' : 'gray'}`}>{idol.status}</span>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    {idol.stage_total > 0 ? (
                      <>
                        {idol.stage_status} • {idol.stage_completed}/{idol.stage_total} completed
                      </>
                    ) : (
                      'No stages'
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${idol.stock_state === 'in_stock' ? 'green' : idol.stock_state === 'sold' ? 'orange' : 'gray'}`}>
                    {idol.stock_state || 'not_placed'}
                  </span>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {idol.is_sold
                      ? `Sold to ${idol.sold_to_customer || 'customer'}`
                      : (Number(idol.stock_balance || 0) > 0
                        ? `${Number(idol.stock_balance)} in ${idol.stock_warehouse_name || `WH ${idol.stock_warehouse_id || ''}`}`
                        : 'Not in warehouse')}
                  </div>
                </td>
                <td>Rs.{Number(idol.total_manufacturing_cost || 0).toLocaleString('en-IN')}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => openView(idol.id)} style={{ marginRight: '4px' }}>View</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(idol)} style={{ marginRight: '4px' }}>Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openStages(idol.id)} style={{ marginRight: '4px' }}>Stages</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(idol.id)}>Delete</button>
                </td>
              </tr>))}
            </tbody>
          </table></div>
        )}
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ padding: '12px 12px 0', fontWeight: 700 }}>Project Raw Materials</div>
        {!projectId ? (
          <div className="empty-state"><div className="empty-icon">📦</div><p>Select a project to view raw materials</p></div>
        ) : (
          <div className="table-wrap">
            <table>
            <thead><tr><th>Category</th><th>Item</th><th>UOM</th><th>Qty</th></tr></thead>
            <tbody>
              {groupProjectMaterialsForDisplay(projectMaterials).map((m) => (
                <tr key={m.key}>
                  <td>{m.categoryName}</td>
                  <td>{m.itemName}</td>
                  <td>{m.uom}</td>
                  <td>{m.qty}</td>
                </tr>
              ))}
              {(projectMaterials || []).length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>No materials for this project</td></tr>
              )}
            </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ padding: '12px 12px 0', fontWeight: 700 }}>Blueprints</div>
        {!projectId ? (
          <div className="empty-state"><div className="empty-icon">📐</div><p>Select a project to view blueprints</p></div>
        ) : blueprintsLoading ? <div className="loading">Loading...</div> : blueprintStructures.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📐</div><p>No blueprints for this project</p></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Structure</th><th>Description</th><th>Layers</th><th>Positions</th></tr></thead>
            <tbody>
              {blueprintStructures.map(s => {
                const summary = blueprintSummary[s.id] || { layers: 0, positions: 0 };
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.description || '—'}</td>
                    <td>{summary.layers}</td>
                    <td>{summary.positions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95%' }}>
            <div className="modal-title">{editMode ? '✏️ Edit Idol' : '🔨 New Idol'}</div>
            {error && <div className="alert alert-error">Warning: {error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-group"><label className="form-label">Idol Name *</label><input className="form-input" value={form.idol_name || ''} required onChange={e => setForm(p => ({ ...p, idol_name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="form-group">
                <label className="form-label">Project Raw Materials (Select for Idol)</label>
                <div className="table-wrap" style={{ overflowX: 'auto', maxHeight: '50vh' }}>
                  <table>
                    <thead><tr><th>Select</th><th>Category</th><th>Item</th><th>UOM</th><th>Serial No</th><th>Qty</th></tr></thead>
                    <tbody>
                      {(idolMaterials || []).map((m, idx) => {
                        const item = items.find(i => i.id === m.item_id);
                        const category = categories.find(c => c.id === item?.category_id);
                        const block = allBlocks.find(b => b.id === m.stone_block_id);
                        const dims = block && [block.length, block.width, block.height].every(v => v !== undefined && v !== null)
                          ? `L:${block.length} W:${block.width} H:${block.height}`
                          : '';
                        const itemSerialIds = (m.serials || []).map(s => s.item_serial_id);
                        const itemSerials = itemSerialIds.map(sid => availableSerials.find(a => a.id === sid)?.serial_no || String(sid));
                        const serialLines = block
                          ? [`${block.serial_no || m.stone_block_id}${dims ? ` • ${dims}` : ''}`]
                          : (itemSerials.length ? itemSerials : [m.stone_block_id ? String(m.stone_block_id) : '—']);
                        const isStone = categories.find(c => c.id === item?.category_id)?.name?.toLowerCase().includes('stone');
                        const isSerialized = item?.has_serial_no;
                        const filterVal = (v) => (v === '' || v === null || v === undefined) ? null : Number(v);
                        const fl = filterVal(m.filter_length);
                        const fw = filterVal(m.filter_width);
                        const fh = filterVal(m.filter_height);
                        const matchesDim = (b) => {
                          const norm = (x) => Math.round(Number(x) * 100) / 100;
                          if (fl !== null && norm(b.length) !== norm(fl)) return false;
                          if (fw !== null && norm(b.width) !== norm(fw)) return false;
                          if (fh !== null && norm(b.height) !== norm(fh)) return false;
                          return true;
                        };
                        const selectableBlocks = isStone
                          ? allBlocks.filter(b =>
                              b.item_id === m.item_id &&
                              b.status === 'available' &&
                              matchesDim(b)
                            )
                          : [];
                        const selectableSerials = isSerialized
                          ? availableSerials.filter(s => s.item_id === m.item_id && s.status === 'available')
                          : [];
                        const maxQty = Number(availableQtyByItem[m.item_id] ?? m.qty ?? 0);

                        return (
                          <tr key={`${m.item_id || m.stone_block_id || idx}`}>
                            <td>
                              <input
                                type="checkbox"
                                checked={!!m.selected}
                                onChange={e => {
                                  const next = [...idolMaterials];
                                  next[idx] = { ...next[idx], selected: e.target.checked };
                                  setIdolMaterials(next);
                                }}
                              />
                            </td>
                            <td>{category?.name || (item ? '—' : '')}</td>
                            <td>{item?.name || (m.item_id ? m.item_id : '')}</td>
                            <td>{item?.uom || ''}</td>
                            <td>
                              {isStone ? (
                                <div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                                    <input
                                      className="form-input"
                                      type="number"
                                      placeholder="L"
                                      value={m.filter_length}
                                      onChange={e => {
                                        const next = [...idolMaterials];
                                        next[idx] = { ...next[idx], filter_length: e.target.value };
                                        setIdolMaterials(next);
                                      }}
                                    />
                                    <input
                                      className="form-input"
                                      type="number"
                                      placeholder="W"
                                      value={m.filter_width}
                                      onChange={e => {
                                        const next = [...idolMaterials];
                                        next[idx] = { ...next[idx], filter_width: e.target.value };
                                        setIdolMaterials(next);
                                      }}
                                    />
                                    <input
                                      className="form-input"
                                      type="number"
                                      placeholder="H"
                                      value={m.filter_height}
                                      onChange={e => {
                                        const next = [...idolMaterials];
                                        next[idx] = { ...next[idx], filter_height: e.target.value };
                                        setIdolMaterials(next);
                                      }}
                                    />
                                  </div>
                                  <select
                                    className="form-input"
                                    multiple
                                    value={(m.serial_ids || []).map(String)}
                                    onChange={e => {
                                      const selected = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                                      const next = [...idolMaterials];
                                      next[idx] = { ...next[idx], serial_ids: selected, qty: selected.length };
                                      setIdolMaterials(next);
                                    }}
                                    size={4}
                                    style={{ minHeight: '80px', width: '100%' }}
                                  >
                                    {selectableBlocks.map(b => {
                                      const dims = [b.length, b.width, b.height].every(v => v !== undefined && v !== null)
                                        ? `L:${b.length} W:${b.width} H:${b.height}`
                                        : '';
                                      return (
                                        <option key={b.id} value={b.id}>
                                          {b.serial_no}{dims ? ` • ${dims}` : ''} {b.project_id && b.project_id !== Number(projectId) ? '(Reserved)' : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              ) : isSerialized ? (
                                <select
                                  className="form-input"
                                  multiple
                                  value={(m.serial_ids || []).map(String)}
                                  onChange={e => {
                                    const selected = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                                    const next = [...idolMaterials];
                                    next[idx] = { ...next[idx], serial_ids: selected, qty: selected.length };
                                    setIdolMaterials(next);
                                  }}
                                  size={4}
                                  style={{ minHeight: '80px', width: '100%' }}
                                >
                                  {selectableSerials.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.serial_no}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                serialLines.map((s, i) => (
                                  <div key={`${m.item_id || m.stone_block_id || idx}-s-${i}`}>{s}</div>
                                ))
                              )}
                            </td>
                            <td style={{ minWidth: 90 }}>
                              {isStone || isSerialized ? (
                                <input className="form-input" type="number" value={m.qty} readOnly />
                              ) : (
                                <input
                                  className="form-input"
                                  type="number"
                                  value={m.qty}
                                  min="0"
                                  max={maxQty}
                                  onChange={e => {
                                    const raw = Number(e.target.value || 0);
                                    const nextQty = Math.min(Math.max(raw, 0), maxQty);
                                    const next = [...idolMaterials];
                                    next[idx] = { ...next[idx], qty: nextQty };
                                    setIdolMaterials(next);
                                  }}
                                />
                              )}
                              {!isStone && !isSerialized && (
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                  Available: {maxQty}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {(idolMaterials || []).length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>No materials for this project</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editMode ? 'Update' : 'Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {stageModalId && (
        <div className="modal-overlay" onClick={() => { setStageModalId(null); setAddStageModal(false); }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95%' }}>
            <div className="modal-title">Stages</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddStageModal(true); }} style={{ marginRight: '8px' }}>
                Add Stage
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setScrapModal(true); }}>
                Record Scrap
              </button>
            </div>
            <div className="table-wrap" style={{ marginBottom: '12px', overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Order</th><th>Name</th><th>Status</th><th>Labor Hrs</th><th>Labor Rate</th><th>Material Cost</th><th>Remarks</th><th>Stage Cost</th><th>Action</th></tr></thead>
                <tbody>
                  {stages.map(s => (
                    <tr key={s.id}>
                      <td>{s.stage_order}</td>
                      <td>{s.stage_name}</td>
                      <td>
                        <select
                          className="form-input"
                          value={stageEdits[s.id]?.status ?? s.status}
                          onChange={e => setStageEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], status: e.target.value } }))}
                          disabled={stageUpdatingId === s.id}
                        >
                          <option value="pending">pending</option>
                          <option value="in_progress">in_progress</option>
                          <option value="completed">completed</option>
                        </select>
                      </td>
                      <td>
                        <input
                          className="form-input"
                          type="number"
                          value={stageEdits[s.id]?.labor_hours ?? s.labor_hours ?? 0}
                          onChange={e => setStageEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], labor_hours: e.target.value } }))}
                          disabled={stageUpdatingId === s.id}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          type="number"
                          value={stageEdits[s.id]?.labor_rate ?? s.labor_rate ?? 0}
                          onChange={e => setStageEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], labor_rate: e.target.value } }))}
                          disabled={stageUpdatingId === s.id}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          type="number"
                          value={stageEdits[s.id]?.material_cost ?? s.material_cost ?? 0}
                          onChange={e => setStageEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], material_cost: e.target.value } }))}
                          disabled={stageUpdatingId === s.id}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          value={stageEdits[s.id]?.remarks ?? s.remarks ?? ''}
                          onChange={e => setStageEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], remarks: e.target.value } }))}
                          disabled={stageUpdatingId === s.id}
                        />
                      </td>
                      <td>Rs.{Number(s.stage_cost || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          onClick={() => updateStage(s.id)}
                          disabled={stageUpdatingId === s.id}
                          >
                          {stageUpdatingId === s.id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => deleteStage(s.id)}
                          style={{ marginLeft: '6px' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stages.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>No stages</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-wrap" style={{ marginBottom: '12px', overflowX: 'auto' }}>
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>Stage Scrap Records</div>
              <table>
                <thead><tr><th>Date</th><th>Stage</th><th>Material</th><th>Serial/Block</th><th>Qty</th><th>Warehouse</th><th>Reason</th><th>Remarks</th></tr></thead>
                <tbody>
                  {stageScrapRows.map(r => (
                    <tr key={r.id}>
                      <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                      <td>{r.stage_name || '—'}</td>
                      <td>{r.item_name || '—'}</td>
                      <td>{r.stone_serial_no || '—'}</td>
                      <td>{Number(r.qty || 0)}</td>
                      <td>{r.warehouse_name || '—'}</td>
                      <td>{r.reason || '—'}</td>
                      <td>{r.remarks || '—'}</td>
                    </tr>
                  ))}
                  {stageScrapRows.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>No scrap records</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { setStageModalId(null); setAddStageModal(false); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {addStageModal && (
        <div className="modal-overlay" onClick={() => setAddStageModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px' }}>
            <div className="modal-title">Add Stage</div>
            <form onSubmit={addStage}>
              <div className="form-group">
                <label className="form-label">Select Stage *</label>
                <select
                  className="form-input"
                  value={stageForm.stage_master_id}
                  onChange={e => {
                    const value = e.target.value;
                    const master = stageMaster.find(s => s.id === Number(value));
                    setStageForm(p => ({
                      ...p,
                      stage_master_id: value,
                      stage_name: master ? master.name : p.stage_name,
                    }));
                  }}
                  disabled={stageMasterLoading}
                  required
                >
                  <option value="">-- Select --</option>
                  {stageMaster.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Stage Order *</label><input className="form-input" type="number" value={stageForm.stage_order} required onChange={e => setStageForm(p => ({ ...p, stage_order: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Material Cost</label><input className="form-input" type="number" value={stageForm.material_cost} onChange={e => setStageForm(p => ({ ...p, material_cost: e.target.value }))} /></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Labor Hours</label><input className="form-input" type="number" value={stageForm.labor_hours} onChange={e => setStageForm(p => ({ ...p, labor_hours: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Labor Rate</label><input className="form-input" type="number" value={stageForm.labor_rate} onChange={e => setStageForm(p => ({ ...p, labor_rate: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Remarks</label><textarea className="form-textarea" value={stageForm.remarks} onChange={e => setStageForm(p => ({ ...p, remarks: e.target.value }))} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setCreateStageModal(true)}>
                  Create Stage Master
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setAddStageModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Stage</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewModalId && (
        <div className="modal-overlay" onClick={() => setViewModalId(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95%' }}>
            <div className="modal-title">Idol Details</div>
            {!viewIdol ? (
              <div className="loading" style={{ padding: '12px' }}>Loading...</div>
            ) : (
              <div style={{ padding: '12px' }}>
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                  <div><strong>Serial No:</strong> {viewIdol.serial_no}</div>
                  <div><strong>Name:</strong> {viewIdol.idol_name}</div>
                  <div><strong>Status:</strong> {viewIdol.status}</div>
                  <div><strong>Project ID:</strong> {viewIdol.project_id}</div>
                  <div><strong>Total Cost:</strong> Rs.{Number(viewIdol.total_manufacturing_cost || 0).toLocaleString('en-IN')}</div>
                  <div><strong>Total Stage Cost:</strong> Rs.{Number(viewIdol.total_stage_cost || 0).toLocaleString('en-IN')}</div>
                  <div><strong>Total Labor Hours:</strong> {Number(viewIdol.total_labor_hours || 0)}</div>
                  <div><strong>Description:</strong> {viewIdol.description || '—'}</div>
                </div>

                <div className="form-group" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                  <label className="form-label">Finished Idol Stock</label>
                  <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div><strong>Stock State:</strong> {viewIdol.stock_state || 'not_placed'}</div>
                    <div><strong>Stock Qty:</strong> {Number(viewIdol.stock_balance || 0)}</div>
                    <div><strong>Warehouse:</strong> {viewIdol.stock_warehouse_name || (viewIdol.stock_warehouse_id ? `WH ${viewIdol.stock_warehouse_id}` : '?')}</div>
                    <div><strong>Sold:</strong> {viewIdol.is_sold ? `Yes (${viewIdol.sold_to_customer || 'Customer'})` : 'No'}</div>
                  </div>

                  {viewIdol.status === 'completed' && !viewIdol.is_sold && Number(viewIdol.stock_balance || 0) <= 0 && (
                    <form onSubmit={placeIdolInStock} style={{ marginBottom: '10px', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Place In Warehouse</div>
                      <div className="grid-2">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Warehouse</label>
                          <select className="form-select" value={placeForm.warehouse_id} onChange={e => setPlaceForm(p => ({ ...p, warehouse_id: e.target.value }))} required>
                            <option value="">Select...</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Remarks</label>
                          <input className="form-input" value={placeForm.remarks} onChange={e => setPlaceForm(p => ({ ...p, remarks: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={stockActionLoading}>{stockActionLoading ? 'Saving...' : 'Place In Stock'}</button>
                      </div>
                    </form>
                  )}

                  {viewIdol.status === 'completed' && !viewIdol.is_sold && Number(viewIdol.stock_balance || 0) > 0 && (
                    <>
                      <form onSubmit={transferIdolStock} style={{ marginBottom: '10px', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '8px' }}>Transfer Stock</div>
                        <div className="grid-2">
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">To Warehouse</label>
                            <select className="form-select" value={transferForm.to_warehouse_id} onChange={e => setTransferForm(p => ({ ...p, to_warehouse_id: e.target.value }))} required>
                              <option value="">Select...</option>
                              {warehouses.filter(w => Number(w.id) !== Number(viewIdol.stock_warehouse_id)).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Remarks</label>
                            <input className="form-input" value={transferForm.remarks} onChange={e => setTransferForm(p => ({ ...p, remarks: e.target.value }))} />
                          </div>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <button type="submit" className="btn btn-ghost btn-sm" disabled={stockActionLoading}>{stockActionLoading ? 'Saving...' : 'Transfer'}</button>
                        </div>
                      </form>

                      <form onSubmit={sellIdolFromStock} style={{ marginBottom: '10px', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '8px' }}>Sell Idol</div>
                        <div className="grid-2">
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Customer Name *</label>
                            <input className="form-input" value={sellForm.customer_name} onChange={e => setSellForm(p => ({ ...p, customer_name: e.target.value }))} required />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">GSTIN</label>
                            <input className="form-input" value={sellForm.customer_gstin} onChange={e => setSellForm(p => ({ ...p, customer_gstin: e.target.value }))} />
                          </div>
                        </div>
                        <div className="grid-2">
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Sale Date *</label>
                            <input className="form-input" type="date" value={sellForm.sale_date} onChange={e => setSellForm(p => ({ ...p, sale_date: e.target.value }))} required />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Sale Amount</label>
                            <input className="form-input" type="number" min="0" step="0.01" value={sellForm.sale_amount} onChange={e => setSellForm(p => ({ ...p, sale_amount: e.target.value }))} />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Remarks</label>
                          <input className="form-input" value={sellForm.remarks} onChange={e => setSellForm(p => ({ ...p, remarks: e.target.value }))} />
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <button type="submit" className="btn btn-primary btn-sm" disabled={stockActionLoading}>{stockActionLoading ? 'Saving...' : 'Sell Idol'}</button>
                        </div>
                      </form>
                    </>
                  )}

                  <div className="table-wrap" style={{ overflowX: 'auto' }}>
                    <table>
                      <thead><tr><th>Date</th><th>Warehouse</th><th>Movement</th><th>Qty In</th><th>Qty Out</th><th>Balance</th><th>Reference</th></tr></thead>
                      <tbody>
                        {viewStockMovements.map(m => {
                          const wh = warehouses.find(w => Number(w.id) === Number(m.warehouse_id));
                          return (
                            <tr key={m.id}>
                              <td>{m.created_at ? new Date(m.created_at).toLocaleString() : '?'}</td>
                              <td>{wh?.name || m.warehouse_id}</td>
                              <td>{m.movement_type}</td>
                              <td>{m.qty_in}</td>
                              <td>{m.qty_out}</td>
                              <td>{m.balance_qty}</td>
                              <td>{m.reference_type || '?'}</td>
                            </tr>
                          );
                        })}
                        {viewStockMovements.length === 0 && (
                          <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>No idol stock movements yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Materials</label>
                  <div className="table-wrap" style={{ overflowX: 'auto' }}>
                    <table>
                      <thead><tr><th>Category</th><th>Item</th><th>UOM</th><th>Serial/Block</th><th>Qty</th></tr></thead>
                      <tbody>
                        {(viewIdol.materials || []).map((m, idx) => {
                          const item = items.find(i => i.id === m.item_id);
                          const category = categories.find(c => c.id === item?.category_id);
                          const isStone = (category?.name || '').toLowerCase().includes('stone');
                          const block = allBlocks.find(b => b.id === m.stone_block_id);
                          const dims = block && [block.length, block.width, block.height].every(v => v !== undefined && v !== null)
                            ? `L:${block.length} W:${block.width} H:${block.height}`
                            : '';
                          let label = '—';
                          if (isStone && block) {
                            label = `${block.serial_no}${dims ? ` • ${dims}` : ''}`;
                          } else if (item?.has_serial_no) {
                            // Serial selected for non-stone item (if issued)
                            const serial = (availableSerials || []).find(s => s.reference_type === 'idol' && s.reference_id === viewIdol.id && s.item_id === m.item_id);
                            label = serial?.serial_no || '—';
                          } else if (block?.serial_no) {
                            label = block.serial_no;
                          }
                          return (
                            <tr key={`${m.id || idx}`}>
                              <td>{category?.name || '—'}</td>
                              <td>{item?.name || (m.item_id || '—')}</td>
                              <td>{item?.uom || ''}</td>
                              <td>{label}</td>
                              <td>{m.qty}</td>
                            </tr>
                          );
                        })}
                        {(viewIdol.materials || []).length === 0 && (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>No materials</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Stages</label>
                  <div className="table-wrap" style={{ overflowX: 'auto' }}>
                    <table>
                      <thead><tr><th>Order</th><th>Name</th><th>Status</th><th>Labor Hrs</th><th>Labor Rate</th><th>Material Cost</th><th>Stage Cost</th></tr></thead>
                      <tbody>
                        {viewStages.map(s => (
                          <tr key={s.id}>
                            <td>{s.stage_order}</td>
                            <td>{s.stage_name}</td>
                            <td>{s.status}</td>
                            <td>{s.labor_hours}</td>
                            <td>{s.labor_rate}</td>
                            <td>{s.material_cost}</td>
                            <td>{s.stage_cost}</td>
                          </tr>
                        ))}
                        {viewStages.length === 0 && (
                          <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>No stages</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setViewModalId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {scrapModal && (
        <div className="modal-overlay" onClick={() => setScrapModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-title">Record Scrap (Manufacturing)</div>
            <form onSubmit={submitScrap}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Item (from this idol)</label>
                  <select
                    className="form-select"
                    value={scrapForm.item_id}
                    onChange={e => setScrapForm(p => ({ ...p, item_id: e.target.value, stone_block_id: '', serial_id: '', warehouse_id: '', qty: '' }))}
                    disabled={!!scrapForm.stone_block_id}
                  >
                    <option value="">Select...</option>
                    {allowedItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  {scrapForm.item_id && (
                    <div className="form-help">Serials: {scrapItemSerialDisplay}</div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Stone Block (from this idol)</label>
                  <select
                    className="form-select"
                    value={scrapForm.stone_block_id}
                    onChange={e => setScrapForm(p => ({ ...p, stone_block_id: e.target.value, item_id: '', serial_id: '', warehouse_id: '' }))}
                    disabled={!!scrapForm.item_id}
                  >
                    <option value="">Select...</option>
                    {allowedBlocks.map(b => {
                      const dims = [b.length, b.width, b.height].every(v => v !== undefined && v !== null)
                        ? ` (L:${b.length} W:${b.width} H:${b.height})`
                        : '';
                      return (
                        <option key={b.id} value={b.id}>{b.serial_no || `#${b.id}`}{dims}</option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Warehouse *</label>
                  <select className="form-select" value={scrapForm.warehouse_id} onChange={e => setScrapForm(p => ({ ...p, warehouse_id: e.target.value }))} required>
                    <option value="">Select...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  {scrapForm.stone_block_id && (
                    <div className="form-help">Auto-filled from selected stone block warehouse.</div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Qty *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.001"
                    value={scrapForm.qty}
                    max={scrapQtyLimit > 0 ? scrapQtyLimit : undefined}
                    onChange={e => {
                      const raw = Number(e.target.value || 0);
                      const nextQty = scrapQtyLimit > 0 ? Math.min(Math.max(raw, 0), scrapQtyLimit) : Math.max(raw, 0);
                      setScrapForm(p => ({ ...p, qty: String(nextQty) }));
                    }}
                    required
                  />
                  {scrapForm.stone_block_id && (
                    <div className="form-help">For stone block, qty is volume. Available volume: {Number(selectedScrapBlock?.available_volume || 0)}</div>
                  )}
                  {!scrapForm.stone_block_id && scrapForm.item_id && !selectedScrapItemHasSerial && (
                    <div className="form-help">Max allowed from idol allocation: {selectedIdolAllocatedQty}</div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <select className="form-select" value={scrapForm.reason} onChange={e => setScrapForm(p => ({ ...p, reason: e.target.value }))} required>
                    <option value="incorrect">Incorrect</option>
                    <option value="damaged">Damaged</option>
                    <option value="process_loss">Process Loss</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Stage</label>
                <select className="form-select" value={scrapForm.stage_id} onChange={e => setScrapForm(p => ({ ...p, stage_id: e.target.value }))}>
                  <option value="">Select stage...</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.stage_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea className="form-textarea" rows="2" value={scrapForm.remarks} onChange={e => setScrapForm(p => ({ ...p, remarks: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setScrapModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={scrapSaving}>{scrapSaving ? 'Saving...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createStageModal && (
        <div className="modal-overlay" onClick={() => setCreateStageModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Create Stage</div>
            <div className="form-group">
              <label className="form-label">Stage Name *</label>
              <input
                className="form-input"
                value={newMaster.name}
                onChange={e => setNewMaster(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                value={newMaster.description}
                onChange={e => setNewMaster(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setCreateStageModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={createStageMaster} disabled={stageUpdatingId === 'create-master'}>
                {stageUpdatingId === 'create-master' ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Component modal removed */}
    </div>
  );
}
