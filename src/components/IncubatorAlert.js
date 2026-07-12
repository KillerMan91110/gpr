import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getActiveCombat, isCombatInProgress } from '../utils/activeCombat';

const POLL_MS = 20000;
const TOAST_MS = 8000;

// Alerta global (mismo criterio que CoopBar): visible en cualquier pantalla mientras estás
// logueado, avisa apenas el huevo en incubación queda listo. Polling porque el back no tiene
// websockets.
export default function IncubatorAlert() {
  const { player, token, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [incubator, setIncubator] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const announcedRef = useRef(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !player) {
      setIncubator(null);
      return undefined;
    }
    async function poll() {
      try {
        const data = await api.getIncubator(player.id, token);
        setIncubator(data);
        if (data?.ready && !announcedRef.current) {
          // Primera vez que vemos este huevo listo: avisamos una sola vez con el toast,
          // no en cada poll de 20s mientras siga sin reclamar.
          announcedRef.current = true;
          setToastVisible(true);
          clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToastVisible(false), TOAST_MS);
        } else if (!data?.ready) {
          announcedRef.current = false;
        }
      } catch {
        // silencioso: reintenta en el próximo poll
      }
    }
    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => clearInterval(iv);
  }, [isAuthenticated, player, token]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  if (!isAuthenticated || !player) return null;
  if (location.pathname === '/login' || location.pathname === '/register') return null;
  if (location.pathname === '/pets') return null;
  if (!incubator?.ready) return null;

  const inCombat = isCombatInProgress(getActiveCombat());

  // En combate, "Ir a reclamar" no sirve: ProtectedRoute te devuelve al combate apenas
  // navegás a otro lado mientras hay una pelea en curso. Ahí solo avisamos con un toast
  // que se cierra solo — reclamás cuando termines o salgas de la pelea.
  if (inCombat) {
    if (!toastVisible) return null;
    return (
      <div className="incubator-alert rpg-panel">
        <span className="incubator-alert-text">
          🥚 ¡{incubator.egg_name} está listo para eclosionar!
        </span>
      </div>
    );
  }

  return (
    <div className="incubator-alert rpg-panel">
      <span className="incubator-alert-text">
        🥚 ¡{incubator.egg_name} está listo para eclosionar!
      </span>
      <button className="rpg-button rpg-button--small" onClick={() => navigate('/pets')}>
        Ir a reclamar
      </button>
    </div>
  );
}
