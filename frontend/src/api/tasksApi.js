import { request } from './request.js';

function toParams({ status, search } = {}) {
  return {
    ...(status && { status }),
    ...(search && { search }),
  };
}

export const tasksApi = {
  list: (filters, token) => request('/tasks', { params: toParams(filters), token }),

  create: (data, token) => request('/tasks', { method: 'post', data, token }),

  update: (id, data, token) =>
    request(`/tasks/${id}`, { method: 'put', data, token }),

  remove: (id, token) => request(`/tasks/${id}`, { method: 'delete', token }),
};
