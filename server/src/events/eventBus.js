// Minimal in-process event bus for cross-module side effects.
// emit() waits for every listener, so a caller can rely on cleanup being finished (and a failing
// listener rejects the emit instead of being silently lost).
const handlers = new Map();

export const eventBus = {
  on(event, handler) {
    handlers.set(event, [...(handlers.get(event) ?? []), handler]);
  },

  async emit(event, payload) {
    await Promise.all((handlers.get(event) ?? []).map((handler) => handler(payload)));
  },
};
