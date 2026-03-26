import { useState, useEffect } from 'react';
import { blueprintsAPI, stonesAPI, inventoryAPI, projectsAPI, reportsAPI } from '../services/api';

export default function Blueprints() {
  // view: 'structures' | 'layers' | 'positions'
  const [view, setView] = useState('structures');
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState(null);

  const [structures, setStructures] = useState([]);
  const [layers, setLayers] = useState([]);
  const [positions, setPositions] = useState([]);
  const [stoneBlocks, setStoneBlocks] = useState([]);
  const [stoneLoading, setStoneLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [availableSerials, setAvailableSerials] = useState([]);
  const [stockBalances, setStockBalances] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectMaterials, setProjectMaterials] = useState([]);
  const [reserveStatus, setReserveStatus] = useState({ reservations: [], allocations: [] });

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [stageModal, setStageModal] = useState(false);
  const [stagePos, setStagePos] = useState(null);
  const [stageList, setStageList] = useState([]);
  const [stageMaster, setStageMaster] = useState([]);
  const [stageScrapRows, setStageScrapRows] = useState([]);
  const [stageLoading, setStageLoading] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);
  const [newStage, setNewStage] = useState({ stage_id: '', stage_order: '', labor_hours: '', labor_rate: '', material_cost: '', remarks: '' });
  const [newMaster, setNewMaster] = useState({ name: '', description: '' });
  const [stageError, setStageError] = useState(null);
  const [createStageModal, setCreateStageModal] = useState(false);
  const [addStageModal, setAddStageModal] = useState(false);
  const [dependencyModal, setDependencyModal] = useState(false);
  const [dependencyPos, setDependencyPos] = useState(null);
  const [dependencyRows, setDependencyRows] = useState([]);
  const [dependencyLoading, setDependencyLoading] = useState(false);
  const [dependencySaving, setDependencySaving] = useState(false);
  const [dependencyError, setDependencyError] = useState(null);
  const [dependencyForm, setDependencyForm] = useState({ depends_on_id: '' });
  const [scrapModal, setScrapModal] = useState(false);
  const [scrapSaving, setScrapSaving] = useState(false);
  const [scrapForm, setScrapForm] = useState({ item_id: '', stone_block_id: '', serial_id: '', warehouse_id: '', qty: '', reason: 'incorrect', stage_id: '', remarks: '' });

  // ── Loaders ──────────────────────────────────────────────
  const loadStructures = () => {
    setLoading(true);
    blueprintsAPI.structures()
      .then(r => setStructures(r.data))
      .finally(() => setLoading(false));
  };

  const loadLayers = (structureId) => {
    setLoading(true);
    blueprintsAPI.layers(structureId)
      .then(r => setLayers(r.data))
      .finally(() => setLoading(false));
  };

  const loadPositions = (layerId) => {
    setLoading(true);
    blueprintsAPI.positions(layerId)
      .then(r => setPositions(r.data))
      .finally(() => setLoading(false));
  };

  const loadDependencies = async (structureId) => {
    if (!structureId) {
      setDependencyRows([]);
      return;
    }
    setDependencyLoading(true);
    try {
      const r = await blueprintsAPI.dependencies(structureId);
      setDependencyRows(r.data || []);
    } catch {
      setDependencyRows([]);
    } finally {
      setDependencyLoading(false);
    }
  };

  const loadProjects = () => {
    projectsAPI.list()
      .then(r => setProjects(r.data || []))
      .catch(() => setProjects([]));
  };

  const loadProjectMaterials = async (projectId) => {
    if (!projectId) {
      setProjectMaterials([]);
      return;
    }
    try {
      const r = await projectsAPI.get(projectId);
      setProjectMaterials(r.data?.materials || []);
    } catch {
      setProjectMaterials([]);
    }
  };

  const loadStoneBlocks = async () => {
    setStoneLoading(true);
    try {
      const params = {};
      const r = await stonesAPI.list(params);
      setStoneBlocks(r.data || []);
    } finally {
      setStoneLoading(false);
    }
  };

  const loadItems = async () => {
    setItemsLoading(true);
    try {
      const r = await inventoryAPI.items();
      setItems(r.data || []);
    } finally {
      setItemsLoading(false);
    }
  };
  const loadCategories = async () => {
    try {
      const r = await inventoryAPI.categories();
      setCategories(r.data || []);
    } catch {
      setCategories([]);
    }
  };

  const loadWarehouses = async () => {
    try {
      const r = await inventoryAPI.warehouses();
      setWarehouses(r.data || []);
    } catch {
      // ignore
    }
  };
  const loadSerials = async () => {
    try {
      const r = await inventoryAPI.serials();
      setAvailableSerials(r.data || []);
    } catch {
      setAvailableSerials([]);
    }
  };
  const loadStockBalances = async () => {
    try {
      const r = await inventoryAPI.stockBalance();
      setStockBalances(r.data || []);
    } catch {
      setStockBalances([]);
    }
  };

  const ensureStoneBlock = async (blockId) => {
    if (!blockId) return;
    if (stoneBlocks.some(b => b.id === blockId)) return;
    try {
      const r = await stonesAPI.get(blockId);
      setStoneBlocks(prev => [...prev, r.data]);
    } catch {
      // ignore missing block
    }
  };

  useEffect(() => { loadStructures(); }, []);
  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { loadItems(); loadCategories(); loadWarehouses(); loadSerials(); loadStockBalances(); }, []);
  useEffect(() => {
    const pid = selectedStructure?.project_id;
    if (!pid) { setReserveStatus({ reservations: [], allocations: [] }); return; }
    projectsAPI.reserveStatus(pid)
      .then(r => setReserveStatus(r.data || { reservations: [], allocations: [] }))
      .catch(() => setReserveStatus({ reservations: [], allocations: [] }));
  }, [selectedStructure?.project_id]);
  useEffect(() => {
    if (view === 'positions') loadStoneBlocks();
  }, [view, selectedStructure?.id]);

  useEffect(() => {
    if (view === 'positions' && selectedStructure?.id) {
      loadDependencies(selectedStructure.id);
    }
  }, [view, selectedStructure?.id]);

  useEffect(() => {
    if (showModal === 'position') ensureStoneBlock(form?.stone_block_id);
  }, [showModal, form?.stone_block_id]);

  const isStoneItem = (item) => {
    const category = categories.find(c => c.id === item?.category_id);
    return (category?.name || '').toLowerCase().includes('stone');
  };
  const positionAllocatedItemId = stagePos?.stone_item_id ? Number(stagePos.stone_item_id) : null;
  const allowedPositionItems = positionAllocatedItemId
    ? items.filter(i => i.id === positionAllocatedItemId)
    : [];
  const allocatedBlockIds = new Set(
    (reserveStatus.allocations || [])
      .filter(a => a && a.stone_block_id && a.is_released === false)
      .map(a => a.stone_block_id),
  );
  const selectedScrapItemId = scrapForm.item_id ? Number(scrapForm.item_id) : null;
  const selectedScrapItem = selectedScrapItemId ? items.find(i => i.id === selectedScrapItemId) : null;
  const selectedScrapItemHasSerial = !!selectedScrapItem?.has_serial_no;
  const selectedScrapItemIsStone = selectedScrapItem ? isStoneItem(selectedScrapItem) : false;
  const selectedScrapBlock = scrapForm.stone_block_id
    ? stoneBlocks.find(b => b.id === Number(scrapForm.stone_block_id))
    : null;
  const selectedPositionAllocatedQty = selectedScrapItemId && positionAllocatedItemId && selectedScrapItemId === positionAllocatedItemId ? 1 : 0;
  const scrapQtyLimit = scrapForm.stone_block_id
    ? Number(selectedScrapBlock?.available_volume || 0)
    : (scrapForm.item_id && selectedScrapItemHasSerial)
      ? 1
      : selectedPositionAllocatedQty;
  const allowedPositionBlocks = stoneBlocks.filter(b => {
    if (!stagePos?.stone_block_id) return false;
    return b.id === stagePos.stone_block_id;
  });
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
  const positionSerialIds = new Set(
    (projectMaterials || [])
      .filter(m => selectedScrapItemId && m.item_id === selectedScrapItemId)
      .flatMap(m => (m.serials || []).map(s => s.item_serial_id ?? s.id ?? s))
      .filter(Boolean),
  );
  const scrapItemSerials = selectedScrapItemId && !selectedScrapItemIsStone
    ? availableSerials
      .filter(s => s.item_id === selectedScrapItemId)
      .filter(s => !scrapForm.warehouse_id || s.warehouse_id === Number(scrapForm.warehouse_id))
      .filter(s => !s.status || s.status === 'available')
      .filter(s => positionSerialIds.size === 0 || positionSerialIds.has(s.id))
    : [];
  const selectedScrapSerial = scrapForm.serial_id
    ? availableSerials.find(s => s.id === Number(scrapForm.serial_id))
    : null;
  const serialWarehouseCandidates = selectedScrapItemId && selectedScrapItemHasSerial
    ? Array.from(new Set(
      availableSerials
        .filter(s => s.item_id === selectedScrapItemId)
        .filter(s => !s.status || s.status === 'available')
        .filter(s => positionSerialIds.size === 0 || positionSerialIds.has(s.id))
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

  useEffect(() => {
    loadProjectMaterials(selectedStructure?.project_id);
  }, [selectedStructure?.project_id]);

  useEffect(() => {
    if (showModal !== 'position') return;
    loadItems();
    if (form?.stone_block_id) {
      const block = stoneBlocks.find(b => b.id === form.stone_block_id);
      if (block?.item_id) setForm(p => ({ ...p, stone_item_id: block.item_id }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  // ── Navigation ───────────────────────────────────────────
  const goToLayers = (structure) => {
    setSelectedStructure(structure);
    setView('layers');
    loadLayers(structure.id);
  };

  const goToPositions = (layer) => {
    setSelectedLayer(layer);
    setView('positions');
    loadPositions(layer.id);
    loadDependencies(selectedStructure?.id);
  };

  const goBack = () => {
    if (view === 'positions') { setView('layers'); setSelectedLayer(null); }
    else if (view === 'layers') { setView('structures'); setSelectedStructure(null); }
  };

  // ── CRUD ─────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (showModal === 'structure') {
        if (editMode) await blueprintsAPI.updateStructure(editId, form);
        else await blueprintsAPI.createStructure(form);
        loadStructures();
      } else if (showModal === 'layer') {
        if (editMode) await blueprintsAPI.updateLayer(editId, form);
        else await blueprintsAPI.createLayer(selectedStructure.id, form);
        loadLayers(selectedStructure.id);
      } else if (showModal === 'position') {
        if (editMode) await blueprintsAPI.updatePosition(editId, form);
        else await blueprintsAPI.createPosition(selectedLayer.id, form);
        loadPositions(selectedLayer.id);
      }
      setShowModal(null); setEditMode(false); setEditId(null); setForm({});
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      if (type === 'structure') { await blueprintsAPI.deleteStructure(id); loadStructures(); }
      else if (type === 'layer') { await blueprintsAPI.deleteLayer(id); loadLayers(selectedStructure.id); }
      else if (type === 'position') { await blueprintsAPI.deletePosition(id); loadPositions(selectedLayer.id); }
    } catch (err) { alert('Delete failed: ' + (err.response?.data?.detail || 'Error')); }
  };

  const openStages = async (pos) => {
    setStagePos(pos);
    setStageModal(true);
    setStageError(null);
    setStageLoading(true);
    setStageScrapRows([]);
    try {
      const [rStages, rMaster, scrapRes] = await Promise.all([
        blueprintsAPI.positionStages(pos.id),
        blueprintsAPI.stages(),
        reportsAPI.scrapReport(),
      ]);
      setStageList(rStages.data || []);
      setStageMaster(rMaster.data || []);
      const scrapRows = (scrapRes.data || []).filter(r => r.source_type === 'position_stage' && Number(r.source_id) === Number(pos.id));
      setStageScrapRows(scrapRows);
    } catch (err) {
      setStageError(err.response?.data?.detail || 'Failed to load stages');
    } finally {
      setStageLoading(false);
    }
  };

  const updateStageField = (stageId, patch) => {
    setStageList(prev => prev.map(s => (s.stage_id === stageId ? { ...s, ...patch } : s)));
  };

  const openDependencies = (pos) => {
    setDependencyPos(pos);
    setDependencyError(null);
    setDependencyForm({ depends_on_id: '' });
    setDependencyModal(true);
  };

  const addDependency = async () => {
    if (!dependencyPos) return;
    const dependsOnId = Number(dependencyForm.depends_on_id || 0);
    if (!dependsOnId) {
      setDependencyError('Select predecessor position');
      return;
    }
    setDependencySaving(true);
    setDependencyError(null);
    try {
      await blueprintsAPI.createDependency({
        position_id: dependencyPos.id,
        depends_on_id: dependsOnId,
      });
      await loadDependencies(selectedStructure?.id);
      setDependencyForm({ depends_on_id: '' });
      if (selectedLayer?.id) loadPositions(selectedLayer.id);
    } catch (err) {
      setDependencyError(err.response?.data?.detail || 'Failed to add dependency');
    } finally {
      setDependencySaving(false);
    }
  };

  const removeDependency = async (positionId, dependsOnId) => {
    if (!window.confirm('Remove this dependency?')) return;
    setDependencySaving(true);
    setDependencyError(null);
    try {
      await blueprintsAPI.deleteDependency(positionId, dependsOnId);
      await loadDependencies(selectedStructure?.id);
      if (selectedLayer?.id) loadPositions(selectedLayer.id);
    } catch (err) {
      setDependencyError(err.response?.data?.detail || 'Failed to remove dependency');
    } finally {
      setDependencySaving(false);
    }
  };

  const saveStages = async () => {
    if (!stagePos) return;
    setStageSaving(true);
    setStageError(null);
    try {
      const payload = stageList.map(s => ({
        stage_id: s.stage_id,
        status: s.status,
        stage_order: s.stage_order ?? null,
        labor_hours: Number(s.labor_hours || 0),
        labor_rate: Number(s.labor_rate || 0),
        material_cost: Number(s.material_cost || 0),
        remarks: s.remarks || null,
        started_at: s.started_at || null,
        completed_at: s.completed_at || null,
      }));
      const r = await blueprintsAPI.updatePositionStages(stagePos.id, payload);
      setStageList(r.data || []);
      setStageModal(false);
      if (selectedLayer?.id) loadPositions(selectedLayer.id);
    } catch (err) {
      setStageError(err.response?.data?.detail || 'Failed to save stages');
    } finally {
      setStageSaving(false);
    }
  };

  const submitScrap = async (e) => {
    e.preventDefault();
    if ((!scrapForm.item_id && !scrapForm.stone_block_id) || !scrapForm.warehouse_id || !scrapForm.qty) {
      alert('Select item or stone block, warehouse, and qty');
      return;
    }
    if (scrapForm.item_id && selectedScrapItemIsStone && !scrapForm.stone_block_id) {
      alert('Select a stone block for this stone item');
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
      alert(`You can scrap only allocated qty for this position. Max allowed: ${scrapQtyLimit}`);
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
        source_type: 'position_stage',
        source_id: stagePos?.id || null,
        stage_id: scrapForm.stage_id ? Number(scrapForm.stage_id) : null,
        remarks: scrapForm.remarks || null,
      });
      try {
        const scrapRes = await reportsAPI.scrapReport();
        const scrapRows = (scrapRes.data || []).filter(r => r.source_type === 'position_stage' && Number(r.source_id) === Number(stagePos?.id));
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

  const addStageToPosition = () => {
    if (!newStage.stage_id) {
      setStageError('Select a stage');
      return false;
    }
    const stageIdNum = Number(newStage.stage_id);
    if (stageList.some(s => s.stage_id === stageIdNum)) {
      setStageError('Stage already added');
      return false;
    }
    const master = stageMaster.find(s => s.id === stageIdNum);
    if (!master) {
      setStageError('Stage not found');
      return false;
    }
    setStageList(prev => ([
      ...prev,
      {
        stage_id: stageIdNum,
        name: master.name,
        description: master.description,
        stage_order: newStage.stage_order === '' ? null : Number(newStage.stage_order),
        labor_hours: Number(newStage.labor_hours || 0),
        labor_rate: Number(newStage.labor_rate || 0),
        material_cost: Number(newStage.material_cost || 0),
        stage_cost: Number(newStage.labor_hours || 0) * Number(newStage.labor_rate || 0) + Number(newStage.material_cost || 0),
        remarks: newStage.remarks || null,
        started_at: null,
        completed_at: null,
        status: 'pending',
      },
    ]));
    setNewStage({ stage_id: '', stage_order: '', labor_hours: '', labor_rate: '', material_cost: '', remarks: '' });
    return true;
  };

  const createStageMaster = async () => {
    if (!newMaster.name.trim()) {
      setStageError('Stage name is required');
      return;
    }
    setStageSaving(true);
    setStageError(null);
    try {
      const r = await blueprintsAPI.createStage({
        name: newMaster.name.trim(),
        description: newMaster.description || null,
      });
      const created = r.data;
      setStageMaster(prev => [...prev, created]);
      setNewStage(p => ({ ...p, stage_id: String(created.id) }));
      setNewMaster({ name: '', description: '' });
      setCreateStageModal(false);
    } catch (err) {
      setStageError(err.response?.data?.detail || 'Failed to create stage');
    } finally {
      setStageSaving(false);
    }
  };

  const openEdit = (type, record) => {
    setForm(record); setEditMode(true); setEditId(record.id); setError(null); setShowModal(type);
  };
  const openCreate = (type) => {
    setForm({}); setEditMode(false); setEditId(null); setError(null); setShowModal(type);
  };

  // ── Render ───────────────────────────────────────────────
  const stoneBlockById = stoneBlocks.reduce((acc, b) => {
    acc[b.id] = b;
    return acc;
  }, {});
  const projectById = projects.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});
  const positionById = positions.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});
  const dependencyByPosition = dependencyRows.reduce((acc, d) => {
    if (!acc[d.position_id]) acc[d.position_id] = [];
    acc[d.position_id].push(d.depends_on_id);
    return acc;
  }, {});
  const currentDependencies = dependencyPos
    ? dependencyRows.filter(d => d.position_id === dependencyPos.id)
    : [];
  const currentDependencyIds = new Set(currentDependencies.map(d => d.depends_on_id));
  const dependencyOptions = positions.filter(
    p => dependencyPos && p.id !== dependencyPos.id && !currentDependencyIds.has(p.id),
  );
  const itemById = items.reduce((acc, it) => {
    acc[it.id] = it;
    return acc;
  }, {});
  const reqLength = form?.req_length;
  const reqWidth = form?.req_width;
  const reqHeight = form?.req_height;
  const hasDims =
    reqLength !== undefined && reqLength !== null && reqLength !== '' && Number(reqLength) > 0 &&
    reqWidth !== undefined && reqWidth !== null && reqWidth !== '' && Number(reqWidth) > 0 &&
    reqHeight !== undefined && reqHeight !== null && reqHeight !== '' && Number(reqHeight) > 0;
  const isSelectableBlock = (b) => {
    return b.status === 'available';
  };
  const filteredStoneBlocks = stoneBlocks.filter(b => {
    if (!isSelectableBlock(b)) return false;
    if (form?.stone_item_id && Number(form.stone_item_id) !== b.item_id) return false;
    if (!hasDims) return true;
    return Number(b.length) === Number(reqLength) &&
      Number(b.width) === Number(reqWidth) &&
      Number(b.height) === Number(reqHeight);
  });
  const selectStoneBlocks = (() => {
    const selectedId = form?.stone_block_id;
    if (!selectedId) return filteredStoneBlocks;
    const hasSelected = filteredStoneBlocks.some(b => b.id === selectedId);
    if (hasSelected) return filteredStoneBlocks;
    const selectedBlock = stoneBlockById[selectedId];
    return selectedBlock ? [selectedBlock, ...filteredStoneBlocks] : filteredStoneBlocks;
  })();
  const projectStoneBlocks = stoneBlocks;
  const availableProjectStoneBlocks = projectStoneBlocks.filter(b => b.status === 'available');
  const positionStageTotalCost = stageList.reduce(
    (sum, s) => sum + ((Number(s.labor_hours || 0) * Number(s.labor_rate || 0)) + Number(s.material_cost || 0)),
    0,
  );
  const projectItemIds = new Set((projectMaterials || []).map(m => m.item_id).filter(Boolean));
  const availableItemIds = new Set(availableProjectStoneBlocks.map(b => b.item_id).filter(Boolean));
  const stoneItemOptions = Array.from(
    new Set(
      Array.from(availableItemIds).filter(id => projectItemIds.size === 0 || projectItemIds.has(id))
    )
  ).map(id => ({
    id,
    name: itemById[id]?.name || `Item #${id}`,
  }));
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {view !== 'structures' && (
            <button className="btn btn-ghost" onClick={goBack} style={{ padding: '6px 12px' }}>← Back</button>
          )}
          <div>
            <div className="page-title">
              {view === 'structures' && 'Blueprints — Structures'}
              {view === 'layers' && `Layers — ${selectedStructure?.name}`}
              {view === 'positions' && `Positions — Layer ${selectedLayer?.layer_order}: ${selectedLayer?.name}`}
            </div>
            <div className="page-subtitle" style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: '#94a3b8' }}>
              <span
                style={{ cursor: view !== 'structures' ? 'pointer' : 'default', color: view !== 'structures' ? '#3b82f6' : 'inherit' }}
                onClick={() => { setView('structures'); setSelectedStructure(null); setSelectedLayer(null); }}
              >Structures</span>
              {selectedStructure && (<>
                <span>›</span>
                <span
                  style={{ cursor: view === 'positions' ? 'pointer' : 'default', color: view === 'positions' ? '#3b82f6' : 'inherit' }}
                  onClick={() => view === 'positions' && goToLayers(selectedStructure)}
                >{selectedStructure.name}</span>
              </>)}
              {selectedLayer && (<>
                <span>›</span>
                <span>Layer {selectedLayer.layer_order}: {selectedLayer.name}</span>
              </>)}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => openCreate(view === 'structures' ? 'structure' : view === 'layers' ? 'layer' : 'position')}>
          + Add {view === 'structures' ? 'Structure' : view === 'layers' ? 'Layer' : 'Position'}
        </button>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {/* Structures table */}
            {view === 'structures' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Structure Name</th>
                      <th>Description</th>
                      <th>Project</th>
                      <th>Total Layers</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {structures.map((s, i) => (
                      <tr key={s.id}>
                        <td style={{ color: '#94a3b8', width: '40px' }}>{i + 1}</td>
                        <td><strong>{s.name}</strong></td>
                        <td style={{ color: '#64748b' }}>{s.description || '—'}</td>
                        <td>{projectById[s.project_id]?.name || '—'}</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{s.layer_count ?? 0}</span>
                          <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '4px' }}>layers</span>
                        </td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => goToLayers(s)} style={{ marginRight: '4px' }}>View Layers →</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit('structure', s)} style={{ marginRight: '4px' }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete('structure', s.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {structures.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No structures yet. Click "+ Add Structure" to create one.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Layers table */}
            {view === 'layers' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Layer #</th>
                      <th>Layer Name</th>
                      <th>Description</th>
                      <th>Positions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layers.map(l => (
                      <tr key={l.id}>
                        <td style={{ width: '80px' }}>
                          <span style={{ background: '#e2e8f0', borderRadius: '4px', padding: '2px 8px', fontWeight: 700, fontSize: '12px' }}>{l.layer_order}</span>
                        </td>
                        <td><strong>{l.name}</strong></td>
                        <td style={{ color: '#64748b' }}>{l.description || '—'}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => goToPositions(l)}
                          >
                            View Positions →
                          </button>
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit('layer', l)} style={{ marginRight: '4px' }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete('layer', l.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {layers.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No layers yet. Click "+ Add Layer" to create one.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Positions table */}
            {view === 'positions' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Description</th>
                      <th>L x W x H (ft)</th>
                      <th>Tolerance %</th>
                      <th>Stone Block</th>
                      <th>Total Cost</th>
                      <th>Stages</th>
                      <th>Dependencies</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(p => {
                      const block = stoneBlockById[p.stone_block_id];
                      return (
                        <tr key={p.id}>
                          <td>
                            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>{p.position_code}</code>
                          </td>
                          <td style={{ color: '#64748b' }}>{p.description || '-'}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {p.req_length ?? '-'} x {p.req_width ?? '-'} x {p.req_height ?? '-'}
                          </td>
                          <td>{p.tolerance_pct ?? 2}%</td>
                          <td style={{ color: '#64748b' }}>
                            {p.stone_block_id ? (
                              block ? (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {block.serial_no} (L:{block.length} W:{block.width} H:{block.height})
                                </span>
                              ) : (
                                `#${p.stone_block_id}`
                              )
                            ) : (
                              '-'
                            )}
                          </td>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Rs.{Number(p.total_cost || 0).toLocaleString('en-IN')}
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => openStages(p)}>Manage</button>
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => openDependencies(p)}>
                              Manage ({(dependencyByPosition[p.id] || []).length})
                            </button>
                          </td>
                          <td>
                            <span className={`badge badge-${p.status === 'completed' ? 'green' : p.status === 'in_progress' ? 'orange' : 'gray'}`}>
                              {p.status}
                            </span>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                              {p.stage_total > 0 ? (
                                <>
                                  {p.stage_status} • {p.stage_completed}/{p.stage_total} completed
                                </>
                              ) : (
                                'No stages'
                              )}
                            </div>
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit('position', p)} style={{ marginRight: '4px' }}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete('position', p.id)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                    {positions.length === 0 && (
                      <tr><td colSpan={10} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No positions yet. Click "+ Add Position" to create one.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {editMode ? 'Edit' : 'New'} {showModal === 'structure' ? 'Structure' : showModal === 'layer' ? `Layer — ${selectedStructure?.name}` : `Position — ${selectedLayer?.name}`}
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              {showModal === 'structure' && (<>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={form.name || ''} required onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Project</label>
                  <select
                    className="form-input"
                    value={form.project_id ?? ''}
                    onChange={e => setForm(p => ({ ...p, project_id: e.target.value ? Number(e.target.value) : null }))}
                  >
                    <option value="">-- None --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
              </>)}

              {showModal === 'layer' && (<>
                <div className="form-group">
                  <label className="form-label">Layer Order *</label>
                  <input className="form-input" type="number" min="1" value={form.layer_order || ''} required
                    placeholder="1 = bottom-most layer"
                    onChange={e => setForm(p => ({ ...p, layer_order: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={form.name || ''} required onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
              </>)}

              {showModal === 'position' && (<>
                <div className="form-group">
                  <label className="form-label">Position Code *</label>
                  <input className="form-input" value={form.position_code || ''} required
                    placeholder="e.g. F-01, W-03"
                    onChange={e => setForm(p => ({ ...p, position_code: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Length (ft)</label>
                    <input className="form-input" type="number" step="0.01" value={form.req_length || ''}
                      onChange={e => setForm(p => ({ ...p, req_length: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Width (ft)</label>
                    <input className="form-input" type="number" step="0.01" value={form.req_width || ''}
                      onChange={e => setForm(p => ({ ...p, req_width: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Height (ft)</label>
                    <input className="form-input" type="number" step="0.01" value={form.req_height || ''}
                      onChange={e => setForm(p => ({ ...p, req_height: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Stone Item Type</label>
                  <select
                    className="form-input"
                    disabled={itemsLoading}
                    value={form.stone_item_id ?? ''}
                    onChange={e => {
                      const value = e.target.value;
                      setForm(p => ({ ...p, stone_item_id: value ? Number(value) : null }));
                    }}
                  >
                    <option value="">-- All Stone Items --</option>
                    {itemsLoading && (
                      <option value="" disabled>Loading...</option>
                    )}
                    {!itemsLoading && stoneItemOptions.length === 0 && (
                      <option value="" disabled>No stone items available</option>
                    )}
                    {stoneItemOptions.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.name} (ID: {it.id})
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Filter stone blocks by item type.
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Stone Block Serial</label>
                  <select
                    className="form-input"
                    disabled={stoneLoading}
                    value={form.stone_block_id ?? ''}
                    onChange={e => {
                      const value = e.target.value;
                      const blockId = value ? Number(value) : null;
                      const block = blockId ? stoneBlockById[blockId] : null;
                      setForm(p => ({
                        ...p,
                        stone_block_id: blockId,
                        stone_item_id: block?.item_id ?? p.stone_item_id ?? null,
                      }));
                    }}
                  >
                    <option value="">-- None --</option>
                    {stoneLoading && (
                      <option value="" disabled>Loading...</option>
                    )}
                    {!stoneLoading && selectStoneBlocks.length === 0 && (
                      <option value="" disabled>No blocks available</option>
                    )}
                    {selectStoneBlocks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.serial_no} (L:{b.length} W:{b.width} H:{b.height})
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Select a stone block serial for this position (optional).
                    Enter L, W, H to filter available blocks within tolerance.
                  </div>
                  {!stoneLoading && selectStoneBlocks.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                      No blocks match the current filters. Check:
                      <span style={{ display: 'block', color: '#ef4444' }}>• Selected stone item type has no available blocks.</span>
                      <span style={{ display: 'block', color: '#ef4444' }}>• L/W/H + tolerance filters exclude all blocks.</span>
                      <span style={{ display: 'block', color: '#ef4444' }}>• Blocks are allocated to another project.</span>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Tolerance %</label>
                  <input className="form-input" type="number" step="0.1" value={form.tolerance_pct ?? 2.0}
                    onChange={e => setForm(p => ({ ...p, tolerance_pct: Number(e.target.value) }))} />
                </div>
              </>)}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editMode ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dependencyModal && (
        <div className="modal-overlay" onClick={() => setDependencyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px' }}>
            <div className="modal-title">Dependencies - {dependencyPos?.position_code}</div>
            {dependencyError && <div className="alert alert-error">{dependencyError}</div>}

            <div className="card" style={{ padding: '12px', marginBottom: '12px' }}>
              <div className="page-subtitle" style={{ marginBottom: '8px' }}>Add Predecessor</div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Depends On Position *</label>
                  <select
                    className="form-input"
                    value={dependencyForm.depends_on_id}
                    onChange={e => setDependencyForm({ depends_on_id: e.target.value })}
                  >
                    <option value="">-- Select Position --</option>
                    {dependencyOptions.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.position_code} ({p.status || 'pending'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={addDependency}
                    disabled={dependencySaving}
                  >
                    {dependencySaving ? 'Adding...' : 'Add Dependency'}
                  </button>
                </div>
              </div>
            </div>

            <div className="table-wrap" style={{ marginBottom: '12px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Predecessor</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dependencyLoading ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                        Loading dependencies...
                      </td>
                    </tr>
                  ) : (
                    <>
                      {currentDependencies.map((d, idx) => {
                        const pred = positionById[d.depends_on_id];
                        return (
                          <tr key={`${d.position_id}-${d.depends_on_id}-${idx}`}>
                            <td>{pred?.position_code || `Position #${d.depends_on_id}`}</td>
                            <td>{pred?.status || '-'}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => removeDependency(d.position_id, d.depends_on_id)}
                                disabled={dependencySaving}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {currentDependencies.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                            No dependencies configured.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDependencyModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {stageModal && (
        <div className="modal-overlay" onClick={() => { setStageModal(false); setAddStageModal(false); }}>
          <div className="modal blueprint-stage-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Stages — {stagePos?.position_code}
            </div>
            {stageError && <div className="alert alert-error">{stageError}</div>}
            {stageLoading ? (
              <div className="loading">Loading...</div>
            ) : (
              <>
                <div className="table-wrap" style={{ marginBottom: '12px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Stage</th>
                        <th>Order</th>
                        <th>Labor Hrs</th>
                        <th>Labor Rate</th>
                        <th>Material Cost</th>
                        <th>Stage Cost</th>
                        <th>Status</th>
                        <th>Remarks</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageList.map(s => (
                        <tr key={s.stage_id}>
                          <td><strong>{s.name}</strong></td>
                          <td>
                            <input
                              className="form-input"
                              type="number"
                              value={s.stage_order ?? ''}
                              onChange={e => updateStageField(s.stage_id, { stage_order: e.target.value === '' ? null : Number(e.target.value) })}
                            />
                          </td>
                          <td>
                            <input
                              className="form-input"
                              type="number"
                              step="0.01"
                              value={s.labor_hours ?? 0}
                              onChange={e => updateStageField(s.stage_id, { labor_hours: Number(e.target.value || 0) })}
                            />
                          </td>
                          <td>
                            <input
                              className="form-input"
                              type="number"
                              step="0.01"
                              value={s.labor_rate ?? 0}
                              onChange={e => updateStageField(s.stage_id, { labor_rate: Number(e.target.value || 0) })}
                            />
                          </td>
                          <td>
                            <input
                              className="form-input"
                              type="number"
                              step="0.01"
                              value={s.material_cost ?? 0}
                              onChange={e => updateStageField(s.stage_id, { material_cost: Number(e.target.value || 0) })}
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            Rs.{Number((Number(s.labor_hours || 0) * Number(s.labor_rate || 0)) + Number(s.material_cost || 0)).toLocaleString('en-IN')}
                          </td>
                          <td>
                            <select
                              className="form-input"
                              value={s.status || 'pending'}
                              onChange={e => updateStageField(s.stage_id, { status: e.target.value })}
                            >
                              <option value="pending">pending</option>
                              <option value="in_progress">in_progress</option>
                              <option value="completed">completed</option>
                            </select>
                          </td>
                          <td>
                            <input
                              className="form-input"
                              value={s.remarks || ''}
                              onChange={e => updateStageField(s.stage_id, { remarks: e.target.value })}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => setStageList(prev => prev.filter(x => x.stage_id !== s.stage_id))}
                              disabled={stageSaving}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {stageList.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                            No stages yet.
                          </td>
                        </tr>
                      )}
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
                          <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                          <td>{r.stage_name || '-'}</td>
                          <td>{r.item_name || '-'}</td>
                          <td>{r.stone_serial_no || '-'}</td>
                          <td>{Number(r.qty || 0)}</td>
                          <td>{r.warehouse_name || '-'}</td>
                          <td>{r.reason || '-'}</td>
                          <td>{r.remarks || '-'}</td>
                        </tr>
                      ))}
                      {stageScrapRows.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>No scrap records</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginBottom: '12px', fontWeight: 600, color: '#0f172a' }}>
                  Position Stage Total Cost: Rs.{Number(positionStageTotalCost || 0).toLocaleString('en-IN')}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setAddStageModal(true)}>Add Stage</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setScrapModal(true)}>Record Scrap</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setStageModal(false); setAddStageModal(false); }}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={saveStages} disabled={stageSaving}>
                    {stageSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {addStageModal && (
        <div className="modal-overlay" onClick={() => setAddStageModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px' }}>
            <div className="modal-title">Add Stage</div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Select Stage *</label>
                <select
                  className="form-input"
                  value={newStage.stage_id}
                  onChange={e => setNewStage(p => ({ ...p, stage_id: e.target.value }))}
                >
                  <option value="">-- Select --</option>
                  {stageMaster.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Order</label>
                <input
                  className="form-input"
                  type="number"
                  value={newStage.stage_order}
                  onChange={e => setNewStage(p => ({ ...p, stage_order: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Labor Hours</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={newStage.labor_hours}
                  onChange={e => setNewStage(p => ({ ...p, labor_hours: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Labor Rate</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={newStage.labor_rate}
                  onChange={e => setNewStage(p => ({ ...p, labor_rate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Material Cost</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={newStage.material_cost}
                  onChange={e => setNewStage(p => ({ ...p, material_cost: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Remarks</label>
                <input
                  className="form-input"
                  value={newStage.remarks}
                  onChange={e => setNewStage(p => ({ ...p, remarks: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setCreateStageModal(true)}>
                Create Stage Master
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setAddStageModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  const ok = addStageToPosition();
                  if (ok) setAddStageModal(false);
                }}
                disabled={stageSaving}
              >
                Add Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {scrapModal && (
        <div className="modal-overlay" onClick={() => setScrapModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-title">Record Scrap (Structure Stage)</div>
            <form onSubmit={submitScrap}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Item (for this position)</label>
                  <select
                    className="form-select"
                    value={scrapForm.item_id}
                    onChange={e => setScrapForm(p => ({ ...p, item_id: e.target.value, stone_block_id: '', serial_id: '', warehouse_id: '', qty: '' }))}
                  >
                    <option value="">Select...</option>
                    {allowedPositionItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  {scrapForm.item_id && !selectedScrapItemIsStone && (
                    <div className="form-help">Serials: {scrapItemSerialDisplay}</div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Stone Block (for this position)</label>
                  <select
                    className="form-select"
                    value={scrapForm.stone_block_id}
                    onChange={e => {
                      const value = e.target.value;
                      const blockId = value ? Number(value) : null;
                      const block = blockId ? stoneBlocks.find(b => b.id === blockId) : null;
                      setScrapForm(p => ({
                        ...p,
                        stone_block_id: value,
                        item_id: block?.item_id ? String(block.item_id) : p.item_id,
                        serial_id: '',
                        warehouse_id: '',
                      }));
                    }}
                    disabled={!!scrapForm.item_id && !selectedScrapItemIsStone}
                  >
                    <option value="">Select...</option>
                    {allowedPositionBlocks.map(b => {
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
              {scrapForm.item_id && selectedScrapItemHasSerial && !selectedScrapItemIsStone && !scrapForm.stone_block_id && (
                <div className="form-group">
                  <label className="form-label">Serial No *</label>
                  <select
                    className="form-select"
                    value={scrapForm.serial_id}
                    onChange={e => setScrapForm(p => ({ ...p, serial_id: e.target.value }))}
                    required
                  >
                    <option value="">Select serial...</option>
                    {scrapItemSerials.map(s => (
                      <option key={s.id} value={s.id}>{s.serial_no || `#${s.id}`}</option>
                    ))}
                  </select>
                </div>
              )}
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
                    <div className="form-help">Max allowed from this position allocation: {selectedPositionAllocatedQty}</div>
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
                  {stageList.map(s => <option key={s.stage_id} value={s.stage_id}>{s.name}</option>)}
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
            {stageError && <div className="alert alert-error">{stageError}</div>}
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
              <button type="button" className="btn btn-primary" onClick={createStageMaster} disabled={stageSaving}>
                {stageSaving ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
