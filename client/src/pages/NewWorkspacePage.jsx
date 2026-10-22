import Card from '../shared/ui/Card';
import { CreateWorkspaceForm } from '../features/workspaces';

// Reached from "Create workspace" in the workspace switcher.
export default function NewWorkspacePage() {
  return (
    <Card className="max-w-2xl p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Create a workspace</h2>
      <p className="mt-1 mb-5 text-sm text-dash-muted">You will be its owner and can invite your team afterwards.</p>
      <CreateWorkspaceForm />
    </Card>
  );
}
