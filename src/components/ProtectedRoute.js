import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getActiveCombat, isCombatInProgress } from '../utils/activeCombat';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const activeCombat = getActiveCombat();
  if (isCombatInProgress(activeCombat)) {
    if (location.pathname !== activeCombat.path) {
      return <Navigate to={activeCombat.path} replace />;
    }
  }

  return children;
}
