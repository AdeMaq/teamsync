import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import SelectField from '../../../shared/ui/SelectField';
import Spinner from '../../../shared/ui/Spinner';
import TextField from '../../../shared/ui/TextField';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { ROUTES } from '../../../app/routes/routePaths';
import { useListProjectsQuery } from '../api/projectApi';
import { PAGE_SIZE, SORTS, STATUSES } from '../constants';
import ProjectCard from './ProjectCard';

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...STATUSES.map(({ value, label }) => ({ value, label }))];

// Search, filter and page through one workspace's projects. The filters live here so the server does the work.
export default function ProjectsList({ workspaceId }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim());

  // A different filter means a different result set, so go back to its first page.
  useEffect(() => {
    setPage(1);
  }, [q, status, sort]);

  const params = { workspaceId, sort, page, limit: PAGE_SIZE, ...(q && { q }), ...(status && { status }) };
  const { data, isLoading, isFetching, isError, refetch } = useListProjectsQuery(params);

  const filtered = Boolean(q || status);
  const projects = data?.projects ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  // If the last project on the last page was deleted or moved, step back instead of showing an empty page.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <TextField
          label="Search projects"
          type="search"
          placeholder="Project name"
          className="w-full sm:w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField label="Status" className="w-full sm:w-40" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
        <SelectField label="Sort by" className="w-full sm:w-44" value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS} />
      </Card>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold text-dash-text">Could not load projects</h2>
          <p className="mt-1 text-sm text-dash-muted">Check your connection and try again.</p>
          <ActionButton className="mt-4" onClick={refetch}>
            Try again
          </ActionButton>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="font-display text-lg font-semibold text-dash-text">
            {filtered ? 'No projects match' : 'No projects yet'}
          </h2>
          <p className="mt-1 text-sm text-dash-muted">
            {filtered ? 'Try a different search or status.' : 'Create the first one to start organizing work.'}
          </p>
          {!filtered && (
            <Link
              to={ROUTES.newProject}
              className="mt-4 inline-flex h-9 items-center rounded-xl bg-dash-gradient px-4 text-sm font-medium text-dash-bg hover:opacity-90"
            >
              New project
            </Link>
          )}
        </Card>
      ) : (
        <>
          <div
            className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-70 transition-opacity' : ''}`}
            aria-busy={isFetching}
          >
            {projects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between" aria-label="Pages">
              <p className="text-xs text-dash-muted">
                Page {page} of {totalPages} · {data.total} projects
              </p>
              <div className="flex gap-2">
                <ActionButton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </ActionButton>
                <ActionButton disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </ActionButton>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
