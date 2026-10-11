import {
  BellIcon,
  ChartIcon,
  ChatIcon,
  KanbanIcon,
  ShieldIcon,
  UserPlusIcon,
} from '../../../shared/ui/icons';

const FEATURES = [
  {
    icon: KanbanIcon,
    title: 'Kanban boards',
    text: 'Move tasks across To do, In progress, In review and Done, with ordering that stays in sync for everyone.',
  },
  {
    icon: ChatIcon,
    title: 'Real-time messaging',
    text: 'Workspace channels with live typing indicators, so conversations never wait for a page refresh.',
  },
  {
    icon: ShieldIcon,
    title: 'Role-based access',
    text: 'Owner, admin and member roles decide who can change workspaces, projects and tasks.',
  },
  {
    icon: BellIcon,
    title: 'Instant notifications',
    text: 'Get alerted the moment you are assigned a task, mentioned in a thread or invited to a workspace.',
  },
  {
    icon: ChartIcon,
    title: 'Productivity analytics',
    text: 'Task counts, weekly throughput and recent activity for the whole workspace on one dashboard.',
  },
  {
    icon: UserPlusIcon,
    title: 'Workspaces & invites',
    text: 'Create a workspace for each team and bring people in by email in a few clicks.',
  },
];

export default function Features() {
  return (
    <section className="mx-auto max-w-[1150px] px-6 py-16 lg:py-24">
      <h2 className="font-display text-[28px] font-bold leading-tight text-white">Everything a remote team needs</h2>
      <p className="mt-3 max-w-[520px] text-sm leading-relaxed text-muted">
        Planning, doing and talking about the work, together in one workspace, without stitching five tools together.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="rounded-2xl border border-slate-border bg-navy-800 p-6 transition-colors hover:border-teal-400/30"
          >
            <Icon size={22} className="text-teal-400" />
            <h3 className="mt-4 font-display text-base font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
