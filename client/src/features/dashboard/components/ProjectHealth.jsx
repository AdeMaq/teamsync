import { Link } from 'react-router-dom';
import Card from '../../../shared/ui/Card';
import { ROUTES } from '../../../app/routes/routePaths';

const BADGE_TONES = {
  teal: 'bg-teal-400/10 text-teal-300',
  amber: 'bg-amber-400/10 text-amber-300',
  green: 'bg-green-400/10 text-green-300',
};

export default function ProjectHealth({ projects }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-dash-text">Project health</h2>
        <Link to={ROUTES.projects} className="text-sm font-medium text-dash-teal transition-opacity hover:opacity-80">
          View all
        </Link>
      </div>

      <ul className="mt-4 space-y-4">
        {projects.map(({ id, name, openTasks, status, tone, progress }) => (
          <li
            key={id}
            className="rounded-2xl border border-dash-border bg-dash-inset p-4 transition-colors hover:border-[#2F3A5C]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-medium text-dash-text">{name}</p>
                <p className="mt-0.5 text-xs text-dash-muted">{openTasks} open tasks</p>
              </div>
              <span
                className={`inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-xs font-medium ${BADGE_TONES[tone]}`}
              >
                {status}
              </span>
            </div>

            <div
              className="mt-3 h-1.5 w-full rounded-full bg-dash-track"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${name} progress`}
            >
              <div className="h-full rounded-full bg-dash-gradient" style={{ width: `${progress}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
