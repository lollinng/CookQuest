import { test, expect } from '@playwright/test';

test.describe('Dark Palette - Recipe Cards & Skill Cards (task_077)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('recipe cards have dark surface background', async ({ page }) => {
    const recipeCards = page.locator('[data-testid="recipe-card"]');
    const count = await recipeCards.count();
    expect(count).toBeGreaterThan(0);

    const firstCard = recipeCards.first();
    const bg = await firstCard.evaluate((el) => getComputedStyle(el).backgroundColor);

    // bg-cq-surface → #111827 → rgb(17, 24, 39)
    expect(bg).toBe('rgb(17, 24, 39)');
  });

  test('recipe card title is near-white', async ({ page }) => {
    const title = page.locator('[data-testid="recipe-card"] h3').first();
    const color = await title.evaluate((el) => getComputedStyle(el).color);

    // text-cq-text-primary → #F9FAFB → rgb(249, 250, 251)
    expect(color).toBe('rgb(249, 250, 251)');
  });

  test('skill cards have dark surface background', async ({ page }) => {
    const skillCards = page.locator('[data-testid="skill-card"]');
    const count = await skillCards.count();
    expect(count).toBeGreaterThan(0);

    const firstCard = skillCards.first();
    const bg = await firstCard.evaluate((el) => getComputedStyle(el).backgroundColor);

    // bg-cq-surface → #111827 → rgb(17, 24, 39)
    expect(bg).toBe('rgb(17, 24, 39)');
  });

  test('skill card has colored gradient bar at top', async ({ page }) => {
    const gradientBar = page.locator('[data-testid="skill-card"] .bg-gradient-to-r').first();
    await expect(gradientBar).toBeVisible();

    const height = await gradientBar.evaluate((el) => {
      return parseInt(getComputedStyle(el).height);
    });
    expect(height).toBeGreaterThan(0);
  });

  test('XP badge is readable on dark background', async ({ page }) => {
    const xpBadge = page.locator('[data-testid="recipe-card"] .text-orange-400').first();
    if (await xpBadge.isVisible().catch(() => false)) {
      const color = await xpBadge.evaluate((el) => getComputedStyle(el).color);
      // text-orange-400 → rgb(251, 146, 60)
      expect(color).toBe('rgb(251, 146, 60)');
    }
  });

  test('no white backgrounds on any card', async ({ page }) => {
    const allCards = page.locator('[data-testid="recipe-card"], [data-testid="skill-card"]');
    const count = await allCards.count();

    for (let i = 0; i < count; i++) {
      const card = allCards.nth(i);
      const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
      // None should be white
      expect(bg).not.toBe('rgb(255, 255, 255)');
    }
  });

  test('screenshot - dark cards on dashboard', async ({ page }) => {
    await page.screenshot({
      path: 'e2e/screenshots/dark-cards-dashboard.png',
      fullPage: true,
    });
  });
});
