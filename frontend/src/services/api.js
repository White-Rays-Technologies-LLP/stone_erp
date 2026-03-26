import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      window.location.href = '/login';
    }
    // Format validation errors with field names
    if (err.response?.data?.detail && Array.isArray(err.response.data.detail)) {
      err.response.data.detail = err.response.data.detail.map(e => {
        const field = e.loc ? e.loc[e.loc.length - 1] : 'Field';
        return `${field}: ${e.msg || e}`;
      }).join('; ');
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (username, password) => {
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);
    return axios.post(`${BASE_URL}/auth/login`, form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },
  me: () => api.get('/auth/me'),
  users: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const inventoryAPI = {
  categories: () => api.get('/inventory/categories'),
  createCategory: (data) => api.post('/inventory/categories', data),
  updateCategory: (id, data) => api.put(`/inventory/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/inventory/categories/${id}`),
  items: (params) => api.get('/inventory/items', { params }),
  createItem: (data) => api.post('/inventory/items', data),
  updateItem: (id, data) => api.put(`/inventory/items/${id}`, data),
  deleteItem: (id) => api.delete(`/inventory/items/${id}`),
  warehouses: () => api.get('/inventory/warehouses'),
  createWarehouse: (data) => api.post('/inventory/warehouses', data),
  updateWarehouse: (id, data) => api.put(`/inventory/warehouses/${id}`, data),
  deleteWarehouse: (id) => api.delete(`/inventory/warehouses/${id}`),
  stockMovement: (data) => api.post('/inventory/stock/movement', data),
  stockBalance: (params) => api.get('/inventory/stock/balance', { params }),
  stockLedger: (itemId, params) => api.get('/inventory/stock/ledger', { params: { ...params, item_id: itemId } }),
  serials: (params) => api.get('/inventory/serials', { params }),
  updateSerialStatus: (id, status) => api.put(`/inventory/serials/${id}/status`, null, { params: { status } }),
  deleteSerial: (id) => api.delete(`/inventory/serials/${id}`),
  deleteStockBalance: (itemId, warehouseId) => api.delete('/inventory/stock/balance', { params: { item_id: itemId, warehouse_id: warehouseId } }),
  scrap: () => api.get('/inventory/scrap'),
  createScrap: (data) => api.post('/inventory/scrap', data),
};

export const stonesAPI = {
  list: (params) => api.get('/stones/blocks', { params }),
  register: (data) => api.post('/stones/blocks', data),
  get: (id) => api.get(`/stones/blocks/${id}`),
  delete: (id) => api.delete(`/stones/blocks/${id}`),
  split: (id, data) => api.post(`/stones/blocks/${id}/split`, data),
  genealogy: (id) => api.get(`/stones/blocks/${id}/genealogy`),
  children: (id) => api.get(`/stones/blocks/${id}/children`),
};

export const blueprintsAPI = {
  structures: (params) => api.get('/blueprints/structures', { params }),
  createStructure: (data) => api.post('/blueprints/structures', data),
  updateStructure: (id, data) => api.put(`/blueprints/structures/${id}`, data),
  deleteStructure: (id) => api.delete(`/blueprints/structures/${id}`),
  layers: (structureTypeId) => api.get('/blueprints/layers', { params: { structure_type_id: structureTypeId } }),
  createLayer: (structureTypeId, data) => api.post('/blueprints/layers', { ...data, structure_type_id: structureTypeId }),
  updateLayer: (id, data) => api.put(`/blueprints/layers/${id}`, data),
  deleteLayer: (id) => api.delete(`/blueprints/layers/${id}`),
  positions: (layerId) => api.get('/blueprints/positions', { params: { layer_id: layerId } }),
  createPosition: (layerId, data) => api.post('/blueprints/positions', { ...data, layer_id: layerId }),
  updatePosition: (id, data) => api.put(`/blueprints/positions/${id}`, data),
  deletePosition: (id) => api.delete(`/blueprints/positions/${id}`),
  stages: () => api.get('/blueprints/stages'),
  createStage: (data) => api.post('/blueprints/stages', data),
  positionStages: (posId) => api.get(`/blueprints/positions/${posId}/stages`),
  updatePositionStages: (posId, data) => api.put(`/blueprints/positions/${posId}/stages`, data),
  dependencies: (structureTypeId) => api.get('/blueprints/dependencies', { params: { structure_type_id: structureTypeId } }),
  createDependency: (data) => api.post('/blueprints/dependencies', data),
  deleteDependency: (positionId, dependsOnId) => api.delete(`/blueprints/dependencies/${positionId}/${dependsOnId}`),
  gapReport: (structureTypeId) => api.get(`/blueprints/dependency-gap/${structureTypeId}`),
  updatePositionStatus: (posId, status) => api.put(`/blueprints/positions/${posId}/status`, null, { params: { status } }),
};

export const projectsAPI = {
  list: () => api.get('/projects/'),
  create: (data) => api.post('/projects/', data),
  get: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  reserveMaterials: (id, data) => api.post(`/projects/${id}/reserve-materials`, data),
  releaseMaterials: (id) => api.post(`/projects/${id}/release-materials`),
  reserveStatus: (id) => api.get(`/projects/${id}/reserve-status`),
};

export const manufacturingAPI = {
  idols: (params) => api.get('/manufacturing/idols', { params }),
  createIdol: (data) => api.post('/manufacturing/idols', data),
  getIdol: (id) => api.get(`/manufacturing/idols/${id}`),
  updateIdol: (id, data) => api.put(`/manufacturing/idols/${id}`, data),
  deleteIdol: (id) => api.delete(`/manufacturing/idols/${id}`),
  stages: (idolId) => api.get(`/manufacturing/idols/${idolId}/stages`),
  addStage: (data) => api.post('/manufacturing/stages', data),
  updateStage: (stageId, data) => api.put(`/manufacturing/stages/${stageId}`, data),
  deleteStage: (stageId) => api.delete(`/manufacturing/stages/${stageId}`),
  components: (params) => api.get('/manufacturing/components', { params }),
  createComponent: (data) => api.post('/manufacturing/components', data),
  updateComponentStatus: (id, params) => api.put(`/manufacturing/components/${id}/status`, null, { params }),
  deleteComponent: (id) => api.delete(`/manufacturing/components/${id}`),
  deletePhoto: (photoId) => api.delete(`/manufacturing/photos/${photoId}`),
  placeStock: (idolId, data) => api.post(`/manufacturing/idols/${idolId}/stock/place`, data),
  transferStock: (idolId, data) => api.post(`/manufacturing/idols/${idolId}/stock/transfer`, data),
  sellStock: (idolId, data) => api.post(`/manufacturing/idols/${idolId}/stock/sell`, data),
  idolStockMovements: (idolId) => api.get(`/manufacturing/idols/${idolId}/stock/movements`),
};

export const allocationsAPI = {
  list: (params) => api.get('/allocations/', { params }),
  allocate: (data) => api.post('/allocations/', data),
  release: (id) => api.delete(`/allocations/${id}`),
  transfer: (data) => api.post('/allocations/transfers', data),
  deleteTransfer: (id) => api.delete(`/allocations/transfers/${id}`),
};

export const jobworkAPI = {
  list: (params) => api.get('/job-work/', { params }),
  create: (data) => api.post('/job-work/', data),
  get: (id) => api.get(`/job-work/${id}`),
  update: (id, data) => api.put(`/job-work/${id}`, data),
  delete: (id) => api.delete(`/job-work/${id}`),
  processReturn: (id, data) => api.put(`/job-work/${id}/return`, data),
};

export const siteAPI = {
  dispatches: (params) => api.get('/site/dispatches', { params }),
  createDispatch: (data) => api.post('/site/dispatches', data),
  updateDispatch: (id, data) => api.put(`/site/dispatches/${id}`, data),
  confirmDispatch: (id) => api.post(`/site/dispatches/${id}/confirm`),
  dispatchFGInventory: (params) => api.get('/site/dispatches/fg-inventory', { params }),
  deleteDispatch: (id) => api.delete(`/site/dispatches/${id}`),
  installations: (params) => api.get('/site/installations', { params }),
  createInstallation: (data) => api.post('/site/installations', data),
  updateInstallation: (id, data) => api.put(`/site/installations/${id}`, data),
  deleteInstallation: (id) => api.delete(`/site/installations/${id}`),
  deleteInstallationPhoto: (photoId) => api.delete(`/site/installations/photos/${photoId}`),
  verifyInstallation: (id) => api.patch(`/site/installations/${id}/verify`),
  ewayBill: (dispatchId) => api.get(`/site/dispatches/${dispatchId}/eway-bill`),
  challan: (dispatchId) => api.get(`/site/dispatches/${dispatchId}/challan`),
};

export const contractorsAPI = {
  list: () => api.get('/contractors/'),
  create: (data) => api.post('/contractors/', data),
  get: (id) => api.get(`/contractors/${id}`),
  update: (id, data) => api.put(`/contractors/${id}`, data),
  delete: (id) => api.delete(`/contractors/${id}`),
  agreements: (contractorId) => api.get(`/contractors/${contractorId}/agreements`),
  allAgreements: () => api.get('/contractors/agreements'),
  createAgreement: (contractorId, data) => api.post(`/contractors/${contractorId}/agreements`, data),
  updateAgreement: (id, data) => api.put(`/contractors/agreements/${id}`, data),
  deleteAgreement: (id) => api.delete(`/contractors/agreements/${id}`),
  invoices: (params) => api.get('/contractors/invoices', { params }),
  createInvoice: (data) => api.post('/contractors/invoices', data),
  updateInvoice: (id, data) => api.put(`/contractors/invoices/${id}`, data),
  deleteInvoice: (id) => api.delete(`/contractors/invoices/${id}`),
  recordPayment: (invoiceId, data) => api.post(`/contractors/invoices/${invoiceId}/payment`, data),
};

export const billingAPI = {
  milestones: (projectId) => api.get('/billing/milestones', { params: projectId ? { project_id: projectId } : {} }),
  createMilestone: (data) => api.post('/billing/milestones', data),
  updateMilestone: (id, data) => api.put(`/billing/milestones/${id}`, data),
  deleteMilestone: (id) => api.delete(`/billing/milestones/${id}`),
  dispatchItems: (projectId) => api.get('/billing/dispatch-items', { params: { project_id: projectId } }),
  invoices: (params) => api.get('/billing/invoices', { params }),
  createInvoice: (data) => api.post('/billing/invoices', data),
  updateInvoice: (id, data) => api.put(`/billing/invoices/${id}`, data),
  invoicePdf: (id) => api.get(`/billing/invoices/${id}/pdf`, { responseType: 'blob' }),
  issueInvoice: (id) => api.post(`/billing/invoices/${id}/issue`),
  deleteInvoice: (id) => api.delete(`/billing/invoices/${id}`),
  recordPayment: (invoiceId, data) => api.post(`/billing/invoices/${invoiceId}/payment`, data),
  advancePayments: (params) => api.get('/billing/advance-payments', { params }),
  createAdvancePayment: (data) => api.post('/billing/advance-payments', data),
  deleteAdvancePayment: (id) => api.delete(`/billing/advance-payments/${id}`),
};

export const gstAPI = {
  calculate: (data) => api.post('/gst/calculate', data),
  gstr1: (params) => api.get('/gst/gstr1-export', { params }),
  projectCosts: (projectId) => api.get(`/gst/project-costs/${projectId}`),
  allProjectCosts: () => api.get('/gst/project-costs'),
  deleteProjectCost: (id) => api.delete(`/gst/project-costs/${id}`),
  marginReport: (projectId) => api.get(`/gst/margin-report/${projectId}`),
  allMarginReports: () => api.get('/gst/margin-report'),
};

export const auditAPI = {
  logs: (params) => api.get('/audit/logs', { params }),
};

export const reportsAPI = {
  projectSummary: (params) => api.get('/reports/project-summary', { params }),
  projectCosting: (params) => api.get('/reports/project-costing', { params }),
  projectProfitability: (params) => api.get('/reports/project-profitability', { params }),
  projectProfitabilityIdols: (params) => api.get('/reports/project-profitability-idols', { params }),
  projectProfitabilityStructures: (params) => api.get('/reports/project-profitability-structures', { params }),
  blueprintPositionProgress: (params) => api.get('/reports/blueprint-position-progress', { params }),
  positionDependencyHealth: (params) => api.get('/reports/position-dependency-health', { params }),
  installationReport: (params) => api.get('/reports/installation-report', { params }),
  stockBalance: () => api.get('/reports/stock-balance'),
  stockLedgerMovement: (params) => api.get('/inventory/stock/ledger', { params }),
  serializedStock: () => api.get('/reports/serialized-stock'),
  idolSummary: (params) => api.get('/reports/idol-summary', { params }),
  idolStageProgress: (params) => api.get('/reports/idol-stage-progress', { params }),
  idolMaterialConsumption: (params) => api.get('/reports/idol-material-consumption', { params }),
  stoneBlockAvailability: (params) => api.get('/reports/stone-block-availability', { params }),
  scrapReport: () => api.get('/reports/scrap-report'),
  purchaseOrders: (params) => api.get('/purchase/orders', { params }),
  purchaseReceipts: (params) => api.get('/purchase/receipts', { params }),
  purchasePayments: (params) => api.get('/purchase/payments', { params }),
};

export default api;
