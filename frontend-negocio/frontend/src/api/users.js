// src/api/users.js
import api from "./axios";

export const getUsers = async () => (await api.get("/users")).data;

export const createUserAdmin = async (payload) =>
  (await api.post("/users", payload)).data;

// updateUserAdmin: permite email/role/password en el mismo endpoint
export const updateUserAdmin = async (id, payload) =>
  (await api.patch(`/users/${id}`, payload)).data;

// activar/desactivar
export const setUserActiveAdmin = async (id, isActive) =>
  (await api.patch(`/users/${id}/active`, { isActive })).data;

// ✅ alias para que no te explote si Users.jsx usa resetUserPassword
export const resetUserPassword = async (id, password) =>
  updateUserAdmin(id, { password });

// ✅ alias para que no te explote si Users.jsx usa createUser/updateUser
export const createUser = createUserAdmin;
export const updateUser = updateUserAdmin;
