import { Link } from 'react-router-dom';
import Card from '../../../shared/ui/Card';
import { ROUTES } from '../../../app/routes/routePaths';
import { projectPath } from '../../projects';

const BADGE_TONES = {
  teal: 'bg-teal-400/10 text-teal-300',
  amber: 'bg-amber-400/10 text-amber-300',
  green: 'bg-green-400/10 text-green-300',
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// `projects` is [{ id, name, openTasks, overdueTasks, status, tone, progress }].
export default function ProjectHealth({ projects }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-dash-text">Project health</h2>
        <Link to={ROUTES.projects} className="text-sm font-medium text-dash-teal transition-opacity hover:opacity-80">
          View all
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="mt-4 text-sm text-dash-muted">
          No projects yet.{' '}
          <Link to={ROUTES.newProject} className="text-dash-teal hover:underline">
            Create the first one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {projects.map(({ id, name, openTasks, overdueTasks, status, tone, progress }) => (
            <li
              key={id}
              className="rounded-2xl border border-dash-border bg-dash-inset p-4 transition-colors hover:border-[#2F3A5C]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link to={projectPath(id)} className="block truncate text-base font-medium text-dash-text hover:text-dash-teal">
                    {name}
                  </Link>
                  <p className="mt-0.5 text-xs text-dash-muted">
                    {plural(openTasks, 'open task')}
                    {overdueTasks > 0 && <span className="text-red-300"> · {overdueTasks} overdue</span>}
                  </p>
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
      )}
    </Card>
  );
}
