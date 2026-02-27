import { test, expect } from '@playwright/test';

test.describe('Air Fryer Skill Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/skill/air-fryer');
  });

  test('displays Air Fryer Mastery heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Air Fryer Mastery');
  });

  test('displays the air fryer icon', async ({ page }) => {
    await expect(page.locator('text=🍟').first()).toBeVisible();
  });

  test('displays learn tags for air fryer', async ({ page }) => {
    await expect(page.locator('text=Temperature settings')).toBeVisible();
    await expect(page.locator('text=Basket arrangement')).toBeVisible();
    await expect(page.locator('text=Preheating')).toBeVisible();
  });

  test('displays air fryer recipes in learning path', async ({ page }) => {
    await expect(page.locator('text=Crispy Air Fryer Fries')).toBeVisible();
    await expect(page.locator('text=Air Fryer Chicken Wings')).toBeVisible();
    await expect(page.locator('text=Air Fryer Glazed Salmon')).toBeVisible();
  });

  test('has back button that links to dashboard', async ({ page }) => {
    const backLink = page.locator('a[href="/"]').first();
    await expect(backLink).toBeVisible();
  });

  test('does not show Skill not found', async ({ page }) => {
    await expect(page.locator('text=Skill not found')).not.toBeVisible();
  });
});

test.describe('Dashboard shows Air Fryer skill', () => {
  test('Air Fryer Mastery appears in Cooking Skills section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Air Fryer Mastery')).toBeVisible();
  });
});
