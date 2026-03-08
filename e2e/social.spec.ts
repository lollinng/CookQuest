import { test, expect } from '@playwright/test';

const API = 'http://localhost:3003/api/v1';

interface TestUser {
  token: string;
  id: number;
  username: string;
}

async function registerUser(request: any, prefix: string): Promise<TestUser> {
  const ts = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const username = `${prefix}_${ts}`;
  const res = await request.post(`${API}/auth/register`, {
    data: {
      email: `${username}@test.com`,
      username,
      password: 'TestPass123!',
    },
  });
  expect(res.ok(), `Register ${prefix} failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return {
    token: body.data.token || body.data.accessToken,
    id: body.data.user.id,
    username,
  };
}

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

test.describe('Social Features — Full E2E (task_109)', () => {
  let userA: TestUser;
  let userB: TestUser;

  test.beforeAll(async ({ request }) => {
    userA = await registerUser(request, 'social_a');
    userB = await registerUser(request, 'social_b');
  });

  // ── Follow / Unfollow ──

  test('User A follows User B → 200', async ({ request }) => {
    const res = await request.post(`${API}/users/${userB.id}/follow`, {
      headers: auth(userA),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.following).toBe(true);
  });

  test('User A follows User B again → 409 conflict', async ({ request }) => {
    const res = await request.post(`${API}/users/${userB.id}/follow`, {
      headers: auth(userA),
    });
    expect(res.status()).toBe(409);
  });

  test('User A self-follow → 400', async ({ request }) => {
    const res = await request.post(`${API}/users/${userA.id}/follow`, {
      headers: auth(userA),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('yourself');
  });

  test('Follow nonexistent user → 404', async ({ request }) => {
    const res = await request.post(`${API}/users/999999/follow`, {
      headers: auth(userA),
    });
    expect(res.status()).toBe(404);
  });

  test('GET /users/:id/followers — B has A as follower', async ({ request }) => {
    const res = await request.get(`${API}/users/${userB.id}/followers`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const followerIds = body.data.map((u: any) => u.id);
    expect(followerIds).toContain(userA.id);
  });

  test('GET /users/:id/following — A is following B', async ({ request }) => {
    const res = await request.get(`${API}/users/${userA.id}/following`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const followingIds = body.data.map((u: any) => u.id);
    expect(followingIds).toContain(userB.id);
  });

  test('GET /users/:id/followers with auth — includes isFollowing flag', async ({ request }) => {
    const res = await request.get(`${API}/users/${userB.id}/followers`, {
      headers: auth(userA),
    });
    const body = await res.json();
    expect(body.data[0]).toHaveProperty('isFollowing');
  });

  // ── User Profile ──

  test('GET /users/:id — returns profile with follow counts', async ({ request }) => {
    const res = await request.get(`${API}/users/${userB.id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.username).toBe(userB.username);
    expect(body.data.followersCount).toBeGreaterThanOrEqual(1);
    expect(body.data).toHaveProperty('followingCount');
    expect(body.data).toHaveProperty('totalRecipesCompleted');
  });

  test('GET /users/:id — with auth shows isFollowing', async ({ request }) => {
    const res = await request.get(`${API}/users/${userB.id}`, {
      headers: auth(userA),
    });
    const body = await res.json();
    expect(body.data.isFollowing).toBe(true);
  });

  test('GET /users/999999 — 404', async ({ request }) => {
    const res = await request.get(`${API}/users/999999`);
    expect(res.status()).toBe(404);
  });

  // ── User Search ──

  test('GET /users/search?q=social_b — finds User B', async ({ request }) => {
    const res = await request.get(`${API}/users/search?q=${userB.username.slice(0, 8)}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const ids = body.data.map((u: any) => u.id);
    expect(ids).toContain(userB.id);
  });

  test('GET /users/search?q=zzz_nonexistent_zzz — empty', async ({ request }) => {
    const res = await request.get(`${API}/users/search?q=zzz_nonexistent_zzz`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  test('GET /users/search — no query → 400', async ({ request }) => {
    const res = await request.get(`${API}/users/search`);
    expect(res.status()).toBe(400);
  });

  // ── Feed ──

  test('User B creates a post → appears in A feed', async ({ request }) => {
    // B creates a post
    const postRes = await request.post(`${API}/posts`, {
      headers: auth(userB),
      data: { postType: 'milestone', caption: 'Hello from B!' },
    });
    expect(postRes.status()).toBe(201);

    // A's feed should include B's post (A follows B)
    const feedRes = await request.get(`${API}/feed`, {
      headers: auth(userA),
    });
    expect(feedRes.ok()).toBeTruthy();
    const body = await feedRes.json();
    const bPosts = body.data.filter((p: any) => p.userId === userB.id);
    expect(bPosts.length).toBeGreaterThanOrEqual(1);
    expect(bPosts[0].caption).toBe('Hello from B!');
  });

  test('User B feed is empty (B follows nobody)', async ({ request }) => {
    const res = await request.get(`${API}/feed`, {
      headers: auth(userB),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  test('GET /feed without auth → 401', async ({ request }) => {
    const res = await request.get(`${API}/feed`);
    expect(res.status()).toBe(401);
  });

  // ── User Posts ──

  test('GET /users/:id/posts — B has posts', async ({ request }) => {
    const res = await request.get(`${API}/users/${userB.id}/posts`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const post = body.data[0];
    expect(post).toHaveProperty('userId');
    expect(post).toHaveProperty('username');
    expect(post).toHaveProperty('postType');
    expect(post).toHaveProperty('createdAt');
  });

  // ── Auto-post on recipe completion ──

  test('Recipe completion creates auto-post', async ({ request }) => {
    // B completes a recipe
    await request.post(`${API}/recipes/boiled-egg/progress`, {
      headers: auth(userB),
      data: { completed: true },
    });

    // B's posts should include a recipe_completed post
    const postsRes = await request.get(`${API}/users/${userB.id}/posts`);
    const body = await postsRes.json();
    const completionPost = body.data.find(
      (p: any) => p.postType === 'recipe_completed' && p.recipeId === 'boiled-egg'
    );
    expect(completionPost).toBeTruthy();
    expect(completionPost.caption).toContain('Boiled');

    // A's feed should also have it
    const feedRes = await request.get(`${API}/feed`, {
      headers: auth(userA),
    });
    const feedBody = await feedRes.json();
    const feedPost = feedBody.data.find(
      (p: any) => p.postType === 'recipe_completed' && p.recipeId === 'boiled-egg'
    );
    expect(feedPost).toBeTruthy();
  });

  // ── Unfollow ──

  test('User A unfollows User B → 200', async ({ request }) => {
    const res = await request.delete(`${API}/users/${userB.id}/follow`, {
      headers: auth(userA),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.following).toBe(false);
  });

  test('After unfollow — B followers is empty', async ({ request }) => {
    const res = await request.get(`${API}/users/${userB.id}/followers`);
    const body = await res.json();
    const followerIds = body.data.map((u: any) => u.id);
    expect(followerIds).not.toContain(userA.id);
  });

  test('After unfollow — A feed is empty', async ({ request }) => {
    const res = await request.get(`${API}/feed`, {
      headers: auth(userA),
    });
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  test('Unfollow when not following → 404', async ({ request }) => {
    const res = await request.delete(`${API}/users/${userB.id}/follow`, {
      headers: auth(userA),
    });
    expect(res.status()).toBe(404);
  });
});
