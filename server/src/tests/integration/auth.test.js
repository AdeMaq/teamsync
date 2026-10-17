import jwt from 'jsonwebtoken';
import User from '../../modules/users/users.model.js';
import RefreshToken from '../../modules/auth/refreshToken.model.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import { BASE, authed, http, login, refreshCookieOf, registerUser, uniqueEmail } from '../helpers.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

describe('POST /auth/register', () => {
  it('creates the account, returns a session and sets an httpOnly refresh cookie', async () => {
    const email = uniqueEmail();
    const res = await http().post(`${BASE}/auth/register`).send({ name: 'Ada Lovelace', email, password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ name: 'Ada Lovelace', email, status: 'active' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data).not.toHaveProperty('refreshToken'); // the refresh token only travels in the cookie

    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('stores only a bcrypt hash of the password', async () => {
    const { user } = await registerUser({ password: 'password123' });
    const stored = await User.findById(user._id).select('+passwordHash');

    expect(stored.passwordHash).not.toBe('password123');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('stores only a hash of the refresh token', async () => {
    const { user, cookie } = await registerUser();
    const rawToken = cookie.split('=')[1];
    const stored = await RefreshToken.findOne({ user: user._id });

    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toBe(rawToken);
  });

  it('rejects invalid input and says which fields are wrong', async () => {
    const res = await http().post(`${BASE}/auth/register`).send({ name: 'A', email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'password']);
  });

  it('rejects a password longer than bcrypt can use (72 characters)', async () => {
    const res = await http()
      .post(`${BASE}/auth/register`)
      .send({ name: 'Ada', email: uniqueEmail(), password: 'x'.repeat(73) });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('password');
  });

  it('rejects an email that is already registered, ignoring letter case', async () => {
    const { creds } = await registerUser();
    const res = await http()
      .post(`${BASE}/auth/register`)
      .send({ ...creds, email: creds.email.toUpperCase() });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(res.body.error.details[0].field).toBe('email');
  });

  it('trims and lower-cases the email', async () => {
    const { user } = await registerUser({ email: `  Padded-${Date.now()}@Example.COM ` });
    expect(user.email).toBe(user.email.trim().toLowerCase());
    expect(user.email).toMatch(/^padded-\d+@example\.com$/);
  });

  it('ignores fields it does not know, such as a smuggled status', async () => {
    const res = await http()
      .post(`${BASE}/auth/register`)
      .send({ name: 'Ada', email: uniqueEmail(), password: 'password123', status: 'suspended', isEmailVerified: true });

    expect(res.status).toBe(201);
    expect(res.body.data.user.status).toBe('active');
    expect(res.body.data.user.isEmailVerified).toBe(false);
  });
});

describe('POST /auth/login', () => {
  it('logs in with the right credentials and records the login time', async () => {
    const { creds, user } = await registerUser();
    const res = await login(creds.email, creds.password);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(creds.email);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(refreshCookieOf(res)).toBeTruthy();

    const stored = await User.findById(user._id);
    expect(stored.lastLoginAt).toBeInstanceOf(Date);
  });

  it('gives the exact same error for a wrong password and an unknown email', async () => {
    const { creds } = await registerUser();
    const wrongPassword = await login(creds.email, 'wrong-password');
    const unknownEmail = await login(uniqueEmail('nobody'), 'wrong-password');

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('accepts the email in any letter case', async () => {
    const { creds } = await registerUser();
    const res = await login(creds.email.toUpperCase(), creds.password);
    expect(res.status).toBe(200);
  });

  it('blocks suspended accounts', async () => {
    const { creds, user } = await registerUser();
    await User.updateOne({ _id: user._id }, { status: 'suspended' });

    const res = await login(creds.email, creds.password);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('rejects missing fields', async () => {
    const res = await http().post(`${BASE}/auth/login`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('access token (protected routes)', () => {
  it('rejects a request without a token', async () => {
    const res = await http().get(`${BASE}/users/me`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a scheme other than Bearer', async () => {
    const res = await http().get(`${BASE}/users/me`).set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a garbage token', async () => {
    const res = await http().get(`${BASE}/users/me`).set(authed('garbage'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a token signed with a different secret', async () => {
    const { user } = await registerUser();
    const forged = jwt.sign({ sub: user._id }, 'some-other-secret', { expiresIn: '15m' });

    const res = await http().get(`${BASE}/users/me`).set(authed(forged));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('says TOKEN_EXPIRED for an expired token, so the client knows to refresh', async () => {
    const { user } = await registerUser();
    const expired = jwt.sign({ sub: user._id }, process.env.JWT_ACCESS_SECRET, { expiresIn: -10 });

    const res = await http().get(`${BASE}/users/me`).set(authed(expired));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects a refresh token used as an access token', async () => {
    const { user } = await registerUser();
    const wrongKind = jwt.sign({ sub: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '15m' });

    const res = await http().get(`${BASE}/users/me`).set(authed(wrongKind));
    expect(res.status).toBe(401);
  });

  it('accepts a valid token', async () => {
    const { token, user } = await registerUser();
    const res = await http().get(`${BASE}/users/me`).set(authed(token));

    expect(res.status).toBe(200);
    expect(res.body.data.user._id).toBe(user._id);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });
});

describe('POST /auth/refresh', () => {
  it('needs the refresh cookie', async () => {
    const res = await http().post(`${BASE}/auth/refresh`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('issues a new session and rotates the refresh token', async () => {
    const { cookie } = await registerUser();
    const res = await http().post(`${BASE}/auth/refresh`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const newCookie = refreshCookieOf(res);
    expect(newCookie).toBeTruthy();
    expect(newCookie).not.toBe(cookie);

    const me = await http().get(`${BASE}/users/me`).set(authed(res.body.data.accessToken));
    expect(me.status).toBe(200);
  });

  it('revokes the whole login when an already-used refresh token is replayed', async () => {
    const { cookie: first } = await registerUser();

    const rotated = await http().post(`${BASE}/auth/refresh`).set('Cookie', first);
    const second = refreshCookieOf(rotated);

    // Someone replays the old token: refused, and everything from that login is revoked...
    const replay = await http().post(`${BASE}/auth/refresh`).set('Cookie', first);
    expect(replay.status).toBe(401);

    // ...including the newest token, which was perfectly valid a moment ago.
    const afterReplay = await http().post(`${BASE}/auth/refresh`).set('Cookie', second);
    expect(afterReplay.status).toBe(401);
  });

  it('rejects a tampered cookie', async () => {
    const { cookie } = await registerUser();
    const res = await http().post(`${BASE}/auth/refresh`).set('Cookie', `${cookie}x`);
    expect(res.status).toBe(401);
  });

  it('rejects a correctly signed token that the server never issued', async () => {
    const { user } = await registerUser();
    const unknown = jwt.sign({ sub: user._id, family: 'made-up' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    const res = await http().post(`${BASE}/auth/refresh`).set('Cookie', `refreshToken=${unknown}`);
    expect(res.status).toBe(401);
  });

  it('clears the cookie when the refresh fails', async () => {
    const res = await http().post(`${BASE}/auth/refresh`).set('Cookie', 'refreshToken=garbage');
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie'].join(';')).toMatch(/refreshToken=;/);
  });

  it('stops working for suspended accounts', async () => {
    const { cookie, user } = await registerUser();
    await User.updateOne({ _id: user._id }, { status: 'suspended' });

    const res = await http().post(`${BASE}/auth/refresh`).set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token', async () => {
    const { cookie, user } = await registerUser();

    const out = await http().post(`${BASE}/auth/logout`).set('Cookie', cookie);
    expect(out.status).toBe(200);
    expect(out.headers['set-cookie'].join(';')).toMatch(/refreshToken=;/);

    const stored = await RefreshToken.findOne({ user: user._id });
    expect(stored.revoked).toBe(true);

    const refresh = await http().post(`${BASE}/auth/refresh`).set('Cookie', cookie);
    expect(refresh.status).toBe(401);
  });

  it('succeeds even when nobody is logged in', async () => {
    const res = await http().post(`${BASE}/auth/logout`);
    expect(res.status).toBe(200);
  });
});
