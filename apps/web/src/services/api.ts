const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { idempotencyKey?: string } = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.idempotencyKey) {
    headers['idempotency-key'] = options.idempotencyKey;
  }

  // Check for stored token in localStorage or sessionStorage
  const storedToken =
    localStorage.getItem('pos_token') || sessionStorage.getItem('pos_token');
  if (
    storedToken &&
    !headers['Authorization'] &&
    !headers['authorization']
  ) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends cookies
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = json?.error || {
      code: 'UNKNOWN_ERROR',
      message: response.statusText || 'Request failed',
    };
    throw new ApiError(
      errorPayload.code,
      errorPayload.message,
      errorPayload.details,
      response.status
    );
  }

  return json?.data ?? json;
}

export const api = {
  // Auth
  register: (body: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  me: () => apiRequest('/auth/me'),

  // Businesses
  getBusinesses: () => apiRequest('/businesses'),
  createBusiness: (body: any) => apiRequest('/businesses', { method: 'POST', body: JSON.stringify(body) }),
  getBranches: (bizId: string) => apiRequest(`/businesses/${bizId}/branches`),
  createBranch: (bizId: string, body: any) => apiRequest(`/businesses/${bizId}/branches`, { method: 'POST', body: JSON.stringify(body) }),
  getMembers: (bizId: string) => apiRequest(`/businesses/${bizId}/members`),
  inviteEmployee: (bizId: string, body: any) => apiRequest(`/businesses/${bizId}/invitations`, { method: 'POST', body: JSON.stringify(body) }),

  // Registers & Sessions
  getRegisters: (bizId: string, branchId?: string) =>
    apiRequest(`/businesses/${bizId}/registers${branchId ? `?branchId=${branchId}` : ''}`),
  createRegister: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/registers`, { method: 'POST', body: JSON.stringify(body) }),
  openSession: (bizId: string, body: { registerId: string; openingCash: string }) =>
    apiRequest(`/businesses/${bizId}/registers/open`, { method: 'POST', body: JSON.stringify(body) }),
  getCurrentSession: (bizId: string, registerId: string) =>
    apiRequest(`/businesses/${bizId}/registers/${registerId}/current-session`),
  closeSession: (bizId: string, sessionId: string, body: { closingCash: string }) =>
    apiRequest(`/businesses/${bizId}/registers/sessions/${sessionId}/close`, { method: 'POST', body: JSON.stringify(body) }),
  recordCashMovement: (bizId: string, sessionId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/registers/sessions/${sessionId}/cash-movement`, { method: 'POST', body: JSON.stringify(body) }),

  // Categories & Products
  getCategories: (bizId: string) => apiRequest(`/businesses/${bizId}/categories`),
  createCategory: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/categories`, { method: 'POST', body: JSON.stringify(body) }),
  getProducts: (bizId: string, query: any = {}) => {
    const sp = new URLSearchParams();
    if (query.search) sp.set('search', query.search);
    if (query.categoryId) sp.set('categoryId', query.categoryId);
    return apiRequest(`/businesses/${bizId}/products?${sp.toString()}`);
  },
  createProduct: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/products`, { method: 'POST', body: JSON.stringify(body) }),
  lookupBarcode: (bizId: string, barcode: string) =>
    apiRequest(`/businesses/${bizId}/products/lookup/${encodeURIComponent(barcode)}`),

  // Inventory
  getInventoryLocations: (bizId: string, branchId?: string) =>
    apiRequest(`/businesses/${bizId}/inventory/locations${branchId ? `?branchId=${branchId}` : ''}`),
  getInventoryBalances: (bizId: string, query: any = {}) => {
    const sp = new URLSearchParams();
    if (query.branchId) sp.set('branchId', query.branchId);
    if (query.productId) sp.set('productId', query.productId);
    return apiRequest(`/businesses/${bizId}/inventory?${sp.toString()}`);
  },
  adjustStock: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/inventory/adjustments`, { method: 'POST', body: JSON.stringify(body) }),
  getInventoryMovements: (bizId: string, query: any = {}) => {
    const sp = new URLSearchParams();
    if (query.productId) sp.set('productId', query.productId);
    return apiRequest(`/businesses/${bizId}/inventory/movements?${sp.toString()}`);
  },
  reconcileInventory: (bizId: string, body: { productId: string; locationId: string }) =>
    apiRequest(`/businesses/${bizId}/inventory/reconcile`, { method: 'POST', body: JSON.stringify(body) }),

  // Sales & Checkout
  checkout: (bizId: string, body: any, idempotencyKey?: string) =>
    apiRequest(`/businesses/${bizId}/sales`, {
      method: 'POST',
      body: JSON.stringify(body),
      idempotencyKey,
    }),
  getSales: (bizId: string, query: any = {}) => {
    const sp = new URLSearchParams();
    if (query.branchId) sp.set('branchId', query.branchId);
    return apiRequest(`/businesses/${bizId}/sales?${sp.toString()}`);
  },
  getSaleById: (bizId: string, saleId: string) =>
    apiRequest(`/businesses/${bizId}/sales/${saleId}`),

  // Returns
  processReturn: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/returns`, { method: 'POST', body: JSON.stringify(body) }),
  getReturns: (bizId: string) => apiRequest(`/businesses/${bizId}/returns`),

  // Purchasing & Suppliers
  getSuppliers: (bizId: string) => apiRequest(`/businesses/${bizId}/suppliers`),
  createSupplier: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/suppliers`, { method: 'POST', body: JSON.stringify(body) }),
  getPurchaseOrders: (bizId: string) => apiRequest(`/businesses/${bizId}/purchase-orders`),
  createPurchaseOrder: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/purchase-orders`, { method: 'POST', body: JSON.stringify(body) }),
  receiveGoods: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/goods-receipts`, { method: 'POST', body: JSON.stringify(body) }),

  // Expenses
  getExpenses: (bizId: string, branchId?: string) =>
    apiRequest(`/businesses/${bizId}/expenses${branchId ? `?branchId=${branchId}` : ''}`),
  recordExpense: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/expenses`, { method: 'POST', body: JSON.stringify(body) }),

  // Customers
  getCustomers: (bizId: string, search?: string) =>
    apiRequest(`/businesses/${bizId}/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createCustomer: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/customers`, { method: 'POST', body: JSON.stringify(body) }),

  // Reports
  getSalesReport: (bizId: string, query: any = {}) => {
    const sp = new URLSearchParams();
    if (query.branchId) sp.set('branchId', query.branchId);
    if (query.fromDate) sp.set('fromDate', query.fromDate);
    if (query.toDate) sp.set('toDate', query.toDate);
    return apiRequest(`/businesses/${bizId}/reports/sales?${sp.toString()}`);
  },
  getInventoryReport: (bizId: string, branchId?: string) =>
    apiRequest(`/businesses/${bizId}/reports/inventory${branchId ? `?branchId=${branchId}` : ''}`),
  getProfitReport: (bizId: string, query: any = {}) => {
    const sp = new URLSearchParams();
    if (query.branchId) sp.set('branchId', query.branchId);
    return apiRequest(`/businesses/${bizId}/reports/profit?${sp.toString()}`);
  },

  // Industry
  getRestaurantTables: (bizId: string, branchId?: string) =>
    apiRequest(`/businesses/${bizId}/industry/restaurant/tables${branchId ? `?branchId=${branchId}` : ''}`),
  createRestaurantTable: (bizId: string, body: any) =>
    apiRequest(`/businesses/${bizId}/industry/restaurant/tables`, { method: 'POST', body: JSON.stringify(body) }),
  getMedicines: (bizId: string) =>
    apiRequest(`/businesses/${bizId}/industry/pharmacy/medicines`),
  getSerials: (bizId: string, productId?: string) =>
    apiRequest(`/businesses/${bizId}/industry/electronics/serials${productId ? `?productId=${productId}` : ''}`),

  // Audit Logs
  getAuditLogs: (bizId: string, limit = 50, offset = 0) =>
    apiRequest(`/businesses/${bizId}/audit-logs?limit=${limit}&offset=${offset}`),
};
