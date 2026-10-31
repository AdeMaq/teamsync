// Must match PROJECT_STATUSES in server/src/modules/projects/projects.validation.js.
export const STATUSES = [
  { value: 'planning', label: 'Planning', tone: 'bg-white/5 text-dash-muted' },
  { value: 'active', label: 'Active', tone: 'bg-dash-teal/10 text-dash-teal' },
  { value: 'on-hold', label: 'On hold', tone: 'bg-amber-400/10 text-amber-300' },
  { value: 'completed', label: 'Completed', tone: 'bg-blue-400/10 text-blue-300' },
  { value: 'archived', label: 'Archived', tone: 'bg-white/5 text-dash-muted' },
];

export const STATUS_BY_VALUE = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

export const SORTS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'name', label: 'Name (A to Z)' },
  { value: 'created', label: 'Newest first' },
];

// Colours offered in the form. The first one is the server's default.
export const PROJECT_COLORS = ['#2DD4BF', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#EAB308', '#22C55E', '#EF4444'];

export const PAGE_SIZE = 12;
