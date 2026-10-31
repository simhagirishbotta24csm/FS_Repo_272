import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api.js';
import Splash from '../components/Splash.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(getToken()));

  // Restore the session from a stored token.
  useEffect(() => {
    if (!getToken()) return undefined;
    let alive = true;
    api
      .get('/auth/me')
      .then((me) => alive && setUser(me))
      .catch(() => setToken(null))
      .finally(() => alive && setBooting(false));
    return () => {
      alive = false;
    };
  }, []);

  // api.js fires this when the server rejects our token.
  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (identifier, password) => {
    const data = await api.post('/auth/login', { identifier, password });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (form) => {
    const data = await api.post('/auth/register', form);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, login, register, logout }),
    [user, login, register, logout]
  );

  if (booting) return <Splash />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
