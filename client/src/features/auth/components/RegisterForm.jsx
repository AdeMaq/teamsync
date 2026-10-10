import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { parseApiError } from '../../../shared/api/errors';
import { validateRegister } from '../../../shared/utils/validators';
import { ROUTES } from '../../../app/routes/routePaths';
import { useRegisterMutation } from '../api/authApi';

// On success the session is stored in Redux and GuestRoute redirects, so no navigation here.
export default function RegisterForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [register, { isLoading }] = useRegisterMutation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clientErrors = validateRegister(form);
    if (Object.keys(clientErrors).length > 0) return setErrors(clientErrors);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      }).unwrap();
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      // Field errors show under their input; anything else shows as a form-level message.
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? undefined : message });
    }
  };

  return (
    <div className="bg-slate-card border border-slate-border rounded-2xl p-8 shadow-glow">
      <h2 className="text-xl font-bold text-[#F5F7FA] mb-1">Create your workspace</h2>
      <p className="text-sm mb-7 text-muted">Get your team set up in under a minute</p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Full name"
          name="name"
          placeholder="Jordan Lee"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          required
        />
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
        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          required
        />

        {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}

        <Button type="submit" loading={isLoading} className="mt-2">
          Create account
        </Button>
      </form>

      <p className="text-center text-xs mt-6 text-muted">
        Already have an account?{' '}
        <Link to={ROUTES.login} className="font-semibold text-teal-400">
          Log in
        </Link>
      </p>
    </div>
  );
}
