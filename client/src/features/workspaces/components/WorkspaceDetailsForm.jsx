import { useState } from 'react';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import TextAreaField from '../../../shared/ui/TextAreaField';
import TextField from '../../../shared/ui/TextField';
import { parseApiError } from '../../../shared/api/errors';
import { formatDate } from '../../../shared/utils/formatDate';
import { useUpdateWorkspaceMutation } from '../api/workspaceApi';
import { can } from '../permissions';

// Admins and the owner can edit; plain members see the details read-only. The slug is fixed on purpose.
export default function WorkspaceDetailsForm({ workspace }) {
  const editable = can(workspace.myRole, 'workspace:update');
  const [form, setForm] = useState({ name: workspace.name, description: workspace.description });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [updateWorkspace, { isLoading }] = useUpdateWorkspaceMutation();

  const unchanged = form.name.trim() === workspace.name && form.description.trim() === workspace.description;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setErrors({ name: 'Give your workspace a name' });

    try {
      await updateWorkspace({ id: workspace._id, name: form.name.trim(), description: form.description.trim() }).unwrap();
      setSaved(true);
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? undefined : message });
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Workspace details</h2>
      <p className="mt-1 text-sm text-dash-muted">
        {editable ? 'Visible to everyone in the workspace.' : 'Only admins and the owner can edit these.'}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <TextField
          label="Name"
          name="name"
          className="sm:max-w-sm"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          disabled={!editable}
        />
        <TextAreaField
          label="Description"
          name="description"
          className="sm:max-w-lg"
          value={form.description}
          onChange={handleChange}
          error={errors.description}
          disabled={!editable}
        />

        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-dash-muted">URL name</dt>
            <dd className="text-dash-text">{workspace.slug}</dd>
          </div>
          <div>
            <dt className="text-xs text-dash-muted">Plan</dt>
            <dd className="capitalize text-dash-text">{workspace.plan}</dd>
          </div>
          <div>
            <dt className="text-xs text-dash-muted">Created</dt>
            <dd className="text-dash-text">{formatDate(workspace.createdAt)}</dd>
          </div>
        </dl>

        {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}
        {saved && <p className="text-xs text-dash-teal">Saved.</p>}

        {editable && (
          <ActionButton type="submit" variant="primary" loading={isLoading} disabled={unchanged}>
            Save changes
          </ActionButton>
        )}
      </form>
    </Card>
  );
}
