import { ROLE_LABELS } from '../permissions';

const TONES = {
  owner: 'bg-dash-teal/10 text-dash-teal',
  admin: 'bg-blue-400/10 text-blue-300',
  member: 'bg-white/5 text-dash-muted',
};

export default function RoleBadge({ role }) {
  return (
    <span className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-xs font-medium ${TONES[role] ?? TONES.member}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}
