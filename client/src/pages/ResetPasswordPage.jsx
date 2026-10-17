import AuthLayout from '../shared/layout/AuthLayout';
import { ResetPasswordForm } from '../features/auth';

// Opened from the link in the reset email: /reset-password/:token
export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
