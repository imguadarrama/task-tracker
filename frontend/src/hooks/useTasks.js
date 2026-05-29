import { useCallback, useEffect, useState } from 'react';
import { tasksApi } from '../api/tasksApi.js';

const EMPTY_FILTERS = { status: '', search: '' };

export function useTasks(token) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFiltersState] = useState(EMPTY_FILTERS);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let active = true;
    tasksApi
      .list(filters, token)
      .then((rows) => {
        if (!active) return;
        setTasks(rows);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, token, reloads]);

  const setFilters = useCallback((next) => {
    setLoading(true);
    setFiltersState(next);
  }, []);

  const reload = useCallback(() => setReloads((n) => n + 1), []);

  const create = useCallback(
    async (data) => {
      await tasksApi.create(data, token);
      reload();
    },
    [reload, token],
  );

  const update = useCallback(
    async (id, data) => {
      await tasksApi.update(id, data, token);
      reload();
    },
    [reload, token],
  );

  const remove = useCallback(
    async (id) => {
      await tasksApi.remove(id, token);
      reload();
    },
    [reload, token],
  );

  return { tasks, loading, error, filters, setFilters, create, update, remove };
}
