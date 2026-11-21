import { recentComments } from '../comments/index.js';
import { listLiveProjects } from '../projects/index.js';
import { dashboardNumbers, taskTitles } from '../tasks/index.js';
import { getMemberProfiles } from '../workspaces/index.js';

const ACTIVITY_SHOWN = 10;
const PROJECTS_SHOWN = 5;

const DAY = 24 * 60 * 60 * 1000;

// "Shipped" once completed; "at risk" when it has overdue tasks, or its end date has passed with work still open.
export const healthOf = (project, counts, now) => {
  if (project.status === 'completed') return 'shipped';
  const pastEnd = project.endDate && new Date(project.endDate).getTime() + DAY <= now.getTime();
  return counts.overdue > 0 || (pastEnd && counts.open > 0) ? 'at-risk' : 'on-track';
};

// Everything the dashboard shows, for one workspace. The workspace and the caller's access are checked by the
// route; this only gathers numbers from the modules that own the data. Days and weeks are in UTC.
export const getDashboard = async (workspaceId, now = new Date()) => {
  const [numbers, projects, comments, people] = await Promise.all([
    dashboardNumbers(workspaceId, now),
    listLiveProjects(workspaceId),
    recentComments(workspaceId, ACTIVITY_SHOWN),
    getMemberProfiles(workspaceId),
  ]);

  const person = (userId) => people[userId] ?? null; // null: they left the workspace or deleted their account

  // The feed is derived from what exists (new tasks and comments); there is no separate activity log yet.
  const titles = await taskTitles(workspaceId, comments.map((c) => c.taskId));
  const activity = [
    ...numbers.recentTasks.map((t) => ({
      type: 'task_created',
      actor: person(t.userId),
      taskId: t.taskId,
      taskTitle: t.title,
      projectId: t.projectId,
      createdAt: t.at,
    })),
    ...comments
      .filter((c) => titles[c.taskId]) // the task may have just been deleted
      .map((c) => ({
        type: 'comment_added',
        actor: person(c.userId),
        taskId: c.taskId,
        taskTitle: titles[c.taskId].title,
        projectId: titles[c.taskId].projectId,
        createdAt: c.at,
      })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, ACTIVITY_SHOWN);

  const none = { total: 0, done: 0, open: 0, overdue: 0 };
  const projectHealth = projects.slice(0, PROJECTS_SHOWN).map((project) => {
    const counts = numbers.perProject[project._id] ?? none;
    return {
      _id: project._id,
      name: project.name,
      color: project.color,
      status: project.status,
      openTasks: counts.open,
      totalTasks: counts.total,
      overdueTasks: counts.overdue,
      progress: counts.total ? Math.round((counts.done / counts.total) * 100) : 0,
      health: healthOf(project, counts, now),
    };
  });

  return {
    stats: {
      activeProjects: projects.filter((p) => p.status === 'active').length,
      openTasks: numbers.openTasks,
      dueThisWeek: numbers.dueThisWeek,
      overdueTasks: numbers.overdueTasks,
      completedLast30Days: numbers.completedLast30Days,
      completedPrevious30Days: numbers.completedPrevious30Days,
    },
    weeklyThroughput: numbers.weeks,
    activity,
    projectHealth,
    workload: numbers.workload
      .filter((w) => person(w.userId))
      .map((w) => ({ user: person(w.userId), tasks: w.tasks })),
  };
};
