import api from "./axios";

export const loginRequest = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  return data; // { token, user }
};

export const meRequest = async () => {
  const { data } = await api.get("/auth/me");
  return data; // user
};
