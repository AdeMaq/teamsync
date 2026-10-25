import { useState } from 'react';
import { useSelector } from 'react-redux';
import ActionButton from '../../../shared/ui/ActionButton';
import Avatar from '../../../shared/ui/Avatar';
import Card from '../../../shared/ui/Card';
import SelectField from '../../../shared/ui/SelectField';
import Spinner from '../../../shared/ui/Spinner';
import { parseApiError } from '../../../shared/api/errors';
import { assetUrl } from '../../../shared/utils/assetUrl';
import { selectCurrentUser } from '../../auth';
import {
  useChangeMemberRoleMutation,
  useGetWorkspaceQuery,
  useRemoveMemberMutation,
} from '../api/workspaceApi';
import { ROLE_LABELS, assignableRoles, canManageMember } from '../permissions';
import RoleBadge from './RoleBadge';

// What each row offers follows the server's rank rule: you can only act on people ranked below you.
// (The server checks again, so these buttons are a convenience, not the security.)
function MemberRow({ workspaceId, member, myRole, myId, onError }) {
  const [confirming, setConfirming] = useState(false);
  const [changeRole, { isLoading: changing }] = useChangeMemberRoleMutation();
  const [removeMember, { isLoading: removing }] = useRemoveMemberMutation();

  const { user, role } = member;
  const manageable = canManageMember(myRole, role);
  const roleChoices = assignableRoles(myRole);
  const canChangeRole = manageable && roleChoices.some((r) => r !== role);

  const run = async (action) => {
    onError('');
    try {
      await action.unwrap();
    } catch (err) {
      onError(parseApiError(err).message);
      setConfirming(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={user.name} src={assetUrl(user.avatar)} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-dash-text">
          {user.name}
          {user._id === myId && <span className="ml-2 text-xs font-normal text-dash-muted">(you)</span>}
        </p>
        <p className="truncate text-xs text-dash-muted">{user.email}</p>
      </div>

      {canChangeRole ? (
        <SelectField
          aria-label={`Role of ${user.name}`}
          className="w-28"
          value={role}
          disabled={changing}
          options={roleChoices.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          onChange={(e) => run(changeRole({ id: workspaceId, memberId: user._id, role: e.target.value }))}
        />
      ) : (
        <RoleBadge role={role} />
      )}

      {manageable &&
        (confirming ? (
          <div className="flex gap-2">
            <ActionButton
              variant="danger"
              loading={removing}
              onClick={() => run(removeMember({ id: workspaceId, memberId: user._id }))}
            >
              Confirm
            </ActionButton>
            <ActionButton onClick={() => setConfirming(false)} disabled={removing}>
              Cancel
            </ActionButton>
          </div>
        ) : (
          <ActionButton onClick={() => setConfirming(true)} aria-label={`Remove ${user.name}`}>
            Remove
          </ActionButton>
        ))}
    </li>
  );
}

export default function MembersCard({ workspaceId, myRole, memberLimit = null }) {
  const me = useSelector(selectCurrentUser);
  const { data: workspace, isLoading, isError } = useGetWorkspaceQuery(workspaceId);
  const [error, setError] = useState('');

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">
        Members{' '}
        {workspace && (
          <span className="text-sm font-normal text-dash-muted">
            ({memberLimit ? `${workspace.members.length} of ${memberLimit}` : workspace.members.length})
          </span>
        )}
      </h2>

      {isLoading && <Spinner />}
      {isError && <p className="mt-3 text-sm text-red-400">Could not load the members. Refresh the page to try again.</p>}

      {workspace && (
        <ul className="mt-2 divide-y divide-dash-border">
          {workspace.members.map((member) => (
            <MemberRow
              key={member.user._id}
              workspaceId={workspaceId}
              member={member}
              myRole={myRole}
              myId={me?._id}
              onError={setError}
            />
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
