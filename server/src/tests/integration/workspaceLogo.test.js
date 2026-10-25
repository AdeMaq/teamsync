import fs from 'fs';
import path from 'path';
import Workspace from '../../modules/workspaces/workspaces.model.js';
import { logosDir } from '../../config/paths.js';
import { clearTestDb, closeTestDb, connectTestDb } from '../db.js';
import { BASE, PNG, addMember, authed, createWorkspace, http, registerUser } from '../helpers.js';

// Logos are written to the real uploads folder, so every workspace created here is remembered and its
// files are removed after each test, even if a test fails halfway.
const createdWorkspaceIds = new Set();
const makeWorkspace = async (token, body) => {
  const workspace = await createWorkspace(token, body);
  createdWorkspaceIds.add(workspace._id);
  return workspace;
};

const logoFilesOf = (workspaceId) =>
  fs.existsSync(logosDir) ? fs.readdirSync(logosDir).filter((file) => file.startsWith(`${workspaceId}-`)) : [];

const logoFileExists = (url) => fs.existsSync(path.join(logosDir, path.basename(url)));

beforeAll(connectTestDb);
afterEach(async () => {
  for (const id of createdWorkspaceIds) {
    logoFilesOf(id).forEach((file) => fs.unlinkSync(path.join(logosDir, file)));
  }
  createdWorkspaceIds.clear();
  await clearTestDb();
});
afterAll(closeTestDb);

const upload = (token, workspaceId, buffer = PNG, options = { filename: 'logo.png', contentType: 'image/png' }) =>
  http().post(`${BASE}/workspaces/${workspaceId}/logo`).set(authed(token)).attach('logo', buffer, options);

describe('POST /workspaces/:id/logo', () => {
  it('lets the owner upload a real image and serves it', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);

    const res = await upload(owner.token, workspace._id);

    expect(res.status).toBe(200);
    const url = res.body.data.workspace.logo;
    expect(url).toMatch(new RegExp(`^/uploads/logos/${workspace._id}-[a-f0-9]+\\.png$`));
    expect(logoFileExists(url)).toBe(true);
    expect((await Workspace.findById(workspace._id)).logo).toBe(url);

    const served = await http().get(url);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toMatch(/image\/png/);
    expect(served.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('lets an admin upload too', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);
    const admin = await addMember(workspace._id, owner.token, 'admin');

    expect((await upload(admin.token, workspace._id)).status).toBe(200);
  });

  it('refuses a plain member BEFORE any file is written', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);

    const res = await upload(member.token, workspace._id);

    expect(res.status).toBe(403);
    expect(logoFilesOf(workspace._id)).toHaveLength(0);
    expect((await Workspace.findById(workspace._id)).logo).toBe('');
  });

  it('is invisible to non-members (404) and writes nothing', async () => {
    const owner = await registerUser();
    const outsider = await registerUser();
    const workspace = await makeWorkspace(owner.token);

    const res = await upload(outsider.token, workspace._id);

    expect(res.status).toBe(404);
    expect(logoFilesOf(workspace._id)).toHaveLength(0);
  });

  it('rejects a file that claims to be an image but is not, and leaves nothing behind', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);

    const res = await upload(owner.token, workspace._id, Buffer.from('not an image'), {
      filename: 'fake.png',
      contentType: 'image/png',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toEqual({ field: 'logo', message: 'File is not a valid image' });
    expect(logoFilesOf(workspace._id)).toHaveLength(0);
    expect((await Workspace.findById(workspace._id)).logo).toBe('');
  });

  it('rejects other file types and files over 2 MB', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);

    const text = await upload(owner.token, workspace._id, Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(text.status).toBe(400);
    expect(text.body.error.details[0].field).toBe('logo');

    const big = await upload(owner.token, workspace._id, Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024 + 1)]));
    expect(big.status).toBe(400);
    expect(big.body.error.message).toBe('Image must be 2 MB or smaller');
    expect(logoFilesOf(workspace._id)).toHaveLength(0);
  });

  it('asks for a file when none is sent', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);

    const res = await http().post(`${BASE}/workspaces/${workspace._id}/logo`).set(authed(owner.token));

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toBe('Choose an image to upload');
  });

  it('replacing the logo deletes the old file', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);
    const first = (await upload(owner.token, workspace._id)).body.data.workspace.logo;
    const second = (await upload(owner.token, workspace._id)).body.data.workspace.logo;

    expect(second).not.toBe(first);
    expect(logoFileExists(first)).toBe(false);
    expect(logoFileExists(second)).toBe(true);
    expect(logoFilesOf(workspace._id)).toHaveLength(1);
  });

  it('requires a login and a valid workspace id', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);

    const anonymous = await http().post(`${BASE}/workspaces/${workspace._id}/logo`).attach('logo', PNG, { filename: 'l.png', contentType: 'image/png' });
    expect(anonymous.status).toBe(401);

    expect((await upload(owner.token, 'not-an-id')).status).toBe(400);
  });
});

describe('DELETE /workspaces/:id/logo', () => {
  it('clears the logo and deletes the file', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);
    const url = (await upload(owner.token, workspace._id)).body.data.workspace.logo;

    const res = await http().delete(`${BASE}/workspaces/${workspace._id}/logo`).set(authed(owner.token));

    expect(res.status).toBe(200);
    expect(res.body.data.workspace.logo).toBe('');
    expect(logoFileExists(url)).toBe(false);
  });

  it('is refused for a plain member', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);
    const member = await addMember(workspace._id, owner.token);
    const url = (await upload(owner.token, workspace._id)).body.data.workspace.logo;

    const res = await http().delete(`${BASE}/workspaces/${workspace._id}/logo`).set(authed(member.token));

    expect(res.status).toBe(403);
    expect(logoFileExists(url)).toBe(true);
  });
});

describe('logo files are cleaned up with their workspace', () => {
  it('when the workspace is deleted', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token, { name: 'Doomed' });
    const url = (await upload(owner.token, workspace._id)).body.data.workspace.logo;

    await http().delete(`${BASE}/workspaces/${workspace._id}`).set(authed(owner.token)).send({ confirmName: 'Doomed' });

    expect(logoFileExists(url)).toBe(false);
  });

  it("when the last member's account is deleted", async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);
    const url = (await upload(owner.token, workspace._id)).body.data.workspace.logo;

    await http().delete(`${BASE}/users/me`).set(authed(owner.token)).send({ password: owner.creds.password });

    expect(await Workspace.exists({ _id: workspace._id })).toBeNull();
    expect(logoFileExists(url)).toBe(false);
  });

  it('but not when ownership simply passes to someone else', async () => {
    const owner = await registerUser();
    const workspace = await makeWorkspace(owner.token);
    await addMember(workspace._id, owner.token, 'admin');
    const url = (await upload(owner.token, workspace._id)).body.data.workspace.logo;

    await http().delete(`${BASE}/users/me`).set(authed(owner.token)).send({ password: owner.creds.password });

    expect(logoFileExists(url)).toBe(true);
  });
});
