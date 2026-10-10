import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuthStatus } from '../../features/auth';
import { ROUTES } from '../../app/routes/routePaths';
import Loader from './Loader';

// Login/Register: logged-in users are sent on to where they were headed (or the workspaces page).
export default function GuestRoute() {
  const status = useSelector(selectAuthStatus);
  const location = useLocation();

  if (status === 'checking') return <Loader />;
  if (status === 'authenticated') {
    const from = location.state?.from?.pathname;
    return <Navigate to={from ?? ROUTES.workspaces} replace />;
  }
  return <Outlet />;
}
