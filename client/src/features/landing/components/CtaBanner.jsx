import { Link } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/routePaths';

export default function CtaBanner() {
  return (
    <section className="mx-auto max-w-[1150px] px-6 pb-16 lg:pb-24">
      <div className="relative overflow-hidden rounded-2xl border border-slate-border bg-navy-800">
        <div className="pointer-events-none absolute inset-0 bg-cta-glow" aria-hidden="true" />

        <div className="relative flex flex-col gap-6 p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Ready to sync your team?</h2>
            <p className="mt-2 text-sm text-muted">Create a workspace and invite your team in minutes.</p>
          </div>

          <Link
            to={ROUTES.register}
            className="self-start rounded-lg bg-brand-gradient px-6 py-3 text-sm font-semibold text-navy transition-opacity hover:opacity-90 md:self-auto"
          >
            Get started free
          </Link>
        </div>
      </div>
    </section>
  );
}
