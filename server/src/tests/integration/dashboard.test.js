import Task from '../../modules/tasks/tasks.model.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import { BASE, addMember, authed, createProject, createWorkspace, http, registerUser } from '../helpers.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const DAY = 24 * 60 * 60 * 1000;
const dayOffset = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10); // a calendar day, UTC

const dashboard = (token, workspaceId) => http().get(`${BASE}/workspaces/${workspaceId}/dashboard`).set(authed(token));

async function makeTask(token, projectId, body = {}) {
  const res = await http()
    .post(`${BASE}/projects/${projectId}/tasks`)
    .set(authed(token))
    .send({ title: 'A task', ...body });
  if (res.status !== 201) throw new Error(`create task failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.task;
}

const move = (token, taskId, body) => http().post(`${BASE}/tasks/${taskId}/move`).set(authed(token)).send(body);

async function team() {
  const owner = await registerUser();
  const workspace = await createWorkspace(owner.token);
  const member = await addMember(workspace._id, owner.token);
  const project = await createProject(owner.token, workspace._id, { name: 'Apollo', status: 'active' });
  return { owner, member, workspace, project };
}

describe('GET /workspaces/:workspaceId/dashboard', () => {
  it('gives zeros and empty lists for a workspace with nothing in it', async () => {
    const { owner, workspace } = await (async () => {
      const o = await registerUser();
      return { owner: o, workspace: await createWorkspace(o.token) };
    })();

    const res = await dashboard(owner.token, workspace._id);

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toEqual({
      activeProjects: 0,
      openTasks: 0,
      dueThisWeek: 0,
      overdueTasks: 0,
      completedLast30Days: 0,
      completedPrevious30Days: 0,
    });
    expect(res.body.data.weeklyThroughput).toHaveLength(6);
    expect(res.body.data.weeklyThroughput.every((w) => w.value === 0)).toBe(true);
    expect(res.body.data).toMatchObject({ activity: [], projectHealth: [], workload: [] });
  });

  it('counts open, due-this-week and overdue tasks, and active projects', async () => {
    const { owner, workspace, project } = await team();
    await createProject(owner.token, workspace._id, { name: 'Planned', status: 'planning' });
    await makeTask(owner.token, project._id, { title: 'no date' });
    await makeTask(owner.token, project._id, { title: 'soon', dueDate: dayOffset(2) });
    await makeTask(owner.token, project._id, { title: 'late', dueDate: dayOffset(-3) });
    await makeTask(owner.token, project._id, { title: 'far', dueDate: dayOffset(30) });
    const finished = await makeTask(owner.token, project._id, { title: 'done late', dueDate: dayOffset(-3) });
    await move(owner.token, finished._id, { status: 'done' });

    const { stats } = (await dashboard(owner.token, workspace._id)).body.data;

    expect(stats).toMatchObject({ activeProjects: 1, openTasks: 4, dueThisWeek: 1, overdueTasks: 1 });
  });

  it('counts finished tasks per 30 days and per week, using when they were finished', async () => {
    const { owner, workspace, project } = await team();
    const recent = await makeTask(owner.token, project._id, { title: 'recent' });
    const older = await makeTask(owner.token, project._id, { title: 'older' });
    const ancient = await makeTask(owner.token, project._id, { title: 'ancient' });
    for (const task of [recent, older, ancient]) await move(owner.token, task._id, { status: 'done' });
    await Task.updateOne({ _id: older._id }, { completedAt: new Date(Date.now() - 40 * DAY) });
    await Task.updateOne({ _id: ancient._id }, { completedAt: new Date(Date.now() - 200 * DAY) });

    const { stats, weeklyThroughput } = (await dashboard(owner.token, workspace._id)).body.data;

    expect(stats.completedLast30Days).toBe(1);
    expect(stats.completedPrevious30Days).toBe(1); // 200 days ago is in neither
    expect(weeklyThroughput.at(-1).value).toBe(1); // the current week is last
    expect(weeklyThroughput.reduce((sum, w) => sum + w.value, 0)).toBeLessThanOrEqual(2);
  });

  it('lists the weeks oldest first, starting on Mondays', async () => {
    const { owner, workspace } = await team();

    const { weeklyThroughput } = (await dashboard(owner.token, workspace._id)).body.data;

    const starts = weeklyThroughput.map((w) => w.weekStart);
    expect([...starts].sort()).toEqual(starts);
    expect(starts.every((s) => new Date(s).getUTCDay() === 1)).toBe(true);
  });

  it('stamps completedAt when a task enters "done" and clears it when it leaves', async () => {
    const { owner, project } = await team();
    const task = await makeTask(owner.token, project._id);

    await move(owner.token, task._id, { status: 'done' });
    const stamped = (await Task.findById(task._id)).completedAt;
    expect(stamped).toBeInstanceOf(Date);

    await move(owner.token, task._id, { status: 'done', index: 0 }); // reordering inside "done" keeps the stamp
    expect((await Task.findById(task._id)).completedAt.getTime()).toBe(stamped.getTime());

    await move(owner.token, task._id, { status: 'todo' });
    expect((await Task.findById(task._id)).completedAt).toBeNull();
  });

  it('stamps completedAt on a task created straight into "done"', async () => {
    const { owner, project } = await team();
    const task = await makeTask(owner.token, project._id, { status: 'done' });

    expect((await Task.findById(task._id)).completedAt).toBeInstanceOf(Date);
  });

  it('shows open work per person, busiest first, leaving finished tasks out', async () => {
    const { owner, member, workspace, project } = await team();
    await makeTask(owner.token, project._id, { assigneeId: member.user._id });
    await makeTask(owner.token, project._id, { assigneeId: member.user._id });
    await makeTask(owner.token, project._id, { assigneeId: owner.user._id });
    const done = await makeTask(owner.token, project._id, { assigneeId: owner.user._id });
    await move(owner.token, done._id, { status: 'done' });
    await makeTask(owner.token, project._id); // unassigned

    const { workload } = (await dashboard(owner.token, workspace._id)).body.data;

    expect(workload.map((w) => [w.user._id, w.tasks])).toEqual([
      [member.user._id, 2],
      [owner.user._id, 1],
    ]);
    expect(workload[0].user).toMatchObject({ name: member.user.name });
  });

  it('gives each project its progress, open count and health', async () => {
    const { owner, workspace, project } = await team();
    const shipped = await createProject(owner.token, workspace._id, { name: 'Shipped', status: 'completed' });
    const risky = await createProject(owner.token, workspace._id, { name: 'Risky', status: 'active' });
    await createProject(owner.token, workspace._id, { name: 'Gone', status: 'archived' });

    const a = await makeTask(owner.token, project._id);
    await makeTask(owner.token, project._id);
    await move(owner.token, a._id, { status: 'done' });
    await makeTask(owner.token, risky._id, { dueDate: dayOffset(-2) });

    const { projectHealth } = (await dashboard(owner.token, workspace._id)).body.data;
    const byName = Object.fromEntries(projectHealth.map((p) => [p.name, p]));

    expect(Object.keys(byName).sort()).toEqual(['Apollo', 'Risky', 'Shipped']); // archived projects are left out
    expect(byName.Apollo).toMatchObject({ openTasks: 1, totalTasks: 2, progress: 50, health: 'on-track' });
    expect(byName.Risky).toMatchObject({ openTasks: 1, overdueTasks: 1, progress: 0, health: 'at-risk' });
    expect(byName.Shipped).toMatchObject({ openTasks: 0, progress: 0, health: 'shipped' });
    expect(shipped).toBeDefined();
  });

  it('builds the activity feed from new tasks and comments, newest first, with who did it', async () => {
    const { owner, member, workspace, project } = await team();
    const task = await makeTask(owner.token, project._id, { title: 'Write the spec' });
    await http().post(`${BASE}/tasks/${task._id}/comments`).set(authed(member.token)).send({ text: 'Looks good' });

    const { activity } = (await dashboard(owner.token, workspace._id)).body.data;

    expect(activity.map((a) => [a.type, a.taskTitle, a.actor.name])).toEqual([
      ['comment_added', 'Write the spec', member.user.name],
      ['task_created', 'Write the spec', owner.user.name],
    ]);
    expect(activity[0]).toMatchObject({ taskId: task._id, projectId: project._id });
  });

  it('shows no one for activity by a person who left, and drops comments of deleted tasks', async () => {
    const { owner, member, workspace, project } = await team();
    const task = await makeTask(member.token, project._id, { title: 'Mine' });
    await http().delete(`${BASE}/workspaces/${workspace._id}/members/${member.user._id}`).set(authed(owner.token));

    const { activity } = (await dashboard(owner.token, workspace._id)).body.data;
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({ type: 'task_created', taskTitle: 'Mine', actor: null });

    await http().delete(`${BASE}/tasks/${task._id}`).set(authed(owner.token));
    expect((await dashboard(owner.token, workspace._id)).body.data.activity).toEqual([]);
  });

  it('keeps the feed to the newest 10', async () => {
    const { owner, workspace, project } = await team();
    for (let i = 0; i < 12; i += 1) await makeTask(owner.token, project._id, { title: `Task ${i}` });

    const { activity } = (await dashboard(owner.token, workspace._id)).body.data;

    expect(activity).toHaveLength(10);
  });

  it("never mixes in another workspace's data, and hides the workspace from non-members", async () => {
    const mine = await team();
    const other = await team();
    await makeTask(other.owner.token, other.project._id);

    const { stats, projectHealth, activity } = (await dashboard(mine.owner.token, mine.workspace._id)).body.data;
    expect(stats.openTasks).toBe(0);
    expect(projectHealth.map((p) => p.name)).toEqual(['Apollo']);
    expect(activity).toEqual([]);

    expect((await dashboard(mine.owner.token, other.workspace._id)).status).toBe(404);
    expect((await http().get(`${BASE}/workspaces/${mine.workspace._id}/dashboard`)).status).toBe(401);
    expect((await dashboard(mine.owner.token, 'nope')).status).toBe(400);
  });

  it('is open to every member, not only admins', async () => {
    const { member, workspace } = await team();

    expect((await dashboard(member.token, workspace._id)).status).toBe(200);
  });
});
