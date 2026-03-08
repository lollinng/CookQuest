import { test, expect } from '@playwright/test';

test.describe('Design Tokens - Dark Mode Foundation (task_075)', () => {
  test('page background is deep navy (#0F172A)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });

    // #0F172A = rgb(15, 23, 42)
    expect(bgColor).toBe('rgb(15, 23, 42)');
  });

  test('CSS custom properties are defined on :root', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const tokens = await page.evaluate(() => {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      return {
        primary: cs.getPropertyValue('--cq-primary').trim(),
        bg: cs.getPropertyValue('--cq-bg').trim(),
        surface: cs.getPropertyValue('--cq-surface').trim(),
        textPrimary: cs.getPropertyValue('--cq-text-primary').trim(),
        textSecondary: cs.getPropertyValue('--cq-text-secondary').trim(),
        textMuted: cs.getPropertyValue('--cq-text-muted').trim(),
        border: cs.getPropertyValue('--cq-border').trim(),
        success: cs.getPropertyValue('--cq-success').trim(),
        track: cs.getPropertyValue('--cq-track').trim(),
      };
    });

    expect(tokens.primary).toBe('#F97316');
    expect(tokens.bg).toBe('#0F172A');
    expect(tokens.surface).toBe('#111827');
    expect(tokens.textPrimary).toBe('#F9FAFB');
    expect(tokens.textSecondary).toBe('#9CA3AF');
    expect(tokens.textMuted).toBe('#6B7280');
    expect(tokens.border).toBe('#1F2937');
    expect(tokens.success).toBe('#22C55E');
    expect(tokens.track).toBe('#1F2937');
  });

  test('body text color is near-white', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const color = await page.evaluate(() => {
      return getComputedStyle(document.body).color;
    });

    // #F9FAFB = rgb(249, 250, 251)
    expect(color).toBe('rgb(249, 250, 251)');
  });

  test('meta theme-color is dark navy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const themeColor = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="theme-color"]');
      return meta?.getAttribute('content');
    });

    expect(themeColor).toBe('#0F172A');
  });

  test('no white page flash on load', async ({ page }) => {
    await page.goto('/');

    // Check immediately — the bg should never be white
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });

    // Should NOT be white (rgb(255, 255, 255))
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('Tailwind cq-* utility classes generate correct styles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Inject a test element with cq-* classes and verify computed styles
    const styles = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'bg-cq-surface text-cq-text-primary border-cq-border';
      el.style.display = 'none';
      document.body.appendChild(el);

      const cs = getComputedStyle(el);
      const result = {
        bg: cs.backgroundColor,
        color: cs.color,
        borderColor: cs.borderColor,
      };

      document.body.removeChild(el);
      return result;
    });

    // bg-cq-surface → #111827 → rgb(17, 24, 39)
    expect(styles.bg).toBe('rgb(17, 24, 39)');
    // text-cq-text-primary → #F9FAFB → rgb(249, 250, 251)
    expect(styles.color).toBe('rgb(249, 250, 251)');
    // border-cq-border → #1F2937 → rgb(31, 41, 55)
    expect(styles.borderColor).toBe('rgb(31, 41, 55)');
  });

  test('screenshot - dark mode dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'e2e/screenshots/design-tokens-dark-bg.png',
      fullPage: true,
    });
  });
});
