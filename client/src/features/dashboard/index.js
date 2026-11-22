// Public API of the dashboard feature.
export { default as StatsCard } from './components/StatsCard';
export { default as ActivityChart } from './components/ActivityChart';
export { default as ActivityFeed } from './components/ActivityFeed';
export { default as ProjectHealth } from './components/ProjectHealth';
export { default as Workload } from './components/Workload';
export { useGetDashboardQuery } from './api/dashboardApi';
export { toStats, toWeeks, toActivity, toProjects, toPeople } from './utils';
