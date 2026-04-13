import axios from "axios";

const api = axios.create({
  baseURL: "/api", // ✅ mismo origen (mismo puerto)
});

const storedTheme = localStorage.getItem("uiTheme");
if (storedTheme === "dark" || storedTheme === "light") {
  document.documentElement.dataset.theme = storedTheme;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
