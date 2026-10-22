import { Outlet } from 'react-router-dom';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import Spinner from '../../../shared/ui/Spinner';
import { useActiveWorkspace } from '../hooks/useActiveWorkspace';
import CreateWorkspaceForm from './CreateWorkspaceForm';

// Wraps every page that needs a workspace (dashboard, projects, team, settings...).
// While the list loads it shows a spinner; with no workspace it shows the "create your first one" screen.
export default function WorkspaceGate() {
  const { workspaces, isLoading, isError, refetch } = useActiveWorkspace();

  if (isLoading) return <Spinner />;

  if (isError) {
    return (
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold text-dash-text">Could not load your workspaces</h2>
        <p className="mt-1 text-sm text-dash-muted">Check your connection and try again.</p>
        <ActionButton className="mt-4" onClick={refetch}>
          Try again
        </ActionButton>
      </Card>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Card className="max-w-2xl p-5">
        <h2 className="font-display text-lg font-semibold text-dash-text">Create your first workspace</h2>
        <p className="mt-1 mb-5 text-sm text-dash-muted">
          A workspace is where your team's projects, tasks and chat live. Were you invited to one? Open the link from
          your invitation email instead.
        </p>
        <CreateWorkspaceForm />
      </Card>
    );
  }

  return <Outlet />;
}
