import { InviteForm, MembersCard, PendingInvites, can, useActiveWorkspace } from '../features/workspaces';

// Members of the active workspace. Inside WorkspaceGate, so a workspace always exists here.
export default function TeamPage() {
  const { active } = useActiveWorkspace();
  const canInvite = can(active.myRole, 'members:invite');

  // key: switching workspace starts every card fresh instead of carrying over typed text or errors
  return (
    <div key={active._id} className="max-w-3xl space-y-4">
      {canInvite && <InviteForm workspaceId={active._id} myRole={active.myRole} />}
      <MembersCard workspaceId={active._id} myRole={active.myRole} />
      {canInvite && <PendingInvites workspaceId={active._id} />}
    </div>
  );
}
