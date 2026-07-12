import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getActiveCombat, isCombatInProgress } from '../utils/activeCombat';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const activeCombat = getActiveCombat();
  if (isCombatInProgress(activeCombat)) {
    const combatPath = `/combat/${activeCombat.zoneId}`;
    if (location.pathname !== combatPath) {
      return <Navigate to={combatPath} replace />;
    }
  }

  return children;
}
