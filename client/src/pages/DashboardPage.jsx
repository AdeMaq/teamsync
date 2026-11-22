import {
  ActivityChart,
  ActivityFeed,
  ProjectHealth,
  StatsCard,
  Workload,
  toActivity,
  toPeople,
  toProjects,
  toStats,
  toWeeks,
  useGetDashboardQuery,
} from '../features/dashboard';
import { useActiveWorkspace } from '../features/workspaces';
import ActionButton from '../shared/ui/ActionButton';
import Card from '../shared/ui/Card';
import Spinner from '../shared/ui/Spinner';

// Landing page after login. Shown inside AppShell (sidebar + top bar), for the active workspace.
// Breakpoints: 1280px+ stats 4 across; 768-1279px stats 2x2; under 768px one column.
// The 2/3 + 1/3 rows hold from 768px up. Card wrappers are grids so each card stretches
// to the height of its row neighbour.
export default function DashboardPage() {
  const { active } = useActiveWorkspace();
  // The workspace is always set here (WorkspaceGate). Refetch on every visit so other people's changes show up.
  const { data, isLoading, isError, refetch } = useGetDashboardQuery(active?._id, {
    skip: !active,
    refetchOnMountOrArgChange: true,
  });

  if (isLoading || !active) return <Spinner />;

  if (isError || !data) {
    return (
      <Card className="max-w-2xl p-5">
        <h2 className="font-display text-lg font-semibold text-dash-text">Could not load the dashboard</h2>
        <p className="mt-1 text-sm text-dash-muted">Check your connection and try again.</p>
        <ActionButton className="mt-4" onClick={refetch}>
          Try again
        </ActionButton>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Key numbers">
        {toStats(data.stats).map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="grid md:col-span-2">
          <ActivityChart data={toWeeks(data.weeklyThroughput)} />
        </div>
        <ActivityFeed items={toActivity(data.activity)} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="grid md:col-span-2">
          <ProjectHealth projects={toProjects(data.projectHealth)} />
        </div>
        <Workload people={toPeople(data.workload)} />
      </section>
    </div>
  );
}
