import axios from 'axios';
import { config } from '../constants/config';

const api = axios.create({
  baseURL: `${config.apiUrl}${config.apiPrefix}`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;

// Registered by the auth store so the 401 interceptor can clear persisted
// auth state + route back to welcome. Exposed via a setter (not a direct
// import) to avoid a circular import with authStore, which itself imports
// this module to attach the token on rehydrate.
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function registerOnUnauthorized(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.request.use((req) => {
  if (authToken) {
    req.headers.Authorization = `Bearer ${authToken}`;
  }
  return req;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Either the token expired or the persisted auth blob is stale from
      // a previous install. Drop the local session — the auth gate will
      // route the user to /welcome on next render.
      authToken = null;
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export default api;
