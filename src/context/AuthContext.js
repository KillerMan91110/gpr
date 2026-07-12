import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { clearActiveCombat, getActiveCombat, isCombatInProgress } from '../utils/activeCombat';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [player, setPlayer] = useState(() => {
    const stored = localStorage.getItem('player');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  useEffect(() => {
    if (player) localStorage.setItem('player', JSON.stringify(player));
    else localStorage.removeItem('player');
  }, [player]);

  async function login(email, password) {
    const data = await api.login({ email, password });
    setToken(data.token);
    setPlayer(data.player);
    return data.player;
  }

  async function register(payload) {
    const data = await api.register(payload);
    setToken(data.token);
    setPlayer(data.player);
    return data.player;
  }

  function logout() {
    // Salir en medio de un combate coop cuenta como abandono: dispara la penalización de
    // oro y deja al personaje jugado por la IA para no trabar a los demás (ver CoopBar.handleLeave).
    if (player && token && isCombatInProgress(getActiveCombat())) {
      api.leaveCoopParty(player.id, token).catch(() => {});
    }
    clearActiveCombat();
    setToken(null);
    setPlayer(null);
  }

  return (
    <AuthContext.Provider value={{ token, player, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
