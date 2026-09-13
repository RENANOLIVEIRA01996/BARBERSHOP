import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getToken } from '../api/client';

// Protege as rotas do painel — redireciona para login se não houver token.
export default function AdminGuard() {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}