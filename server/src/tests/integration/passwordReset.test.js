import User from '../../modules/users/users.model.js';
import { outbox } from '../../core/utils/sendEmail.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import { BASE, http, login, registerUser, uniqueEmail } from '../helpers.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const forgot = (email) => http().post(`${BASE}/auth/forgot-password`).send({ email });
const reset = (token, password) => http().post(`${BASE}/auth/reset-password`).send({ token, password });

// The reset link is only ever sent by email, so tests read it from the in-memory outbox.
const lastResetToken = () => outbox.at(-1).text.match(/reset-password\/([a-f0-9]{64})/)[1];

describe('POST /auth/forgot-password', () => {
  it('emails a reset link to an existing account', async () => {
    const { creds } = await registerUser();
    const before = outbox.length;

    const res = await forgot(creds.email);

    expect(res.status).toBe(200);
    expect(outbox).toHaveLength(before + 1);
    expect(outbox.at(-1).to).toBe(creds.email);
    expect(outbox.at(-1).subject).toMatch(/reset/i);
    expect(outbox.at(-1).text).toContain('http://localhost:5173/reset-password/');
  });

  it('answers identically for an unknown email and sends nothing (no way to discover who is registered)', async () => {
    const { creds } = await registerUser();
    const known = await forgot(creds.email);

    const before = outbox.length;
    const unknown = await forgot(uniqueEmail('nobody'));

    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(outbox).toHaveLength(before);
  });

  it('stores only a hash of the token, and it expires in about an hour', async () => {
    const { creds, user } = await registerUser();
    await forgot(creds.email);
    const token = lastResetToken();

    const stored = await User.findById(user._id).select('+passwordResetTokenHash +passwordResetExpiresAt');
    expect(stored.passwordResetTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.passwordResetTokenHash).not.toBe(token);

    const minutesLeft = (stored.passwordResetExpiresAt - Date.now()) / 60000;
    expect(minutesLeft).toBeGreaterThan(55);
    expect(minutesLeft).toBeLessThanOrEqual(60);
  });

  it('does not expose the reset token in any API response', async () => {
    const { creds, token } = await registerUser();
    await forgot(creds.email);

    const me = await http().get(`${BASE}/users/me`).set({ Authorization: `Bearer ${token}` });
    expect(JSON.stringify(me.body)).not.toMatch(/passwordReset/);
  });

  it('does nothing for a suspended account', async () => {
    const { creds, user } = await registerUser();
    await User.updateOne({ _id: user._id }, { status: 'suspended' });

    const before = outbox.length;
    const res = await forgot(creds.email);

    expect(res.status).toBe(200);
    expect(outbox).toHaveLength(before);
  });

  it('rejects an invalid email address', async () => {
    const res = await forgot('not-an-email');
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/reset-password', () => {
  it('sets the new password: the old one stops working and the new one works', async () => {
    const { creds } = await registerUser();
    await forgot(creds.email);

    const res = await reset(lastResetToken(), 'a-brand-new-password');

    expect(res.status).toBe(200);
    expect((await login(creds.email, creds.password)).status).toBe(401);
    expect((await login(creds.email, 'a-brand-new-password')).status).toBe(200);
  });

  it('works only once', async () => {
    const { creds } = await registerUser();
    await forgot(creds.email);
    const token = lastResetToken();

    expect((await reset(token, 'a-brand-new-password')).status).toBe(200);

    const again = await reset(token, 'another-password-1');
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('INVALID_RESET_TOKEN');
    expect((await login(creds.email, 'another-password-1')).status).toBe(401);
  });

  it('removes the token from the account once used', async () => {
    const { creds, user } = await registerUser();
    await forgot(creds.email);
    await reset(lastResetToken(), 'a-brand-new-password');

    const stored = await User.findById(user._id).select('+passwordResetTokenHash +passwordResetExpiresAt');
    expect(stored.passwordResetTokenHash).toBeUndefined();
    expect(stored.passwordResetExpiresAt).toBeUndefined();
  });

  it('ends every existing session', async () => {
    const { creds, cookie } = await registerUser();
    await forgot(creds.email);
    await reset(lastResetToken(), 'a-brand-new-password');

    const refresh = await http().post(`${BASE}/auth/refresh`).set('Cookie', cookie);
    expect(refresh.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const { creds, user } = await registerUser();
    await forgot(creds.email);
    const token = lastResetToken();
    await User.updateOne({ _id: user._id }, { passwordResetExpiresAt: new Date(Date.now() - 1000) });

    const res = await reset(token, 'a-brand-new-password');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('rejects a token that was never issued', async () => {
    const res = await reset('a'.repeat(64), 'a-brand-new-password');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('rejects a malformed token before touching the database', async () => {
    const res = await reset('not-a-valid-token', 'a-brand-new-password');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('a too-short password is rejected and the link keeps working', async () => {
    const { creds } = await registerUser();
    await forgot(creds.email);
    const token = lastResetToken();

    const weak = await reset(token, 'short');
    expect(weak.status).toBe(400);
    expect(weak.body.error.details[0].field).toBe('password');

    expect((await reset(token, 'a-brand-new-password')).status).toBe(200);
  });

  it('a newer request invalidates the older link', async () => {
    const { creds } = await registerUser();

    await forgot(creds.email);
    const oldToken = lastResetToken();
    await forgot(creds.email);
    const newToken = lastResetToken();

    expect(newToken).not.toBe(oldToken);
    expect((await reset(oldToken, 'a-brand-new-password')).status).toBe(400);
    expect((await reset(newToken, 'a-brand-new-password')).status).toBe(200);
  });
});
