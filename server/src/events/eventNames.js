// Events one module emits and others listen to. The emitter never knows who listens.
export const EVENTS = Object.freeze({
  USER_DELETED: 'user.deleted', // payload: { userId }
  PASSWORD_CHANGED: 'user.password_changed', // payload: { userId }
  // Projects, tasks, comments and messages of a workspace must listen for this and delete their own data.
  WORKSPACE_DELETED: 'workspace.deleted', // payload: { workspaceId }
  // Someone was removed from, or left, a workspace. Modules that tie people to things inside it clean up.
  WORKSPACE_MEMBER_REMOVED: 'workspace.member_removed', // payload: { workspaceId, userId }
  // Tasks (and later comments) of a project must listen for this and delete their own data.
  PROJECT_DELETED: 'project.deleted', // payload: { projectId, workspaceId }
});
