// Public API of the comments module.
import './comments.events.js'; // registers the module's event listeners
export { taskCommentsRouter, commentsRouter } from './comments.routes.js';
// Read-only list for the dashboard.
export { recentComments } from './comments.service.js';
