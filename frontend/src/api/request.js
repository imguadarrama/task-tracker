import { httpClient } from './httpClient.js';
import { ApiError } from './ApiError.js';

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
