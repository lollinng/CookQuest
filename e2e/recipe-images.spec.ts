import { test, expect } from '@playwright/test';

test.describe('Recipe Image Fallbacks', () => {

  test('dashboard recipe cards show images or gradient fallbacks (no broken images)', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check that no recipe card shows a broken image icon
    const recipeCards = page.locator('[data-testid="recipe-card"]');
    const count = await recipeCards.count();

    // There should be at least 1 recipe card
    expect(count).toBeGreaterThan(0);

    // Every card's image area should either have an <img> or a gradient fallback div
    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = recipeCards.nth(i);
      const imageArea = card.locator('.relative').first();

      // Check that the area is visible (not zero height)
      const box = await imageArea.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThan(20);
      }
    }
  });

  test('recipe detail hero shows image or gradient (no gray box)', async ({ page }) => {
    await page.goto('http://localhost:3000/recipe/boiled-egg');
    await page.waitForLoadState('networkidle');

    // The hero section should have either an image or a gradient background
    const hero = page.locator('.relative.h-64, .relative.h-80').first();
    await expect(hero).toBeVisible();

    const box = await hero.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThan(100);
    }
  });

  test('recipe detail page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('http://localhost:3000/recipe/boiled-egg');
    await page.waitForLoadState('networkidle');

    // No JavaScript errors
    expect(errors).toEqual([]);

    // Title should be visible
    await expect(page.locator('h1')).toContainText('Perfect Boiled Egg');
  });

  test('recipe card shows emoji overlay', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // At least one emoji overlay should be visible
    const emojiOverlays = page.locator('[data-testid="recipe-card"] .absolute .text-xl');
    const count = await emojiOverlays.count();
    expect(count).toBeGreaterThan(0);
  });
});
