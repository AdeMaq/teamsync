import Avatar from '../../../shared/ui/Avatar';
import Card from '../../../shared/ui/Card';

const FULL_BAR_TASKS = 12; // fill width = tasks / 12

// Open tasks per person. `people` is [{ id, name, avatar, tasks }], busiest first.
export default function Workload({ people }) {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Workload</h2>

      {people.length === 0 ? (
        <p className="mt-4 text-sm text-dash-muted">No open tasks are assigned to anyone.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {people.map(({ id, name, avatar, tasks }) => (
            <li key={id} className="flex h-6 items-center gap-3">
              <Avatar name={name} src={avatar} size="xs" />
              <span className="flex-1 truncate text-sm font-medium text-dash-text">{name}</span>
              <div className="h-1.5 w-[100px] shrink-0 rounded-full bg-dash-track">
                <div
                  className="h-full rounded-full bg-dash-gradient"
                  style={{ width: `${Math.min(100, (tasks / FULL_BAR_TASKS) * 100)}%` }}
                />
              </div>
              <span className="w-5 shrink-0 text-right text-xs text-dash-muted">{tasks}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
