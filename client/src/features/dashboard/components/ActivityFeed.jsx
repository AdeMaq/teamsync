import Avatar from '../../../shared/ui/Avatar';
import Card from '../../../shared/ui/Card';

export default function ActivityFeed({ items }) {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Live activity</h2>

      <ul className="mt-4 space-y-4">
        {items.map(({ id, name, action, time }) => (
          <li key={id} className="flex gap-3">
            <Avatar name={name} size="xs" />
            <div className="min-w-0">
              <p className="text-sm leading-5">
                <span className="font-semibold text-dash-text">{name}</span>{' '}
                <span className="text-dash-muted">{action}</span>
              </p>
              <p className="text-xs text-dash-muted">{time}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
