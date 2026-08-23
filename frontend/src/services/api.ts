import axios from 'axios';
import { store } from '../store';
import { setCredentials, logout, updateToken, updateUser } from '../slices/authSlice';

// Dynamic API base URL (uses VITE_API_BASE_URL or relative '/api' for production/proxied deployments)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create base axios client
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for receiving/sending HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Shared singleton promise for refreshing access tokens concurrently
let refreshTokenPromise: Promise<string> | null = null;

// Helper: Check if request URL belongs to a public auth endpoint
const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  const authPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/verify-otp',
    '/auth/reset-password-otp',
    '/auth/refresh',
    '/auth/logout',
  ];
  return authPaths.some((path) => url.includes(path));
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';

    // Guard 1: Direct logout on failed refresh endpoint request
    if (requestUrl.includes('/auth/refresh')) {
      store.dispatch(logout());
      return Promise.reject(error);
    }

    // Guard 2: Bypass token refresh for all public auth endpoints (/auth/login, /auth/register, etc.)
    if (isAuthEndpoint(requestUrl)) {
      return Promise.reject(error);
    }

    // Check if error is 401 and request has not been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!refreshTokenPromise) {
          refreshTokenPromise = (async () => {
            try {
              const res = await axios.post(
                `${API_BASE_URL}/auth/refresh`,
                {},
                { withCredentials: true }
              );
              const newAccessToken = res.data.accessToken;
              store.dispatch(updateToken(newAccessToken));
              if (res.data.user) {
                store.dispatch(updateUser(res.data.user));
              }
              return newAccessToken;
            } catch (refreshErr) {
              store.dispatch(logout());
              throw refreshErr;
            } finally {
              refreshTokenPromise = null;
            }
          })();
        }

        const newAccessToken = await refreshTokenPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
export default api;
