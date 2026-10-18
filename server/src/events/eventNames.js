// Events one module emits and others listen to. The emitter never knows who listens.
export const EVENTS = Object.freeze({
  USER_DELETED: 'user.deleted', // payload: { userId }
  PASSWORD_CHANGED: 'user.password_changed', // payload: { userId }
  // Projects, tasks, comments and messages of a workspace must listen for this and delete their own data.
  WORKSPACE_DELETED: 'workspace.deleted', // payload: { workspaceId }
});
