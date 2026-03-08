import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3003/api/v1';
const APP_BASE = 'http://localhost:3000';

test.describe('Top Navigation Bar (task_101)', () => {

  test('navbar is visible on the home page', async ({ page }) => {
    await page.goto(APP_BASE);
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="top-nav"]');
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('navbar contains CookQuest branding', async ({ page }) => {
    await page.goto(APP_BASE);
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="top-nav"]');
    await expect(nav.getByText('CookQuest')).toBeVisible();
  });

  test('navbar has Recipes link that navigates to /recipes', async ({ page }) => {
    await page.goto(APP_BASE);
    await page.waitForLoadState('networkidle');
    const recipesLink = page.locator('[data-testid="top-nav"] a[href="/recipes"]');
    await expect(recipesLink).toBeVisible();
    await recipesLink.click();
    await expect(page).toHaveURL(/\/recipes/);
  });

  test('navbar is visible on skill page too', async ({ page }) => {
    await page.goto(`${APP_BASE}/skill/basic-cooking`);
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="top-nav"]');
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('navbar is visible on recipe page too', async ({ page }) => {
    await page.goto(`${APP_BASE}/recipe/boiled-egg`);
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="top-nav"]');
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('navbar is sticky (stays on top after scroll)', async ({ page }) => {
    await page.goto(APP_BASE);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(300);

    const nav = page.locator('[data-testid="top-nav"]');
    await expect(nav).toBeVisible();

    // Check it's stuck at top
    const navBox = await nav.boundingBox();
    expect(navBox).toBeTruthy();
    expect(navBox!.y).toBeLessThanOrEqual(5); // should be near top of viewport
  });

  test('navbar has favorites heart icon', async ({ page }) => {
    await page.goto(APP_BASE);
    await page.waitForLoadState('networkidle');
    const heartLink = page.locator('[data-testid="nav-favorites-link"]');
    await expect(heartLink).toBeVisible();
  });

  test('navbar favorites link navigates to /favorites', async ({ page }) => {
    await page.goto(APP_BASE);
    await page.waitForLoadState('networkidle');
    const heartLink = page.locator('[data-testid="nav-favorites-link"]');
    await heartLink.click();
    await expect(page).toHaveURL(/\/favorites/);
  });

  test('navbar shows auth button for anonymous users', async ({ page }) => {
    await page.goto(APP_BASE);
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="top-nav"]');
    // Should have either a Sign In button or avatar menu
    const authElement = nav.locator('button').last();
    await expect(authElement).toBeVisible();
  });
});
