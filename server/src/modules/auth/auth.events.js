import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import * as authRepository from './auth.repository.js';

// Auth reacts to events from other modules; it does not know who emits them.
const endAllSessions = ({ userId }) => authRepository.deleteRefreshTokensByUser(userId);

eventBus.on(EVENTS.USER_DELETED, endAllSessions);
// A changed password signs the account out everywhere (access tokens simply expire within minutes).
eventBus.on(EVENTS.PASSWORD_CHANGED, endAllSessions);
