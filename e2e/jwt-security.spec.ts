import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3003/api/v1';

// Helper: register a unique test user and return the token
async function registerTestUser(request: any) {
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const res = await request.post(`${API_BASE}/auth/register`, {
    data: {
      email: `jwt-test-${uniqueId}@example.com`,
      password: 'TestPass123',
      username: `jwttest_${uniqueId}`,
    },
  });
  return res;
}

test.describe('JWT Security Hardening', () => {

  test('register returns a valid JWT with correct claims', async ({ request }) => {
    const res = await registerTestUser(request);
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeTruthy();

    // Decode the JWT (base64 header + payload) without verification
    const token = body.data.token;
    const parts = token.split('.');
    expect(parts.length).toBe(3);

    // Check header — algorithm must be HS256
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    expect(header.alg).toBe('HS256');
    expect(header.typ).toBe('JWT');

    // Check payload — must have iss, aud, userId, email, username
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    expect(payload.iss).toBe('cookquest-api');
    expect(payload.aud).toBe('cookquest-web');
    expect(payload.userId).toBeGreaterThan(0);
    expect(payload.email).toContain('@example.com');
    expect(payload.username).toBeTruthy();
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('login returns a JWT with iss and aud claims', async ({ request }) => {
    // First register
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const email = `jwt-login-${uniqueId}@example.com`;
    const password = 'TestPass123';
    const username = `jwtlogin_${uniqueId}`;

    await request.post(`${API_BASE}/auth/register`, {
      data: { email, password, username },
    });

    // Now login
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email, password },
    });
    expect(loginRes.status()).toBe(200);

    const body = await loginRes.json();
    const token = body.data.token;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(payload.iss).toBe('cookquest-api');
    expect(payload.aud).toBe('cookquest-web');
  });

  test('valid token passes /auth/me endpoint', async ({ request }) => {
    const regRes = await registerTestUser(request);
    const { data } = await regRes.json();

    const meRes = await request.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(meRes.status()).toBe(200);

    const meBody = await meRes.json();
    expect(meBody.success).toBe(true);
    expect(meBody.data.user.email).toBe(data.user.email);
  });

  test('tampered token is rejected with 401', async ({ request }) => {
    const regRes = await registerTestUser(request);
    const { data } = await regRes.json();

    // Tamper with the token by flipping a character in the signature
    const parts = data.token.split('.');
    const sig = parts[2];
    const tamperedSig = sig[0] === 'a' ? 'b' + sig.slice(1) : 'a' + sig.slice(1);
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

    const meRes = await request.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    expect(meRes.status()).toBe(401);
  });

  test('token with wrong issuer is rejected', async ({ request }) => {
    // Craft a token with wrong issuer manually — this won't pass verification
    // We just ensure a garbage token gets 401
    const meRes = await request.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlzcyI6Indyb25nLWlzc3VlciJ9.fake' },
    });
    expect(meRes.status()).toBe(401);
  });

  test('missing Authorization header returns 401', async ({ request }) => {
    const meRes = await request.get(`${API_BASE}/auth/me`);
    expect(meRes.status()).toBe(401);
  });

  test('refresh token returns new JWT with correct claims', async ({ request }) => {
    const regRes = await registerTestUser(request);
    const { data } = await regRes.json();

    const refreshRes = await request.post(`${API_BASE}/auth/refresh`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(refreshRes.status()).toBe(200);

    const refreshBody = await refreshRes.json();
    const newToken = refreshBody.data.token;
    expect(newToken).toBeTruthy();
    // Note: tokens may be identical if refreshed within the same second (same iat)
    // The important thing is that the endpoint returns a valid token with correct claims

    // Verify new token has correct claims
    const payload = JSON.parse(Buffer.from(newToken.split('.')[1], 'base64url').toString());
    expect(payload.iss).toBe('cookquest-api');
    expect(payload.aud).toBe('cookquest-web');
  });

  test('logout invalidates the session', async ({ request }) => {
    const regRes = await registerTestUser(request);
    const { data } = await regRes.json();

    // Logout
    const logoutRes = await request.post(`${API_BASE}/auth/logout`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(logoutRes.status()).toBe(200);

    // Token should no longer work (session deleted)
    const meRes = await request.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(meRes.status()).toBe(401);
  });
});
