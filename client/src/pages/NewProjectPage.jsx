import { Link, useNavigate } from 'react-router-dom';
import { ProjectForm, projectPath } from '../features/projects';
import { useActiveWorkspace } from '../features/workspaces';
import Card from '../shared/ui/Card';
import { ROUTES } from '../app/routes/routePaths';

export default function NewProjectPage() {
  const { active } = useActiveWorkspace();
  const navigate = useNavigate();

  return (
    <div key={active._id} className="max-w-3xl space-y-4">
      <Link to={ROUTES.projects} className="text-sm text-dash-muted hover:text-dash-text">
        ← Back to projects
      </Link>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold text-dash-text">New project</h2>
        <p className="mt-1 mb-5 text-sm text-dash-muted">
          It is created in {active.name}, and you become its lead. You can hand the lead role to someone else later.
        </p>
        <ProjectForm workspaceId={active._id} onSaved={(project) => navigate(projectPath(project._id))} />
      </Card>
    </div>
  );
}
