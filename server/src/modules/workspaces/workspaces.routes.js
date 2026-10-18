import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { authLimiter } from '../../core/middleware/rateLimiter.middleware.js';
import { requireWorkspacePermission as allow } from './workspaces.middleware.js';
import {
  acceptInviteSchema,
  changeRoleSchema,
  createWorkspaceSchema,
  deleteWorkspaceSchema,
  idParams,
  inviteSchema,
  memberIdParams,
  revokeInviteSchema,
  transferSchema,
  updateWorkspaceSchema,
} from './workspaces.validation.js';
import * as workspacesController from './workspaces.controller.js';

const router = Router();

router.use(requireAuth);

// Workspaces of the logged-in user
router.post('/', validate(createWorkspaceSchema), workspacesController.create);
router.get('/', workspacesController.list);

// Accepting an invitation: the caller is not a member yet, so there is no workspace permission to check.
router.post('/invites/accept', authLimiter, validate(acceptInviteSchema), workspacesController.acceptInvite);

// One workspace (the middleware checks membership and the role's permission for each action)
router.get('/:id', validate(idParams), allow('workspace:view'), workspacesController.get);
router.patch('/:id', validate(updateWorkspaceSchema), allow('workspace:update'), workspacesController.update);
router.delete('/:id', validate(deleteWorkspaceSchema), allow('workspace:delete'), workspacesController.remove);
router.post('/:id/transfer-ownership', validate(transferSchema), allow('workspace:transfer'), workspacesController.transferOwnership);

// Invitations
router.post('/:id/invite', validate(inviteSchema), allow('members:invite'), workspacesController.invite);
router.get('/:id/invites', validate(idParams), allow('members:invite'), workspacesController.listInvites);
router.delete('/:id/invites/:inviteId', validate(revokeInviteSchema), allow('members:invite'), workspacesController.revokeInvite);

// Members. Any member may call DELETE (to leave); the service checks the rank rules for removing others.
router.patch('/:id/members/:memberId', validate(changeRoleSchema), allow('members:manage'), workspacesController.changeRole);
router.delete('/:id/members/:memberId', validate(memberIdParams), allow('workspace:view'), workspacesController.removeMember);

export default router;
