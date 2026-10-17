import {
  AvatarSection,
  DeleteAccountSection,
  EmailSection,
  NameSection,
  PasswordSection,
  SessionSection,
} from '../features/profile';

// Reached by clicking the user card in the sidebar. Shown inside AppShell.
export default function ProfilePage() {
  return (
    <div className="max-w-3xl space-y-4">
      <AvatarSection />
      <NameSection />
      <EmailSection />
      <PasswordSection />
      <SessionSection />
      <DeleteAccountSection />
    </div>
  );
}
