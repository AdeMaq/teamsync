import { Link, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth';
import { WorkspaceSwitcher } from '../../features/workspaces';
import { ROUTES } from '../../app/routes/routePaths';
import { assetUrl } from '../utils/assetUrl';
import Avatar from '../ui/Avatar';
import { CloseIcon } from '../ui/icons';
import { NAV_ITEMS } from './navItems';

const linkClass = ({ isActive }) =>
  `flex h-9 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-colors ${
    isActive
      ? 'border-dash-teal/30 bg-dash-teal/10 text-dash-text'
      : 'border-transparent text-dash-muted hover:border-dash-border hover:text-dash-text'
  }`;

// 256px, fixed from 768px up. Below that it is a drawer that slides in over the page and
// closes on navigation or backdrop click.
export default function Sidebar({ open, onClose }) {
  const user = useSelector(selectCurrentUser);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-dash-border bg-dash-inset p-4
          transition-transform duration-200 md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-dash-gradient">
              <span className="text-xs font-bold text-dash-bg">TS</span>
            </div>
            <span className="font-display text-lg font-bold text-dash-text">TeamSync</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-dash-muted hover:text-dash-text md:hidden"
            aria-label="Close menu"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <WorkspaceSwitcher />

        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* The whole card opens the profile page (photo, email, log out, delete account). */}
        <Link
          to={ROUTES.profile}
          aria-label="Open your profile"
          className="mt-auto flex items-center gap-3 rounded-2xl border border-dash-border bg-dash-card p-3
            transition-colors hover:border-[#2F3A5C]"
        >
          <Avatar name={user?.name} src={assetUrl(user?.avatar)} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-dash-text">{user?.name}</p>
            <p className="truncate text-xs text-dash-muted">{user?.email}</p>
          </div>
        </Link>
      </aside>
    </>
  );
}
