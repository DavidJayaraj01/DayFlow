import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth';

export default function ProtectedRoute() {
  const { isAuthenticated, accessToken, user } = useAuthStore();

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (user?.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
