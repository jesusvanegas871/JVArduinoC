const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      let errorDetail = 'Error en la solicitud a la API';
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || JSON.stringify(errJson);
      } catch (e) {
        errorDetail = await response.text();
      }
      throw new Error(errorDetail);
    }
    return await response.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export const apiService = {
  // --- DASHBOARD ---
  getDashboardStats: () => request('/dashboard/stats'),

  // --- PRODUCTS ---
  getCategories: () => request('/products/categories'),
  getProducts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category_id) query.append('category_id', params.category_id);
    if (params.is_active !== undefined) query.append('is_active', params.is_active);
    const qStr = query.toString();
    return request(`/products${qStr ? `?${qStr}` : ''}`);
  },
  getProductById: (id) => request(`/products/${id}`),
  createProduct: (productData) => request('/products', { method: 'POST', body: JSON.stringify(productData) }),
  updateProduct: (id, productData) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(productData) }),
  deactivateProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // --- INVENTORY ---
  getInventoryStock: () => request('/inventory/stock'),
  getInventoryMovements: (productId = null, limit = 100) => {
    const query = new URLSearchParams();
    if (productId) query.append('product_id', productId);
    if (limit) query.append('limit', limit);
    return request(`/inventory/movements?${query.toString()}`);
  },
  createMovement: (movementData) => request('/inventory/movements', { method: 'POST', body: JSON.stringify(movementData) }),

  // --- LOCATIONS ---
  getLocations: () => request('/locations'),
  createLocation: (locationData) => request('/locations', { method: 'POST', body: JSON.stringify(locationData) }),
  getLocationStock: (code) => request(`/locations/${code}/stock`),

  // --- ORDERS ---
  getOrders: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status_filter) query.append('status_filter', params.status_filter);
    if (params.product_id) query.append('product_id', params.product_id);
    const qStr = query.toString();
    return request(`/orders${qStr ? `?${qStr}` : ''}`);
  },
  getOrderById: (id) => request(`/orders/${id}`),
  createOrder: (orderData) => request('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  cancelOrder: (id, reason) => {
    const q = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return request(`/orders/${id}/cancel${q}`, { method: 'POST' });
  },

  // --- MISSIONS ---
  getMissions: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status_filter) query.append('status_filter', params.status_filter);
    if (params.order_id) query.append('order_id', params.order_id);
    const qStr = query.toString();
    return request(`/missions${qStr ? `?${qStr}` : ''}`);
  },
  getMissionById: (id) => request(`/missions/${id}`),
  createMission: (missionData) => request('/missions', { method: 'POST', body: JSON.stringify(missionData) }),
  recordMissionEvent: (missionId, eventData) => request(`/missions/${missionId}/events`, { method: 'POST', body: JSON.stringify(eventData) })
};
