import { AlertIcon, CheckCircleIcon, ClockIcon, FolderIcon } from '../../shared/ui/icons';
import { assetUrl } from '../../shared/utils/assetUrl';
import { formatRelative } from '../../shared/utils/formatDate';

// Turn the server's dashboard response into the plain props the dashboard components take.

// "+18% vs the previous 30 days"
export const trendCaption = (last, previous) => {
  if (previous === 0) return last === 0 ? 'Nothing finished yet' : 'None the 30 days before';
  const change = Math.round(((last - previous) / previous) * 100);
  if (change === 0) return 'Same as the previous 30 days';
  return `${change > 0 ? '+' : ''}${change}% vs the previous 30 days`;
};

export const toStats = (s) => [
  { label: 'Active projects', icon: FolderIcon, value: String(s.activeProjects), caption: 'Currently in progress' },
  { label: 'Open tasks', icon: ClockIcon, value: String(s.openTasks), caption: `${s.dueThisWeek} due in the next 7 days` },
  {
    label: 'Overdue',
    icon: AlertIcon,
    value: String(s.overdueTasks),
    caption: s.overdueTasks > 0 ? 'Past their due date' : 'Everything is on time',
  },
  {
    label: 'Completed (30d)',
    icon: CheckCircleIcon,
    value: String(s.completedLast30Days),
    caption: trendCaption(s.completedLast30Days, s.completedPrevious30Days),
  },
];

// Weeks start on Monday (UTC). The label is that Monday: "Nov 10".
const weekFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const toWeeks = (weeks) =>
  weeks.map(({ weekStart, value }) => ({ week: weekFormatter.format(new Date(weekStart)), value }));

export const toActivity = (items) =>
  items.map((item) => ({
    id: `${item.type}-${item.taskId}-${item.createdAt}`,
    name: item.actor?.name ?? 'Former member',
    avatar: assetUrl(item.actor?.avatar),
    verb: item.type === 'comment_added' ? 'commented on' : 'created',
    target: item.taskTitle,
    projectId: item.projectId,
    time: formatRelative(item.createdAt),
  }));

const HEALTH = {
  'on-track': { status: 'On track', tone: 'teal' },
  'at-risk': { status: 'At risk', tone: 'amber' },
  shipped: { status: 'Shipped', tone: 'green' },
};

export const toProjects = (projects) =>
  projects.map((p) => ({
    id: p._id,
    name: p.name,
    openTasks: p.openTasks,
    overdueTasks: p.overdueTasks,
    progress: p.progress,
    ...HEALTH[p.health],
  }));

export const toPeople = (workload) =>
  workload.map(({ user, tasks }) => ({ id: user._id, name: user.name, avatar: assetUrl(user.avatar), tasks }));
