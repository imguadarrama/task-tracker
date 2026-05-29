import { api } from './client.js';

export const register = (username, password) =>
  api('/register', { method: 'POST', body: { username, password } });

export const login = (username, password) =>
  api('/login', { method: 'POST', body: { username, password } });

export const getMe = (token) => api('/me', { token });
