import AuthLayout from '../shared/layout/AuthLayout';
import { AcceptInviteCard } from '../features/workspaces';

export default function AcceptInvitePage() {
  return (
    <AuthLayout>
      <AcceptInviteCard />
    </AuthLayout>
  );
}
