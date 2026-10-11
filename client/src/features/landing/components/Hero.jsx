import { Link } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/routePaths';
import KanbanMockup from './KanbanMockup';

const STATS = [
  { value: '4.2k', label: 'Teams onboarded' },
  { value: '99.98%', label: 'Uptime' },
  { value: '31%', label: 'Faster delivery' },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-[1150px] items-center gap-14 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-border px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            Built for distributed teams
          </span>

          <h1 className="mt-6 max-w-[520px] font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            One workspace for your{' '}
            <span className="bg-brand-gradient bg-clip-text text-transparent [box-decoration-break:clone]">
              whole remote team
            </span>
          </h1>

          <p className="mt-6 max-w-[480px] text-base leading-relaxed text-muted">
            TeamSync brings projects, a Kanban task board, real-time chat and live progress into one place, so
            distributed teams always know what is happening and who owns what.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={ROUTES.dashboard}
              className="rounded-lg bg-brand-gradient px-5 py-3 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
            >
              Explore the demo →
            </Link>
            <Link
              to={ROUTES.projects}
              className="rounded-lg border border-slate-border bg-slate-card px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-teal-400/40"
            >
              See a Kanban board
            </Link>
          </div>

          <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-6">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-3xl font-bold text-teal-400">{stat.value}</dd>
                <p className="mt-1 text-xs text-muted" aria-hidden="true">
                  {stat.label}
                </p>
              </div>
            ))}
          </dl>
        </div>

        <KanbanMockup />
      </div>
    </section>
  );
}
