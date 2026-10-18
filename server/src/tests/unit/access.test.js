import { can, PERMISSIONS } from '../../core/constants/permissions.js';
import { ROLE_RANK } from '../../core/constants/roles.js';
import { slugify } from '../../core/utils/slugify.js';

describe('permissions', () => {
  it('ranks owner above admin above member', () => {
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.member);
  });

  it.each([
    ['member', 'workspace:view', true],
    ['member', 'workspace:update', false],
    ['member', 'members:invite', false],
    ['member', 'members:manage', false],
    ['admin', 'workspace:view', true],
    ['admin', 'workspace:update', true],
    ['admin', 'members:invite', true],
    ['admin', 'members:manage', true],
    ['admin', 'workspace:delete', false],
    ['admin', 'workspace:transfer', false],
    ['owner', 'workspace:delete', true],
    ['owner', 'workspace:transfer', true],
  ])('%s %s -> %s', (role, action, expected) => {
    expect(can(role, action)).toBe(expected);
  });

  it('every higher role can do everything a lower role can', () => {
    for (const action of Object.keys(PERMISSIONS)) {
      if (can('member', action)) expect(can('admin', action)).toBe(true);
      if (can('admin', action)) expect(can('owner', action)).toBe(true);
    }
  });

  it('denies an unknown or missing role', () => {
    expect(can('stranger', 'workspace:view')).toBe(false);
    expect(can(undefined, 'workspace:view')).toBe(false);
  });

  it('throws on an unknown action, so a typo can never grant access by accident', () => {
    expect(() => can('owner', 'workspace:explode')).toThrow(/Unknown permission/);
  });
});

describe('slugify', () => {
  it('lower-cases and joins words with single hyphens', () => {
    expect(slugify('Northwind Labs')).toBe('northwind-labs');
    expect(slugify('  Hello   World!!  ')).toBe('hello-world');
  });

  it('removes accents', () => {
    expect(slugify('Café Müller')).toBe('cafe-muller');
  });

  it('falls back to "workspace" when nothing usable is left', () => {
    expect(slugify('!!!')).toBe('workspace');
    expect(slugify('')).toBe('workspace');
  });

  it('limits the length without leaving a trailing hyphen', () => {
    const slug = slugify('a'.repeat(30) + ' ' + 'b'.repeat(30), 31);
    expect(slug.length).toBeLessThanOrEqual(31);
    expect(slug.endsWith('-')).toBe(false);
  });
});
