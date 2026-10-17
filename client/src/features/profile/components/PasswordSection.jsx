import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import TextField from '../../../shared/ui/TextField';
import { baseApi } from '../../../shared/api/baseApi';
import { parseApiError } from '../../../shared/api/errors';
import { validateNewPassword } from '../../../shared/utils/validators';
import { ROUTES } from '../../../app/routes/routePaths';
import { loggedOut } from '../../auth';
import { useChangePasswordMutation } from '../api/profileApi';

export default function PasswordSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clientErrors = {};
    if (!form.currentPassword) clientErrors.currentPassword = 'Enter your current password';
    const newErrors = validateNewPassword(form.newPassword, form.confirm);
    if (newErrors.password) clientErrors.newPassword = newErrors.password;
    if (newErrors.confirm) clientErrors.confirm = newErrors.confirm;
    if (Object.keys(clientErrors).length > 0) return setErrors(clientErrors);

    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }).unwrap();
      // The server ended every session. Clear the local one first, then show the login page with a message.
      dispatch(loggedOut());
      dispatch(baseApi.util.resetApiState());
      navigate(ROUTES.login, { replace: true, state: { notice: 'Password changed. Please log in again.' } });
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? undefined : message });
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Password</h2>
      <p className="mt-1 text-sm text-dash-muted">
        Changing your password logs you out on every device, so you will need to log in again.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <TextField
          label="Current password"
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          className="sm:max-w-sm"
          value={form.currentPassword}
          onChange={handleChange}
          error={errors.currentPassword}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="New password"
            type="password"
            name="newPassword"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.newPassword}
            onChange={handleChange}
            error={errors.newPassword}
          />
          <TextField
            label="Confirm new password"
            type="password"
            name="confirm"
            autoComplete="new-password"
            value={form.confirm}
            onChange={handleChange}
            error={errors.confirm}
          />
        </div>

        {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}

        <ActionButton type="submit" variant="primary" loading={isLoading}>
          Change password
        </ActionButton>
      </form>
    </Card>
  );
}
