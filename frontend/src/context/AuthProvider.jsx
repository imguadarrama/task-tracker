import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext.js";
import { tokenStore } from "../api/client.js";
import * as authApi from "../api/authApi.js";

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
      .then((me) => {
        if (!active) return;
        setToken(stored);
        setUser(me);
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
    const { token: issued } = await authApi.login(username, password);
    const me = await authApi.getMe(issued);
    tokenStore.set(issued);
    setToken(issued);
    setUser(me);
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
