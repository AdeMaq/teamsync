import { Link, useParams } from 'react-router-dom';
import { DeleteProject, ProjectForm, StatusBadge, formatDateRange, useGetProjectQuery } from '../features/projects';
import ActionButton from '../shared/ui/ActionButton';
import Avatar from '../shared/ui/Avatar';
import Card from '../shared/ui/Card';
import Spinner from '../shared/ui/Spinner';
import { assetUrl } from '../shared/utils/assetUrl';
import { ROUTES } from '../app/routes/routePaths';

function Message({ title, text, children }) {
  return (
    <Card className="max-w-2xl p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">{title}</h2>
      <p className="mt-1 text-sm text-dash-muted">{text}</p>
      {children}
    </Card>
  );
}

// One project: its details for everyone, the edit form and delete for people who can manage it.
export default function ProjectPage() {
  const { projectId } = useParams();
  const { data: project, isLoading, error, refetch } = useGetProjectQuery(projectId);

  if (isLoading) return <Spinner />;

  if (error?.status === 404 || error?.status === 400) {
    return (
      <Message title="Project not found" text="It may have been deleted, or you are not a member of its workspace.">
        <Link to={ROUTES.projects} className="mt-4 inline-block text-sm text-dash-teal hover:underline">
          Back to projects
        </Link>
      </Message>
    );
  }

  if (error) {
    return (
      <Message title="Could not load this project" text="Check your connection and try again.">
        <ActionButton className="mt-4" onClick={refetch}>
          Try again
        </ActionButton>
      </Message>
    );
  }

  const { lead } = project;

  return (
    <div className="max-w-3xl space-y-4">
      <Link to={ROUTES.projects} className="text-sm text-dash-muted hover:text-dash-text">
        ← Back to projects
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} aria-hidden="true" />
          <h2 className="min-w-0 flex-1 break-words font-display text-xl font-semibold text-dash-text">{project.name}</h2>
          <StatusBadge status={project.status} />
        </div>

        <p className="mt-3 whitespace-pre-line text-sm text-dash-muted">{project.description || 'No description yet.'}</p>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-dash-border pt-4 text-sm">
          <div>
            <dt className="text-xs text-dash-muted">Lead</dt>
            <dd className="mt-1 flex items-center gap-2 text-dash-text">
              {lead ? (
                <>
                  <Avatar name={lead.name} src={assetUrl(lead.avatar)} size="xs" />
                  {lead.name}
                </>
              ) : (
                'No lead'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-dash-muted">Dates</dt>
            <dd className="mt-1 text-dash-text">{formatDateRange(project.startDate, project.endDate)}</dd>
          </div>
        </dl>
      </Card>

      {project.canManage && (
        <>
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold text-dash-text">Edit project</h2>
            <div className="mt-4">
              <ProjectForm key={project._id} workspaceId={project.workspace} project={project} />
            </div>
          </Card>
          <DeleteProject project={project} />
        </>
      )}

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold text-dash-text">Tasks</h2>
        <p className="mt-1 text-sm text-dash-muted">The task board for this project is coming soon.</p>
      </Card>
    </div>
  );
}
