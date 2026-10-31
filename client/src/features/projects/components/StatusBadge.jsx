import { STATUS_BY_VALUE } from '../constants';

export default function StatusBadge({ status }) {
  const { label, tone } = STATUS_BY_VALUE[status] ?? STATUS_BY_VALUE.planning;

  return (
    <span className={`inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}
