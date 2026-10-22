import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ActionButton from '../../../shared/ui/ActionButton';
import SelectField from '../../../shared/ui/SelectField';
import TextField from '../../../shared/ui/TextField';
import { parseApiError } from '../../../shared/api/errors';
import { ROUTES } from '../../../app/routes/routePaths';
import { selectCurrentUser } from '../../auth';
import {
  useDeleteWorkspaceMutation,
  useGetWorkspaceQuery,
  useLeaveWorkspaceMutation,
  useTransferOwnershipMutation,
} from '../api/workspaceApi';
import { selectWorkspace } from '../slice';

// After leaving or deleting, forget the saved choice; the dashboard then picks another workspace or asks for a new one.
function useLeaveCurrentWorkspace() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return () => {
    dispatch(selectWorkspace(null));
    navigate(ROUTES.dashboard, { replace: true });
  };
}

function Section({ title, children }) {
  return (
    <div className="border-t border-red-500/20 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-dash-text">{title}</h3>
      {children}
    </div>
  );
}

function LeaveSection({ workspace }) {
  const me = useSelector(selectCurrentUser);
  const done = useLeaveCurrentWorkspace();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [leave, { isLoading }] = useLeaveWorkspaceMutation();

  const handleLeave = async () => {
    try {
      await leave({ id: workspace._id, memberId: me._id }).unwrap();
      done();
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  return (
    <Section title="Leave this workspace">
      <p className="mt-1 text-sm text-dash-muted">You lose access immediately. An admin can invite you back.</p>
      {confirming ? (
        <div className="mt-3 flex gap-2">
          <ActionButton variant="danger" loading={isLoading} onClick={handleLeave}>
            Yes, leave
          </ActionButton>
          <ActionButton disabled={isLoading} onClick={() => setConfirming(false)}>
            Cancel
          </ActionButton>
        </div>
      ) : (
        <ActionButton variant="danger" className="mt-3" onClick={() => setConfirming(true)}>
          Leave workspace
        </ActionButton>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </Section>
  );
}

function TransferSection({ workspace }) {
  const me = useSelector(selectCurrentUser);
  const navigate = useNavigate();
  const { data: details } = useGetWorkspaceQuery(workspace._id);
  const [userId, setUserId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [transfer, { isLoading }] = useTransferOwnershipMutation();

  const others = (details?.members ?? []).filter((m) => m.user._id !== me._id);
  const target = others.find((m) => m.user._id === userId);

  const handleTransfer = async () => {
    try {
      await transfer({ id: workspace._id, userId }).unwrap();
      navigate(ROUTES.team); // you are an admin now; the team page shows the new roles
    } catch (err) {
      setError(parseApiError(err).message);
      setConfirming(false);
    }
  };

  return (
    <Section title="Transfer ownership">
      <p className="mt-1 text-sm text-dash-muted">
        Make another member the owner. You become an admin. Only the owner can delete the workspace or transfer it.
      </p>
      {others.length === 0 ? (
        <p className="mt-2 text-xs text-dash-muted">Invite someone first: you are the only member.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <SelectField
            label="New owner"
            className="w-full sm:w-64"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setConfirming(false);
              setError('');
            }}
            options={[
              { value: '', label: 'Choose a member…' },
              ...others.map((m) => ({ value: m.user._id, label: `${m.user.name} (${m.role})` })),
            ]}
          />
          {confirming ? (
            <>
              <ActionButton variant="danger" loading={isLoading} onClick={handleTransfer}>
                Make {target?.user.name} the owner
              </ActionButton>
              <ActionButton disabled={isLoading} onClick={() => setConfirming(false)}>
                Cancel
              </ActionButton>
            </>
          ) : (
            <ActionButton variant="danger" disabled={!userId} onClick={() => setConfirming(true)}>
              Transfer ownership
            </ActionButton>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </Section>
  );
}

function DeleteSection({ workspace }) {
  const done = useLeaveCurrentWorkspace();
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState('');
  const [deleteWorkspace, { isLoading }] = useDeleteWorkspaceMutation();

  const handleDelete = async (e) => {
    e.preventDefault();
    try {
      await deleteWorkspace({ id: workspace._id, confirmName }).unwrap();
      done();
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  return (
    <Section title="Delete this workspace">
      <p className="mt-1 text-sm text-dash-muted">
        Permanently deletes the workspace and everything in it for all members. This cannot be undone.
      </p>
      <form onSubmit={handleDelete} noValidate className="mt-3 flex flex-wrap items-end gap-3">
        <TextField
          label={`Type "${workspace.name}" to confirm`}
          className="w-full sm:w-72"
          value={confirmName}
          onChange={(e) => {
            setConfirmName(e.target.value);
            setError('');
          }}
          error={error}
        />
        <ActionButton type="submit" variant="danger" loading={isLoading} disabled={confirmName !== workspace.name}>
          Delete workspace
        </ActionButton>
      </form>
    </Section>
  );
}

// The owner can transfer or delete; everyone else can leave.
export default function DangerZone({ workspace }) {
  const isOwner = workspace.myRole === 'owner';

  return (
    <section className="space-y-4 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
      <h2 className="font-display text-lg font-semibold text-red-300">Danger zone</h2>
      {isOwner ? (
        <>
          <TransferSection workspace={workspace} />
          <DeleteSection workspace={workspace} />
        </>
      ) : (
        <LeaveSection workspace={workspace} />
      )}
    </section>
  );
}
