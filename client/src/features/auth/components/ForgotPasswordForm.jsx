import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { parseApiError } from '../../../shared/api/errors';
import { ROUTES } from '../../../app/routes/routePaths';
import { useForgotPasswordMutation } from '../api/authApi';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address');

    try {
      await forgotPassword({ email: email.trim() }).unwrap();
      setSentTo(email.trim()); // the server answers the same way whether or not the account exists
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  if (sentTo) {
    return (
      <div className="bg-slate-card border border-slate-border rounded-2xl p-8 shadow-glow">
        <h2 className="text-xl font-bold text-[#F5F7FA] mb-1">Check your email</h2>
        <p className="text-sm text-muted">
          If an account exists for <span className="text-[#F5F7FA]">{sentTo}</span>, we sent a link to reset the
          password. It works for 1 hour.
        </p>
        {import.meta.env.DEV && (
          <p className="mt-4 text-xs text-muted">
            Development: with no SMTP configured, the link is printed in the server console instead of being emailed.
          </p>
        )}
        <p className="text-center text-xs mt-6 text-muted">
          <Link to={ROUTES.login} className="font-semibold text-teal-400">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-card border border-slate-border rounded-2xl p-8 shadow-glow">
      <h2 className="text-xl font-bold text-[#F5F7FA] mb-1">Forgot your password?</h2>
      <p className="text-sm mb-7 text-muted">Enter your email and we will send you a reset link</p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Work email"
          type="email"
          name="email"
          placeholder="you@company.com"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          error={error}
          required
        />

        <Button type="submit" loading={isLoading} className="mt-2">
          Send reset link
        </Button>
      </form>

      <p className="text-center text-xs mt-6 text-muted">
        Remembered it?{' '}
        <Link to={ROUTES.login} className="font-semibold text-teal-400">
          Log in
        </Link>
      </p>
    </div>
  );
}
