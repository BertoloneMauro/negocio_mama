import api from "./axios";

export const createSale = async (items, discountPercent = 0) => {
  const { data } = await api.post("/sales", { items, discountPercent });
  return data;
};

export const getTodaySales = async () => {
  const { data } = await api.get("/sales/today");
  return data;
};

export const getSalesRange = async (from, to) => {
  const { data } = await api.get(`/sales/range?from=${from}&to=${to}`);
  return data;
};
export const voidSale = async (id, reason = "") => {
  const { data } = await api.post(`/sales/${id}/void`, { reason });
  return data;
};

export const refundSale = async (id, reason = "") => {
  const { data } = await api.post(`/sales/${id}/refund`, { reason });
  return data;
};