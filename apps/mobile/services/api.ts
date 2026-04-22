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
    // Some call sites USE a 401 as a signal rather than a failure — most
    // notably the OTP screen probing `/wallet/summary` to decide whether a
    // Firebase-verified user is already registered in our own DB. Those
    // callers pass `skipAuthReset: true` on their request config so the
    // global "wipe auth state" side-effect below is suppressed. For every
    // other 401 it still fires — that's how we self-heal stale tokens.
    const skip = (error.config as any)?.skipAuthReset === true;
    if (error.response?.status === 401 && !skip) {
      authToken = null;
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export default api;
