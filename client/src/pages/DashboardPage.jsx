import {
  ACTIVITY,
  ActivityChart,
  ActivityFeed,
  PROJECT_HEALTH,
  ProjectHealth,
  STATS,
  StatsCard,
  WEEKLY_THROUGHPUT,
  WORKLOAD,
  Workload,
} from '../features/dashboard';

// Landing page after login. Shown inside AppShell (sidebar + top bar).
// Breakpoints: 1280px+ stats 4 across; 768-1279px stats 2x2; under 768px one column.
// The 2/3 + 1/3 rows hold from 768px up. Card wrappers are grids so each card stretches
// to the height of its row neighbour.
export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Key numbers">
        {STATS.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="grid md:col-span-2">
          <ActivityChart data={WEEKLY_THROUGHPUT} />
        </div>
        <ActivityFeed items={ACTIVITY} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="grid md:col-span-2">
          <ProjectHealth projects={PROJECT_HEALTH} />
        </div>
        <Workload people={WORKLOAD} />
      </section>
    </div>
  );
}
