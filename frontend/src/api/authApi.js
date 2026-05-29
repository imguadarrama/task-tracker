import { request } from './client.js';

export const authApi = {
  register: (username, password) =>
    request('/register', { method: 'post', data: { username, password } }),

  login: (username, password) =>
    request('/login', { method: 'post', data: { username, password } }),

  getMe: (token) => request('/me', { token }),
};
