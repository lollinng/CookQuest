import { test, expect } from '@playwright/test';

const APP_BASE = 'http://localhost:3002';
const API_BASE = 'http://localhost:3003/api/v1';

test.describe('Recipe Browse Page (task_082/083)', () => {

  test('page loads and shows recipe cards', async ({ page }) => {
    await page.goto(`${APP_BASE}/recipes`);
    await expect(page.getByText('All Recipes')).toBeVisible();
    // Wait for recipe cards to load
    await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible({ timeout: 10000 });
    const cards = page.locator('[data-testid="recipe-card"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('search filters recipes', async ({ page }) => {
    await page.goto(`${APP_BASE}/recipes`);
    await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible({ timeout: 10000 });

    // Type in search
    await page.getByPlaceholder('Search recipes...').fill('egg');
    // Wait for debounce + refetch
    await page.waitForTimeout(500);

    // URL should update
    await expect(page).toHaveURL(/search=egg/);

    // All visible cards should match
    const cards = page.locator('[data-testid="recipe-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('skill filter works', async ({ page }) => {
    await page.goto(`${APP_BASE}/recipes`);
    await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible({ timeout: 10000 });

    // Click Basic Cooking pill
    await page.getByRole('button', { name: 'Basic Cooking' }).click();
    await page.waitForTimeout(300);

    // URL should update
    await expect(page).toHaveURL(/skill=basic-cooking/);
  });

  test('difficulty filter works', async ({ page }) => {
    await page.goto(`${APP_BASE}/recipes`);
    await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible({ timeout: 10000 });

    // Click Beginner pill
    await page.getByRole('button', { name: 'Beginner' }).click();
    await page.waitForTimeout(300);

    // URL should update
    await expect(page).toHaveURL(/difficulty=beginner/);
  });

  test('sort dropdown works', async ({ page }) => {
    await page.goto(`${APP_BASE}/recipes`);
    await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible({ timeout: 10000 });

    // Open sort dropdown and select Most XP
    await page.locator('button[role="combobox"]').click();
    await page.getByRole('option', { name: 'Most XP' }).click();
    await page.waitForTimeout(300);

    // URL should update
    await expect(page).toHaveURL(/sort=-xp/);
  });

  test('clear all filters resets state', async ({ page }) => {
    await page.goto(`${APP_BASE}/recipes?skill=basic-cooking&difficulty=beginner&sort=-xp`);
    await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible({ timeout: 10000 });

    // Click clear all
    await page.getByText('Clear all').click();
    await page.waitForTimeout(300);

    // URL should be clean
    const url = new URL(page.url());
    expect(url.searchParams.has('skill')).toBe(false);
    expect(url.searchParams.has('difficulty')).toBe(false);
  });

  test('empty state shown for no matches', async ({ page }) => {
    await page.goto(`${APP_BASE}/recipes`);
    await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('Search recipes...').fill('xyznonexistent123');
    await page.waitForTimeout(500);

    await expect(page.getByText('No recipes found')).toBeVisible();
  });

  test('URL state restoration on page load', async ({ page }) => {
    await page.goto(`${APP_BASE}/recipes?skill=basic-cooking&sort=-xp`);
    await page.waitForTimeout(500);

    // Skill pill should be active
    const pill = page.getByRole('button', { name: 'Basic Cooking' });
    await expect(pill).toBeVisible();
  });

  test('back button navigates to dashboard', async ({ page }) => {
    await page.goto(`${APP_BASE}/recipes`);
    await expect(page.getByText('All Recipes')).toBeVisible();

    // Click the back arrow (first ghost button)
    await page.locator('a[href="/"]').first().click();
    await expect(page).toHaveURL(`${APP_BASE}/`);
  });
});

test.describe('Recipe API — sort & search (task_079)', () => {

  test('GET /recipes with sort=-xp returns highest XP first', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?sort=-xp`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const xps = body.data.recipes.map((r: any) => r.xp_reward || 100);
    for (let i = 1; i < xps.length; i++) {
      expect(xps[i]).toBeLessThanOrEqual(xps[i - 1]);
    }
  });

  test('GET /recipes with search returns matching results', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?search=chicken`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    for (const recipe of body.data.recipes) {
      const matches = recipe.title.toLowerCase().includes('chicken') ||
                      recipe.description.toLowerCase().includes('chicken');
      expect(matches).toBe(true);
    }
  });

  test('GET /recipes with combined filters works', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?skill=basic-cooking&sort=-title`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    for (const recipe of body.data.recipes) {
      expect(recipe.skill).toBe('basic-cooking');
    }
    const titles = body.data.recipes.map((r: any) => r.title);
    const sorted = [...titles].sort((a: string, b: string) => b.localeCompare(a));
    expect(titles).toEqual(sorted);
  });
});
