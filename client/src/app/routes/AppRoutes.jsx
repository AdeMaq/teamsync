import { Routes, Route, Navigate } from 'react-router-dom';
import { useBootstrapAuth } from '../../features/auth';
import GuestRoute from '../../shared/common/GuestRoute';
import ProtectedRoute from '../../shared/common/ProtectedRoute';
import AppShell from '../../shared/layout/AppShell';
import HomePage from '../../pages/HomePage';
import LoginPage from '../../pages/LoginPage';
import RegisterPage from '../../pages/RegisterPage';
import ForgotPasswordPage from '../../pages/ForgotPasswordPage';
import ResetPasswordPage from '../../pages/ResetPasswordPage';
import DashboardPage from '../../pages/DashboardPage';
import ProfilePage from '../../pages/ProfilePage';
import PlaceholderPage from '../../pages/PlaceholderPage';
import { ROUTES } from './routePaths';

export default function AppRoutes() {
  useBootstrapAuth(); // restore the session on page load

  return (
    <Routes>
      {/* Public landing page, shown before sign-in */}
      <Route path={ROUTES.home} element={<HomePage />} />

      {/* Login / Register: logged-in users are redirected to the dashboard */}
      <Route element={<GuestRoute />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
      </Route>

      {/* Password recovery works whether or not the visitor is logged in */}
      <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />

      {/* Logged-in app: sidebar + top bar layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.projects} element={<PlaceholderPage title="Projects" />} />
          <Route path={ROUTES.messages} element={<PlaceholderPage title="Messages" />} />
          <Route path={ROUTES.team} element={<PlaceholderPage title="Team" />} />
          <Route path={ROUTES.settings} element={<PlaceholderPage title="Settings" />} />
          <Route path={ROUTES.profile} element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
