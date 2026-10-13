import { useNavigate } from 'react-router-dom';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import { ROUTES } from '../../../app/routes/routePaths';
import { useLogoutMutation } from '../../auth';

export default function SessionSection() {
  const navigate = useNavigate();
  const [logout, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    // Leave the protected page first, so the guard does not remember /profile as the post-login target.
    navigate(ROUTES.home, { replace: true });
    await logout();
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Session</h2>
      <p className="mt-1 text-sm text-dash-muted">Sign out of TeamSync on this device.</p>

      <ActionButton className="mt-4" loading={isLoading} onClick={handleLogout}>
        Log out
      </ActionButton>
    </Card>
  );
}
