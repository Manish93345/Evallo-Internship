import axios from 'axios';

/**
 * Centralised axios instance. In dev, Vite's proxy forwards /api → backend,
 * so we leave baseURL relative. In production we point at the deployed API.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({
  baseURL: `${baseURL}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Phase 1 will add the auth-token interceptor and 401-refresh logic here.
