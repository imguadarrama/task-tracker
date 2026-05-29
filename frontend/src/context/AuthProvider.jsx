import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext.js";
import { tokenStore } from "../api/client.js";
import { authApi } from "../api/authApi.js";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() =>
    tokenStore.get() ? "loading" : "anonymous",
  );

  useEffect(() => {
    const stored = tokenStore.get();
    if (!stored) return undefined;

    let active = true;
    authApi
      .getMe(stored)
      .then((account) => {
        if (!active) return;
        setToken(stored);
        setUser(account);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        tokenStore.clear();
        setStatus("anonymous");
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const session = await authApi.login(username, password);
    const account = await authApi.getMe(session.token);
    tokenStore.set(session.token);
    setToken(session.token);
    setUser(account);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (username, password) => {
      await authApi.register(username, password);
      await login(username, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({ token, user, status, login, register, logout }),
    [token, user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
