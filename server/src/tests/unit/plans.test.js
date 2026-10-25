import { PLAN_LIMITS, memberLimitFor } from '../../core/constants/plans.js';

describe('plan limits', () => {
  it('gives every plan a member limit, growing with the plan', () => {
    expect(memberLimitFor('free')).toBe(10);
    expect(memberLimitFor('pro')).toBeGreaterThan(memberLimitFor('free'));
  });

  it('enterprise has no limit', () => {
    expect(memberLimitFor('enterprise')).toBeNull();
  });

  it('treats an unknown plan like the free plan, never as unlimited', () => {
    expect(memberLimitFor('something-else')).toBe(memberLimitFor('free'));
    expect(memberLimitFor(undefined)).toBe(memberLimitFor('free'));
  });

  it('covers exactly the plans the workspace model allows', () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual(['enterprise', 'free', 'pro']);
  });
});
