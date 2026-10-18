import request from 'supertest';
import app from '../app.js';
import { outbox } from '../core/utils/sendEmail.js';

export const BASE = '/api/v1';

// A fresh supertest client for the app (no real port is opened).
export const http = () => request(app);

let counter = 0;
export const uniqueEmail = (prefix = 'user') => `${prefix}-${Date.now()}-${counter++}@example.com`;

// "refreshToken=<jwt>" taken from a response's Set-Cookie header, ready to send back as a Cookie header.
export const refreshCookieOf = (res) =>
  res.headers['set-cookie']?.find((cookie) => cookie.startsWith('refreshToken='))?.split(';')[0];

export const authed = (token) => ({ Authorization: `Bearer ${token}` });

// Creates an account through the real endpoint and returns everything a test needs.
export async function registerUser(overrides = {}) {
  const creds = { name: 'Test User', email: uniqueEmail(), password: 'password123', ...overrides };
  const res = await http().post(`${BASE}/auth/register`).send(creds);
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { creds, user: res.body.data.user, token: res.body.data.accessToken, cookie: refreshCookieOf(res) };
}

export const login = (email, password) => http().post(`${BASE}/auth/login`).send({ email, password });

// A real 1x1 PNG.
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

// ---- workspaces ----

// Creates a workspace through the real endpoint; returns the workspace summary.
export async function createWorkspace(token, body = {}) {
  const res = await http().post(`${BASE}/workspaces`).set(authed(token)).send({ name: 'Northwind Labs', ...body });
  if (res.status !== 201) {
    throw new Error(`createWorkspace failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.workspace;
}

// Invitation links are only ever emailed, so tests read them from the in-memory outbox.
export const lastInviteToken = () => outbox.at(-1).text.match(/invites\/([a-f0-9]{64})/)[1];

export const invite = (token, workspaceId, email, role) =>
  http().post(`${BASE}/workspaces/${workspaceId}/invite`).set(authed(token)).send({ email, ...(role && { role }) });

export const acceptInvite = (token, inviteToken) =>
  http().post(`${BASE}/workspaces/invites/accept`).set(authed(token)).send({ token: inviteToken });

// Registers a new user and brings them into the workspace with the given role (inviter must be allowed to).
export async function addMember(workspaceId, inviterToken, role = 'member') {
  const account = await registerUser();
  const sent = await invite(inviterToken, workspaceId, account.creds.email, role);
  if (sent.status !== 201) throw new Error(`invite failed: ${sent.status} ${JSON.stringify(sent.body)}`);

  const inviteToken = lastInviteToken();
  const accepted = await acceptInvite(account.token, inviteToken);
  if (accepted.status !== 200) throw new Error(`accept failed: ${accepted.status} ${JSON.stringify(accepted.body)}`);

  return { ...account, inviteToken };
}
