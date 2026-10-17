import request from 'supertest';
import app from '../app.js';

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
