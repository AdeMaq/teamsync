import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ROUTES } from '../../../app/routes/routePaths';
import { CheckIcon, ChevronDownIcon, PlusIcon } from '../../../shared/ui/icons';
import { useActiveWorkspace } from '../hooks/useActiveWorkspace';
import { selectWorkspace } from '../slice';

const planLabel = (plan) => plan.charAt(0).toUpperCase() + plan.slice(1);
const membersLabel = (count) => `${count} ${count === 1 ? 'member' : 'members'}`;

// The card at the top of the sidebar: shows the active workspace and lets you switch or create another.
export default function WorkspaceSwitcher() {
  const dispatch = useDispatch();
  const { workspaces, active, isLoading } = useActiveWorkspace();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const choose = (id) => {
    dispatch(selectWorkspace(id));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative mb-6">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch workspace"
        className="flex w-full items-center gap-2 rounded-2xl border border-dash-border bg-dash-card p-3 text-left
          transition-colors hover:border-[#2F3A5C]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-dash-muted">Workspace</span>
          {active ? (
            <>
              <span className="mt-0.5 block truncate text-sm font-semibold text-dash-text">{active.name}</span>
              <span className="mt-0.5 block text-xs text-dash-teal">
                {planLabel(active.plan)} · {membersLabel(active.memberCount)}
              </span>
            </>
          ) : (
            <span className="mt-0.5 block text-sm text-dash-muted">{isLoading ? 'Loading…' : 'No workspace yet'}</span>
          )}
        </span>
        <ChevronDownIcon size={16} className={`shrink-0 text-dash-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-10 mt-2 rounded-2xl border border-dash-border bg-dash-card p-1 shadow-lg shadow-black/40">
          <ul role="listbox" aria-label="Your workspaces" className="max-h-60 overflow-y-auto">
            {workspaces.map((workspace) => (
              <li key={workspace._id} role="option" aria-selected={workspace._id === active?._id}>
                <button
                  type="button"
                  onClick={() => choose(workspace._id)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-dash-text
                    transition-colors hover:bg-white/5"
                >
                  <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                  {workspace._id === active?._id && <CheckIcon size={16} className="shrink-0 text-dash-teal" />}
                </button>
              </li>
            ))}
          </ul>

          <Link
            to={ROUTES.newWorkspace}
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-xl border-t border-dash-border px-3 py-2 text-sm font-medium
              text-dash-teal transition-colors hover:bg-white/5"
          >
            <PlusIcon size={16} />
            Create workspace
          </Link>
        </div>
      )}
    </div>
  );
}
