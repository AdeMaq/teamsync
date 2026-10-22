import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../../shared/ui/Button';
import { parseApiError } from '../../../shared/api/errors';
import { ROUTES } from '../../../app/routes/routePaths';
import { useLogoutMutation } from '../../auth';
import { useAcceptInviteMutation } from '../api/workspaceApi';

// Opened from the link in the invitation email: /invites/:token (the visitor is already logged in here;
// logged-out visitors are sent to log in first and brought back by ProtectedRoute).
export default function AcceptInviteCard() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [acceptInvite, { isLoading }] = useAcceptInviteMutation();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();

  const handleAccept = async () => {
    setError(null);
    try {
      await acceptInvite(token).unwrap(); // joining also makes it the active workspace
      navigate(ROUTES.dashboard, { replace: true });
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <div className="bg-slate-card border border-slate-border rounded-2xl p-8 shadow-glow">
      <h2 className="text-xl font-bold text-[#F5F7FA] mb-1">You have been invited</h2>
      <p className="text-sm mb-7 text-muted">Accept the invitation to join the workspace on TeamSync.</p>

      {error && (
        <div className="mb-5 space-y-2" role="alert">
          <p className="text-xs text-red-400">
            {error.code === 'INVALID_INVITE'
              ? 'This invitation is invalid or has expired. Ask an admin to send you a new one.'
              : error.message}
          </p>
          {error.code === 'INVITE_EMAIL_MISMATCH' && (
            <button
              type="button"
              onClick={() => logout()}
              disabled={loggingOut}
              className="text-xs font-semibold text-teal-400 disabled:opacity-60"
            >
              Log out and use the invited address
            </button>
          )}
        </div>
      )}

      <Button type="button" loading={isLoading} onClick={handleAccept}>
        Accept invitation
      </Button>
    </div>
  );
}
