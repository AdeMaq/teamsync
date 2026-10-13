import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import * as authRepository from './auth.repository.js';

// Auth reacts to events from other modules; it does not know who emits them.
eventBus.on(EVENTS.USER_DELETED, ({ userId }) => authRepository.deleteRefreshTokensByUser(userId));
