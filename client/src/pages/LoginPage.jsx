import AuthLayout from '../shared/layout/AuthLayout';
import { LoginForm } from '../features/auth';

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
