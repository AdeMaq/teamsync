import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { parseApiError } from '../../../shared/api/errors';
import { validateLogin } from '../../../shared/utils/validators';
import { ROUTES } from '../../../app/routes/routePaths';
import { useLoginMutation } from '../api/authApi';

// On success the session is stored in Redux and GuestRoute redirects, so no navigation here.
export default function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [login, { isLoading }] = useLoginMutation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clientErrors = validateLogin(form);
    if (Object.keys(clientErrors).length > 0) return setErrors(clientErrors);

    try {
      await login({ email: form.email.trim(), password: form.password }).unwrap();
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors({ ...fieldErrors, form: message });
    }
  };

  return (
    <div className="bg-slate-card border border-slate-border rounded-2xl p-8 shadow-glow">
      <h2 className="text-xl font-bold text-[#F5F7FA] mb-1">Welcome back</h2>
      <p className="text-sm mb-7 text-muted">Log in to your TeamSync workspace</p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Work email"
          type="email"
          name="email"
          placeholder="you@company.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          required
        />
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted">Password</label>
            <Link to={ROUTES.forgotPassword} className="text-xs font-medium text-teal-400">
              Forgot password?
            </Link>
          </div>
          <Input
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
        </div>

        {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}

        <Button type="submit" loading={isLoading} className="mt-2">
          Log in
        </Button>
      </form>

      <p className="text-center text-xs mt-6 text-muted">
        Don't have an account?{' '}
        <Link to={ROUTES.register} className="font-semibold text-teal-400">
          Sign up
        </Link>
      </p>
    </div>
  );
}
