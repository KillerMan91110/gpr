import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Dashboard from './Dashboard';
import Landing from './Landing';

export default function Home() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Landing />;
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
