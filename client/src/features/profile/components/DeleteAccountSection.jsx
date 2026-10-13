import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ActionButton from '../../../shared/ui/ActionButton';
import TextField from '../../../shared/ui/TextField';
import { baseApi } from '../../../shared/api/baseApi';
import { parseApiError } from '../../../shared/api/errors';
import { ROUTES } from '../../../app/routes/routePaths';
import { loggedOut } from '../../auth';
import { useDeleteAccountMutation } from '../api/profileApi';

// Two steps on purpose: a button first, then a password confirmation. Deleting cannot be undone.
export default function DeleteAccountSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [deleteAccount, { isLoading }] = useDeleteAccountMutation();

  const cancel = () => {
    setConfirming(false);
    setPassword('');
    setError('');
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!password) return setError('Enter your password to confirm.');

    try {
      await deleteAccount({ password }).unwrap();
      navigate(ROUTES.home, { replace: true }); // leave the protected page before the session is cleared
      dispatch(loggedOut());
      dispatch(baseApi.util.resetApiState());
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  return (
    <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
      <h2 className="font-display text-lg font-semibold text-red-300">Delete account</h2>
      <p className="mt-1 text-sm text-dash-muted">
        Permanently deletes your account and signs you out everywhere. This cannot be undone.
      </p>

      {!confirming ? (
        <ActionButton variant="danger" className="mt-4" onClick={() => setConfirming(true)}>
          Delete my account
        </ActionButton>
      ) : (
        <form onSubmit={handleDelete} noValidate className="mt-4 max-w-sm space-y-4">
          <TextField
            label="Confirm with your password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            error={error}
          />
          <div className="flex gap-2">
            <ActionButton type="submit" variant="danger" loading={isLoading}>
              Delete permanently
            </ActionButton>
            <ActionButton onClick={cancel} disabled={isLoading}>
              Cancel
            </ActionButton>
          </div>
        </form>
      )}
    </section>
  );
}
