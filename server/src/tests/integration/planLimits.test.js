import mongoose from 'mongoose';
import Workspace from '../../modules/workspaces/workspaces.model.js';
import * as workspacesRepository from '../../modules/workspaces/workspaces.repository.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import { BASE, acceptInvite, authed, createWorkspace, http, invite, lastInviteToken, registerUser, uniqueEmail } from '../helpers.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

// Adds `count` placeholder members straight in the database, so reaching the limit does not need 10 real accounts.
const addFakeMembers = (workspaceId, count) =>
  Workspace.updateOne(
    { _id: workspaceId },
    { $push: { members: { $each: Array.from({ length: count }, () => ({ user: new mongoose.Types.ObjectId(), role: 'member' })) } } }
  );

// A workspace with its owner already counted: members are owner + `others`.
async function workspaceWithMembers(others, plan) {
  const owner = await registerUser();
  const workspace = await createWorkspace(owner.token);
  await addFakeMembers(workspace._id, others);
  if (plan) await Workspace.updateOne({ _id: workspace._id }, { plan });
  return { owner, workspace };
}

describe('member limit in the API', () => {
  it.each([
    ['free', 10],
    ['pro', 100],
    ['enterprise', null],
  ])('a %s workspace reports its limit (%s)', async (plan, limit) => {
    const { owner, workspace } = await workspaceWithMembers(0, plan);
    const res = await http().get(`${BASE}/workspaces/${workspace._id}`).set(authed(owner.token));

    expect(res.body.data.workspace.plan).toBe(plan);
    expect(res.body.data.workspace.memberLimit).toBe(limit);
  });

  it('is included when listing workspaces', async () => {
    const { owner } = await workspaceWithMembers(0);
    const res = await http().get(`${BASE}/workspaces`).set(authed(owner.token));
    expect(res.body.data.workspaces[0].memberLimit).toBe(10);
  });
});

describe('inviting', () => {
  it('is allowed while there is room', async () => {
    const { owner, workspace } = await workspaceWithMembers(8); // 9 of 10
    const res = await invite(owner.token, workspace._id, uniqueEmail());
    expect(res.status).toBe(201);
  });

  it('is refused once the workspace is full, naming the plan and the limit', async () => {
    const { owner, workspace } = await workspaceWithMembers(9); // 10 of 10

    const res = await invite(owner.token, workspace._id, uniqueEmail());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PLAN_LIMIT_REACHED');
    expect(res.body.error.message).toMatch(/Free plan allows up to 10 members/);
    expect((await Workspace.findById(workspace._id)).invites).toHaveLength(0);
  });

  it('counts pending invitations towards the limit', async () => {
    const { owner, workspace } = await workspaceWithMembers(8); // 9 of 10

    expect((await invite(owner.token, workspace._id, uniqueEmail())).status).toBe(201); // 9 + 1 pending
    const second = await invite(owner.token, workspace._id, uniqueEmail());

    expect(second.status).toBe(403);
    expect(second.body.error.code).toBe('PLAN_LIMIT_REACHED');
  });

  it('lets you re-send an invitation to the same email when full (it replaces the old one)', async () => {
    const { owner, workspace } = await workspaceWithMembers(8); // 9 of 10
    const email = uniqueEmail();

    expect((await invite(owner.token, workspace._id, email)).status).toBe(201);
    expect((await invite(owner.token, workspace._id, email)).status).toBe(201);
    expect((await Workspace.findById(workspace._id)).invites).toHaveLength(1);
  });

  it('frees a seat again when an invitation is revoked', async () => {
    const { owner, workspace } = await workspaceWithMembers(8);
    const sent = await invite(owner.token, workspace._id, uniqueEmail());
    expect((await invite(owner.token, workspace._id, uniqueEmail())).status).toBe(403);

    await http().delete(`${BASE}/workspaces/${workspace._id}/invites/${sent.body.data.invite._id}`).set(authed(owner.token));

    expect((await invite(owner.token, workspace._id, uniqueEmail())).status).toBe(201);
  });

  it('allows more on the pro plan and any number on enterprise', async () => {
    const pro = await workspaceWithMembers(9, 'pro'); // 10 members, limit 100
    expect((await invite(pro.owner.token, pro.workspace._id, uniqueEmail())).status).toBe(201);

    const enterprise = await workspaceWithMembers(150, 'enterprise');
    expect((await invite(enterprise.owner.token, enterprise.workspace._id, uniqueEmail())).status).toBe(201);
  });
});

describe('accepting', () => {
  it('is refused when the workspace filled up meanwhile, and the invitation stays usable', async () => {
    const { owner, workspace } = await workspaceWithMembers(0);
    const invitee = await registerUser();
    await invite(owner.token, workspace._id, invitee.creds.email);
    const token = lastInviteToken();

    await addFakeMembers(workspace._id, 9); // now 10 of 10

    const refused = await acceptInvite(invitee.token, token);
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe('PLAN_LIMIT_REACHED');
    let doc = await Workspace.findById(workspace._id);
    expect(doc.members).toHaveLength(10);
    expect(doc.invites).toHaveLength(1); // not used up

    // Someone leaves: the same link now works.
    await Workspace.updateOne({ _id: workspace._id }, { $pop: { members: 1 } });
    expect((await acceptInvite(invitee.token, token)).status).toBe(200);
    doc = await Workspace.findById(workspace._id);
    expect(doc.members).toHaveLength(10);
    expect(doc.invites).toHaveLength(0);
  });

  it('the database update itself refuses to overfill (guards against two people accepting at once)', async () => {
    const { owner, workspace } = await workspaceWithMembers(0);
    const invitee = await registerUser();
    await invite(owner.token, workspace._id, invitee.creds.email);
    const [pending] = (await Workspace.findById(workspace._id)).invites;
    await addFakeMembers(workspace._id, 9); // 10 of 10

    const result = await workspacesRepository.acceptInvite(workspace._id, pending.id, invitee.user._id, 'member', 10);

    expect(result.modifiedCount).toBe(0);
    expect((await Workspace.findById(workspace._id)).members).toHaveLength(10);
  });
});
