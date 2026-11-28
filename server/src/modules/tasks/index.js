// Public API of the tasks module.
import './tasks.events.js'; // registers the module's event listeners
// Read-only numbers for the dashboard.
export { dashboardNumbers, taskTitles } from './tasks.service.js';
export { projectTasksRouter, tasksRouter, workspaceTaskCountsRouter } from './tasks.routes.js';
// Reused by comments... to guard routes that name a task (/tasks/:id/...).
export { requireTaskPermission } from './tasks.middleware.js';
// Loads one task (no permission check): comments use it to describe a task in their events.
export { findTask as findTaskForComments } from './tasks.service.js';
