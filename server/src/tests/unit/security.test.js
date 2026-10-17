import {
  hashToken,
  newTokenFamily,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../core/utils/generateToken.js';
import { hashPassword, verifyPassword } from '../../core/utils/password.js';

describe('tokens', () => {
  it('an access token carries the user id', () => {
    const token = signAccessToken('user-1');
    expect(verifyAccessToken(token).sub).toBe('user-1');
  });

  it('access and refresh tokens cannot be used in place of each other', () => {
    const access = signAccessToken('user-1');
    const refresh = signRefreshToken('user-1', newTokenFamily());

    expect(() => verifyRefreshToken(access)).toThrow();
    expect(() => verifyAccessToken(refresh)).toThrow();
  });

  it('refresh tokens issued at the same moment are still different', () => {
    const family = newTokenFamily();
    expect(signRefreshToken('user-1', family)).not.toBe(signRefreshToken('user-1', family));
  });

  it('a refresh token carries its family', () => {
    const family = newTokenFamily();
    expect(verifyRefreshToken(signRefreshToken('user-1', family)).family).toBe(family);
  });

  it('hashToken is a stable 64-character hash that differs per input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});

describe('passwords', () => {
  it('produces a bcrypt hash, never the plain password', async () => {
    const hash = await hashPassword('password123');
    expect(hash).not.toContain('password123');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('password123');
    expect(await verifyPassword('password123', hash)).toBe(true);
    expect(await verifyPassword('password124', hash)).toBe(false);
  });

  it('salts every hash, so the same password hashes differently each time', async () => {
    expect(await hashPassword('password123')).not.toBe(await hashPassword('password123'));
  });
});
