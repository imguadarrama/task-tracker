import axios from 'axios';
import { ApiError } from './ApiError.js';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'taskTracker.token';

const httpClient = axios.create({ baseURL });

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export async function request(url, { method = 'get', data, token } = {}) {
  try {
    const response = await httpClient.request({
      url,
      method,
      data,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

function toApiError(error) {
  if (error.response) {
    return new ApiError(
      error.response.data?.error ?? 'Request failed',
      error.response.status,
    );
  }
  return new ApiError('Unable to reach the server', 0);
}
