// Events one module emits and others listen to. The emitter never knows who listens.
export const EVENTS = Object.freeze({
  USER_DELETED: 'user.deleted', // payload: { userId }
});
