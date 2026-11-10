// auth.jsx
// Who is logged in, shared with React Context. The token is kept in localStorage.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch((err) => {
        if (err.status === 401 || err.status === 403) setToken(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const signIn = useCallback(async (path, body) => {
    const d = await api(path, { method: 'POST', body });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);
  const login = useCallback((email, password) => signIn('/auth/login', { email, password }), [signIn]);
  const register = useCallback((name, email, password) => signIn('/auth/register', { name, email, password }), [signIn]);
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const canEdit = user?.role === 'editor' || user?.role === 'admin';
  const value = useMemo(() => ({ user, setUser, checking, login, register, logout, canEdit }), [user, checking, login, register, logout, canEdit]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
