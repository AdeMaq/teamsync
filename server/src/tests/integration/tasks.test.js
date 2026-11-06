import Task from '../../modules/tasks/tasks.model.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import { BASE, addMember, authed, createProject, createWorkspace, http, registerUser } from '../helpers.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const projectTasksUrl = (projectId, query = '') => `${BASE}/projects/${projectId}/tasks${query}`;
const taskUrl = (taskId) => `${BASE}/tasks/${taskId}`;

const create = (token, projectId, body = {}) =>
  http().post(projectTasksUrl(projectId)).set(authed(token)).send({ title: 'Write the spec', ...body });
const list = (token, projectId, query) => http().get(projectTasksUrl(projectId, query)).set(authed(token));
const get = (token, taskId) => http().get(taskUrl(taskId)).set(authed(token));
const update = (token, taskId, body) => http().patch(taskUrl(taskId)).set(authed(token)).send(body);
const move = (token, taskId, body) => http().post(`${taskUrl(taskId)}/move`).set(authed(token)).send(body);
const remove = (token, taskId) => http().delete(taskUrl(taskId)).set(authed(token));

// Makes a task and returns it.
async function makeTask(token, projectId, body) {
  const res = await create(token, projectId, body);
  if (res.status !== 201) throw new Error(`create task failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.task;
}

// The titles of one column, top to bottom, as the board would show them.
async function column(token, projectId, status) {
  const res = await list(token, projectId, `?status=${status}`);
  return res.body.data.tasks.map((t) => t.title);
}

// A workspace with an owner, an admin and two plain members; the project is led by `lead` (a plain member).
async function team() {
  const owner = await registerUser();
  const workspace = await createWorkspace(owner.token);
  const admin = await addMember(workspace._id, owner.token, 'admin');
  const lead = await addMember(workspace._id, owner.token);
  const member = await addMember(workspace._id, owner.token);
  const project = await createProject(lead.token, workspace._id);
  return { owner, admin, lead, member, workspace, project };
}

describe('POST /projects/:id/tasks', () => {
  it('lets any member create a task with sensible defaults', async () => {
    const { member, project, workspace } = await team();

    const res = await create(member.token, project._id, { title: '  Write the spec ' });

    expect(res.status).toBe(201);
    expect(res.body.data.task).toMatchObject({
      title: 'Write the spec',
      description: '',
      status: 'todo',
      priority: 'medium',
      assignee: null,
      dueDate: null,
      project: project._id,
      workspace: workspace._id,
      createdBy: member.user._id,
      canDelete: true, // they made it
    });
    expect(res.body.data.task.position).toBeGreaterThan(0);
  });

  it('accepts every field, including an assignee who belongs to the workspace', async () => {
    const { lead, member, project } = await team();

    const res = await create(lead.token, project._id, {
      title: 'Fix login',
      description: 'It breaks on Safari',
      status: 'in-progress',
      priority: 'urgent',
      assigneeId: member.user._id,
      dueDate: '2026-12-01',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.task).toMatchObject({ status: 'in-progress', priority: 'urgent', description: 'It breaks on Safari' });
    expect(res.body.data.task.assignee).toMatchObject({ _id: member.user._id, name: member.user.name });
    expect(res.body.data.task.dueDate).toMatch(/^2026-12-01/);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  it('puts new tasks at the bottom of their column', async () => {
    const { lead, project } = await team();
    await makeTask(lead.token, project._id, { title: 'first' });
    await makeTask(lead.token, project._id, { title: 'second' });
    await makeTask(lead.token, project._id, { title: 'other column', status: 'done' });
    await makeTask(lead.token, project._id, { title: 'third' });

    expect(await column(lead.token, project._id, 'todo')).toEqual(['first', 'second', 'third']);
    expect(await column(lead.token, project._id, 'done')).toEqual(['other column']);
  });

  it('rejects an assignee from outside the workspace', async () => {
    const { lead, project } = await team();
    const stranger = await registerUser();

    const res = await create(lead.token, project._id, { assigneeId: stranger.user._id });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('assigneeId');
  });

  it('validates the input', async () => {
    const { lead, project } = await team();

    for (const body of [
      { title: '' },
      { title: 'x'.repeat(201) },
      { status: 'finished' },
      { priority: 'whenever' },
      { dueDate: 'tomorrow' },
      { assigneeId: 'not-an-id' },
    ]) {
      const res = await create(lead.token, project._id, body);
      expect(res.status).toBe(400);
    }
    const noTitle = await http().post(projectTasksUrl(project._id)).set(authed(lead.token)).send({});
    expect(noTitle.status).toBe(400);
  });

  it('ignores fields it does not know, so a caller cannot choose the workspace, creator or position', async () => {
    const { lead, project } = await team();
    const stranger = await registerUser();

    const res = await create(lead.token, project._id, {
      workspace: '64b000000000000000000000',
      createdBy: stranger.user._id,
      position: -5,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.task.createdBy).toBe(lead.user._id);
    expect(res.body.data.task.workspace).not.toBe('64b000000000000000000000');
    expect(res.body.data.task.position).toBeGreaterThan(0);
  });

  it('stops at the per-project limit', async () => {
    const { lead, project, workspace } = await team();
    await Task.insertMany(
      Array.from({ length: 500 }, (_, i) => ({
        title: `t${i}`,
        workspace: workspace._id,
        project: project._id,
        createdBy: lead.user._id,
        position: i,
      }))
    );

    const res = await create(lead.token, project._id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('answers a non-member and a missing project with the same 404, and a logged-out caller with 401', async () => {
    const { project } = await team();
    const outsider = await registerUser();

    const asOutsider = await create(outsider.token, project._id);
    const missing = await create(outsider.token, '64b000000000000000000000');
    const loggedOut = await http().post(projectTasksUrl(project._id)).send({ title: 'x' });

    expect(asOutsider.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(asOutsider.body.error.message).toBe(missing.body.error.message);
    expect(loggedOut.status).toBe(401);
  });
});

describe('GET /projects/:id/tasks', () => {
  it('returns every task of the project with assignee details', async () => {
    const { lead, member, project } = await team();
    await makeTask(lead.token, project._id, { title: 'a', assigneeId: member.user._id });
    await makeTask(lead.token, project._id, { title: 'b' });

    const res = await list(member.token, project._id);

    expect(res.status).toBe(200);
    expect(res.body.data.tasks.map((t) => t.title)).toEqual(['a', 'b']);
    expect(res.body.data.tasks[0].assignee.email).toBe(member.user.email);
  });

  it('filters by status, priority and assignee ("me", "none", or an id)', async () => {
    const { lead, member, project } = await team();
    await makeTask(lead.token, project._id, { title: 'mine', assigneeId: member.user._id, priority: 'high' });
    await makeTask(lead.token, project._id, { title: 'leads', assigneeId: lead.user._id, status: 'done' });
    await makeTask(lead.token, project._id, { title: 'nobody', priority: 'high' });

    const titles = async (query) => (await list(member.token, project._id, query)).body.data.tasks.map((t) => t.title);

    expect(await titles('?status=done')).toEqual(['leads']);
    expect(await titles('?priority=high')).toEqual(['mine', 'nobody']);
    expect(await titles('?assignee=me')).toEqual(['mine']);
    expect(await titles('?assignee=none')).toEqual(['nobody']);
    expect(await titles(`?assignee=${lead.user._id}`)).toEqual(['leads']);
    expect(await titles('?priority=high&assignee=none')).toEqual(['nobody']);
  });

  it('only returns the tasks of the project asked for', async () => {
    const { lead, project, workspace } = await team();
    const other = await createProject(lead.token, workspace._id, { name: 'Other' });
    await makeTask(lead.token, project._id, { title: 'here' });
    await makeTask(lead.token, other._id, { title: 'there' });

    const res = await list(lead.token, project._id);

    expect(res.body.data.tasks.map((t) => t.title)).toEqual(['here']);
  });

  it('rejects a bad filter and hides the board from outsiders', async () => {
    const { project } = await team();
    const outsider = await registerUser();

    expect((await list(outsider.token, project._id)).status).toBe(404);
    const member = (await team()).member;
    expect((await list(member.token, '64b000000000000000000000')).status).toBe(404);
  });

  it('rejects an invalid filter value', async () => {
    const { lead, project } = await team();

    expect((await list(lead.token, project._id, '?status=nope')).status).toBe(400);
    expect((await list(lead.token, project._id, '?assignee=everyone')).status).toBe(400);
  });
});

describe('GET /tasks/:id', () => {
  it('returns one task to any workspace member', async () => {
    const { lead, member, project } = await team();
    const task = await makeTask(lead.token, project._id, { title: 'Look at me' });

    const res = await get(member.token, task._id);

    expect(res.status).toBe(200);
    expect(res.body.data.task).toMatchObject({ _id: task._id, title: 'Look at me', canDelete: false });
  });

  it('is a 404 for outsiders, for missing tasks and for a malformed id', async () => {
    const { lead, project } = await team();
    const task = await makeTask(lead.token, project._id);
    const outsider = await registerUser();

    expect((await get(outsider.token, task._id)).status).toBe(404);
    expect((await get(lead.token, '64b000000000000000000000')).status).toBe(404);
    expect((await get(lead.token, 'nope')).status).toBe(400);
  });
});

describe('PATCH /tasks/:id', () => {
  it('lets any member edit the text fields, priority, due date and assignee', async () => {
    const { lead, member, project } = await team();
    const task = await makeTask(lead.token, project._id);

    const res = await update(member.token, task._id, {
      title: 'New title',
      description: 'Details',
      priority: 'low',
      dueDate: '2026-12-24',
      assigneeId: member.user._id,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.task).toMatchObject({ title: 'New title', description: 'Details', priority: 'low' });
    expect(res.body.data.task.assignee._id).toBe(member.user._id);
    expect(res.body.data.task.dueDate).toMatch(/^2026-12-24/);
  });

  it('clears the assignee and the due date with null, and leaves other fields alone', async () => {
    const { lead, project } = await team();
    const task = await makeTask(lead.token, project._id, {
      title: 'Keep me',
      assigneeId: lead.user._id,
      dueDate: '2026-12-01',
    });

    const res = await update(lead.token, task._id, { assigneeId: null, dueDate: null });

    expect(res.status).toBe(200);
    expect(res.body.data.task).toMatchObject({ title: 'Keep me', assignee: null, dueDate: null });
  });

  it('rejects an outside assignee, an empty body and a status change', async () => {
    const { lead, project } = await team();
    const task = await makeTask(lead.token, project._id);
    const stranger = await registerUser();

    const outside = await update(lead.token, task._id, { assigneeId: stranger.user._id });
    expect(outside.status).toBe(400);
    expect(outside.body.error.details[0].field).toBe('assigneeId');
    expect((await update(lead.token, task._id, {})).status).toBe(400);
    expect((await update(lead.token, task._id, { status: 'done' })).status).toBe(400); // moving has its own endpoint
  });

  it('is a 404 for outsiders', async () => {
    const { lead, project } = await team();
    const task = await makeTask(lead.token, project._id);
    const outsider = await registerUser();

    const res = await update(outsider.token, task._id, { title: 'hijack' });

    expect(res.status).toBe(404);
    expect((await get(lead.token, task._id)).body.data.task.title).toBe('Write the spec');
  });
});

describe('POST /tasks/:id/move', () => {
  it('moves a task to another column, at the bottom unless told otherwise', async () => {
    const { lead, project } = await team();
    const a = await makeTask(lead.token, project._id, { title: 'a' });
    await makeTask(lead.token, project._id, { title: 'b' });
    await makeTask(lead.token, project._id, { title: 'x', status: 'done' });

    const res = await move(lead.token, a._id, { status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('done');
    expect(await column(lead.token, project._id, 'done')).toEqual(['x', 'a']);
    expect(await column(lead.token, project._id, 'todo')).toEqual(['b']);
  });

  it('puts a task at the given place in the column', async () => {
    const { lead, project } = await team();
    const [a, b, c] = [
      await makeTask(lead.token, project._id, { title: 'a' }),
      await makeTask(lead.token, project._id, { title: 'b' }),
      await makeTask(lead.token, project._id, { title: 'c' }),
    ];
    const d = await makeTask(lead.token, project._id, { title: 'd', status: 'done' });

    await move(lead.token, d._id, { status: 'todo', index: 0 });
    expect(await column(lead.token, project._id, 'todo')).toEqual(['d', 'a', 'b', 'c']);

    await move(lead.token, c._id, { status: 'todo', index: 1 });
    expect(await column(lead.token, project._id, 'todo')).toEqual(['d', 'c', 'a', 'b']);

    await move(lead.token, a._id, { status: 'todo', index: 99 }); // past the end = the bottom
    expect(await column(lead.token, project._id, 'todo')).toEqual(['d', 'c', 'b', 'a']);

    await move(lead.token, b._id, { status: 'todo', index: 0 });
    expect(await column(lead.token, project._id, 'todo')).toEqual(['b', 'd', 'c', 'a']);
  });

  it('reorders inside the same column', async () => {
    const { lead, project } = await team();
    const a = await makeTask(lead.token, project._id, { title: 'a' });
    await makeTask(lead.token, project._id, { title: 'b' });
    await makeTask(lead.token, project._id, { title: 'c' });

    await move(lead.token, a._id, { status: 'todo', index: 2 });
    expect(await column(lead.token, project._id, 'todo')).toEqual(['b', 'c', 'a']);

    await move(lead.token, a._id, { status: 'todo', index: 0 });
    expect(await column(lead.token, project._id, 'todo')).toEqual(['a', 'b', 'c']);
  });

  it('keeps the order correct after many drops in the same spot (renumbering)', async () => {
    const { lead, project } = await team();
    const first = await makeTask(lead.token, project._id, { title: 'first' });
    await makeTask(lead.token, project._id, { title: 'last' });
    const movers = [];
    for (let i = 0; i < 45; i++) movers.push(await makeTask(lead.token, project._id, { title: `m${i}`, status: 'done' }));

    // Always drop between the first two: the gap halves each time until the column has to be renumbered.
    const expected = ['first', 'last'];
    for (const m of movers) {
      const res = await move(lead.token, m._id, { status: 'todo', index: 1 });
      expect(res.status).toBe(200);
      expected.splice(1, 0, m.title);
    }

    expect(await column(lead.token, project._id, 'todo')).toEqual(expected);
    expect(first.title).toBe('first');
  });

  it('works for any member, and not for outsiders', async () => {
    const { lead, member, project } = await team();
    const task = await makeTask(lead.token, project._id);
    const outsider = await registerUser();

    expect((await move(member.token, task._id, { status: 'in-review' })).status).toBe(200);
    expect((await move(outsider.token, task._id, { status: 'done' })).status).toBe(404);
    expect((await get(lead.token, task._id)).body.data.task.status).toBe('in-review');
  });

  it('validates the input', async () => {
    const { lead, project } = await team();
    const task = await makeTask(lead.token, project._id);

    expect((await move(lead.token, task._id, {})).status).toBe(400);
    expect((await move(lead.token, task._id, { status: 'limbo' })).status).toBe(400);
    expect((await move(lead.token, task._id, { status: 'done', index: -1 })).status).toBe(400);
    expect((await move(lead.token, task._id, { status: 'done', index: 1.5 })).status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  it('lets the creator delete their own task', async () => {
    const { member, project } = await team();
    const task = await makeTask(member.token, project._id);

    const res = await remove(member.token, task._id);

    expect(res.status).toBe(200);
    expect((await get(member.token, task._id)).status).toBe(404);
  });

  it('lets the project lead, an admin and the owner delete anyone\'s task', async () => {
    const { owner, admin, lead, member, project } = await team();

    for (const who of [lead, admin, owner]) {
      const task = await makeTask(member.token, project._id);
      expect((await remove(who.token, task._id)).status).toBe(200);
    }
  });

  it('forbids a member who neither created the task nor leads the project', async () => {
    const { lead, member, project } = await team();
    const task = await makeTask(lead.token, project._id);

    const res = await remove(member.token, task._id);

    expect(res.status).toBe(403);
    expect((await get(lead.token, task._id)).status).toBe(200);
  });

  it('is a 404 for outsiders', async () => {
    const { lead, project } = await team();
    const task = await makeTask(lead.token, project._id);
    const outsider = await registerUser();

    expect((await remove(outsider.token, task._id)).status).toBe(404);
    expect((await get(lead.token, task._id)).status).toBe(200);
  });

  it('reports canDelete correctly per person', async () => {
    const { admin, lead, member, project } = await team();
    const task = await makeTask(member.token, project._id);

    const flags = {};
    for (const [name, who] of Object.entries({ admin, lead, member })) {
      flags[name] = (await get(who.token, task._id)).body.data.task.canDelete;
    }
    const other = await makeTask(lead.token, project._id);
    flags.memberOnLeadsTask = (await get(member.token, other._id)).body.data.task.canDelete;

    expect(flags).toEqual({ admin: true, lead: true, member: true, memberOnLeadsTask: false });
  });
});

describe('clean-up after other modules', () => {
  it('deletes a project\'s tasks when the project is deleted', async () => {
    const { lead, project, workspace } = await team();
    const other = await createProject(lead.token, workspace._id, { name: 'Other' });
    await makeTask(lead.token, project._id);
    await makeTask(lead.token, other._id);

    const res = await http().delete(`${BASE}/projects/${project._id}`).set(authed(lead.token));

    expect(res.status).toBe(200);
    expect(await Task.countDocuments({ project: project._id })).toBe(0);
    expect(await Task.countDocuments({ project: other._id })).toBe(1);
  });

  it('deletes all tasks when the workspace is deleted', async () => {
    const { owner, lead, project, workspace } = await team();
    await makeTask(lead.token, project._id);

    const res = await http()
      .delete(`${BASE}/workspaces/${workspace._id}`)
      .set(authed(owner.token))
      .send({ confirmName: workspace.name });

    expect(res.status).toBe(200);
    expect(await Task.countDocuments({})).toBe(0);
  });

  it('unassigns a member who is removed from the workspace, keeping the task', async () => {
    const { owner, lead, member, project, workspace } = await team();
    const task = await makeTask(lead.token, project._id, { assigneeId: member.user._id });

    const res = await http()
      .delete(`${BASE}/workspaces/${workspace._id}/members/${member.user._id}`)
      .set(authed(owner.token));

    expect(res.status).toBe(200);
    expect((await get(lead.token, task._id)).body.data.task.assignee).toBeNull();
  });

  it('unassigns a person who deletes their account, keeping the task', async () => {
    const { lead, member, project } = await team();
    const task = await makeTask(lead.token, project._id, { assigneeId: member.user._id });

    const res = await http()
      .delete(`${BASE}/users/me`)
      .set(authed(member.token))
      .send({ password: member.creds.password });

    expect(res.status).toBe(200);
    const after = await get(lead.token, task._id);
    expect(after.status).toBe(200);
    expect(after.body.data.task.assignee).toBeNull();
  });

  it('shows no tasks to someone who was removed from the workspace', async () => {
    const { owner, lead, member, project, workspace } = await team();
    const task = await makeTask(lead.token, project._id);
    await http().delete(`${BASE}/workspaces/${workspace._id}/members/${member.user._id}`).set(authed(owner.token));

    expect((await get(member.token, task._id)).status).toBe(404);
    expect((await list(member.token, project._id)).status).toBe(404);
  });
});

describe('GET /workspaces/:workspaceId/task-counts', () => {
  const counts = (token, workspaceId) =>
    http().get(`${BASE}/workspaces/${workspaceId}/task-counts`).set(authed(token));

  it('counts tasks per project and column, leaving out projects without tasks', async () => {
    const { owner, member, project, workspace } = await team();
    const empty = await createProject(owner.token, workspace._id, { name: 'Empty' });
    await makeTask(member.token, project._id, { title: 'a' });
    await makeTask(member.token, project._id, { title: 'b' });
    await makeTask(member.token, project._id, { title: 'c', status: 'done' });

    const res = await counts(member.token, workspace._id);

    expect(res.status).toBe(200);
    expect(res.body.data.counts[project._id]).toEqual({ todo: 2, 'in-progress': 0, 'in-review': 0, done: 1, total: 3 });
    expect(res.body.data.counts[empty._id]).toBeUndefined();
  });

  it('follows moves and deletes', async () => {
    const { member, project, workspace } = await team();
    const task = await makeTask(member.token, project._id);
    await move(member.token, task._id, { status: 'in-progress' });

    let res = await counts(member.token, workspace._id);
    expect(res.body.data.counts[project._id]).toMatchObject({ todo: 0, 'in-progress': 1, total: 1 });

    await remove(member.token, task._id);
    res = await counts(member.token, workspace._id);
    expect(res.body.data.counts[project._id]).toBeUndefined();
  });

  it("never includes another workspace's projects, and hides the workspace from non-members", async () => {
    const mine = await team();
    const other = await team();
    await makeTask(other.member.token, other.project._id);

    const res = await counts(mine.member.token, mine.workspace._id);
    expect(res.body.data.counts).toEqual({});

    expect((await counts(mine.member.token, other.workspace._id)).status).toBe(404);
    expect((await http().get(`${BASE}/workspaces/${mine.workspace._id}/task-counts`)).status).toBe(401);
    expect((await counts(mine.member.token, 'nope')).status).toBe(400);
  });
});
