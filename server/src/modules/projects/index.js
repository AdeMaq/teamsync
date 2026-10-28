// Public API of the projects module.
import './projects.events.js'; // registers the module's event listeners
export { projectsRouter, workspaceProjectsRouter } from './projects.routes.js';
// Reused by tasks, comments... to guard routes that name a project (/projects/:id/...).
export { requireProjectPermission } from './projects.middleware.js';
