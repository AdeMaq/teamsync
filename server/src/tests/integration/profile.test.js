import fs from 'fs';
import path from 'path';
import User from '../../modules/users/users.model.js';
import RefreshToken from '../../modules/auth/refreshToken.model.js';
import { avatarsDir } from '../../config/paths.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import { BASE, PNG, authed, http, login, registerUser, uniqueEmail } from '../helpers.js';

// Avatar files are written to the real uploads folder, so every user created here is remembered
// and their files are removed after each test, even if a test fails halfway.
const createdUserIds = new Set();
const makeUser = async (overrides) => {
  const account = await registerUser(overrides);
  createdUserIds.add(account.user._id);
  return account;
};

const avatarFilesOf = (userId) => fs.existsSync(avatarsDir)
  ? fs.readdirSync(avatarsDir).filter((file) => file.startsWith(`${userId}-`))
  : [];

const avatarFileExists = (url) => fs.existsSync(path.join(avatarsDir, path.basename(url)));

beforeAll(connectTestDb);
afterEach(async () => {
  for (const id of createdUserIds) {
    avatarFilesOf(id).forEach((file) => fs.unlinkSync(path.join(avatarsDir, file)));
  }
  createdUserIds.clear();
  await clearTestDb();
});
afterAll(closeTestDb);

const upload = (token, buffer = PNG, options = { filename: 'photo.png', contentType: 'image/png' }) =>
  http().post(`${BASE}/users/me/avatar`).set(authed(token)).attach('avatar', buffer, options);

describe('PATCH /users/me (name)', () => {
  it('changes the name and trims it', async () => {
    const { token, user } = await makeUser();
    const res = await http().patch(`${BASE}/users/me`).set(authed(token)).send({ name: '  New Name  ' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('New Name');
    expect((await User.findById(user._id)).name).toBe('New Name');
  });

  it('rejects a name that is too short', async () => {
    const { token } = await makeUser();
    const res = await http().patch(`${BASE}/users/me`).set(authed(token)).send({ name: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('name');
  });

  it('cannot be used to change protected fields', async () => {
    const { token, user } = await makeUser();
    await http()
      .patch(`${BASE}/users/me`)
      .set(authed(token))
      .send({ name: 'Valid Name', email: 'hacker@example.com', status: 'suspended', isEmailVerified: true });

    const stored = await User.findById(user._id);
    expect(stored.email).toBe(user.email);
    expect(stored.status).toBe('active');
    expect(stored.isEmailVerified).toBe(false);
  });

  it('requires a login', async () => {
    const res = await http().patch(`${BASE}/users/me`).send({ name: 'Valid Name' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /users/me/email', () => {
  it('changes the email when the password is right, and only the new email logs in', async () => {
    const { token, creds } = await makeUser();
    const newEmail = uniqueEmail('changed');

    const res = await http()
      .patch(`${BASE}/users/me/email`)
      .set(authed(token))
      .send({ email: newEmail, password: creds.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(newEmail);
    expect((await login(newEmail, creds.password)).status).toBe(200);
    expect((await login(creds.email, creds.password)).status).toBe(401);
  });

  it('refuses a wrong password with 403 (never 401, which would look like an expired session)', async () => {
    const { token, user } = await makeUser();
    const res = await http()
      .patch(`${BASE}/users/me/email`)
      .set(authed(token))
      .send({ email: uniqueEmail('x'), password: 'wrong-password' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
    expect(res.body.error.details[0].field).toBe('password');
    expect((await User.findById(user._id)).email).toBe(user.email);
  });

  it('refuses the email you already have', async () => {
    const { token, creds } = await makeUser();
    const res = await http()
      .patch(`${BASE}/users/me/email`)
      .set(authed(token))
      .send({ email: creds.email, password: creds.password });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('email');
  });

  it("refuses an email that belongs to someone else", async () => {
    const other = await makeUser();
    const { token, creds } = await makeUser();

    const res = await http()
      .patch(`${BASE}/users/me/email`)
      .set(authed(token))
      .send({ email: other.creds.email, password: creds.password });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects an invalid email', async () => {
    const { token, creds } = await makeUser();
    const res = await http()
      .patch(`${BASE}/users/me/email`)
      .set(authed(token))
      .send({ email: 'nope', password: creds.password });

    expect(res.status).toBe(400);
  });

  it('requires a login', async () => {
    const res = await http().patch(`${BASE}/users/me/email`).send({ email: uniqueEmail(), password: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /users/me/password', () => {
  const change = (token, body) => http().patch(`${BASE}/users/me/password`).set(authed(token)).send(body);

  it('changes the password: the old one stops working, the new one works', async () => {
    const { token, creds } = await makeUser();
    const res = await change(token, { currentPassword: creds.password, newPassword: 'brand-new-pass-1' });

    expect(res.status).toBe(200);
    expect((await login(creds.email, creds.password)).status).toBe(401);
    expect((await login(creds.email, 'brand-new-pass-1')).status).toBe(200);
  });

  it('stores the new password only as a bcrypt hash', async () => {
    const { token, creds, user } = await makeUser();
    await change(token, { currentPassword: creds.password, newPassword: 'brand-new-pass-1' });

    const stored = await User.findById(user._id).select('+passwordHash');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored.passwordHash).not.toContain('brand-new-pass-1');
  });

  it('signs the account out everywhere: existing refresh tokens stop working', async () => {
    const { token, creds, cookie, user } = await makeUser();
    await change(token, { currentPassword: creds.password, newPassword: 'brand-new-pass-1' });

    const refresh = await http().post(`${BASE}/auth/refresh`).set('Cookie', cookie);
    expect(refresh.status).toBe(401);
    expect(await RefreshToken.countDocuments({ user: user._id })).toBe(0);
  });

  it('refuses a wrong current password with 403', async () => {
    const { token, creds } = await makeUser();
    const res = await change(token, { currentPassword: 'wrong-password', newPassword: 'brand-new-pass-1' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
    expect(res.body.error.details[0].field).toBe('currentPassword');
    expect((await login(creds.email, creds.password)).status).toBe(200); // unchanged
  });

  it('rejects a new password that is too short', async () => {
    const { token, creds } = await makeUser();
    const res = await change(token, { currentPassword: creds.password, newPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('newPassword');
  });

  it('rejects a new password equal to the current one', async () => {
    const { token, creds } = await makeUser();
    const res = await change(token, { currentPassword: creds.password, newPassword: creds.password });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('newPassword');
  });

  it('requires a login', async () => {
    const res = await http().patch(`${BASE}/users/me/password`).send({ currentPassword: 'a', newPassword: 'b' });
    expect(res.status).toBe(401);
  });
});

describe('avatar', () => {
  it('uploads a real image and serves it', async () => {
    const { token, user } = await makeUser();
    const res = await upload(token);

    expect(res.status).toBe(200);
    const url = res.body.data.user.avatar;
    expect(url).toMatch(new RegExp(`^/uploads/avatars/${user._id}-[a-f0-9]+\\.png$`));
    expect(avatarFileExists(url)).toBe(true);

    const served = await http().get(url);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toMatch(/image\/png/);
    expect(served.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('rejects a file that claims to be an image but is not, and leaves nothing behind', async () => {
    const { token, user } = await makeUser();
    const res = await upload(token, Buffer.from('this is not an image'), { filename: 'fake.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toBe('File is not a valid image');
    expect(avatarFilesOf(user._id)).toHaveLength(0);
    expect((await User.findById(user._id)).avatar).toBe('');
  });

  it('rejects other file types', async () => {
    const { token } = await makeUser();
    const res = await upload(token, Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('avatar');
  });

  it('rejects files over 2 MB', async () => {
    const { token } = await makeUser();
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024 + 1)]);
    const res = await upload(token, big);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Image must be 2 MB or smaller');
  });

  it('asks for a file when none is sent', async () => {
    const { token } = await makeUser();
    const res = await http().post(`${BASE}/users/me/avatar`).set(authed(token));

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toBe('Choose an image to upload');
  });

  it('replacing the avatar deletes the old file', async () => {
    const { token, user } = await makeUser();
    const first = (await upload(token)).body.data.user.avatar;
    const second = (await upload(token)).body.data.user.avatar;

    expect(second).not.toBe(first);
    expect(avatarFileExists(first)).toBe(false);
    expect(avatarFileExists(second)).toBe(true);
    expect(avatarFilesOf(user._id)).toHaveLength(1);
  });

  it('removing the avatar clears it and deletes the file', async () => {
    const { token, user } = await makeUser();
    const url = (await upload(token)).body.data.user.avatar;

    const res = await http().delete(`${BASE}/users/me/avatar`).set(authed(token));
    expect(res.status).toBe(200);
    expect(res.body.data.user.avatar).toBe('');
    expect(avatarFileExists(url)).toBe(false);
    expect(avatarFilesOf(user._id)).toHaveLength(0);
  });

  it('requires a login', async () => {
    const res = await http().post(`${BASE}/users/me/avatar`).attach('avatar', PNG, { filename: 'p.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /users/me', () => {
  const remove = (token, body) => http().delete(`${BASE}/users/me`).set(authed(token)).send(body);

  it('refuses a wrong password and keeps the account', async () => {
    const { token, user } = await makeUser();
    const res = await remove(token, { password: 'wrong-password' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
    expect(await User.exists({ _id: user._id })).toBeTruthy();
  });

  it('requires the password in the request', async () => {
    const { token } = await makeUser();
    const res = await remove(token, {});
    expect(res.status).toBe(400);
  });

  it('deletes the user, their refresh tokens and their avatar file', async () => {
    const { token, creds, user, cookie } = await makeUser();
    const avatar = (await upload(token)).body.data.user.avatar;

    const res = await remove(token, { password: creds.password });
    expect(res.status).toBe(200);

    expect(await User.exists({ _id: user._id })).toBeNull();
    expect(await RefreshToken.countDocuments({ user: user._id })).toBe(0);
    expect(avatarFileExists(avatar)).toBe(false);

    expect((await login(creds.email, creds.password)).status).toBe(401);
    expect((await http().post(`${BASE}/auth/refresh`).set('Cookie', cookie)).status).toBe(401);
    expect((await http().get(`${BASE}/users/me`).set(authed(token))).status).toBe(404);
  });

  it("does not touch anyone else's account", async () => {
    const victim = await makeUser();
    const bystander = await makeUser();

    await remove(victim.token, { password: victim.creds.password });

    expect(await User.exists({ _id: bystander.user._id })).toBeTruthy();
    expect(await RefreshToken.countDocuments({ user: bystander.user._id })).toBe(1);
    expect((await login(bystander.creds.email, bystander.creds.password)).status).toBe(200);
  });

  it('requires a login', async () => {
    const res = await http().delete(`${BASE}/users/me`).send({ password: 'x' });
    expect(res.status).toBe(401);
  });
});
