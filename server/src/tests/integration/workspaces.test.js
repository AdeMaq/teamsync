import Workspace from '../../modules/workspaces/workspaces.model.js';
import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import { outbox } from '../../core/utils/sendEmail.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import {
  BASE,
  acceptInvite,
  addMember,
  authed,
  createWorkspace,
  http,
  invite,
  lastInviteToken,
  registerUser,
  uniqueEmail,
} from '../helpers.js';

// Records every WORKSPACE_DELETED event, so tests can check other modules would be told to clean up.
const deletedWorkspaces = [];
eventBus.on(EVENTS.WORKSPACE_DELETED, ({ workspaceId }) => {
  deletedWorkspaces.push(workspaceId);
});

beforeAll(connectTestDb);
afterEach(async () => {
  deletedWorkspaces.length = 0;
  await clearTestDb();
});
afterAll(closeTestDb);

const url = (id, suffix = '') => `${BASE}/workspaces/${id}${suffix}`;
const stored = (id) => Workspace.findById(id);
const roleInDb = async (workspaceId, userId) =>
  (await stored(workspaceId)).members.find((m) => String(m.user) === String(userId))?.role;

describe('POST /workspaces', () => {
  it('creates a workspace and makes the creator its owner', async () => {
    const { token, user } = await registerUser();
    const res = await http().post(`${BASE}/workspaces`).set(authed(token)).send({ name: 'Northwind Labs', description: 'Our team' });

    expect(res.status).toBe(201);
    expect(res.body.data.workspace).toMatchObject({
      name: 'Northwind Labs',
      slug: 'northwind-labs',
      description: 'Our team',
      plan: 'free',
      owner: user._id,
      myRole: 'owner',
      memberCount: 1,
    });
    expect(await roleInDb(res.body.data.workspace._id, user._id)).toBe('owner');
  });

  it('gives workspaces with the same name different slugs', async () => {
    const { token } = await registerUser();
    const first = await createWorkspace(token, { name: 'Acme' });
    const second = await createWorkspace(token, { name: 'Acme' });

    expect(first.slug).toBe('acme');
    expect(second.slug).toMatch(/^acme-[a-f0-9]{4}$/);
  });

  it('accepts a custom slug, and refuses one that is taken', async () => {
    const { token } = await registerUser();
    const ok = await createWorkspace(token, { slug: 'my-team' });
    expect(ok.slug).toBe('my-team');

    const taken = await http().post(`${BASE}/workspaces`).set(authed(token)).send({ name: 'Other', slug: 'my-team' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('SLUG_TAKEN');
    expect(taken.body.error.details[0].field).toBe('slug');
  });

  it('rejects invalid input', async () => {
    const { token } = await registerUser();

    const shortName = await http().post(`${BASE}/workspaces`).set(authed(token)).send({ name: 'A' });
    expect(shortName.status).toBe(400);
    expect(shortName.body.error.details[0].field).toBe('name');

    const badSlug = await http().post(`${BASE}/workspaces`).set(authed(token)).send({ name: 'Valid', slug: 'Bad Slug!' });
    expect(badSlug.status).toBe(400);
    expect(badSlug.body.error.details[0].field).toBe('slug');
  });

  it('ignores fields the caller must not set (plan, owner, members)', async () => {
    const { token, user } = await registerUser();
    const stranger = await registerUser();
    const res = await http()
      .post(`${BASE}/workspaces`)
      .set(authed(token))
      .send({ name: 'Sneaky', plan: 'enterprise', owner: stranger.user._id, members: [{ user: stranger.user._id, role: 'owner' }] });

    expect(res.status).toBe(201);
    const doc = await stored(res.body.data.workspace._id);
    expect(doc.plan).toBe('free');
    expect(String(doc.owner)).toBe(user._id);
    expect(doc.members).toHaveLength(1);
  });

  it('requires a login', async () => {
    const res = await http().post(`${BASE}/workspaces`).send({ name: 'Northwind' });
    expect(res.status).toBe(401);
  });
});

describe('GET /workspaces and GET /workspaces/:id', () => {
  it('lists only the workspaces you belong to, sorted by name, with your role', async () => {
    const me = await registerUser();
    const other = await registerUser();
    await createWorkspace(me.token, { name: 'Zeta' });
    const alpha = await createWorkspace(me.token, { name: 'Alpha' });
    await createWorkspace(other.token, { name: 'Not Mine' });
    const joined = await createWorkspace(other.token, { name: 'Joined' });
    await invite(other.token, joined._id, me.creds.email);
    await acceptInvite(me.token, lastInviteToken());

    const res = await http().get(`${BASE}/workspaces`).set(authed(me.token));

    expect(res.status).toBe(200);
    expect(res.body.data.workspaces.map((w) => w.name)).toEqual(['Alpha', 'Joined', 'Zeta']);
    expect(res.body.data.workspaces.find((w) => w._id === alpha._id).myRole).toBe('owner');
    expect(res.body.data.workspaces.find((w) => w.name === 'Joined').myRole).toBe('member');
  });

  it('shows a member the workspace with its members, without any secrets', async () => {
    const owner = await registerUser({ name: 'Olive Owner' });
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token, 'member');

    const res = await http().get(url(workspace._id)).set(authed(member.token));

    expect(res.status).toBe(200);
    expect(res.body.data.workspace.myRole).toBe('member');
    expect(res.body.data.workspace.memberCount).toBe(2);
    expect(res.body.data.workspace.members.map((m) => m.role).sort()).toEqual(['member', 'owner']);
    expect(res.body.data.workspace.members[0].user).toHaveProperty('name');
    expect(res.body.data.workspace.invites).toBeUndefined();

    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/passwordHash|tokenHash/);
  });

  it('answers a non-member exactly like a workspace that does not exist', async () => {
    const owner = await registerUser();
    const outsider = await registerUser();
    const workspace = await createWorkspace(owner.token);

    const real = await http().get(url(workspace._id)).set(authed(outsider.token));
    const missing = await http().get(url('64b7f0f0f0f0f0f0f0f0f0f0')).set(authed(outsider.token));

    expect(real.status).toBe(404);
    expect(real.body).toEqual(missing.body);
  });

  it('rejects a malformed id with 400', async () => {
    const { token } = await registerUser();
    const res = await http().get(url('not-an-id')).set(authed(token));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires a login', async () => {
    expect((await http().get(`${BASE}/workspaces`)).status).toBe(401);
  });
});

describe('PATCH /workspaces/:id', () => {
  it('lets an admin rename it and edit the description, keeping the slug', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token, { name: 'Old Name' });
    const admin = await addMember(workspace._id, owner.token, 'admin');

    const res = await http().patch(url(workspace._id)).set(authed(admin.token)).send({ name: 'New Name', description: 'Hello' });

    expect(res.status).toBe(200);
    expect(res.body.data.workspace).toMatchObject({ name: 'New Name', description: 'Hello', slug: workspace.slug });
  });

  it('does not let a plain member edit', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);

    const res = await http().patch(url(workspace._id)).set(authed(member.token)).send({ name: 'Hijacked' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((await stored(workspace._id)).name).toBe(workspace.name);
  });

  it('cannot change the slug, plan or owner through this endpoint', async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const workspace = await createWorkspace(owner.token);

    await http()
      .patch(url(workspace._id))
      .set(authed(owner.token))
      .send({ name: 'Renamed', slug: 'new-slug', plan: 'enterprise', owner: other.user._id });

    const doc = await stored(workspace._id);
    expect(doc.name).toBe('Renamed');
    expect(doc.slug).toBe(workspace.slug);
    expect(doc.plan).toBe('free');
    expect(String(doc.owner)).toBe(owner.user._id);
  });

  it('rejects an empty update and an invalid name', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);

    expect((await http().patch(url(workspace._id)).set(authed(owner.token)).send({})).status).toBe(400);
    expect((await http().patch(url(workspace._id)).set(authed(owner.token)).send({ name: 'A' })).status).toBe(400);
  });

  it('is invisible to non-members (404)', async () => {
    const owner = await registerUser();
    const outsider = await registerUser();
    const workspace = await createWorkspace(owner.token);

    const res = await http().patch(url(workspace._id)).set(authed(outsider.token)).send({ name: 'Hijacked' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /workspaces/:id', () => {
  it('lets the owner delete it after typing the exact name, and announces it', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token, { name: 'Doomed' });

    const res = await http().delete(url(workspace._id)).set(authed(owner.token)).send({ confirmName: 'Doomed' });

    expect(res.status).toBe(200);
    expect(await Workspace.exists({ _id: workspace._id })).toBeNull();
    expect(deletedWorkspaces).toContain(workspace._id);
  });

  it('refuses a wrong confirmation name', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token, { name: 'Safe' });

    const res = await http().delete(url(workspace._id)).set(authed(owner.token)).send({ confirmName: 'safe' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('confirmName');
    expect(await Workspace.exists({ _id: workspace._id })).toBeTruthy();
    expect(deletedWorkspaces).toHaveLength(0);
  });

  it('is owner-only: an admin cannot delete', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token, { name: 'Mine' });
    const admin = await addMember(workspace._id, owner.token, 'admin');

    const res = await http().delete(url(workspace._id)).set(authed(admin.token)).send({ confirmName: 'Mine' });

    expect(res.status).toBe(403);
    expect(await Workspace.exists({ _id: workspace._id })).toBeTruthy();
  });
});

describe('invitations', () => {
  it('lets an admin invite by email: the link is emailed and the response never contains it', async () => {
    const owner = await registerUser({ name: 'Olive Owner' });
    const workspace = await createWorkspace(owner.token, { name: 'Acme' });
    const admin = await addMember(workspace._id, owner.token, 'admin');
    const email = uniqueEmail('invitee');

    const res = await invite(admin.token, workspace._id, email);

    expect(res.status).toBe(201);
    expect(res.body.data.invite).toMatchObject({ email, role: 'member' });
    expect(JSON.stringify(res.body)).not.toMatch(/tokenHash|[a-f0-9]{64}/);

    const mail = outbox.at(-1);
    expect(mail.to).toBe(email);
    expect(mail.subject).toMatch(/invited you to Acme/);
    expect(mail.text).toContain('http://localhost:5173/invites/');
  });

  it('stores only a hash of the token and expires the invitation in about 7 days', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    await invite(owner.token, workspace._id, uniqueEmail());
    const token = lastInviteToken();

    const [saved] = (await stored(workspace._id)).invites;
    expect(saved.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.tokenHash).not.toBe(token);

    const daysLeft = (saved.expiresAt - Date.now()) / 86400000;
    expect(daysLeft).toBeGreaterThan(6.9);
    expect(daysLeft).toBeLessThanOrEqual(7);
  });

  it('does not let a plain member invite', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);

    const res = await invite(member.token, workspace._id, uniqueEmail());
    expect(res.status).toBe(403);
  });

  it('only lets people invite to a role below their own', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const admin = await addMember(workspace._id, owner.token, 'admin');

    expect((await invite(admin.token, workspace._id, uniqueEmail(), 'admin')).status).toBe(403);
    expect((await invite(admin.token, workspace._id, uniqueEmail(), 'member')).status).toBe(201);
    expect((await invite(owner.token, workspace._id, uniqueEmail(), 'admin')).status).toBe(201);
  });

  it('cannot invite the owner role', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);

    const res = await invite(owner.token, workspace._id, uniqueEmail(), 'owner');
    expect(res.status).toBe(400);
  });

  it('refuses to invite someone who is already a member', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);

    const res = await invite(owner.token, workspace._id, member.creds.email);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('a second invitation to the same email replaces the first', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const invitee = await registerUser();

    await invite(owner.token, workspace._id, invitee.creds.email);
    const first = lastInviteToken();
    await invite(owner.token, workspace._id, invitee.creds.email);
    const second = lastInviteToken();

    expect((await stored(workspace._id)).invites).toHaveLength(1);
    expect((await acceptInvite(invitee.token, first)).status).toBe(400);
    expect((await acceptInvite(invitee.token, second)).status).toBe(200);
  });

  it('lists pending invitations for admins only, without tokens', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);
    const email = uniqueEmail('pending');
    await invite(owner.token, workspace._id, email);

    const res = await http().get(url(workspace._id, '/invites')).set(authed(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.data.invites).toHaveLength(1);
    expect(res.body.data.invites[0].email).toBe(email);
    expect(JSON.stringify(res.body)).not.toMatch(/tokenHash/);

    expect((await http().get(url(workspace._id, '/invites')).set(authed(member.token))).status).toBe(403);
  });

  it('can be revoked, after which the link no longer works', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const invitee = await registerUser();
    const sent = await invite(owner.token, workspace._id, invitee.creds.email);
    const token = lastInviteToken();

    const revoke = await http().delete(url(workspace._id, `/invites/${sent.body.data.invite._id}`)).set(authed(owner.token));
    expect(revoke.status).toBe(200);
    expect((await acceptInvite(invitee.token, token)).status).toBe(400);

    const again = await http().delete(url(workspace._id, `/invites/${sent.body.data.invite._id}`)).set(authed(owner.token));
    expect(again.status).toBe(404);
  });

  describe('accepting', () => {
    it('adds the invited person with the invited role, and uses up the invitation', async () => {
      const owner = await registerUser();
      const workspace = await createWorkspace(owner.token);
      const invitee = await registerUser();
      await invite(owner.token, workspace._id, invitee.creds.email, 'admin');
      const token = lastInviteToken();

      const res = await acceptInvite(invitee.token, token);

      expect(res.status).toBe(200);
      expect(res.body.data.workspace).toMatchObject({ _id: workspace._id, myRole: 'admin', memberCount: 2 });
      expect((await stored(workspace._id)).invites).toHaveLength(0);

      const list = await http().get(`${BASE}/workspaces`).set(authed(invitee.token));
      expect(list.body.data.workspaces.map((w) => w._id)).toContain(workspace._id);

      // The same link cannot be used again.
      expect((await acceptInvite(invitee.token, token)).status).toBe(400);
    });

    it('only works for the email address it was sent to', async () => {
      const owner = await registerUser();
      const workspace = await createWorkspace(owner.token);
      const invitee = await registerUser();
      const intruder = await registerUser();
      await invite(owner.token, workspace._id, invitee.creds.email);
      const token = lastInviteToken();

      const res = await acceptInvite(intruder.token, token);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INVITE_EMAIL_MISMATCH');
      expect((await stored(workspace._id)).members).toHaveLength(1);
      expect((await acceptInvite(invitee.token, token)).status).toBe(200); // the real invitee can still use it
    });

    it('rejects an unknown token', async () => {
      const { token } = await registerUser();
      const res = await acceptInvite(token, 'a'.repeat(64));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INVITE');
    });

    it('rejects an expired invitation', async () => {
      const owner = await registerUser();
      const workspace = await createWorkspace(owner.token);
      const invitee = await registerUser();
      await invite(owner.token, workspace._id, invitee.creds.email);
      const token = lastInviteToken();
      await Workspace.updateOne({ _id: workspace._id }, { $set: { 'invites.0.expiresAt': new Date(Date.now() - 1000) } });

      const res = await acceptInvite(invitee.token, token);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INVITE');
      expect((await stored(workspace._id)).members).toHaveLength(1);
    });

    it('rejects a malformed token before touching the database', async () => {
      const { token } = await registerUser();
      const res = await acceptInvite(token, 'short');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('requires a login', async () => {
      const res = await http().post(`${BASE}/workspaces/invites/accept`).send({ token: 'a'.repeat(64) });
      expect(res.status).toBe(401);
    });
  });
});

describe('PATCH /workspaces/:id/members/:memberId (change role)', () => {
  const setRole = (token, workspaceId, memberId, role) =>
    http().patch(url(workspaceId, `/members/${memberId}`)).set(authed(token)).send({ role });

  it('lets the owner promote a member to admin and demote an admin to member', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);

    const up = await setRole(owner.token, workspace._id, member.user._id, 'admin');
    expect(up.status).toBe(200);
    expect(await roleInDb(workspace._id, member.user._id)).toBe('admin');

    const down = await setRole(owner.token, workspace._id, member.user._id, 'member');
    expect(down.status).toBe(200);
    expect(await roleInDb(workspace._id, member.user._id)).toBe('member');
  });

  it('does not let an admin promote anyone to admin, or touch another admin', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const admin = await addMember(workspace._id, owner.token, 'admin');
    const otherAdmin = await addMember(workspace._id, owner.token, 'admin');
    const member = await addMember(workspace._id, owner.token);

    expect((await setRole(admin.token, workspace._id, member.user._id, 'admin')).status).toBe(403);
    expect((await setRole(admin.token, workspace._id, otherAdmin.user._id, 'member')).status).toBe(403);
    expect(await roleInDb(workspace._id, member.user._id)).toBe('member');
    expect(await roleInDb(workspace._id, otherAdmin.user._id)).toBe('admin');
  });

  it('never changes the owner role, and nobody changes their own', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const admin = await addMember(workspace._id, owner.token, 'admin');

    expect((await setRole(admin.token, workspace._id, owner.user._id, 'member')).status).toBe(403);
    expect((await setRole(owner.token, workspace._id, owner.user._id, 'member')).status).toBe(403);
    expect((await setRole(admin.token, workspace._id, admin.user._id, 'member')).status).toBe(403);
    expect(await roleInDb(workspace._id, owner.user._id)).toBe('owner');
  });

  it('cannot hand out the owner role, and rejects unknown roles', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);

    expect((await setRole(owner.token, workspace._id, member.user._id, 'owner')).status).toBe(400);
    expect((await setRole(owner.token, workspace._id, member.user._id, 'superuser')).status).toBe(400);
  });

  it('does not let a plain member change roles', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);
    const other = await addMember(workspace._id, owner.token);

    expect((await setRole(member.token, workspace._id, other.user._id, 'admin')).status).toBe(403);
  });

  it('returns 404 for someone who is not in the workspace', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const outsider = await registerUser();

    expect((await setRole(owner.token, workspace._id, outsider.user._id, 'admin')).status).toBe(404);
  });
});

describe('DELETE /workspaces/:id/members/:memberId (remove or leave)', () => {
  const removeMember = (token, workspaceId, memberId) =>
    http().delete(url(workspaceId, `/members/${memberId}`)).set(authed(token));

  it('lets an admin remove a member, who then loses all access', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const admin = await addMember(workspace._id, owner.token, 'admin');
    const member = await addMember(workspace._id, owner.token);

    const res = await removeMember(admin.token, workspace._id, member.user._id);

    expect(res.status).toBe(200);
    expect(await roleInDb(workspace._id, member.user._id)).toBeUndefined();
    expect((await http().get(url(workspace._id)).set(authed(member.token))).status).toBe(404);
  });

  it('does not let an admin remove another admin, but the owner can', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const admin = await addMember(workspace._id, owner.token, 'admin');
    const otherAdmin = await addMember(workspace._id, owner.token, 'admin');

    expect((await removeMember(admin.token, workspace._id, otherAdmin.user._id)).status).toBe(403);
    expect((await removeMember(owner.token, workspace._id, otherAdmin.user._id)).status).toBe(200);
  });

  it('does not let a plain member remove other people', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);
    const other = await addMember(workspace._id, owner.token);

    const res = await removeMember(member.token, workspace._id, other.user._id);

    expect(res.status).toBe(403);
    expect(await roleInDb(workspace._id, other.user._id)).toBe('member');
  });

  it('lets anyone except the owner leave', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);

    const res = await removeMember(member.token, workspace._id, member.user._id);

    expect(res.status).toBe(200);
    expect(await roleInDb(workspace._id, member.user._id)).toBeUndefined();
  });

  it('keeps the owner in: they can neither be removed nor leave', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const admin = await addMember(workspace._id, owner.token, 'admin');

    expect((await removeMember(owner.token, workspace._id, owner.user._id)).status).toBe(403);
    expect((await removeMember(admin.token, workspace._id, owner.user._id)).status).toBe(403);
    expect(await roleInDb(workspace._id, owner.user._id)).toBe('owner');
  });
});

describe('POST /workspaces/:id/transfer-ownership', () => {
  const transfer = (token, workspaceId, userId) =>
    http().post(url(workspaceId, '/transfer-ownership')).set(authed(token)).send({ userId });

  it('makes the chosen member the owner and the old owner an admin', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token, { name: 'Handover' });
    const member = await addMember(workspace._id, owner.token);

    const res = await transfer(owner.token, workspace._id, member.user._id);

    expect(res.status).toBe(200);
    expect(res.body.data.workspace.owner).toBe(member.user._id);
    expect(await roleInDb(workspace._id, member.user._id)).toBe('owner');
    expect(await roleInDb(workspace._id, owner.user._id)).toBe('admin');

    // The former owner lost owner-only powers.
    const del = await http().delete(url(workspace._id)).set(authed(owner.token)).send({ confirmName: 'Handover' });
    expect(del.status).toBe(403);
  });

  it('is owner-only', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const admin = await addMember(workspace._id, owner.token, 'admin');

    expect((await transfer(admin.token, workspace._id, admin.user._id)).status).toBe(403);
    expect(await roleInDb(workspace._id, owner.user._id)).toBe('owner');
  });

  it('needs a current member as the target, and not yourself', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const outsider = await registerUser();

    expect((await transfer(owner.token, workspace._id, outsider.user._id)).status).toBe(404);
    expect((await transfer(owner.token, workspace._id, owner.user._id)).status).toBe(403);
  });
});

describe('when an account is deleted', () => {
  const deleteAccount = (account) =>
    http().delete(`${BASE}/users/me`).set(authed(account.token)).send({ password: account.creds.password });

  it('passes ownership to the most senior remaining member', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token, 'member'); // joined first
    const admin = await addMember(workspace._id, owner.token, 'admin'); // higher rank wins

    expect((await deleteAccount(owner)).status).toBe(200);

    const doc = await stored(workspace._id);
    expect(String(doc.owner)).toBe(admin.user._id);
    expect(await roleInDb(workspace._id, admin.user._id)).toBe('owner');
    expect(await roleInDb(workspace._id, member.user._id)).toBe('member');
    expect(doc.members).toHaveLength(2);
    expect(deletedWorkspaces).toHaveLength(0);
  });

  it('deletes a workspace when nobody else is in it', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);

    expect((await deleteAccount(owner)).status).toBe(200);

    expect(await Workspace.exists({ _id: workspace._id })).toBeNull();
    expect(deletedWorkspaces).toContain(workspace._id);
  });

  it('removes a member from every workspace they were in, and drops invitations they sent', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner.token);
    const admin = await addMember(workspace._id, owner.token, 'admin');
    await invite(admin.token, workspace._id, uniqueEmail('sent-by-admin'));
    expect((await stored(workspace._id)).invites).toHaveLength(1);

    expect((await deleteAccount(admin)).status).toBe(200);

    const doc = await stored(workspace._id);
    expect(doc.members).toHaveLength(1);
    expect(String(doc.owner)).toBe(owner.user._id);
    expect(doc.invites).toHaveLength(0);
  });
});
