import { useLocation } from 'react-router-dom';
import { BellIcon, MenuIcon, SearchIcon } from '../ui/icons';
import { findNavItem } from './navItems';

const iconButton =
  'flex h-9 items-center justify-center rounded-xl border border-dash-border bg-dash-card text-dash-muted ' +
  'transition-colors hover:border-[#2F3A5C] hover:text-dash-text';

// App top bar: page title + subtitle on the left, search and notifications on the right.
// The search box and the "4" unread badge are static until search and notifications are built.
export default function Navbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const page = findNavItem(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-[84px] items-center justify-between gap-3 border-b border-dash-border bg-dash-bg/90 px-5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenuClick} className={`${iconButton} w-9 md:hidden`} aria-label="Open menu">
          <MenuIcon size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold text-dash-text">{page?.label ?? 'TeamSync'}</h1>
          <p className="mt-0.5 truncate text-sm text-dash-muted">{page?.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Under 768px the search box collapses to an icon button */}
        <button type="button" className={`${iconButton} w-9 md:hidden`} aria-label="Search">
          <SearchIcon size={16} />
        </button>
        <label className="relative hidden md:block">
          <span className="sr-only">Search</span>
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-muted" />
          <input
            type="search"
            placeholder="Search tasks, people…"
            className="h-9 w-[190px] rounded-xl border border-dash-border bg-dash-card pl-9 pr-3 text-sm text-dash-text
              outline-none transition-colors placeholder:text-dash-muted focus:border-dash-teal/60"
          />
        </label>

        <button type="button" className={`${iconButton} relative w-[34px]`} aria-label="Notifications, 4 unread">
          <BellIcon size={16} />
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-dash-teal text-[10px] font-bold text-dash-bg">
            4
          </span>
        </button>
      </div>
    </header>
  );
}
