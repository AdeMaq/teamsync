import { useState } from 'react';
import { useSelector } from 'react-redux';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import TextField from '../../../shared/ui/TextField';
import { parseApiError } from '../../../shared/api/errors';
import { selectCurrentUser } from '../../auth';
import { useUpdateNameMutation } from '../api/profileApi';

export default function NameSection() {
  const user = useSelector(selectCurrentUser);
  const [name, setName] = useState(user?.name ?? '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [updateName, { isLoading }] = useUpdateNameMutation();

  const unchanged = name.trim() === user?.name;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Enter your full name');

    try {
      await updateName({ name: name.trim() }).unwrap();
      setSaved(true);
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setError(fieldErrors.name ?? message);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Name</h2>
      <p className="mt-1 text-sm text-dash-muted">This is how teammates see you.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-wrap items-start gap-3">
        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          className="w-full sm:w-72"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
            setSaved(false);
          }}
          error={error}
        />
        <ActionButton type="submit" variant="primary" loading={isLoading} disabled={unchanged} className="sm:mt-[22px]">
          Save name
        </ActionButton>
      </form>

      {saved && <p className="mt-3 text-xs text-dash-teal">Name updated.</p>}
    </Card>
  );
}
