import axios from "axios";

const TOKEN_KEY = "morpheus.token";
// `??` (not `||`) so an explicit empty VITE_API_URL means "same origin" (relative
// /api/v1) — used when the built SPA is served by the backend behind one URL/tunnel.
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8010";

export const api = axios.create({ baseURL: `${API_BASE}/api/v1` });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked — session still works */
  }
}

/** Extract a human message from our typed error envelope. */
export function apiError(e: unknown): string {
  const detail = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
  return detail || "Something went wrong. Please try again.";
}
