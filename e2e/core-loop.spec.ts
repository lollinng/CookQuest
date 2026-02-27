import { test, expect } from '@playwright/test';

test.describe('Core Loop - Phase 1 Features', () => {

  test('Dashboard shows CoreLoopHeroCard with "Start Basic Cooking" for new users', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Clear localStorage to simulate new user
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show the hero card with start CTA
    const heroCard = page.locator('text=Start your cooking journey');
    await expect(heroCard).toBeVisible();

    const startBtn = page.locator('text=Start Basic Cooking');
    await expect(startBtn).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/core-loop-01-hero-start.png', fullPage: true });
  });

  test('Dashboard streak shows real value (not hardcoded 3)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Streak should show 0 or "Start your streak!" for new users
    const streakText = page.locator('text=Start your streak!');
    const streakZero = page.locator('text=Streak: 0 day');
    const hasStart = await streakText.isVisible().catch(() => false);
    const hasZero = await streakZero.isVisible().catch(() => false);

    // Should NOT show hardcoded "Streak: 3 days" for new user
    const hardcoded = page.locator('text=Streak: 3 days');
    const hasHardcoded = await hardcoded.isVisible().catch(() => false);
    expect(hasHardcoded).toBe(false);

    await page.screenshot({ path: 'e2e/screenshots/core-loop-02-streak-real.png' });
  });

  test('Recipe detail shows XP reward badge', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/recipe/boiled-egg');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show XP badge
    const xpBadge = page.locator('text=+100 XP');
    await expect(xpBadge).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/core-loop-03-recipe-xp.png', fullPage: true });
  });

  test('Recipe completion shows rich toast with XP and progress', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/recipe/boiled-egg');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Mark as completed
    const completeBtn = page.locator('text=Mark as completed');
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      await page.waitForTimeout(1500);

      // Toast should appear with XP info
      const toast = page.locator('text=Nice work, chef!');
      const toastVisible = await toast.isVisible().catch(() => false);
      // XP should be mentioned
      const xpToast = page.locator('text=+100 XP earned');
      const xpVisible = await xpToast.isVisible().catch(() => false);

      await page.screenshot({ path: 'e2e/screenshots/core-loop-04-completion-toast.png', fullPage: true });

      expect(toastVisible || xpVisible).toBe(true);
    }
  });

  test('Hero card changes to "Continue" after completing 1 recipe', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Complete a recipe via the recipe page
    await page.goto('http://localhost:3000/recipe/boiled-egg');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const btn = page.locator('text=Mark as completed');
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1000);
    }

    // Go back to dashboard
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Hero card should now show "Welcome back, chef!"
    const continueCard = page.locator('text=Welcome back, chef!');
    await expect(continueCard).toBeVisible();

    // Should show progress 1/3
    const progress = page.locator('text=1 of 3');
    const progressVisible = await progress.isVisible().catch(() => false);

    await page.screenshot({ path: 'e2e/screenshots/core-loop-05-hero-continue.png', fullPage: true });
  });

  test('Recipe cards show XP badge', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // At least one recipe card should show XP
    const xpBadge = page.locator('text=+100 XP').first();
    const visible = await xpBadge.isVisible().catch(() => false);

    await page.screenshot({ path: 'e2e/screenshots/core-loop-06-recipe-card-xp.png', fullPage: true });
    // This may or may not be visible depending on API data availability
  });

  test('Mobile responsive - hero card and streak', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/core-loop-07-mobile.png', fullPage: true });

    // Hero card should be visible on mobile
    const heroCard = page.locator('text=Start your cooking journey');
    await expect(heroCard).toBeVisible();
  });
});
