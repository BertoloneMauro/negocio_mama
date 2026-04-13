import api from "./axios";

export const createPurchase = async (items, supplier = "") => {
  const { data } = await api.post("/purchases", { items, supplier });
  return data;
};

export const getPurchases = async (period = "today") => {
  const { data } = await api.get("/purchases", { params: { period } });
  return data;
};

export const getPurchaseById = async (id) => {
  const { data } = await api.get(`/purchases/${id}`);
  return data;
};