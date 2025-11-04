import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3000",
});

// Interceptor: agrega el token automáticamente a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});