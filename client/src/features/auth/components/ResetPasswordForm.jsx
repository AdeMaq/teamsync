import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { baseApi } from '../../../shared/api/baseApi';
import { parseApiError } from '../../../shared/api/errors';
import { validateNewPassword } from '../../../shared/utils/validators';
import { ROUTES } from '../../../app/routes/routePaths';
import { useResetPasswordMutation } from '../api/authApi';
import { loggedOut } from '../slice';

export default function ResetPasswordForm() {
  const { token } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [linkExpired, setLinkExpired] = useState(false);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clientErrors = validateNewPassword(form.password, form.confirm);
    if (Object.keys(clientErrors).length > 0) return setErrors(clientErrors);

    try {
      await resetPassword({ token, password: form.password }).unwrap();
      // The server ended every session of this account, so forget any local one too.
      dispatch(loggedOut());
      dispatch(baseApi.util.resetApiState());
      navigate(ROUTES.login, { replace: true, state: { notice: 'Password updated. Log in with your new password.' } });
    } catch (err) {
      const { message, code, fieldErrors } = parseApiError(err);
      // A malformed token also fails validation, so treat both cases as "ask for a new link".
      if (code === 'INVALID_RESET_TOKEN' || fieldErrors.token) return setLinkExpired(true);
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? undefined : message });
    }
  };

  if (linkExpired) {
    return (
      <div className="bg-slate-card border border-slate-border rounded-2xl p-8 shadow-glow">
        <h2 className="text-xl font-bold text-[#F5F7FA] mb-1">This link has expired</h2>
        <p className="text-sm text-muted">Reset links work once and for 1 hour. Request a new one to continue.</p>
        <p className="text-center text-xs mt-6">
          <Link to={ROUTES.forgotPassword} className="font-semibold text-teal-400">
            Send me a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-card border border-slate-border rounded-2xl p-8 shadow-glow">
      <h2 className="text-xl font-bold text-[#F5F7FA] mb-1">Choose a new password</h2>
      <p className="text-sm mb-7 text-muted">You will be logged out everywhere and asked to log in again</p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="New password"
          type="password"
          name="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          name="confirm"
          autoComplete="new-password"
          value={form.confirm}
          onChange={handleChange}
          error={errors.confirm}
          required
        />

        {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}

        <Button type="submit" loading={isLoading} className="mt-2">
          Update password
        </Button>
      </form>
    </div>
  );
}
