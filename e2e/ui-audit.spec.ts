import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('UI Audit - Full App Screenshot Review', () => {

  test('01 - Dashboard full page (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/01-dashboard-desktop.png', fullPage: true });
  });

  test('02 - Dashboard (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/02-dashboard-mobile.png', fullPage: true });
  });

  test('03 - Dashboard (tablet)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/03-dashboard-tablet.png', fullPage: true });
  });

  test('04 - Hover states on skill cards', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Try to hover on a skill card
    const skillCard = page.locator('[class*="skill"], [data-testid*="skill"]').first();
    if (await skillCard.isVisible()) {
      await skillCard.hover();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'e2e/screenshots/04-hover-skill-card.png', fullPage: false });
  });

  test('05 - Click into first skill learning path', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Find and click a skill card link
    const skillLink = page.locator('a[href*="/skill/"]').first();
    if (await skillLink.isVisible()) {
      await skillLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: 'e2e/screenshots/05-skill-learning-path.png', fullPage: true });
  });

  test('06 - Click into a recipe detail page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // First go to a skill page
    const skillLink = page.locator('a[href*="/skill/"]').first();
    if (await skillLink.isVisible()) {
      await skillLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    }

    // Then find a recipe link
    const recipeLink = page.locator('a[href*="/recipe/"]').first();
    if (await recipeLink.isVisible()) {
      await recipeLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: 'e2e/screenshots/06-recipe-detail.png', fullPage: true });
  });

  test('07 - Recipe detail (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const skillLink = page.locator('a[href*="/skill/"]').first();
    if (await skillLink.isVisible()) {
      await skillLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    }

    const recipeLink = page.locator('a[href*="/recipe/"]').first();
    if (await recipeLink.isVisible()) {
      await recipeLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: 'e2e/screenshots/07-recipe-detail-mobile.png', fullPage: true });
  });

  test('08 - Auth dialog', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Look for sign in / login button
    const authButton = page.locator('button').filter({ hasText: /sign in|login|log in|register/i }).first();
    if (await authButton.isVisible()) {
      await authButton.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'e2e/screenshots/08-auth-dialog.png', fullPage: false });
  });

  test('09 - Learning path (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const skillLink = page.locator('a[href*="/skill/"]').first();
    if (await skillLink.isVisible()) {
      await skillLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: 'e2e/screenshots/09-learning-path-mobile.png', fullPage: true });
  });

  test('10 - Dark mode check', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Try to toggle dark mode
    const themeToggle = page.locator('button').filter({ hasText: /theme|dark|light|mode/i }).first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(1000);
    } else {
      // Try clicking sun/moon icons
      const iconToggle = page.locator('[class*="theme"], [data-testid*="theme"], button:has(svg)').first();
      if (await iconToggle.isVisible()) {
        // Just capture current state
      }
    }
    await page.screenshot({ path: 'e2e/screenshots/10-theme-state.png', fullPage: true });
  });

  test('11 - Cooking tip section detail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Scroll to cooking tip area
    const tipSection = page.locator('text=Cooking Tip').first();
    if (await tipSection.isVisible()) {
      await tipSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'e2e/screenshots/11-cooking-tip.png', fullPage: false });
  });

  test('12 - Overall progress section', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for progress related elements
    const progressSection = page.locator('text=Progress').first();
    if (await progressSection.isVisible()) {
      await progressSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'e2e/screenshots/12-progress-section.png', fullPage: false });
  });

  test('13 - All interactive elements audit', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Gather all buttons and links for accessibility audit
    const buttons = await page.locator('button').all();
    const links = await page.locator('a').all();

    const auditData = {
      totalButtons: buttons.length,
      totalLinks: links.length,
      buttonTexts: [] as string[],
      linkTexts: [] as string[],
      linkHrefs: [] as string[],
    };

    for (const btn of buttons.slice(0, 20)) {
      const text = await btn.textContent();
      auditData.buttonTexts.push(text?.trim() || '(no text)');
    }

    for (const link of links.slice(0, 20)) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      auditData.linkTexts.push(text?.trim() || '(no text)');
      auditData.linkHrefs.push(href || '(no href)');
    }

    // Write audit data to a file
    // write audit data
    fs.writeFileSync('e2e/screenshots/audit-data.json', JSON.stringify(auditData, null, 2));

    await page.screenshot({ path: 'e2e/screenshots/13-interactive-elements.png', fullPage: true });
  });

  test('14 - Page accessibility check', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Check for common accessibility issues
    const accessibilityReport = {
      imagesWithoutAlt: 0,
      buttonsWithoutLabel: 0,
      linksWithoutText: 0,
      formInputsWithoutLabel: 0,
      headingHierarchy: [] as string[],
    };

    // Images without alt
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (!alt) accessibilityReport.imagesWithoutAlt++;
    }

    // Buttons without accessible name
    const btns = await page.locator('button').all();
    for (const btn of btns) {
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      if (!text?.trim() && !ariaLabel) accessibilityReport.buttonsWithoutLabel++;
    }

    // Heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    for (const h of headings) {
      const tag = await h.evaluate(el => el.tagName);
      const text = await h.textContent();
      accessibilityReport.headingHierarchy.push(`${tag}: ${text?.trim()}`);
    }

    // write audit data
    fs.writeFileSync('e2e/screenshots/accessibility-report.json', JSON.stringify(accessibilityReport, null, 2));
  });
});
