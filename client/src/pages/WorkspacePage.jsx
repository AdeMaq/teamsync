import { useSelector } from 'react-redux';
import { selectCurrentUser, useLogoutMutation } from '../features/auth';
import Button from '../shared/ui/Button';

// PLACEHOLDER: proves login works. Replaced by the real workspace selector in the workspaces step.
export default function WorkspacePage() {
  const user = useSelector(selectCurrentUser);
  const [logout, { isLoading }] = useLogoutMutation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-6">
      <div className="w-full max-w-[400px] bg-slate-card border border-slate-border rounded-2xl p-8 shadow-glow">
        <h2 className="text-xl font-bold text-[#F5F7FA] mb-1">Hi, {user?.name}</h2>
        <p className="text-sm mb-7 text-muted">
          You are logged in as {user?.email}. Workspaces are coming next.
        </p>
        <Button type="button" loading={isLoading} onClick={() => logout()}>
          Log out
        </Button>
      </div>
    </div>
  );
}
