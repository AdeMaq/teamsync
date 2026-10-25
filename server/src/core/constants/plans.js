// What each workspace plan allows. `null` means no limit.
// There is no billing yet, so every workspace starts on "free" and this is the one place to change the numbers.
export const PLAN_LIMITS = Object.freeze({
  free: { members: 10 },
  pro: { members: 100 },
  enterprise: { members: null },
});

export const PLAN_NAMES = Object.freeze({ free: 'Free', pro: 'Pro', enterprise: 'Enterprise' });

// Members a workspace on this plan may have (people already in it plus pending invitations); null = unlimited.
export const memberLimitFor = (plan) => (plan in PLAN_LIMITS ? PLAN_LIMITS[plan].members : PLAN_LIMITS.free.members);
