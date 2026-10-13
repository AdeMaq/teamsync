import { AvatarSection, DeleteAccountSection, EmailSection, SessionSection } from '../features/profile';

// Reached by clicking the user card in the sidebar. Shown inside AppShell.
export default function ProfilePage() {
  return (
    <div className="max-w-3xl space-y-4">
      <AvatarSection />
      <EmailSection />
      <SessionSection />
      <DeleteAccountSection />
    </div>
  );
}
