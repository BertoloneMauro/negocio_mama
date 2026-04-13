// src/api/stock.js
import api from "./axios";

// Backend: GET /api/stock/:productId
export const getStockHistory = async (productId) =>
  (await api.get(`/stock/${productId}`)).data;

// ✅ alias por si en algún lado lo importaste con otro nombre
export const getProductStockHistory = getStockHistory;