import { useState } from 'react';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import SelectField from '../../../shared/ui/SelectField';
import TextField from '../../../shared/ui/TextField';
import { parseApiError } from '../../../shared/api/errors';
import { useInviteMemberMutation } from '../api/workspaceApi';
import { ROLE_LABELS, assignableRoles } from '../permissions';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function InviteForm({ workspaceId, myRole }) {
  const roles = assignableRoles(myRole);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [inviteMember, { isLoading }] = useInviteMemberMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSentTo('');
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address');

    try {
      await inviteMember({ id: workspaceId, email: email.trim(), role }).unwrap();
      setSentTo(email.trim());
      setEmail('');
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Invite someone</h2>
      <p className="mt-1 text-sm text-dash-muted">
        They get an email with a link that works for 7 days, and must log in (or sign up) with that same address.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-wrap items-start gap-3">
        <TextField
          label="Email address"
          type="email"
          placeholder="teammate@company.com"
          className="w-full sm:w-72"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
            setSentTo('');
          }}
          error={error}
        />
        <SelectField
          label="Role"
          className="w-32"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
        />
        <ActionButton type="submit" variant="primary" loading={isLoading} className="sm:mt-[22px]">
          Send invitation
        </ActionButton>
      </form>

      {sentTo && (
        <p className="mt-3 text-xs text-dash-teal" role="status">
          Invitation sent to {sentTo}.
          {import.meta.env.DEV && ' (Development: with no SMTP configured, the link is printed in the server console.)'}
        </p>
      )}
    </Card>
  );
}
