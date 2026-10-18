import { ROLE_RANK, ROLES } from './roles.js';

// The single policy map: each action and the LOWEST workspace role allowed to do it.
// Routes ask for an action (requireWorkspacePermission('workspace:update')), never for a role,
// so changing who may do what happens in this one place.
export const PERMISSIONS = Object.freeze({
  'workspace:view': ROLES.MEMBER,
  'workspace:update': ROLES.ADMIN,
  'workspace:delete': ROLES.OWNER,
  'workspace:transfer': ROLES.OWNER,
  'members:invite': ROLES.ADMIN,
  'members:manage': ROLES.ADMIN,
});

export const can = (role, action) => {
  const required = PERMISSIONS[action];
  if (!required) throw new Error(`Unknown permission "${action}"`); // a typo must fail loudly, not allow access
  return (ROLE_RANK[role] ?? 0) >= ROLE_RANK[required];
};
