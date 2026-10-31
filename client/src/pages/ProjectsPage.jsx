import { Link } from 'react-router-dom';
import { ProjectsList } from '../features/projects';
import { useActiveWorkspace } from '../features/workspaces';
import { PlusIcon } from '../shared/ui/icons';
import { ROUTES } from '../app/routes/routePaths';

// Projects of the active workspace. Inside WorkspaceGate, so a workspace always exists here.
export default function ProjectsPage() {
  const { active } = useActiveWorkspace();

  // key: switching workspace starts the filters and page number fresh
  return (
    <div key={active._id} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-dash-text">{active.name}</h2>
        <Link
          to={ROUTES.newProject}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-dash-gradient px-4 text-sm font-medium text-dash-bg hover:opacity-90"
        >
          <PlusIcon className="h-4 w-4" />
          New project
        </Link>
      </div>

      <ProjectsList workspaceId={active._id} />
    </div>
  );
}
