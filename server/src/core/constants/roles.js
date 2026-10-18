// Workspace roles, lowest to highest. The rank decides who may change whom.
export const ROLES = Object.freeze({
  MEMBER: 'member',
  ADMIN: 'admin',
  OWNER: 'owner',
});

export const ROLE_RANK = Object.freeze({
  [ROLES.MEMBER]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.OWNER]: 3,
});
