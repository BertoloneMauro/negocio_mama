import api from "./axios";

export const getCashToday = async () => {
  const { data } = await api.get("/cash/today");
  return data;
};

export const closeCashToday = async () => {
  const { data } = await api.post("/cash/close");
  return data;
};

export const getCashClosuresRange = async (from, to) => {
  const { data } = await api.get(`/cash/closures?from=${from}&to=${to}`);
  return data;
};
