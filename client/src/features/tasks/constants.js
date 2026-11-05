// Must match TASK_STATUSES / TASK_PRIORITIES in server/src/modules/tasks/tasks.validation.js.
export const COLUMNS = [
  { value: 'todo', label: 'To do', dot: 'bg-dash-muted' },
  { value: 'in-progress', label: 'In progress', dot: 'bg-blue-400' },
  { value: 'in-review', label: 'In review', dot: 'bg-amber-300' },
  { value: 'done', label: 'Done', dot: 'bg-dash-teal' },
];

export const PRIORITIES = [
  { value: 'low', label: 'Low', tone: 'bg-white/5 text-dash-muted' },
  { value: 'medium', label: 'Medium', tone: 'bg-blue-400/10 text-blue-300' },
  { value: 'high', label: 'High', tone: 'bg-amber-400/10 text-amber-300' },
  { value: 'urgent', label: 'Urgent', tone: 'bg-red-500/10 text-red-300' },
];

export const PRIORITY_BY_VALUE = Object.fromEntries(PRIORITIES.map((p) => [p.value, p]));

// The server refuses to create more than this many tasks in one project.
export const MAX_TASKS_PER_PROJECT = 500;
