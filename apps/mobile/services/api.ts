import axios from 'axios';
import { config } from '../constants/config';

const api = axios.create({
  baseURL: `${config.apiUrl}${config.apiPrefix}`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
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
      // Token expired — handled by auth store
    }
    return Promise.reject(error);
  },
);

export default api;
