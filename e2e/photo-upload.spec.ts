import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const API_BASE = 'http://localhost:3003/api/v1';

// Helper: register + login, return session token
async function getAuthToken(request: any): Promise<{ token: string; userId: number }> {
  const email = `phototest-${Date.now()}@test.com`;
  const regRes = await request.post(`${API_BASE}/auth/register`, {
    data: { email, username: `phototest${Date.now()}`, password: 'TestPass123' },
  });
  expect(regRes.ok()).toBeTruthy();
  const regJson = await regRes.json();
  return { token: regJson.data.token, userId: regJson.data.user.id };
}

// Create a minimal valid JPEG buffer (1x1 pixel)
function createTestJpeg(): Buffer {
  // Minimal valid JPEG: SOI + APP0 + DQT + SOF0 + DHT + SOS + EOI
  // Simpler: use a known minimal JPEG hex
  const hex =
    'ffd8ffe000104a46494600010100000100010000' +
    'ffdb004300080606070605080707070909080a0c' +
    '140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c' +
    '20242e2720222c231c1c2837292c30313434341f' +
    '27393d38323c2e333432ffc0000b080001000101' +
    '011100ffc4001f00000105010101010101000000' +
    '00000000000102030405060708090a0bffc400b5' +
    '1000020103030204030505040400000001770001' +
    '0203110400052112314106135161072271143281' +
    '91a1082342b1c11552d1f02433627282090a1617' +
    '18191a25262728292a3435363738393a43444546' +
    '4748494a535455565758595a636465666768696a' +
    '737475767778797a838485868788898a92939495' +
    '969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7' +
    'b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9' +
    'dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9' +
    'faffda00080101000003f400fbdbd300ffd9';
  return Buffer.from(hex, 'hex');
}

test.describe('Photo Upload & Proxy Serving', () => {
  test('API: upload photo and serve via proxy endpoint', async ({ request }) => {
    const { token } = await getAuthToken(request);

    // Create a test JPEG file
    const jpegBuffer = createTestJpeg();
    const tmpPath = path.join('/tmp', `test-photo-${Date.now()}.jpg`);
    fs.writeFileSync(tmpPath, jpegBuffer);

    try {
      // Upload photo for boiled-egg recipe
      const uploadRes = await request.post(`${API_BASE}/recipes/boiled-egg/photos`, {
        headers: { Authorization: `Bearer ${token}` },
        multipart: {
          photo: {
            name: 'test.jpg',
            mimeType: 'image/jpeg',
            buffer: jpegBuffer,
          },
        },
      });

      expect(uploadRes.ok()).toBeTruthy();
      const uploadJson = await uploadRes.json();
      expect(uploadJson.success).toBe(true);
      expect(uploadJson.data.recipe_id).toBe('boiled-egg');

      const photoUrl = uploadJson.data.photo_url;

      // Verify the URL is a proxy URL (not a direct GCS URL)
      expect(photoUrl).toContain('/api/v1/photos/');
      expect(photoUrl).not.toContain('storage.googleapis.com');

      // Extract the filename from the proxy URL (may or may not have r- prefix depending on Sharp availability)
      const filename = photoUrl.split('/photos/').pop();
      expect(filename).toMatch(/^(r-)?[a-f0-9-]+\.jpg$/);

      // Fetch photo via proxy endpoint (no auth needed)
      const proxyRes = await request.get(`${API_BASE}/photos/${filename}`);
      expect(proxyRes.ok()).toBeTruthy();
      expect(proxyRes.headers()['content-type']).toBe('image/jpeg');
      expect(proxyRes.headers()['cache-control']).toContain('max-age=31536000');

      const body = await proxyRes.body();
      expect(body.length).toBeGreaterThan(0);

      // Verify GET /users/me/photos returns the proxy URL
      const listRes = await request.get(`${API_BASE}/users/me/photos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(listRes.ok()).toBeTruthy();
      const listJson = await listRes.json();
      const photos = listJson.data.photos;
      expect(photos.length).toBeGreaterThan(0);

      const boiledEggPhoto = photos.find((p: any) => p.recipe_id === 'boiled-egg');
      expect(boiledEggPhoto).toBeTruthy();
      expect(boiledEggPhoto.photo_url).toContain('/api/v1/photos/');
      expect(boiledEggPhoto.photo_url).not.toContain('storage.googleapis.com');
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });

  test('API: proxy returns 404 for non-existent photo', async ({ request }) => {
    const res = await request.get(`${API_BASE}/photos/r-00000000-0000-0000-0000-000000000000.jpg`);
    expect(res.status()).toBe(404);
  });

  test('API: proxy rejects invalid filenames (path traversal)', async ({ request }) => {
    // Browsers/HTTP clients normalize ../.. in URLs, so the path won't reach our endpoint.
    // Instead test with encoded traversal attempt that bypasses URL normalization.
    const res = await request.get(`${API_BASE}/photos/..%2F..%2Fetc%2Fpasswd`);
    // Should be 400 (invalid filename) or 404 (route not found) — never 200
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('API: proxy rejects filenames without valid extension', async ({ request }) => {
    const res = await request.get(`${API_BASE}/photos/r-abc123.exe`);
    expect(res.status()).toBe(400);
  });

  test('API: upload requires authentication', async ({ request }) => {
    const res = await request.post(`${API_BASE}/recipes/boiled-egg/photos`, {
      multipart: {
        photo: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: createTestJpeg(),
        },
      },
    });
    expect(res.status()).toBe(401);
  });

  test('API: delete photo and verify proxy returns 404', async ({ request }) => {
    const { token } = await getAuthToken(request);

    // Upload
    const uploadRes = await request.post(`${API_BASE}/recipes/boiled-egg/photos`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        photo: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: createTestJpeg(),
        },
      },
    });
    expect(uploadRes.ok()).toBeTruthy();
    const { data } = await uploadRes.json();
    const filename = data.photo_url.split('/photos/').pop();

    // Delete
    const delRes = await request.delete(`${API_BASE}/recipes/boiled-egg/photos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status()).toBe(204);

    // Proxy should now return 404
    const proxyRes = await request.get(`${API_BASE}/photos/${filename}`);
    expect(proxyRes.status()).toBe(404);
  });
});
