// src/lib/http.js (or .ts)
import axios from "axios";
import { getToken } from "../services/AuthService";

export const http = axios.create({
  baseURL: "/api",                // Vite proxy to your backend
  headers: { "Content-Type": "application/json" },
});

let loggedOnce = false;

http.interceptors.request.use((config) => {
  const token = getToken();       // Must return the *same* value you save after login
  config.headers = config.headers || {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    if (!loggedOnce) {
      console.warn("[HTTP] No token from getToken(); Authorization header will be missing");
      loggedOnce = true;
    }
  }
  return config;
});
