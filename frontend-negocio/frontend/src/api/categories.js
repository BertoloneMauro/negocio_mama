import api from "./axios";

export const getCategories = async (all = false) => {
  const { data } = await api.get(`/categories${all ? "?all=true" : ""}`);
  return data;
};

export const createCategory = async (name) => {
  const { data } = await api.post("/categories", { name });
  return data;
};

export const updateCategory = async (id, name) => {
  const { data } = await api.put(`/categories/${id}`, { name });
  return data;
};

export const setCategoryActive = async (id, isActive) => {
  const { data } = await api.patch(`/categories/${id}/active`, { isActive });
  return data;
};
