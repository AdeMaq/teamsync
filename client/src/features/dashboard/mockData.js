import { CheckCircleIcon, ClockIcon, FolderIcon, TrendingUpIcon } from '../../shared/ui/icons';

// STATIC SAMPLE DATA. The dashboard API (GET /workspaces/:id/dashboard) does not exist yet.
// Replace these exports with RTK Query data when it does; the components only depend on these shapes.

export const STATS = [
  { label: 'Active projects', icon: FolderIcon, value: '3', caption: '+1 this month' },
  { label: 'Open tasks', icon: ClockIcon, value: '17', caption: '6 due this week' },
  { label: 'Completed (30d)', icon: CheckCircleIcon, value: '134', caption: '+18% vs last' },
  { label: 'Team velocity', icon: TrendingUpIcon, value: '34 pts', caption: 'Best sprint yet' },
];

export const WEEKLY_THROUGHPUT = [
  { week: 'W28', value: 18 },
  { week: 'W29', value: 24 },
  { week: 'W30', value: 21 },
  { week: 'W31', value: 30 },
  { week: 'W32', value: 27 },
  { week: 'W33', value: 34 },
];

export const ACTIVITY = [
  { id: 1, name: 'Diego Alvarez', action: 'moved APL-14 to In progress', time: '12m ago' },
  { id: 2, name: 'Lena Fischer', action: 'commented on APL-08', time: '48m ago' },
  { id: 3, name: 'Mira Kapoor', action: 'created ATL-12 Dashboard filters', time: '2h ago' },
  { id: 4, name: 'Aisha Rahman', action: 'invited sam@northwind.co as Viewer', time: '5h ago' },
  { id: 5, name: 'Tom Becker', action: 'completed ORB-24 Push notification opt-in', time: 'Yesterday' },
];

// tone: 'teal' | 'amber' | 'green'
export const PROJECT_HEALTH = [
  { id: 1, name: 'Apollo Web App', openTasks: 9, status: 'On track', tone: 'teal', progress: 68 },
  { id: 2, name: 'Atlas Analytics', openTasks: 6, status: 'At risk', tone: 'amber', progress: 41 },
  { id: 3, name: 'Orbit Mobile', openTasks: 2, status: 'Shipped', tone: 'green', progress: 88 },
];

export const WORKLOAD = [
  { id: 1, name: 'Aisha', tasks: 7 },
  { id: 2, name: 'Diego', tasks: 11 },
  { id: 3, name: 'Mira', tasks: 9 },
  { id: 4, name: 'Tom', tasks: 6 },
  { id: 5, name: 'Lena', tasks: 4 },
];
