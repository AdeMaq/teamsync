import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import * as workspacesService from './workspaces.service.js';

// When an account is deleted, its workspaces are handed on (or removed if empty) and its memberships dropped.
eventBus.on(EVENTS.USER_DELETED, ({ userId }) => workspacesService.handleUserDeleted(userId));
