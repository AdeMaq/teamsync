import { Link } from 'react-router-dom';
import Logo from '../../../shared/ui/Logo';
import { ROUTES } from '../../../app/routes/routePaths';

// Logged-out visitors who click a protected link are sent to /login and returned to it afterwards.
// Logged-in visitors reaching /login or /register are sent on to the dashboard.
export default function LandingNavbar() {
  return (
    <header className="border-b border-slate-border bg-black/25">
      <div className="mx-auto flex h-16 max-w-[1150px] items-center justify-between px-6">
        <Link to={ROUTES.home} aria-label="TeamSync home">
          <Logo />
        </Link>

        <nav className="flex items-center gap-5">
          <Link to={ROUTES.login} className="text-sm font-medium text-teal-400 transition-colors hover:text-teal-300">
            Sign in
          </Link>
          <Link
            to={ROUTES.dashboard}
            className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
          >
            Open workspace
          </Link>
        </nav>
      </div>
    </header>
  );
}
