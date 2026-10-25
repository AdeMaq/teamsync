import { DangerZone, LogoSection, WorkspaceDetailsForm, can, useActiveWorkspace } from '../features/workspaces';

// Details and the danger zone of the active workspace. Inside WorkspaceGate, so a workspace always exists here.
export default function WorkspaceSettingsPage() {
  const { active } = useActiveWorkspace();

  return (
    <div key={active._id} className="max-w-3xl space-y-4">
      {can(active.myRole, 'workspace:update') && <LogoSection workspace={active} />}
      <WorkspaceDetailsForm workspace={active} />
      <DangerZone workspace={active} />
    </div>
  );
}
