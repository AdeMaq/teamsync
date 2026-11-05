import { useEffect, useState } from 'react';
import ActionButton from '../../../shared/ui/ActionButton';
import SelectField from '../../../shared/ui/SelectField';
import TextAreaField from '../../../shared/ui/TextAreaField';
import TextField from '../../../shared/ui/TextField';
import { parseApiError } from '../../../shared/api/errors';
import { COLUMNS, PRIORITIES } from '../constants';
import { useCreateTaskMutation, useDeleteTaskMutation, useUpdateTaskMutation } from '../api/taskApi';
import { toDateInput } from '../utils';

const PRIORITY_OPTIONS = PRIORITIES.map(({ value, label }) => ({ value, label }));
const STATUS_OPTIONS = COLUMNS.map(({ value, label }) => ({ value, label }));

const initialValues = (task, status) => ({
  title: task?.title ?? '',
  description: task?.description ?? '',
  status: task?.status ?? status ?? 'todo',
  priority: task?.priority ?? 'medium',
  assigneeId: task?.assignee?._id ?? '',
  dueDate: toDateInput(task?.dueDate),
});

// Creates a task (no `task`; `status` picks the column it starts in) or edits/deletes one.
// `members` is the workspace's member list, for the assignee picker.
export default function TaskModal({ projectId, task, status, members, onClose }) {
  const editing = Boolean(task);
  const initial = initialValues(task, status);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [createTask, { isLoading: creating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: updating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: deleting }] = useDeleteTaskMutation();

  // Escape closes the dialog.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setErrors({ title: 'Give the task a title' });

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      assigneeId: form.assigneeId || null, // null unassigns
      dueDate: form.dueDate || null, // null clears the date
    };

    try {
      if (editing) await updateTask({ id: task._id, projectId, ...body }).unwrap();
      else await createTask({ projectId, status: form.status, ...body }).unwrap();
      onClose();
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length ? undefined : message });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask({ id: task._id, projectId }).unwrap();
      onClose();
    } catch (err) {
      setErrors({ form: parseApiError(err).message });
      setConfirming(false);
    }
  };

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...members.map((m) => ({ value: m.user._id, label: m.user.name })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-lg space-y-4 rounded-2xl border border-dash-border bg-dash-card p-5"
      >
        <h2 id="task-modal-title" className="font-display text-lg font-semibold text-dash-text">
          {editing ? 'Edit task' : 'New task'}
        </h2>

        <TextField
          label="Title"
          name="title"
          autoFocus
          maxLength={200}
          placeholder="What needs to be done?"
          value={form.title}
          onChange={set}
          error={errors.title}
        />
        <TextAreaField
          label="Description (optional)"
          name="description"
          value={form.description}
          onChange={set}
          error={errors.description}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {/* The column of an existing task changes by dragging it, not here. */}
          {!editing && (
            <SelectField label="Column" name="status" value={form.status} onChange={set} options={STATUS_OPTIONS} />
          )}
          <SelectField label="Priority" name="priority" value={form.priority} onChange={set} options={PRIORITY_OPTIONS} error={errors.priority} />
          <SelectField label="Assignee" name="assigneeId" value={form.assigneeId} onChange={set} options={assigneeOptions} error={errors.assigneeId} />
          <TextField label="Due date" name="dueDate" type="date" value={form.dueDate} onChange={set} error={errors.dueDate} />
        </div>

        {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <ActionButton type="submit" variant="primary" loading={creating || updating} disabled={editing && !dirty}>
            {editing ? 'Save changes' : 'Create task'}
          </ActionButton>
          <ActionButton onClick={onClose} disabled={creating || updating || deleting}>
            Cancel
          </ActionButton>

          {editing && task.canDelete && (
            <span className="ml-auto flex gap-2">
              {confirming ? (
                <>
                  <ActionButton variant="danger" loading={deleting} onClick={handleDelete}>
                    Yes, delete
                  </ActionButton>
                  <ActionButton disabled={deleting} onClick={() => setConfirming(false)}>
                    Keep
                  </ActionButton>
                </>
              ) : (
                <ActionButton variant="danger" onClick={() => setConfirming(true)}>
                  Delete
                </ActionButton>
              )}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
