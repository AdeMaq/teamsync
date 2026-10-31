import { useState } from 'react';
import ActionButton from '../../../shared/ui/ActionButton';
import SelectField from '../../../shared/ui/SelectField';
import TextAreaField from '../../../shared/ui/TextAreaField';
import TextField from '../../../shared/ui/TextField';
import { parseApiError } from '../../../shared/api/errors';
import { useGetWorkspaceQuery } from '../../workspaces';
import { useCreateProjectMutation, useUpdateProjectMutation } from '../api/projectApi';
import { PROJECT_COLORS, STATUSES } from '../constants';
import { toDateInput } from '../utils';

const STATUS_OPTIONS = STATUSES.map(({ value, label }) => ({ value, label }));

const initialValues = (project) => ({
  name: project?.name ?? '',
  description: project?.description ?? '',
  status: project?.status ?? 'planning',
  color: project?.color ?? PROJECT_COLORS[0],
  startDate: toDateInput(project?.startDate),
  endDate: toDateInput(project?.endDate),
  leadId: project?.lead?._id ?? '',
});

function ColorPicker({ value, onChange }) {
  // A colour saved earlier that is no longer in the list stays selectable.
  const colors = PROJECT_COLORS.includes(value) ? PROJECT_COLORS : [value, ...PROJECT_COLORS];

  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-medium text-dash-muted">Colour</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <label key={color} className="cursor-pointer">
            <input
              type="radio"
              name="color"
              value={color}
              checked={value === color}
              onChange={() => onChange(color)}
              className="peer sr-only"
              aria-label={color}
            />
            <span
              className="block h-7 w-7 rounded-full ring-offset-2 ring-offset-dash-card transition peer-checked:ring-2 peer-checked:ring-white peer-focus-visible:ring-2 peer-focus-visible:ring-dash-teal"
              style={{ backgroundColor: color }}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Creates a project (no `project` prop) or edits one. `onSaved` receives the saved project.
// Editing also offers the lead hand-over, which needs the workspace's member list.
export default function ProjectForm({ workspaceId, project, onSaved }) {
  const editing = Boolean(project);
  const initial = initialValues(project);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [createProject, { isLoading: creating }] = useCreateProjectMutation();
  const [updateProject, { isLoading: updating }] = useUpdateProjectMutation();
  const { data: workspace } = useGetWorkspaceQuery(workspaceId, { skip: !editing });

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
    setSaved(false);
  };
  const handleChange = (e) => set(e.target.name, e.target.value);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const validate = () => {
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Give the project a name';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      found.endDate = 'End date cannot be before the start date';
    }
    return found;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate();
    if (Object.keys(found).length) return setErrors(found);

    const { leadId, startDate, endDate, ...rest } = form;
    const body = {
      ...rest,
      name: form.name.trim(),
      description: form.description.trim(),
      startDate: startDate || null, // null clears a date
      endDate: endDate || null,
    };

    try {
      if (editing) {
        const changedLead = leadId && leadId !== initial.leadId;
        const result = await updateProject({ id: project._id, ...body, ...(changedLead && { leadId }) }).unwrap();
        setSaved(true);
        onSaved?.(result);
      } else {
        const result = await createProject({ workspaceId, ...body }).unwrap();
        onSaved?.(result);
      }
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? undefined : message });
    }
  };

  const members = workspace?.members ?? [];
  const leadOptions = [
    ...(initial.leadId ? [] : [{ value: '', label: 'No lead: choose one…' }]),
    ...members.map((m) => ({ value: m.user._id, label: m.user.name })),
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <TextField
        label="Project name"
        name="name"
        placeholder="Website redesign"
        value={form.name}
        onChange={handleChange}
        error={errors.name}
        className="sm:max-w-sm"
      />
      <TextAreaField
        label="Description (optional)"
        name="description"
        placeholder="What is this project about?"
        value={form.description}
        onChange={handleChange}
        error={errors.description}
        className="sm:max-w-lg"
      />

      <div className="flex flex-wrap gap-3">
        <SelectField
          label="Status"
          name="status"
          className="w-full sm:w-44"
          value={form.status}
          onChange={handleChange}
          options={STATUS_OPTIONS}
          error={errors.status}
        />
        <TextField
          label="Start date"
          name="startDate"
          type="date"
          className="w-full sm:w-44"
          value={form.startDate}
          onChange={handleChange}
          error={errors.startDate}
        />
        <TextField
          label="End date"
          name="endDate"
          type="date"
          className="w-full sm:w-44"
          value={form.endDate}
          onChange={handleChange}
          error={errors.endDate}
        />
      </div>

      {editing && (
        <SelectField
          label="Project lead"
          name="leadId"
          className="sm:max-w-xs"
          value={form.leadId}
          onChange={handleChange}
          options={leadOptions}
          error={errors.leadId}
          disabled={members.length === 0}
        />
      )}

      <ColorPicker value={form.color} onChange={(color) => set('color', color)} />

      {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}

      <div className="flex items-center gap-3">
        <ActionButton type="submit" variant="primary" loading={creating || updating} disabled={editing && !dirty}>
          {editing ? 'Save changes' : 'Create project'}
        </ActionButton>
        {saved && (
          <span className="text-xs text-dash-teal" role="status">
            Saved.
          </span>
        )}
      </div>
    </form>
  );
}
