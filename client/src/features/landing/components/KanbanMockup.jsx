const COLUMNS = [
  { title: 'To do', cards: 3 },
  { title: 'In progress', cards: 2 },
  { title: 'Done', cards: 1 },
];

// Plain-shape product mockup: an app window holding a skeleton Kanban board.
export default function KanbanMockup() {
  return (
    <div className="rounded-2xl border border-slate-border bg-slate-card shadow-glow" aria-hidden="true">
      <div className="flex items-center gap-1.5 border-b border-slate-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
      </div>

      <div className="grid grid-cols-3 gap-3 p-4">
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="mb-3 text-xs text-muted">{column.title}</p>
            <div className="space-y-3">
              {Array.from({ length: column.cards }).map((_, i) => (
                <div key={i} className="rounded-lg border border-slate-border bg-navy-800 p-3">
                  <div className="h-1.5 w-2/5 rounded-full bg-teal-400" />
                  <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/10" />
                  <div className="mt-1.5 h-1.5 w-3/5 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-border px-4 py-3 text-xs">
        <span className="text-muted">#proj-apollo</span>
        <span>
          <span className="font-medium text-teal-400">Diego</span>{' '}
          <span className="text-white">moved APL-14 to In progress</span>
        </span>
      </div>
    </div>
  );
}
