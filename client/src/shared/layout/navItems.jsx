import { ROUTES } from '../../app/routes/routePaths';
import { ChatIcon, FolderIcon, GridIcon, SettingsIcon, UsersIcon } from '../ui/icons';

// Single source for the sidebar links and the top bar title/subtitle.
// The Dashboard subtitle is a static sprint label until sprints exist in the backend.
export const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: GridIcon, subtitle: 'Sprint 14 · Aug 1 – Aug 14' },
  { to: ROUTES.projects, label: 'Projects', icon: FolderIcon, subtitle: 'Everything your team is building' },
  { to: ROUTES.messages, label: 'Messages', icon: ChatIcon, subtitle: 'Channels and direct conversations' },
  { to: ROUTES.team, label: 'Team', icon: UsersIcon, subtitle: 'People in your workspace' },
  { to: ROUTES.settings, label: 'Settings', icon: SettingsIcon, subtitle: 'Workspace and profile' },
];

export const findNavItem = (pathname) =>
  NAV_ITEMS.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
