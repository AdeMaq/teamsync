import { jest } from '@jest/globals';
import Notification from '../../modules/notifications/notifications.model.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import { BASE, addMember, authed, createProject, createWorkspace, http, registerUser } from '../helpers.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const URL = `${BASE}/notifications`;
const list = (token, query = '') => http().get(`${URL}${query}`).set(authed(token));
const unread = (token) => http().get(`${URL}/unread-count`).set(authed(token));
const markRead = (token, id) => http().patch(`${URL}/${id}/read`).set(authed(token));
const readAll = (token) => http().post(`${URL}/read-all`).set(authed(token));
const remove = (token, id) => http().delete(`${URL}/${id}`).set(authed(token));

const createTask = async (token, projectId, body = {}) => {
  const res = await http()
    .post(`${BASE}/projects/${projectId}/tasks`)
    .set(authed(token))
    .send({ title: 'Write the spec', ...body });
  if (res.status !== 201) throw new Error(`create task failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.task;
};
const updateTask = (token, taskId, body) => http().patch(`${BASE}/tasks/${taskId}`).set(authed(token)).send(body);
const comment = (token, taskId, body) => http().post(`${BASE}/tasks/${taskId}/comments`).set(authed(token)).send(body);
const editComment = (token, id, body) => http().patch(`${BASE}/comments/${id}`).set(authed(token)).send(body);

const typesOf = async (token) => (await list(token)).body.data.notifications.map((n) => n.type);

// An owner (who creates the project), two members.
async function team() {
  const owner = await registerUser({ name: 'Olivia Owner' });
  const workspace = await createWorkspace(owner.token);
  const ana = await addMember(workspace._id, owner.token);
  const ben = await addMember(workspace._id, owner.token);
  const project = await createProject(owner.token, workspace._id);
  return { owner, ana, ben, workspace, project };
}

describe('task assigned', () => {
  it('notifies the assignee when a task is created for them, with a link to the task', async () => {
    const { owner, ana, project, workspace } = await team();
    const task = await createTask(owner.token, project._id, { assigneeId: ana.user._id });

    const res = await list(ana.token);

    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.notifications[0]).toMatchObject({
      type: 'task_assigned',
      title: 'Write the spec',
      message: 'assigned you a task',
      link: `/projects/${project._id}?task=${task._id}`,
      isRead: false,
      workspace: workspace._id,
      sender: { _id: owner.user._id, name: 'Olivia Owner' },
      meta: { taskId: task._id, projectId: project._id },
    });
    expect(res.body.data).toMatchObject({ total: 1, unreadCount: 1, page: 1, limit: 20 });
  });

  it('notifies a new assignee on update, but not when the same person is saved again or the task is unassigned', async () => {
    const { owner, ana, ben, project } = await team();
    const task = await createTask(owner.token, project._id, { assigneeId: ana.user._id });

    await updateTask(owner.token, task._id, { assigneeId: ben.user._id });
    await updateTask(owner.token, task._id, { assigneeId: ben.user._id, title: 'Renamed' });
    await updateTask(owner.token, task._id, { assigneeId: null });

    expect(await typesOf(ben.token)).toEqual(['task_assigned']);
    expect(await typesOf(ana.token)).toEqual(['task_assigned']);
  });

  it('does not notify you about a task you assign to yourself', async () => {
    const { owner, project } = await team();
    await createTask(owner.token, project._id, { assigneeId: owner.user._id });

    expect(await typesOf(owner.token)).toEqual([]);
  });
});

describe('comments and mentions', () => {
  it("tells the task's creator and assignee about a new comment, but not its author", async () => {
    const { owner, ana, ben, project } = await team();
    const task = await createTask(owner.token, project._id, { assigneeId: ana.user._id });
    await Notification.deleteMany({}); // drop the assignment notification

    const res = await comment(ben.token, task._id, { text: 'Looks good to me' });
    expect(res.status).toBe(201);

    expect(await typesOf(owner.token)).toEqual(['comment']);
    expect(await typesOf(ana.token)).toEqual(['comment']);
    expect(await typesOf(ben.token)).toEqual([]);
    expect((await list(owner.token)).body.data.notifications[0]).toMatchObject({ message: 'Looks good to me' });
  });

  it('sends a mention instead of a plain comment notification to someone mentioned', async () => {
    const { owner, ana, ben, project } = await team();
    const task = await createTask(owner.token, project._id);

    const res = await comment(ana.token, task._id, { text: '@Ben and @Olivia, see this', mentions: [ben.user._id, owner.user._id] });

    expect(res.status).toBe(201);
    expect(res.body.data.comment.mentions.sort()).toEqual([ben.user._id, owner.user._id].sort());
    expect(await typesOf(ben.token)).toEqual(['mention']);
    expect(await typesOf(owner.token)).toEqual(['mention']); // creator, but mentioned: one notification, not two
  });

  it('shortens long comments in the notification', async () => {
    const { owner, ana, project } = await team();
    const task = await createTask(owner.token, project._id);

    await comment(ana.token, task._id, { text: 'x'.repeat(500) });

    const { message } = (await list(owner.token)).body.data.notifications[0];
    expect(message.length).toBe(140);
    expect(message.endsWith('…')).toBe(true);
  });

  it('refuses mentions of people outside the workspace, and bad mention lists', async () => {
    const { owner, project } = await team();
    const task = await createTask(owner.token, project._id);
    const stranger = await registerUser();

    expect((await comment(owner.token, task._id, { text: 'hi', mentions: [stranger.user._id] })).status).toBe(400);
    expect((await comment(owner.token, task._id, { text: 'hi', mentions: ['nope'] })).status).toBe(400);
    expect((await comment(owner.token, task._id, { text: 'hi', mentions: [owner.user._id, owner.user._id] })).status).toBe(400);
    expect(await Notification.countDocuments()).toBe(0);
  });

  it('on edit, notifies only people who are newly mentioned', async () => {
    const { owner, ana, ben, project } = await team();
    const task = await createTask(owner.token, project._id);
    const posted = (await comment(owner.token, task._id, { text: 'cc @Ana', mentions: [ana.user._id] })).body.data.comment;

    await editComment(owner.token, posted._id, { text: 'cc @Ana typo fixed', mentions: [ana.user._id] });
    await editComment(owner.token, posted._id, { text: 'cc @Ana @Ben', mentions: [ana.user._id, ben.user._id] });

    expect(await typesOf(ana.token)).toEqual(['mention']);
    expect(await typesOf(ben.token)).toEqual(['mention']);
  });

  it('keeps the mentions when an edit leaves them out', async () => {
    const { owner, ana, project } = await team();
    const task = await createTask(owner.token, project._id);
    const posted = (await comment(owner.token, task._id, { text: 'cc @Ana', mentions: [ana.user._id] })).body.data.comment;

    const res = await editComment(owner.token, posted._id, { text: 'cc @Ana again' });

    expect(res.body.data.comment.mentions).toEqual([ana.user._id]);
  });
});

describe('reading and managing your notifications', () => {
  async function withThree() {
    const t = await team();
    for (const title of ['one', 'two', 'three']) await createTask(t.owner.token, t.project._id, { title, assigneeId: t.ana.user._id });
    return t;
  }

  it('lists newest first, pages, and can show only unread ones', async () => {
    const { ana } = await withThree();
    const all = (await list(ana.token)).body.data.notifications;
    expect(all.map((n) => n.title)).toEqual(['three', 'two', 'one']);

    await markRead(ana.token, all[0]._id);

    const unreadOnly = (await list(ana.token, '?unread=true')).body.data;
    expect(unreadOnly.notifications.map((n) => n.title)).toEqual(['two', 'one']);
    expect(unreadOnly).toMatchObject({ total: 2, unreadCount: 2 });

    const page2 = (await list(ana.token, '?limit=2&page=2')).body.data;
    expect(page2.notifications.map((n) => n.title)).toEqual(['one']);
    expect(page2.total).toBe(3);
  });

  it('counts unread, marks one or all as read', async () => {
    const { ana } = await withThree();
    expect((await unread(ana.token)).body.data.count).toBe(3);

    const [first] = (await list(ana.token)).body.data.notifications;
    const res = await markRead(ana.token, first._id);
    expect(res.status).toBe(200);
    expect(res.body.data.notification).toMatchObject({ _id: first._id, isRead: true });
    expect((await unread(ana.token)).body.data.count).toBe(2);

    expect((await readAll(ana.token)).body.data.updated).toBe(2);
    expect((await unread(ana.token)).body.data.count).toBe(0);
  });

  it('deletes one notification', async () => {
    const { ana } = await withThree();
    const [first] = (await list(ana.token)).body.data.notifications;

    expect((await remove(ana.token, first._id)).status).toBe(200);
    expect((await list(ana.token)).body.data.total).toBe(2);
  });

  it("never shows or changes someone else's notifications", async () => {
    const { ana, ben } = await withThree();
    const [first] = (await list(ana.token)).body.data.notifications;

    expect((await list(ben.token)).body.data.notifications).toEqual([]);
    expect((await markRead(ben.token, first._id)).status).toBe(404);
    expect((await remove(ben.token, first._id)).status).toBe(404);
    expect((await readAll(ben.token)).body.data.updated).toBe(0);
    expect((await unread(ana.token)).body.data.count).toBe(3);
  });

  it('validates ids and queries, and needs a login', async () => {
    const { ana } = await withThree();

    expect((await markRead(ana.token, 'nope')).status).toBe(400);
    expect((await list(ana.token, '?limit=500')).status).toBe(400);
    expect((await http().get(URL)).status).toBe(401);
    expect((await http().get(`${URL}/unread-count`)).status).toBe(401);
  });
});

describe('clean-up when other things change', () => {
  it('deleting a task removes the notifications about it', async () => {
    const { owner, ana, project } = await team();
    const goes = await createTask(owner.token, project._id, { title: 'goes', assigneeId: ana.user._id });
    await createTask(owner.token, project._id, { title: 'stays', assigneeId: ana.user._id });

    await http().delete(`${BASE}/tasks/${goes._id}`).set(authed(owner.token));

    expect((await list(ana.token)).body.data.notifications.map((n) => n.title)).toEqual(['stays']);
  });

  it('deleting a project removes the notifications about its tasks', async () => {
    const { owner, ana, project } = await team();
    await createTask(owner.token, project._id, { assigneeId: ana.user._id });

    await http().delete(`${BASE}/projects/${project._id}`).set(authed(owner.token));

    expect(await Notification.countDocuments()).toBe(0);
  });

  it('leaving a workspace removes your notifications from it, and you get no new ones', async () => {
    const { owner, ana, project, workspace } = await team();
    const task = await createTask(owner.token, project._id, { assigneeId: ana.user._id });

    await http().delete(`${BASE}/workspaces/${workspace._id}/members/${ana.user._id}`).set(authed(owner.token));
    expect(await Notification.countDocuments({ recipient: ana.user._id })).toBe(0);

    // Ana created nothing, but even as a former assignee she hears nothing about later comments.
    await comment(owner.token, task._id, { text: 'still there?' });
    expect(await Notification.countDocuments({ recipient: ana.user._id })).toBe(0);
  });

  it('deleting the workspace removes its notifications', async () => {
    const { owner, ana, project, workspace } = await team();
    await createTask(owner.token, project._id, { assigneeId: ana.user._id });

    await http().delete(`${BASE}/workspaces/${workspace._id}`).set(authed(owner.token)).send({ confirmName: workspace.name });

    expect(await Notification.countDocuments()).toBe(0);
  });

  it("deleting an account removes its notifications and shows it as no one in others'", async () => {
    const { owner, ana, ben, project } = await team();
    const task = await createTask(owner.token, project._id, { assigneeId: ana.user._id });
    await comment(ana.token, task._id, { text: 'on it' }); // notifies the owner, sent by Ana

    await http().delete(`${BASE}/users/me`).set(authed(ana.token)).send({ password: ana.creds.password });

    expect(await Notification.countDocuments({ recipient: ana.user._id })).toBe(0);
    const [fromAna] = (await list(owner.token)).body.data.notifications;
    expect(fromAna).toMatchObject({ type: 'comment', sender: null });
    expect(ben).toBeDefined();
  });

  it('a failing notification never fails the action that caused it', async () => {
    const { owner, ana, project } = await team();
    const broken = jestBreak();
    try {
      const res = await http()
        .post(`${BASE}/projects/${project._id}/tasks`)
        .set(authed(owner.token))
        .send({ title: 'still created', assigneeId: ana.user._id });
      expect(res.status).toBe(201);
    } finally {
      broken.restore();
    }
  });
});

// Makes creating notifications throw, to prove the listener swallows the error.
function jestBreak() {
  const spy = jest.spyOn(Notification, 'insertMany').mockRejectedValue(new Error('database down'));
  return { restore: () => spy.mockRestore() };
}
