import { test, expect } from '@playwright/test';

const API = 'http://localhost:3003/api/v1';

let adminToken: string;
let adminId: number;
let testPostId: number;

test.describe('Comments API', () => {
  test.beforeAll(async ({ request }) => {
    // Login as admin
    const login = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@cookquest.dev', password: 'Admin123!' },
    });
    expect(login.ok()).toBeTruthy();
    const body = await login.json();
    adminToken = body.data.accessToken;
    adminId = body.data.user.id;

    // Create a test post
    const postRes = await request.post(`${API}/posts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { postType: 'milestone', caption: 'Comments test post' },
    });
    expect(postRes.status()).toBe(201);
    const postBody = await postRes.json();
    testPostId = postBody.data.id;
  });

  // ── Happy paths ──

  test('POST /posts/:postId/comments — creates comment with 201', async ({ request }) => {
    const res = await request.post(`${API}/posts/${testPostId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: 'Nice post!' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      postId: testPostId,
      userId: adminId,
      content: 'Nice post!',
    });
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('username');
    expect(body.data).toHaveProperty('createdAt');
  });

  test('GET /posts/:postId/comments — returns comments sorted ASC', async ({ request }) => {
    // Add a second comment to test ordering
    await request.post(`${API}/posts/${testPostId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: 'Second comment' },
    });

    const res = await request.get(`${API}/posts/${testPostId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(2);

    // Verify ASC ordering (oldest first)
    for (let i = 1; i < body.data.length; i++) {
      const prev = new Date(body.data[i - 1].createdAt).getTime();
      const curr = new Date(body.data[i].createdAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }

    // Verify comment shape
    const comment = body.data[0];
    expect(comment).toHaveProperty('id');
    expect(comment).toHaveProperty('postId');
    expect(comment).toHaveProperty('userId');
    expect(comment).toHaveProperty('username');
    expect(comment).toHaveProperty('content');
    expect(comment).toHaveProperty('createdAt');
  });

  test('DELETE /posts/:postId/comments/:commentId — owner can delete', async ({ request }) => {
    // Create a comment to delete
    const addRes = await request.post(`${API}/posts/${testPostId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: 'To be deleted' },
    });
    expect(addRes.status()).toBe(201);
    const addBody = await addRes.json();
    const commentId = addBody.data.id;

    const delRes = await request.delete(`${API}/posts/${testPostId}/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.ok()).toBeTruthy();
    const delBody = await delRes.json();
    expect(delBody.success).toBe(true);

    // Verify it's gone
    const getRes = await request.get(`${API}/posts/${testPostId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getBody = await getRes.json();
    const ids = getBody.data.map((c: any) => c.id);
    expect(ids).not.toContain(commentId);
  });

  test('comments_count increments/decrements correctly', async ({ request }) => {
    // Get initial count
    const postsRes1 = await request.get(`${API}/users/${adminId}/posts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const posts1 = await postsRes1.json();
    const initialCount = posts1.data.find((p: any) => p.id === testPostId)?.commentsCount ?? 0;

    // Add a comment
    const addRes = await request.post(`${API}/posts/${testPostId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: 'Counting comment' },
    });
    const addBody = await addRes.json();
    const commentId = addBody.data.id;

    // Check count incremented
    const postsRes2 = await request.get(`${API}/users/${adminId}/posts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const posts2 = await postsRes2.json();
    const afterAdd = posts2.data.find((p: any) => p.id === testPostId)?.commentsCount ?? 0;
    expect(afterAdd).toBe(initialCount + 1);

    // Delete the comment
    await request.delete(`${API}/posts/${testPostId}/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Check count decremented
    const postsRes3 = await request.get(`${API}/users/${adminId}/posts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const posts3 = await postsRes3.json();
    const afterDelete = posts3.data.find((p: any) => p.id === testPostId)?.commentsCount ?? 0;
    expect(afterDelete).toBe(initialCount);
  });

  // ── Error cases ──

  test('POST with empty content → 400', async ({ request }) => {
    const res = await request.post(`${API}/posts/${testPostId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST with content > 500 chars → 400', async ({ request }) => {
    const res = await request.post(`${API}/posts/${testPostId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: 'x'.repeat(501) },
    });
    expect(res.status()).toBe(400);
  });

  test('POST on non-existent post → 404', async ({ request }) => {
    const res = await request.post(`${API}/posts/999999/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: 'Ghost post' },
    });
    expect(res.status()).toBe(404);
  });

  test('GET on non-existent post → 404', async ({ request }) => {
    const res = await request.get(`${API}/posts/999999/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(404);
  });

  test('POST without auth → 401', async ({ request }) => {
    const res = await request.post(`${API}/posts/${testPostId}/comments`, {
      data: { content: 'No auth' },
    });
    expect(res.status()).toBe(401);
  });

  test('DELETE non-existent comment → 404', async ({ request }) => {
    const res = await request.delete(`${API}/posts/${testPostId}/comments/999999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(404);
  });

  test('POST with invalid postId → 400', async ({ request }) => {
    const res = await request.post(`${API}/posts/abc/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: 'Invalid post ID' },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Comments UI', () => {
  test.beforeAll(async ({ request }) => {
    // Ensure admin is logged in and has a post with comments
    const login = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@cookquest.dev', password: 'Admin123!' },
    });
    const body = await login.json();
    adminToken = body.data.accessToken;
    adminId = body.data.user.id;
  });

  test('profile page shows comment toggle on posts', async ({ page }) => {
    // Login via UI
    await page.goto('/');
    // If there's a login gate, handle it
    const loginButton = page.getByRole('button', { name: /sign in|log in/i });
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
      await page.fill('input[name="email"]', 'admin@cookquest.dev');
      await page.fill('input[name="password"]', 'Admin123!');
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL('/', { timeout: 5000 }).catch(() => {});
    }

    // Navigate to admin's profile
    await page.goto(`/profile/${adminId}`);
    await page.waitForSelector('text=Recent Activity', { timeout: 5000 });

    // Look for comment toggle button (MessageCircle icon + text)
    const commentButton = page.locator('button', { hasText: /comment|View.*comment/i }).first();
    await expect(commentButton).toBeVisible({ timeout: 5000 });
  });
});
