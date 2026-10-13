import { useState } from 'react';
import { useSelector } from 'react-redux';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import TextField from '../../../shared/ui/TextField';
import { parseApiError } from '../../../shared/api/errors';
import { selectCurrentUser } from '../../auth';
import { useChangeEmailMutation } from '../api/profileApi';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function EmailSection() {
  const user = useSelector(selectCurrentUser);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [changeEmail, { isLoading }] = useChangeEmailMutation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clientErrors = {};
    if (!EMAIL_RE.test(form.email.trim())) clientErrors.email = 'Enter a valid email address';
    if (!form.password) clientErrors.password = 'Enter your current password';
    if (Object.keys(clientErrors).length > 0) return setErrors(clientErrors);

    try {
      await changeEmail({ email: form.email.trim(), password: form.password }).unwrap();
      setForm({ email: '', password: '' });
      setSaved(true);
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? undefined : message });
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Email address</h2>
      <p className="mt-1 text-sm text-dash-muted">
        Currently <span className="text-dash-text">{user?.email}</span>. Enter your password to change it.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="New email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />
          <TextField
            label="Current password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
        </div>

        {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}
        {saved && <p className="text-xs text-dash-teal">Email updated.</p>}

        <ActionButton type="submit" variant="primary" loading={isLoading}>
          Update email
        </ActionButton>
      </form>
    </Card>
  );
}
