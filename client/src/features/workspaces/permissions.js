// A client-side COPY of the server's rules (server/src/core/constants/permissions.js), used only to decide
// which buttons to show. The server enforces every rule again, so a mismatch can never grant access;
// keep the two in step when a rule changes.
export const ROLE_RANK = { member: 1, admin: 2, owner: 3 };

const REQUIRED_ROLE = {
  'workspace:update': 'admin',
  'workspace:delete': 'owner',
  'workspace:transfer': 'owner',
  'members:invite': 'admin',
  'members:manage': 'admin',
};

export const can = (role, action) => (ROLE_RANK[role] ?? 0) >= ROLE_RANK[REQUIRED_ROLE[action]];

// Roles you may hand out (invite as, change someone to): only roles below your own, never "owner".
export const assignableRoles = (role) => ['member', 'admin'].filter((r) => ROLE_RANK[r] < (ROLE_RANK[role] ?? 0));

// You may act on a member only when they rank below you (the owner can never be acted on).
export const canManageMember = (actorRole, targetRole) =>
  can(actorRole, 'members:manage') && ROLE_RANK[actorRole] > ROLE_RANK[targetRole];

export const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member' };
