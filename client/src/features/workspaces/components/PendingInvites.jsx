import { useState } from 'react';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import Spinner from '../../../shared/ui/Spinner';
import { parseApiError } from '../../../shared/api/errors';
import { formatDate } from '../../../shared/utils/formatDate';
import { useListInvitesQuery, useRevokeInviteMutation } from '../api/workspaceApi';
import RoleBadge from './RoleBadge';

export default function PendingInvites({ workspaceId }) {
  const { data: invites, isLoading } = useListInvitesQuery(workspaceId);
  const [revokeInvite, { isLoading: revoking }] = useRevokeInviteMutation();
  const [error, setError] = useState('');

  const handleRevoke = async (inviteId) => {
    setError('');
    try {
      await revokeInvite({ id: workspaceId, inviteId }).unwrap();
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Pending invitations</h2>

      {isLoading && <Spinner />}
      {invites?.length === 0 && <p className="mt-2 text-sm text-dash-muted">No pending invitations.</p>}

      {invites?.length > 0 && (
        <ul className="mt-2 divide-y divide-dash-border">
          {invites.map((invite) => (
            <li key={invite._id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-dash-text">{invite.email}</p>
                <p className="text-xs text-dash-muted">Expires {formatDate(invite.expiresAt)}</p>
              </div>
              <RoleBadge role={invite.role} />
              <ActionButton disabled={revoking} onClick={() => handleRevoke(invite._id)}>
                Revoke
              </ActionButton>
            </li>
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
