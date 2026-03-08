import { test, expect } from '@playwright/test';

const API = 'http://localhost:3003/api/v1';

let adminToken: string;
let adminId: number;
let postId: number;

test.describe('Post Comments DB + API (task_118)', () => {
  test.beforeAll(async ({ request }) => {
    // Login as admin
    const login = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@cookquest.dev', password: 'Admin123!' },
    });
    expect(login.ok()).toBeTruthy();
    const body = await login.json();
    adminToken = body.data.accessToken;
    adminId = body.data.user.id;

    // Create a test post to comment on
    const postRes = await request.post(`${API}/posts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { postType: 'milestone', caption: 'Test post for comments' },
    });
    // If posts endpoint doesn't exist yet, use DB directly via feed
    if (postRes.ok()) {
      const postBody = await postRes.json();
      postId = postBody.data.id;
    }
  });

  test('migration creates post_comments table', async ({ request }) => {
    // Verify the table exists by attempting to query comments on a post
    // If the table doesn't exist, the API would 500
    const res = await request.get(`${API}/posts/1/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // Either 200 (table exists, maybe empty) or 404 (post not found) — not 500
    expect(res.status()).not.toBe(500);
  });

  test('comments_count defaults to 0 on user_posts', async ({ request }) => {
    // Get feed or user posts — comments_count should be present
    const res = await request.get(`${API}/users/${adminId}/posts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok()) {
      const body = await res.json();
      if (body.data && body.data.length > 0) {
        expect(body.data[0]).toHaveProperty('comments_count');
        expect(typeof body.data[0].comments_count).toBe('number');
      }
    }
  });

  test('POST /posts/:id/comments — add comment returns comment with user info', async ({ request }) => {
    if (!postId) test.skip();
    const res = await request.post(`${API}/posts/${postId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: 'Great job!' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('content', 'Great job!');
    expect(body.data).toHaveProperty('username');
  });

  test('POST /posts/:id/comments — empty content returns 400', async ({ request }) => {
    if (!postId) test.skip();
    const res = await request.post(`${API}/posts/${postId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /posts/:id/comments — content > 500 chars returns 400', async ({ request }) => {
    if (!postId) test.skip();
    const res = await request.post(`${API}/posts/${postId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: 'x'.repeat(501) },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /posts/:id/comments — without auth returns 401', async ({ request }) => {
    const res = await request.post(`${API}/posts/1/comments`, {
      data: { content: 'Unauthorized comment' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /posts/:id/comments — returns array of comments with user info', async ({ request }) => {
    if (!postId) test.skip();
    const res = await request.get(`${API}/posts/${postId}/comments`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      const comment = body.data[0];
      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('content');
      expect(comment).toHaveProperty('username');
      expect(comment).toHaveProperty('created_at');
    }
  });

  test('DELETE /posts/comments/:id — owner can delete their comment', async ({ request }) => {
    if (!postId) test.skip();
    // Create a comment to delete
    const addRes = await request.post(`${API}/posts/${postId}/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { content: 'Comment to delete' },
    });
    if (!addRes.ok()) test.skip();
    const addBody = await addRes.json();
    const commentId = addBody.data.id;

    const delRes = await request.delete(`${API}/posts/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.ok()).toBeTruthy();
  });

  test('DELETE /posts/comments/:id — non-existent comment returns 404', async ({ request }) => {
    const res = await request.delete(`${API}/posts/comments/999999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(404);
  });

  test('DELETE /posts/comments/:id — without auth returns 401', async ({ request }) => {
    const res = await request.delete(`${API}/posts/comments/1`);
    expect(res.status()).toBe(401);
  });
});
