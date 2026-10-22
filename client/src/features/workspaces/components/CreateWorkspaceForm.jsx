import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ActionButton from '../../../shared/ui/ActionButton';
import TextAreaField from '../../../shared/ui/TextAreaField';
import TextField from '../../../shared/ui/TextField';
import { parseApiError } from '../../../shared/api/errors';
import { ROUTES } from '../../../app/routes/routePaths';
import { useCreateWorkspaceMutation } from '../api/workspaceApi';

// On success the new workspace becomes the active one (see workspaceApi) and we go to the dashboard.
export default function CreateWorkspaceForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});
  const [createWorkspace, { isLoading }] = useCreateWorkspaceMutation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setErrors({ name: 'Give your workspace a name' });

    try {
      await createWorkspace({ name: form.name.trim(), description: form.description.trim() }).unwrap();
      navigate(ROUTES.dashboard);
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? undefined : message });
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <TextField
        label="Workspace name"
        name="name"
        placeholder="Northwind Labs"
        autoComplete="organization"
        value={form.name}
        onChange={handleChange}
        error={errors.name}
        className="sm:max-w-sm"
      />
      <TextAreaField
        label="Description (optional)"
        name="description"
        placeholder="What does this team work on?"
        value={form.description}
        onChange={handleChange}
        error={errors.description}
        className="sm:max-w-lg"
      />

      {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}

      <ActionButton type="submit" variant="primary" loading={isLoading}>
        Create workspace
      </ActionButton>
    </form>
  );
}
