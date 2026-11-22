import { Link } from 'react-router-dom';
import Avatar from '../../../shared/ui/Avatar';
import Card from '../../../shared/ui/Card';
import { projectPath } from '../../projects';

// Recent activity: new tasks and comments. `items` is [{ id, name, avatar, verb, target, projectId, time }].
export default function ActivityFeed({ items }) {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Recent activity</h2>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-dash-muted">Nothing yet. New tasks and comments will show up here.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map(({ id, name, avatar, verb, target, projectId, time }) => (
            <li key={id} className="flex gap-3">
              <Avatar name={name} src={avatar} size="xs" />
              <div className="min-w-0">
                <p className="break-words text-sm leading-5">
                  <span className="font-semibold text-dash-text">{name}</span>{' '}
                  <span className="text-dash-muted">{verb}</span>{' '}
                  <Link to={projectPath(projectId)} className="text-dash-text hover:text-dash-teal">
                    {target}
                  </Link>
                </p>
                <p className="text-xs text-dash-muted">{time}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
