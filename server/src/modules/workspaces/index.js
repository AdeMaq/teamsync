// Public API of the workspaces module.
import './workspaces.events.js'; // registers the module's event listeners
export { default as workspacesRoutes } from './workspaces.routes.js';
// Reused by projects, tasks, messages... to guard routes that live inside a workspace.
export { requireWorkspacePermission } from './workspaces.middleware.js';
// For modules that need to look up one person's role in a workspace (e.g. to guard /projects/:id).
export { getMembership } from './workspaces.service.js';
