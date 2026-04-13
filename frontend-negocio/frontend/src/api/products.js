import api from "./axios";

export const getProducts = async () => {
  const { data } = await api.get("/products");
  return data;
};

export const createProduct = async (payload) => {
  const { data } = await api.post("/products", payload);
  return data;
};

export const updateProduct = async (id, payload) => {
  const { data } = await api.put(`/products/${id}`, payload);
  return data;
};

export const deleteProduct = async (id) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

// opcional: stock directo
export const updateProductStock = async (productId, quantity) => {
  const { data } = await api.patch(`/products/${productId}/stock`, {
    amount: quantity,
  });

  return data;
};

export const getLowStock = async () => {
  const { data } = await api.get("/products/low-stock");
  return data;
};

