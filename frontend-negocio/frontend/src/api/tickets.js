import api from "./axios";

export const createTicket = async (saleId, items, subtotal, discountPercent, discountAmount, total, saleDate) => {
  const { data } = await api.post("/tickets", {
    saleId,
    items,
    subtotal,
    discountPercent,
    discountAmount,
    total,
    saleDate
  });
  return data;
};

export const getTickets = async () => {
  const { data } = await api.get("/tickets");
  return data;
};

export const getTicketsByRange = async (from, to) => {
  const { data } = await api.get(`/tickets/range?from=${from}&to=${to}`);
  return data;
};

export const getTicketById = async (id) => {
  const { data } = await api.get(`/tickets/${id}`);
  return data;
};

export const updateTicket = async (id, customName, notes) => {
  const { data } = await api.put(`/tickets/${id}`, { customName, notes });
  return data;
};

export const deleteTicket = async (id) => {
  const { data } = await api.delete(`/tickets/${id}`);
  return data;
};

export const markTicketAsPrinted = async (id) => {
  const { data } = await api.post(`/tickets/${id}/printed`);
  return data;
};