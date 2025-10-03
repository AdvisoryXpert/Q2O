// src/lib/http-multipart.js
import axios from "axios";
import { getToken } from "../services/AuthService";

export const httpMultipart = axios.create({
  baseURL: "/api",
});

httpMultipart.interceptors.request.use((config) => {
  const token = getToken();
  config.headers = config.headers || {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
