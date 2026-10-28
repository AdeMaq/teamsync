import Project from '../../modules/projects/projects.model.js';
import Workspace from '../../modules/workspaces/workspaces.model.js';
import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import { BASE, addMember, authed, createProject, createWorkspace, http, registerUser } from '../helpers.js';

// Records every PROJECT_DELETED event, so tests can check other modules would be told to clean up.
const deletedProjects = [];
eventBus.on(EVENTS.PROJECT_DELETED, (payload) => {
  deletedProjects.push(payload);
});

beforeAll(connectTestDb);
afterEach(async () => {
  deletedProjects.length = 0;
  await clearTestDb();
});
afterAll(closeTestDb);

const listUrl = (workspaceId, query = '') => `${BASE}/workspaces/${workspaceId}/projects${query}`;
const oneUrl = (projectId) => `${BASE}/projects/${projectId}`;

const create = (token, workspaceId, body = {}) =>
  http().post(listUrl(workspaceId)).set(authed(token)).send({ name: 'Apollo Web App', ...body });
const list = (token, workspaceId, query) => http().get(listUrl(workspaceId, query)).set(authed(token));
const update = (token, projectId, body) => http().patch(oneUrl(projectId)).set(authed(token)).send(body);
const remove = (token, projectId) => http().delete(oneUrl(projectId)).set(authed(token));
const pause = () => new Promise((resolve) => setTimeout(resolve, 15)); // so updatedAt/createdAt differ

// A workspace with an owner, an admin and two plain members.
async function team() {
  const owner = await registerUser();
  const workspace = await createWorkspace(owner.token);
  const admin = await addMember(workspace._id, owner.token, 'admin');
  const member = await addMember(workspace._id, owner.token);
  const other = await addMember(workspace._id, owner.token);
  return { owner, admin, member, other, workspace };
}

describe('POST /workspaces/:workspaceId/projects', () => {
  it('lets any member create a project and makes them its lead', async () => {
    const { member, workspace } = await team();

    const res = await create(member.token, workspace._id, { name: 'Apollo Web App' });

    expect(res.status).toBe(201);
    expect(res.body.data.project).toMatchObject({
      name: 'Apollo Web App',
      description: '',
      status: 'planning',
      color: '#2DD4BF',
      workspace: workspace._id,
      createdBy: member.user._id,
      startDate: null,
      endDate: null,
      canManage: true,
    });
    expect(res.body.data.project.lead).toMatchObject({ _id: member.user._id, name: member.user.name, email: member.user.email });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);

    const stored = await Project.findById(res.body.data.project._id);
    expect(stored.members).toHaveLength(1);
    expect(stored.members[0]).toMatchObject({ role: 'lead' });
    expect(String(stored.members[0].user)).toBe(member.user._id);
  });

  it('stores the optional fields and trims the name', async () => {
    const { owner, workspace } = await team();

    const res = await create(owner.token, workspace._id, {
      name: '  Atlas Analytics  ',
      description: 'Dashboards',
      status: 'active',
      color: '#3B82F6',
      startDate: '2026-11-01',
      endDate: '2026-12-31',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.project).toMatchObject({ name: 'Atlas Analytics', description: 'Dashboards', status: 'active', color: '#3B82F6' });
    expect(res.body.data.project.startDate).toMatch(/^2026-11-01/);
    expect(res.body.data.project.endDate).toMatch(/^2026-12-31/);
  });

  it('rejects invalid input and says which fields are wrong', async () => {
    const { owner, workspace } = await team();

    const res = await create(owner.token, workspace._id, { name: 'A', status: 'finished', color: 'teal', startDate: 'tomorrow' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['color', 'name', 'startDate', 'status']);
  });

  it('rejects an end date before the start date, but allows the same day', async () => {
    const { owner, workspace } = await team();

    const bad = await create(owner.token, workspace._id, { startDate: '2026-12-01', endDate: '2026-11-01' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details[0]).toMatchObject({ field: 'endDate' });

    const sameDay = await create(owner.token, workspace._id, { startDate: '2026-12-01', endDate: '2026-12-01' });
    expect(sameDay.status).toBe(201);
  });

  it('ignores fields the caller must not set (workspace, creator, members)', async () => {
    const { member, other, owner, workspace } = await team();
    const elsewhere = await createWorkspace(owner.token, { name: 'Elsewhere' });

    const res = await create(member.token, workspace._id, {
      workspace: elsewhere._id,
      createdBy: other.user._id,
      members: [{ user: other.user._id, role: 'lead' }],
      canManage: false,
    });

    expect(res.status).toBe(201);
    const stored = await Project.findById(res.body.data.project._id);
    expect(String(stored.workspace)).toBe(workspace._id);
    expect(String(stored.createdBy)).toBe(member.user._id);
    expect(stored.members).toHaveLength(1);
    expect(String(stored.members[0].user)).toBe(member.user._id);
  });

  it('is invisible to people outside the workspace (404) and creates nothing', async () => {
    const { workspace } = await team();
    const outsider = await registerUser();

    const res = await create(outsider.token, workspace._id);

    expect(res.status).toBe(404);
    expect(await Project.countDocuments()).toBe(0);
  });

  it('requires a login and a valid workspace id', async () => {
    const { owner, workspace } = await team();

    expect((await http().post(listUrl(workspace._id)).send({ name: 'Apollo' })).status).toBe(401);
    expect((await create(owner.token, 'not-an-id')).status).toBe(400);
  });
});

describe('GET /workspaces/:workspaceId/projects', () => {
  it('shows every member every project of the workspace, and nothing from other workspaces', async () => {
    const { owner, member, other, workspace } = await team();
    const elsewhere = await createWorkspace(owner.token, { name: 'Elsewhere' });
    await createProject(member.token, workspace._id, { name: 'Mine' });
    await createProject(owner.token, workspace._id, { name: 'Owners' });
    await createProject(owner.token, elsewhere._id, { name: 'Other workspace' });

    const res = await list(other.token, workspace._id);

    expect(res.status).toBe(200);
    expect(res.body.data.projects.map((p) => p.name).sort()).toEqual(['Mine', 'Owners']);
    expect(res.body.data).toMatchObject({ total: 2, page: 1, limit: 20 });
  });

  it('sorts by most recently changed by default, and by name on request', async () => {
    const { owner, workspace } = await team();
    const a = await createProject(owner.token, workspace._id, { name: 'Alpha' });
    await pause();
    await createProject(owner.token, workspace._id, { name: 'Charlie' });
    await pause();
    await createProject(owner.token, workspace._id, { name: 'Bravo' });
    await pause();
    await update(owner.token, a._id, { description: 'touched' });

    const recent = await list(owner.token, workspace._id);
    expect(recent.body.data.projects.map((p) => p.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);

    const byName = await list(owner.token, workspace._id, '?sort=name');
    expect(byName.body.data.projects.map((p) => p.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);

    const created = await list(owner.token, workspace._id, '?sort=created');
    expect(created.body.data.projects.map((p) => p.name)).toEqual(['Bravo', 'Charlie', 'Alpha']);
  });

  it('filters by status', async () => {
    const { owner, workspace } = await team();
    await createProject(owner.token, workspace._id, { name: 'One', status: 'active' });
    await createProject(owner.token, workspace._id, { name: 'Two', status: 'archived' });
    await createProject(owner.token, workspace._id, { name: 'Three', status: 'active' });

    const res = await list(owner.token, workspace._id, '?status=active&sort=name');

    expect(res.body.data.projects.map((p) => p.name)).toEqual(['One', 'Three']);
    expect(res.body.data.total).toBe(2);
    expect((await list(owner.token, workspace._id, '?status=finished')).status).toBe(400);
  });

  it('searches names ignoring letter case, and treats the search text literally', async () => {
    const { owner, workspace } = await team();
    await createProject(owner.token, workspace._id, { name: 'Apollo Web App' });
    await createProject(owner.token, workspace._id, { name: 'Atlas Analytics' });
    await createProject(owner.token, workspace._id, { name: 'Plan (v1.0)' });

    expect((await list(owner.token, workspace._id, '?q=apollo')).body.data.projects.map((p) => p.name)).toEqual(['Apollo Web App']);
    // ".*" and "(" would be regex syntax: searched literally they match nothing / only the real text
    expect((await list(owner.token, workspace._id, '?q=.*')).body.data.total).toBe(0);
    expect((await list(owner.token, workspace._id, `?q=${encodeURIComponent('(v1.0)')}`)).body.data.total).toBe(1);
  });

  it('paginates with a stable order and reports the total', async () => {
    const { owner, workspace } = await team();
    for (const name of ['P1', 'P2', 'P3', 'P4', 'P5']) await createProject(owner.token, workspace._id, { name });

    const second = await list(owner.token, workspace._id, '?sort=name&limit=2&page=2');
    expect(second.body.data.projects.map((p) => p.name)).toEqual(['P3', 'P4']);
    expect(second.body.data).toMatchObject({ total: 5, page: 2, limit: 2 });

    const last = await list(owner.token, workspace._id, '?sort=name&limit=2&page=3');
    expect(last.body.data.projects.map((p) => p.name)).toEqual(['P5']);

    const beyond = await list(owner.token, workspace._id, '?sort=name&limit=2&page=9');
    expect(beyond.body.data.projects).toEqual([]);
    expect(beyond.body.data.total).toBe(5);
  });

  it('refuses unreasonable paging values', async () => {
    const { owner, workspace } = await team();
    expect((await list(owner.token, workspace._id, '?limit=101')).status).toBe(400);
    expect((await list(owner.token, workspace._id, '?limit=0')).status).toBe(400);
    expect((await list(owner.token, workspace._id, '?page=0')).status).toBe(400);
    expect((await list(owner.token, workspace._id, '?page=abc')).status).toBe(400);
  });

  it('tells each viewer whether they can manage each project', async () => {
    const { owner, admin, member, other, workspace } = await team();
    await createProject(member.token, workspace._id, { name: 'Members project' });

    const flag = async (account) => (await list(account.token, workspace._id)).body.data.projects[0].canManage;

    expect(await flag(member)).toBe(true); // the lead
    expect(await flag(admin)).toBe(true); // workspace admin
    expect(await flag(owner)).toBe(true); // workspace owner
    expect(await flag(other)).toBe(false); // just a member
  });

  it('is invisible to people outside the workspace (404)', async () => {
    const { workspace } = await team();
    const outsider = await registerUser();
    expect((await list(outsider.token, workspace._id)).status).toBe(404);
  });

  it('requires a login', async () => {
    const { workspace } = await team();
    expect((await http().get(listUrl(workspace._id))).status).toBe(401);
  });
});

describe('GET /projects/:id', () => {
  it('shows any workspace member the project with its lead', async () => {
    const { member, other, workspace } = await team();
    const project = await createProject(member.token, workspace._id);

    const res = await http().get(oneUrl(project._id)).set(authed(other.token));

    expect(res.status).toBe(200);
    expect(res.body.data.project).toMatchObject({ _id: project._id, name: 'Apollo Web App', canManage: false });
    expect(res.body.data.project.lead).toMatchObject({ _id: member.user._id, name: member.user.name });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  it('answers someone outside the project\'s workspace exactly like a project that does not exist', async () => {
    const { member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);
    const outsider = await registerUser();

    const real = await http().get(oneUrl(project._id)).set(authed(outsider.token));
    const missing = await http().get(oneUrl('64b7f0f0f0f0f0f0f0f0f0f0')).set(authed(outsider.token));

    expect(real.status).toBe(404);
    expect(real.body).toEqual(missing.body);
  });

  it('does not leak across workspaces even for a member of another workspace', async () => {
    const { member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);
    const stranger = await registerUser();
    await createWorkspace(stranger.token, { name: 'Strangers' });

    expect((await http().get(oneUrl(project._id)).set(authed(stranger.token))).status).toBe(404);
  });

  it('rejects a malformed id and a missing login', async () => {
    const { owner, member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);

    expect((await http().get(oneUrl('nope')).set(authed(owner.token))).status).toBe(400);
    expect((await http().get(oneUrl(project._id))).status).toBe(401);
  });
});

describe('PATCH /projects/:id', () => {
  it('lets the lead edit the project', async () => {
    const { member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);
    await pause();

    const res = await update(member.token, project._id, { name: 'Apollo 2', status: 'active', color: '#FF0000', description: 'New' });

    expect(res.status).toBe(200);
    expect(res.body.data.project).toMatchObject({ name: 'Apollo 2', status: 'active', color: '#FF0000', description: 'New' });
    expect(new Date(res.body.data.project.updatedAt) > new Date(project.updatedAt)).toBe(true);
  });

  it('lets a workspace admin and the owner edit any project', async () => {
    const { owner, admin, member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);

    expect((await update(admin.token, project._id, { status: 'on-hold' })).status).toBe(200);
    expect((await update(owner.token, project._id, { status: 'completed' })).status).toBe(200);
    expect((await Project.findById(project._id)).status).toBe('completed');
  });

  it('refuses a plain member who is not the lead', async () => {
    const { member, other, workspace } = await team();
    const project = await createProject(member.token, workspace._id);

    const res = await update(other.token, project._id, { name: 'Hijacked' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((await Project.findById(project._id)).name).toBe('Apollo Web App');
  });

  it('is invisible to people outside the workspace', async () => {
    const { member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);
    const outsider = await registerUser();

    expect((await update(outsider.token, project._id, { name: 'Hijacked' })).status).toBe(404);
  });

  it('validates the dates against the ones already stored', async () => {
    const { owner, workspace } = await team();
    const project = await createProject(owner.token, workspace._id, { startDate: '2026-11-01', endDate: '2026-12-01' });

    const endBeforeStart = await update(owner.token, project._id, { endDate: '2026-10-01' });
    expect(endBeforeStart.status).toBe(400);
    expect(endBeforeStart.body.error.details[0].field).toBe('endDate');

    const startAfterEnd = await update(owner.token, project._id, { startDate: '2027-01-01' });
    expect(startAfterEnd.status).toBe(400);

    const cleared = await update(owner.token, project._id, { endDate: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.project.endDate).toBeNull();

    // with no end date any start date is fine
    expect((await update(owner.token, project._id, { startDate: '2027-01-01' })).status).toBe(200);
  });

  it('cannot move the project to another workspace or change who created it', async () => {
    const { owner, member, workspace } = await team();
    const elsewhere = await createWorkspace(owner.token, { name: 'Elsewhere' });
    const project = await createProject(member.token, workspace._id);

    await update(owner.token, project._id, { name: 'Renamed', workspace: elsewhere._id, createdBy: owner.user._id });

    const stored = await Project.findById(project._id);
    expect(stored.name).toBe('Renamed');
    expect(String(stored.workspace)).toBe(workspace._id);
    expect(String(stored.createdBy)).toBe(member.user._id);
  });

  it('rejects an empty update and invalid values', async () => {
    const { owner, workspace } = await team();
    const project = await createProject(owner.token, workspace._id);

    expect((await update(owner.token, project._id, {})).status).toBe(400);
    expect((await update(owner.token, project._id, { status: 'finished' })).status).toBe(400);
    expect((await update(owner.token, project._id, { name: 'A' })).status).toBe(400);
  });

  describe('handing over the lead', () => {
    it('makes someone else the only lead, and the old lead loses the right to edit', async () => {
      const { member, other, workspace } = await team();
      const project = await createProject(member.token, workspace._id);

      const res = await update(member.token, project._id, { leadId: other.user._id });

      expect(res.status).toBe(200);
      expect(res.body.data.project.lead._id).toBe(other.user._id);
      expect(res.body.data.project.canManage).toBe(false); // the former lead, now an ordinary member

      const stored = await Project.findById(project._id);
      expect(stored.members.filter((m) => m.role === 'lead')).toHaveLength(1);
      expect(stored.members).toHaveLength(1);

      expect((await update(member.token, project._id, { name: 'Still me?' })).status).toBe(403);
      expect((await update(other.token, project._id, { name: 'New lead edits' })).status).toBe(200);
    });

    it('lets an admin reassign a project that someone else leads', async () => {
      const { admin, member, other, workspace } = await team();
      const project = await createProject(member.token, workspace._id);

      const res = await update(admin.token, project._id, { leadId: other.user._id });

      expect(res.status).toBe(200);
      expect(res.body.data.project.lead._id).toBe(other.user._id);
    });

    it('can be combined with other changes in one request', async () => {
      const { owner, member, workspace } = await team();
      const project = await createProject(owner.token, workspace._id);

      const res = await update(owner.token, project._id, { name: 'Handed over', leadId: member.user._id });

      expect(res.body.data.project).toMatchObject({ name: 'Handed over' });
      expect(res.body.data.project.lead._id).toBe(member.user._id);
    });

    it('only accepts a member of the same workspace', async () => {
      const { owner, workspace } = await team();
      const project = await createProject(owner.token, workspace._id);
      const stranger = await registerUser();

      const res = await update(owner.token, project._id, { leadId: stranger.user._id });

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('leadId');
      expect(res.body.data).toBeUndefined();
      expect((await http().get(oneUrl(project._id)).set(authed(owner.token))).body.data.project.lead._id).toBe(owner.user._id);
    });
  });
});

describe('DELETE /projects/:id', () => {
  it('lets the lead delete the project and announces it', async () => {
    const { member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);

    const res = await remove(member.token, project._id);

    expect(res.status).toBe(200);
    expect(await Project.exists({ _id: project._id })).toBeNull();
    expect(deletedProjects).toEqual([{ projectId: project._id, workspaceId: workspace._id }]);
  });

  it('lets a workspace admin and the owner delete any project', async () => {
    const { owner, admin, member, workspace } = await team();
    const first = await createProject(member.token, workspace._id, { name: 'First' });
    const second = await createProject(member.token, workspace._id, { name: 'Second' });

    expect((await remove(admin.token, first._id)).status).toBe(200);
    expect((await remove(owner.token, second._id)).status).toBe(200);
  });

  it('refuses a plain member who is not the lead', async () => {
    const { member, other, workspace } = await team();
    const project = await createProject(member.token, workspace._id);

    const res = await remove(other.token, project._id);

    expect(res.status).toBe(403);
    expect(await Project.exists({ _id: project._id })).toBeTruthy();
    expect(deletedProjects).toHaveLength(0);
  });

  it('is invisible to people outside the workspace', async () => {
    const { member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);
    const outsider = await registerUser();

    expect((await remove(outsider.token, project._id)).status).toBe(404);
    expect(await Project.exists({ _id: project._id })).toBeTruthy();
  });
});

describe('clean-up when other things change', () => {
  it('deleting a workspace deletes its projects, and only its own', async () => {
    const owner = await registerUser();
    const doomed = await createWorkspace(owner.token, { name: 'Doomed' });
    const survivor = await createWorkspace(owner.token, { name: 'Survivor' });
    await createProject(owner.token, doomed._id, { name: 'Gone 1' });
    await createProject(owner.token, doomed._id, { name: 'Gone 2' });
    const kept = await createProject(owner.token, survivor._id, { name: 'Kept' });

    await http().delete(`${BASE}/workspaces/${doomed._id}`).set(authed(owner.token)).send({ confirmName: 'Doomed' });

    expect(await Project.countDocuments({ workspace: doomed._id })).toBe(0);
    expect(await Project.exists({ _id: kept._id })).toBeTruthy();
  });

  it('removing a member from the workspace stops them leading its projects', async () => {
    const { owner, admin, member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);

    await http().delete(`${BASE}/workspaces/${workspace._id}/members/${member.user._id}`).set(authed(admin.token));

    const res = await http().get(oneUrl(project._id)).set(authed(owner.token));
    expect(res.status).toBe(200); // the project stays
    expect(res.body.data.project.lead).toBeNull();
    expect((await http().get(oneUrl(project._id)).set(authed(member.token))).status).toBe(404); // and they lost access
  });

  it('leaving a workspace does the same', async () => {
    const { owner, member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);

    await http().delete(`${BASE}/workspaces/${workspace._id}/members/${member.user._id}`).set(authed(member.token));

    const res = await http().get(oneUrl(project._id)).set(authed(owner.token));
    expect(res.body.data.project.lead).toBeNull();
  });

  it('a project without a lead can still be managed by admins, who can name a new lead', async () => {
    const { admin, member, other, workspace } = await team();
    const project = await createProject(member.token, workspace._id);
    await http().delete(`${BASE}/workspaces/${workspace._id}/members/${member.user._id}`).set(authed(member.token));

    const res = await update(admin.token, project._id, { leadId: other.user._id });

    expect(res.status).toBe(200);
    expect(res.body.data.project.lead._id).toBe(other.user._id);
  });

  it('deleting an account keeps their projects but removes them as lead', async () => {
    const { owner, member, workspace } = await team();
    const project = await createProject(member.token, workspace._id);

    await http().delete(`${BASE}/users/me`).set(authed(member.token)).send({ password: member.creds.password });

    const res = await http().get(oneUrl(project._id)).set(authed(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.data.project.lead).toBeNull();
    expect(res.body.data.project.createdBy).toBe(member.user._id); // still recorded, even though the account is gone
  });

  it("keeps a project when its workspace's ownership just passes on", async () => {
    const { owner, admin, workspace } = await team();
    const project = await createProject(owner.token, workspace._id);

    await http().delete(`${BASE}/users/me`).set(authed(owner.token)).send({ password: owner.creds.password });

    expect((await Workspace.findById(workspace._id)).owner.toString()).toBe(admin.user._id);
    expect((await http().get(oneUrl(project._id)).set(authed(admin.token))).status).toBe(200);
  });
});
