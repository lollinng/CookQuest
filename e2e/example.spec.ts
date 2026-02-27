import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/CookQuest/);
});

test('displays cooking skills', async ({ page }) => {
  await page.goto('/');

  // Check if the main heading is visible
  await expect(page.locator('h1')).toContainText('CookQuest');
  
  // Check if cooking skills section is visible
  await expect(page.locator('text=Cooking Skills')).toBeVisible();
  
  // Check if skill cards are present
  await expect(page.locator('text=Basic Cooking')).toBeVisible();
});

test('cooking tip is displayed', async ({ page }) => {
  await page.goto('/');

  // Check if cooking tip section is visible
  await expect(page.locator('text=Today\'s Cooking Tip')).toBeVisible();
  
  // Wait for the tip to load (after hydration)
  await page.waitForTimeout(1000);
  
  // Check that a cooking tip is displayed (not just "Loading cooking tip...")
  const tipContent = page.locator('[data-testid="cooking-tip-content"]').or(
    page.locator('text="Salt enhances flavor"').or(
      page.locator('text="Always taste as you go"')
    )
  );
  
  await expect(tipContent.first()).toBeVisible();
});