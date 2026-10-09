import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../shared/layout/AuthLayout';
import Input from '../shared/ui/Input';
import Button from '../shared/ui/Button';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: call authApi.register(form)
    } catch (err) {
      setErrors({ form: 'Something went wrong. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-slate-card border border-slate-border rounded-2xl p-8 shadow-glow">
        <h2 className="text-xl font-bold text-[#F5F7FA] mb-1">Create your workspace</h2>
        <p className="text-sm mb-7 text-muted">Get your team set up in under a minute</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Full name"
            name="name"
            placeholder="Jordan Lee"
            value={form.name}
            onChange={handleChange}
            required
          />
          <Input
            label="Work email"
            type="email"
            name="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={handleChange}
            minLength={8}
            required
          />

          {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}

          <Button type="submit" loading={loading} className="mt-2">
            Create account
          </Button>
        </form>

        <p className="text-center text-xs mt-6 text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-teal-400">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}