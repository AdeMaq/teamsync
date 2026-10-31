import { Routes, Route, Navigate } from 'react-router-dom';
import { useBootstrapAuth } from '../../features/auth';
import { WorkspaceGate } from '../../features/workspaces';
import GuestRoute from '../../shared/common/GuestRoute';
import ProtectedRoute from '../../shared/common/ProtectedRoute';
import AppShell from '../../shared/layout/AppShell';
import HomePage from '../../pages/HomePage';
import LoginPage from '../../pages/LoginPage';
import RegisterPage from '../../pages/RegisterPage';
import ForgotPasswordPage from '../../pages/ForgotPasswordPage';
import ResetPasswordPage from '../../pages/ResetPasswordPage';
import AcceptInvitePage from '../../pages/AcceptInvitePage';
import DashboardPage from '../../pages/DashboardPage';
import ProjectsPage from '../../pages/ProjectsPage';
import NewProjectPage from '../../pages/NewProjectPage';
import ProjectPage from '../../pages/ProjectPage';
import TeamPage from '../../pages/TeamPage';
import WorkspaceSettingsPage from '../../pages/WorkspaceSettingsPage';
import NewWorkspacePage from '../../pages/NewWorkspacePage';
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

      {/* Logged-in only */}
      <Route element={<ProtectedRoute />}>
        {/* Invitation link from an email: logged-out visitors log in first and come back here */}
        <Route path={ROUTES.invite} element={<AcceptInvitePage />} />

        {/* Sidebar + top bar layout */}
        <Route element={<AppShell />}>
          <Route path={ROUTES.profile} element={<ProfilePage />} />
          <Route path={ROUTES.newWorkspace} element={<NewWorkspacePage />} />

          {/* Pages that need a workspace: WorkspaceGate asks for one to be created if there is none yet */}
          <Route element={<WorkspaceGate />}>
            <Route path={ROUTES.dashboard} element={<DashboardPage />} />
            <Route path={ROUTES.projects} element={<ProjectsPage />} />
            <Route path={ROUTES.newProject} element={<NewProjectPage />} />
            <Route path={ROUTES.project} element={<ProjectPage />} />
            <Route path={ROUTES.messages} element={<PlaceholderPage title="Messages" />} />
            <Route path={ROUTES.team} element={<TeamPage />} />
            <Route path={ROUTES.settings} element={<WorkspaceSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
