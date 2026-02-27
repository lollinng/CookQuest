import { test, expect } from '@playwright/test';

test.describe('CookQuest Full App Audit - Round 1', () => {

  test('Homepage loads and capture full screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/audit-homepage-full.png', fullPage: true });

    // Check basic structure
    const title = await page.title();
    console.log('Page title:', title);

    // Log all visible headings
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('Headings found:', headings);

    // Log all visible buttons
    const buttons = await page.locator('button').allTextContents();
    console.log('Buttons found:', buttons);

    // Log all links
    const links = await page.locator('a').evaluateAll(els => els.map(el => ({ text: el.textContent?.trim(), href: el.getAttribute('href') })));
    console.log('Links found:', JSON.stringify(links, null, 2));
  });

  test('Check all navigation and interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for clickable cards/elements
    const clickables = await page.locator('[role="button"], button, a, [onclick], [class*="cursor-pointer"]').count();
    console.log('Total clickable elements:', clickables);

    // Check for images and their alt text
    const images = await page.locator('img').evaluateAll(els => els.map(el => ({
      src: el.getAttribute('src'),
      alt: el.getAttribute('alt'),
      width: el.clientWidth,
      height: el.clientHeight
    })));
    console.log('Images:', JSON.stringify(images, null, 2));

    // Check for loading states / skeleton screens
    const skeletons = await page.locator('[class*="skeleton"], [class*="animate-pulse"], [class*="loading"]').count();
    console.log('Loading/skeleton elements visible:', skeletons);
  });

  test('Check responsive design - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'e2e/screenshots/audit-mobile.png', fullPage: true });

    // Check for horizontal scroll (bad on mobile)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    console.log(`Body width: ${bodyWidth}, Viewport: ${viewportWidth}, Overflow: ${bodyWidth > viewportWidth}`);

    // Check text readability - find very small text
    const smallText = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const small: string[] = [];
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        if (fontSize < 12 && el.textContent?.trim()) {
          small.push(`${el.tagName}: "${el.textContent?.trim().substring(0, 50)}" (${fontSize}px)`);
        }
      });
      return small.slice(0, 10);
    });
    console.log('Small text elements:', smallText);
  });

  test('Check cooking skills section in detail', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find skill cards
    const skillCards = page.locator('[class*="skill"], [class*="card"]').filter({ hasText: /cooking|skill|level/i });
    const skillCount = await skillCards.count();
    console.log('Skill-related cards found:', skillCount);

    // Screenshot the skills section
    const skillsSection = page.locator('text=Cooking Skills').locator('..');
    if (await skillsSection.count() > 0) {
      await skillsSection.first().screenshot({ path: 'e2e/screenshots/audit-skills-section.png' });
    }

    // Try clicking on a skill card
    const firstSkillCard = page.locator('text=Basic Cooking').first();
    if (await firstSkillCard.count() > 0) {
      await firstSkillCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/audit-after-skill-click.png', fullPage: true });
      console.log('URL after clicking skill:', page.url());
    }
  });

  test('Check recipes section in detail', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find recipe cards
    const recipeSection = page.locator('text=Recent Recipes').locator('..');
    if (await recipeSection.count() > 0) {
      await recipeSection.first().screenshot({ path: 'e2e/screenshots/audit-recipes-section.png' });
    }

    // Check for recipe data
    const recipeCards = page.locator('[class*="recipe"]');
    const recipeCount = await recipeCards.count();
    console.log('Recipe elements found:', recipeCount);

    // Try to find and click "View All" or similar
    const viewAll = page.locator('text=/view all|see all|more recipes/i');
    if (await viewAll.count() > 0) {
      await viewAll.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/audit-all-recipes.png', fullPage: true });
      console.log('URL after view all:', page.url());
      await page.goBack();
    }
  });

  test('Check cooking tip section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const tipSection = page.locator('text=/cooking tip|tip of the day|today/i').first();
    if (await tipSection.count() > 0) {
      const tipParent = tipSection.locator('xpath=ancestor::section | xpath=ancestor::div[contains(@class,"card") or contains(@class,"tip")]').first();
      if (await tipParent.count() > 0) {
        await tipParent.screenshot({ path: 'e2e/screenshots/audit-cooking-tip.png' });
      }
    }

    // Check tip content quality
    const tipText = await page.locator('text=/cooking tip/i').first().locator('..').textContent();
    console.log('Tip content:', tipText?.substring(0, 200));
  });

  test('Check for empty states and error handling', async ({ page }) => {
    // Navigate to a non-existent page
    const response = await page.goto('/nonexistent-page');
    console.log('404 page status:', response?.status());
    await page.screenshot({ path: 'e2e/screenshots/audit-404.png', fullPage: true });

    // Check if there's a custom 404 page
    const has404Content = await page.locator('text=/not found|404|page doesn/i').count();
    console.log('Has custom 404 content:', has404Content > 0);
  });

  test('Check streak and gamification elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for streak indicators
    const streakElements = await page.locator('text=/streak|day|fire|flame/i').allTextContents();
    console.log('Streak-related elements:', streakElements);

    // Look for level/XP indicators
    const levelElements = await page.locator('text=/level|xp|experience|points/i').allTextContents();
    console.log('Level/XP elements:', levelElements);

    // Look for progress bars
    const progressBars = await page.locator('[role="progressbar"], [class*="progress"]').count();
    console.log('Progress bars found:', progressBars);

    // Look for badges/achievements
    const badges = await page.locator('text=/badge|achievement|reward|trophy/i').count();
    console.log('Badge/achievement elements:', badges);

    await page.screenshot({ path: 'e2e/screenshots/audit-gamification.png' });
  });

  test('Check accessibility basics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check color contrast issues (basic check)
    const contrastIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('p, span, h1, h2, h3, h4, a, button, label');
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bg = style.backgroundColor;
        if (color === bg && el.textContent?.trim()) {
          issues.push(`${el.tagName}: same color as bg - "${el.textContent?.trim().substring(0, 30)}"`);
        }
      });
      return issues;
    });
    console.log('Potential contrast issues:', contrastIssues);

    // Check for proper heading hierarchy
    const headingLevels = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headings).map(h => ({ tag: h.tagName, text: h.textContent?.trim().substring(0, 50) }));
    });
    console.log('Heading hierarchy:', JSON.stringify(headingLevels));

    // Check for missing aria labels on interactive elements
    const missingAria = await page.evaluate(() => {
      const interactives = document.querySelectorAll('button, a, input, select, textarea');
      const missing: string[] = [];
      interactives.forEach(el => {
        const hasLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent?.trim();
        if (!hasLabel) {
          missing.push(`${el.tagName}#${el.id || 'no-id'}.${el.className.substring(0, 50)}`);
        }
      });
      return missing;
    });
    console.log('Elements missing aria labels:', missingAria);

    // Tab order check
    const focusableElements = await page.locator('button, a, input, select, textarea, [tabindex]').count();
    console.log('Total focusable elements:', focusableElements);
  });

  test('Check page load performance', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    console.log('Page load time (ms):', loadTime);

    // Check for large images that could be optimized
    const largeImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      return Array.from(imgs).map(img => ({
        src: img.src.substring(0, 80),
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.clientWidth,
        displayHeight: img.clientHeight,
        loading: img.getAttribute('loading')
      }));
    });
    console.log('Image details:', JSON.stringify(largeImages, null, 2));

    // Check for render-blocking resources
    const scripts = await page.locator('script[src]').count();
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    console.log(`Scripts: ${scripts}, Stylesheets: ${stylesheets}`);
  });

  test('Explore all navigable routes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Collect all internal links
    const internalLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]');
      return Array.from(links)
        .map(a => a.getAttribute('href'))
        .filter(href => href && (href.startsWith('/') || href.startsWith(window.location.origin)))
        .filter((v, i, a) => a.indexOf(v) === i);
    });
    console.log('Internal links found:', internalLinks);

    // Visit each internal link and screenshot
    for (const link of internalLinks.slice(0, 10)) {
      try {
        await page.goto(link!);
        await page.waitForLoadState('networkidle');
        const safeName = link!.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        await page.screenshot({ path: `e2e/screenshots/audit-route${safeName || '_home'}.png`, fullPage: true });
        console.log(`Route ${link}: OK (${page.url()})`);
      } catch (e) {
        console.log(`Route ${link}: ERROR - ${e}`);
      }
    }
  });
});
