import { Routes, Route, Navigate } from 'react-router-dom';
import { useBootstrapAuth } from '../../features/auth';
import GuestRoute from '../../shared/common/GuestRoute';
import ProtectedRoute from '../../shared/common/ProtectedRoute';
import LoginPage from '../../pages/LoginPage';
import RegisterPage from '../../pages/RegisterPage';
import WorkspacePage from '../../pages/WorkspacePage';
import { ROUTES } from './routePaths';

export default function AppRoutes() {
  useBootstrapAuth(); // restore the session on page load

  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path={ROUTES.workspaces} element={<WorkspacePage />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
    </Routes>
  );
}
