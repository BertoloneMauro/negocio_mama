import api from "./axios";

export const getSettings = async () => (await api.get("/settings")).data;
export const updateSettings = async (payload) =>
  (await api.patch("/settings", payload)).data;