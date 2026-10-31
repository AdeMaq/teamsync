import { Link } from 'react-router-dom';
import Avatar from '../../../shared/ui/Avatar';
import Card from '../../../shared/ui/Card';
import { assetUrl } from '../../../shared/utils/assetUrl';
import { formatDateRange, projectPath } from '../utils';
import StatusBadge from './StatusBadge';

export default function ProjectCard({ project }) {
  const { lead } = project;

  return (
    <Card as={Link} to={projectPath(project._id)} className="flex flex-col p-5 hover:bg-white/[0.02]">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
          aria-hidden="true"
        />
        <h3 className="min-w-0 flex-1 truncate font-display text-base font-semibold text-dash-text">{project.name}</h3>
        <StatusBadge status={project.status} />
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-dash-muted">
        {project.description || 'No description yet.'}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-dash-border pt-3">
        {lead ? (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={lead.name} src={assetUrl(lead.avatar)} size="xs" />
            <span className="truncate text-xs text-dash-muted">{lead.name}</span>
          </div>
        ) : (
          <span className="text-xs text-dash-muted">No lead</span>
        )}
        <span className="shrink-0 text-xs text-dash-muted">{formatDateRange(project.startDate, project.endDate)}</span>
      </div>
    </Card>
  );
}
