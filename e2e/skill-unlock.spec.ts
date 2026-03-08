import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3003/api/v1';

test.describe('Skill Unlock - Phase 2 Backend', () => {

  test('Skills endpoint returns unlock dependency fields', async ({ request }) => {
    const res = await request.get(`${API_BASE}/skills`);
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body.success).toBe(true);

    const skills = body.data.skills || body.data;
    expect(Array.isArray(skills)).toBe(true);

    // basic-cooking should have no requirements
    const basicCooking = skills.find((s: any) => s.id === 'basic-cooking');
    expect(basicCooking).toBeTruthy();
    expect(basicCooking.required_skill_id).toBeNull();
    expect(basicCooking.required_recipes_completed).toBe(0);

    // heat-control should require basic-cooking with 3 recipes
    const heatControl = skills.find((s: any) => s.id === 'heat-control');
    expect(heatControl).toBeTruthy();
    expect(heatControl.required_skill_id).toBe('basic-cooking');
    expect(heatControl.required_recipes_completed).toBe(3);
  });

  test('Completing 1st basic-cooking recipe returns empty skills_unlocked', async ({ request }) => {
    // Register a fresh test user
    const timestamp = Date.now();
    const registerRes = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: `unlock-test-1-${timestamp}@test.com`,
        username: `unlocktest1_${timestamp}`,
        password: 'TestPassword123!',
      },
    });
    expect(registerRes.ok()).toBe(true);
    const authData = await registerRes.json();
    const token = authData.data?.token || authData.token;
    expect(token).toBeTruthy();

    // Complete 1st basic-cooking recipe
    const completeRes = await request.post(`${API_BASE}/recipes/boiled-egg/progress`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { completed: true },
    });
    expect(completeRes.ok()).toBe(true);

    const completeBody = await completeRes.json();
    // skills_unlocked should be empty or not present
    const unlocked = completeBody.data?.skills_unlocked || [];
    expect(unlocked.length).toBe(0);
  });

  test('Completing 3rd basic-cooking recipe returns 4 unlocked skills', async ({ request }) => {
    // Register a fresh test user
    const timestamp = Date.now();
    const registerRes = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: `unlock-test-3-${timestamp}@test.com`,
        username: `unlocktest3_${timestamp}`,
        password: 'TestPassword123!',
      },
    });
    expect(registerRes.ok()).toBe(true);
    const authData = await registerRes.json();
    const token = authData.data?.token || authData.token;

    const headers = { Authorization: `Bearer ${token}` };

    // Complete 1st recipe
    await request.post(`${API_BASE}/recipes/boiled-egg/progress`, {
      headers,
      data: { completed: true },
    });

    // Complete 2nd recipe
    await request.post(`${API_BASE}/recipes/make-rice/progress`, {
      headers,
      data: { completed: true },
    });

    // Complete 3rd recipe — this should unlock skills
    const thirdRes = await request.post(`${API_BASE}/recipes/chop-onion/progress`, {
      headers,
      data: { completed: true },
    });
    expect(thirdRes.ok()).toBe(true);

    const thirdBody = await thirdRes.json();
    const unlocked = thirdBody.data?.skills_unlocked || [];

    // Should unlock all 4 dependent skills
    expect(unlocked.length).toBe(4);

    const unlockedIds = unlocked.map((s: any) => s.id).sort();
    expect(unlockedIds).toEqual([
      'air-fryer',
      'flavor-building',
      'heat-control',
      'indian-cuisine',
    ]);
  });

  test('Re-completing an already completed recipe does not re-trigger unlock', async ({ request }) => {
    const timestamp = Date.now();
    const registerRes = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: `unlock-test-re-${timestamp}@test.com`,
        username: `unlocktestre_${timestamp}`,
        password: 'TestPassword123!',
      },
    });
    const authData = await registerRes.json();
    const token = authData.data?.token || authData.token;
    const headers = { Authorization: `Bearer ${token}` };

    // Complete all 3 basic-cooking recipes
    await request.post(`${API_BASE}/recipes/boiled-egg/progress`, { headers, data: { completed: true } });
    await request.post(`${API_BASE}/recipes/make-rice/progress`, { headers, data: { completed: true } });
    await request.post(`${API_BASE}/recipes/chop-onion/progress`, { headers, data: { completed: true } });

    // Re-complete the same recipe
    const reRes = await request.post(`${API_BASE}/recipes/boiled-egg/progress`, {
      headers,
      data: { completed: true },
    });
    expect(reRes.ok()).toBe(true);

    const reBody = await reRes.json();
    const unlocked = reBody.data?.skills_unlocked || [];
    // Should not unlock again (already unlocked)
    expect(unlocked.length).toBe(0);
  });

  test('Dashboard shows unlocked skills after Basic Cooking mastery', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Complete all 3 basic-cooking recipes via UI
    const basicRecipes = ['boiled-egg', 'make-rice', 'chop-onion'];
    for (const recipeId of basicRecipes) {
      await page.goto(`http://localhost:3000/recipe/${recipeId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const btn = page.locator('text=Mark as completed');
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Go back to dashboard
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Skills should now be unlocked (not showing "Locked" badges)
    await page.screenshot({ path: 'e2e/screenshots/skill-unlock-01-dashboard.png', fullPage: true });

    // Heat Control should be accessible (not locked)
    const heatControlLink = page.locator('a[href="/skill/heat-control"]');
    const isVisible = await heatControlLink.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });
});
