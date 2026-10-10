import AuthLayout from '../shared/layout/AuthLayout';
import { RegisterForm } from '../features/auth';

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
