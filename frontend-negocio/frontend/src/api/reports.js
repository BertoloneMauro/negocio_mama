import api from "./axios";

export const getReportSummary = async (from, to) => {
  const { data } = await api.get(`/reports/summary?from=${from}&to=${to}`);
  return data;
};

export const getReportDaily = async (from, to) => {
  const { data } = await api.get(`/reports/daily?from=${from}&to=${to}`);
  return data;
};

export const getTopProducts = async (from, to, limit = 10) => {
  const { data } = await api.get(`/reports/top-products?from=${from}&to=${to}&limit=${limit}`);
  return data;
};
