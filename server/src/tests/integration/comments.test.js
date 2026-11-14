import Comment from '../../modules/comments/comments.model.js';
import Task from '../../modules/tasks/tasks.model.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import { BASE, addMember, authed, createProject, createWorkspace, http, registerUser } from '../helpers.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const taskCommentsUrl = (taskId, query = '') => `${BASE}/tasks/${taskId}/comments${query}`;
const commentUrl = (commentId) => `${BASE}/comments/${commentId}`;

const post = (token, taskId, body = { text: 'Looks good to me' }) =>
  http().post(taskCommentsUrl(taskId)).set(authed(token)).send(body);
const list = (token, taskId, query) => http().get(taskCommentsUrl(taskId, query)).set(authed(token));
const edit = (token, commentId, body) => http().patch(commentUrl(commentId)).set(authed(token)).send(body);
const remove = (token, commentId) => http().delete(commentUrl(commentId)).set(authed(token));

async function makeTask(token, projectId) {
  const res = await http().post(`${BASE}/projects/${projectId}/tasks`).set(authed(token)).send({ title: 'Write the spec' });
  if (res.status !== 201) throw new Error(`create task failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.task;
}

async function makeComment(token, taskId, text) {
  const res = await post(token, taskId, { text });
  if (res.status !== 201) throw new Error(`create comment failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.comment;
}

// A workspace with an owner, an admin and two plain members, one project and one task.
async function team() {
  const owner = await registerUser();
  const workspace = await createWorkspace(owner.token);
  const admin = await addMember(workspace._id, owner.token, 'admin');
  const member = await addMember(workspace._id, owner.token);
  const other = await addMember(workspace._id, owner.token);
  const project = await createProject(member.token, workspace._id);
  const task = await makeTask(member.token, project._id);
  return { owner, admin, member, other, workspace, project, task };
}

describe('POST /tasks/:id/comments', () => {
  it('lets any member comment and returns the author and what they may do', async () => {
    const { other, member, task, workspace } = await team();

    const res = await post(other.token, task._id, { text: '  Looks good to me ' });

    expect(res.status).toBe(201);
    expect(res.body.data.comment).toMatchObject({
      text: 'Looks good to me',
      task: task._id,
      workspace: workspace._id,
      author: { _id: other.user._id, name: other.user.name },
      editedAt: null,
      canEdit: true,
      canDelete: true,
    });
    expect(member).toBeDefined();
  });

  it('rejects empty, blank and over-long text', async () => {
    const { member, task } = await team();

    expect((await post(member.token, task._id, {})).status).toBe(400);
    expect((await post(member.token, task._id, { text: '   ' })).status).toBe(400);
    expect((await post(member.token, task._id, { text: 'x'.repeat(5001) })).status).toBe(400);
  });

  it('ignores fields the caller must not set', async () => {
    const { member, other, task } = await team();

    const res = await post(member.token, task._id, { text: 'hi', author: other.user._id, workspace: other.user._id });

    expect(res.body.data.comment.author._id).toBe(member.user._id);
    expect(res.body.data.comment.workspace).not.toBe(other.user._id);
  });

  it('hides the task from people outside the workspace and needs a login', async () => {
    const { task } = await team();
    const stranger = await registerUser();

    expect((await post(stranger.token, task._id)).status).toBe(404);
    expect((await http().post(taskCommentsUrl(task._id)).send({ text: 'hi' })).status).toBe(401);
    expect((await post(stranger.token, 'nope')).status).toBe(400);
  });
});

describe('GET /tasks/:id/comments', () => {
  it('lists the conversation oldest first, with paging', async () => {
    const { member, other, task } = await team();
    await makeComment(member.token, task._id, 'first');
    await makeComment(other.token, task._id, 'second');
    await makeComment(member.token, task._id, 'third');

    const res = await list(other.token, task._id);
    expect(res.status).toBe(200);
    expect(res.body.data.comments.map((c) => c.text)).toEqual(['first', 'second', 'third']);
    expect(res.body.data).toMatchObject({ total: 3, page: 1, limit: 50 });

    const page2 = await list(other.token, task._id, '?limit=2&page=2');
    expect(page2.body.data.comments.map((c) => c.text)).toEqual(['third']);
    expect(page2.body.data.total).toBe(3);
  });

  it("computes canEdit and canDelete for the person asking", async () => {
    const { member, other, admin, task } = await team();
    await makeComment(member.token, task._id, 'mine');

    const own = (await list(member.token, task._id)).body.data.comments[0];
    expect(own).toMatchObject({ canEdit: true, canDelete: true });

    const someoneElse = (await list(other.token, task._id)).body.data.comments[0];
    expect(someoneElse).toMatchObject({ canEdit: false, canDelete: false });

    const moderator = (await list(admin.token, task._id)).body.data.comments[0];
    expect(moderator).toMatchObject({ canEdit: false, canDelete: true });
  });

  it("only shows a task's own comments, and hides them from other workspaces", async () => {
    const { member, task, project } = await team();
    const second = await makeTask(member.token, project._id);
    await makeComment(member.token, task._id, 'on the first');
    await makeComment(member.token, second._id, 'on the second');

    const res = await list(member.token, task._id);
    expect(res.body.data.comments.map((c) => c.text)).toEqual(['on the first']);

    const stranger = await registerUser();
    expect((await list(stranger.token, task._id)).status).toBe(404);
  });
});

describe('PATCH /comments/:id', () => {
  it('lets the author edit and marks the comment as edited', async () => {
    const { member, task } = await team();
    const comment = await makeComment(member.token, task._id, 'typo');

    const res = await edit(member.token, comment._id, { text: ' fixed ' });

    expect(res.status).toBe(200);
    expect(res.body.data.comment).toMatchObject({ text: 'fixed' });
    expect(res.body.data.comment.editedAt).not.toBeNull();
  });

  it('does not let anyone else edit it, not even an admin or the owner', async () => {
    const { member, other, admin, owner, task } = await team();
    const comment = await makeComment(member.token, task._id, 'mine');

    for (const who of [other, admin, owner]) {
      expect((await edit(who.token, comment._id, { text: 'hijacked' })).status).toBe(403);
    }
    expect((await Comment.findById(comment._id)).text).toBe('mine');
  });

  it('validates the text and hides the comment from outsiders', async () => {
    const { member, task } = await team();
    const comment = await makeComment(member.token, task._id, 'mine');
    const stranger = await registerUser();

    expect((await edit(member.token, comment._id, { text: '' })).status).toBe(400);
    expect((await edit(stranger.token, comment._id, { text: 'x' })).status).toBe(404);
  });
});

describe('DELETE /comments/:id', () => {
  it('lets the author delete their own comment', async () => {
    const { member, task } = await team();
    const comment = await makeComment(member.token, task._id, 'oops');

    expect((await remove(member.token, comment._id)).status).toBe(200);
    expect(await Comment.countDocuments()).toBe(0);
  });

  it("lets a workspace admin and the owner delete anyone's comment, but not another member", async () => {
    const { member, other, admin, owner, task } = await team();

    const a = await makeComment(member.token, task._id, 'a');
    const b = await makeComment(member.token, task._id, 'b');
    const c = await makeComment(member.token, task._id, 'c');

    expect((await remove(other.token, a._id)).status).toBe(403);
    expect((await remove(admin.token, a._id)).status).toBe(200);
    expect((await remove(owner.token, b._id)).status).toBe(200);
    expect(await Comment.countDocuments()).toBe(1);
    expect(c).toBeDefined();
  });

  it('answers 404 for a missing comment and for outsiders', async () => {
    const { member, task } = await team();
    const comment = await makeComment(member.token, task._id, 'a');
    const stranger = await registerUser();

    expect((await remove(stranger.token, comment._id)).status).toBe(404);
    await remove(member.token, comment._id);
    expect((await remove(member.token, comment._id)).status).toBe(404);
  });
});

describe('clean-up when other things change', () => {
  it('deleting a task deletes its comments, and only its comments', async () => {
    const { member, task, project } = await team();
    const keep = await makeTask(member.token, project._id);
    await makeComment(member.token, task._id, 'goes');
    await makeComment(member.token, keep._id, 'stays');

    expect((await http().delete(`${BASE}/tasks/${task._id}`).set(authed(member.token))).status).toBe(200);

    const left = await Comment.find();
    expect(left.map((c) => c.text)).toEqual(['stays']);
  });

  it("deleting a project deletes every comment on its tasks", async () => {
    const { member, task, project, workspace } = await team();
    const otherProject = await createProject(member.token, workspace._id, { name: 'Other' });
    const otherTask = await makeTask(member.token, otherProject._id);
    await makeComment(member.token, task._id, 'goes');
    await makeComment(member.token, otherTask._id, 'stays');

    expect((await http().delete(`${BASE}/projects/${project._id}`).set(authed(member.token))).status).toBe(200);

    expect(await Task.countDocuments()).toBe(1);
    expect((await Comment.find()).map((c) => c.text)).toEqual(['stays']);
  });

  it("deleting the workspace deletes its comments", async () => {
    const { owner, member, task, workspace } = await team();
    await makeComment(member.token, task._id, 'goes');

    const res = await http().delete(`${BASE}/workspaces/${workspace._id}`)
      .set(authed(owner.token))
      .send({ confirmName: workspace.name });
    expect(res.status).toBe(200);
    expect(await Comment.countDocuments()).toBe(0);
  });

  it('keeps comments of a deleted account and shows them without an author', async () => {
    const { member, other, task } = await team();
    await makeComment(other.token, task._id, 'still here');

    const res = await http().delete(`${BASE}/users/me`).set(authed(other.token)).send({ password: other.creds.password });
    expect(res.status).toBe(200);

    const comments = (await list(member.token, task._id)).body.data.comments;
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({ text: 'still here', author: null });
  });
});
