import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: call authApi.login(form)
    } catch (err) {
      setErrors({ form: 'Invalid email or password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-slate-card border border-slate-border rounded-2xl p-8 shadow-glow">
        <h2 className="text-xl font-bold text-[#F5F7FA] mb-1">Welcome back</h2>
        <p className="text-sm mb-7 text-muted">Log in to your TeamSync workspace</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Work email"
            type="email"
            name="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={handleChange}
            required
          />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted">Password</label>
              <Link to="/forgot-password" className="text-xs font-medium text-teal-400">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}

          <Button type="submit" loading={loading} className="mt-2">
            Log in
          </Button>
        </form>

        <p className="text-center text-xs mt-6 text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-teal-400">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}