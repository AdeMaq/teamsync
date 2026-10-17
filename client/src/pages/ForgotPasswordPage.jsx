import AuthLayout from '../shared/layout/AuthLayout';
import { ForgotPasswordForm } from '../features/auth';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
