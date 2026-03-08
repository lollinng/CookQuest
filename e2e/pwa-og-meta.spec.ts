import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const PUBLIC = resolve(ROOT, 'public');

test.describe('OG Image, PWA Manifest, Icons & robots.txt', () => {

  test('public/og-image.jpg exists and is reasonable size (>5KB)', () => {
    const filePath = resolve(PUBLIC, 'og-image.jpg');
    expect(existsSync(filePath)).toBe(true);
    const stats = statSync(filePath);
    expect(stats.size).toBeGreaterThan(5000);
  });

  test('public/icon-192.png exists and is reasonable size', () => {
    const filePath = resolve(PUBLIC, 'icon-192.png');
    expect(existsSync(filePath)).toBe(true);
    const stats = statSync(filePath);
    expect(stats.size).toBeGreaterThan(500);
  });

  test('public/icon-512.png exists and is reasonable size', () => {
    const filePath = resolve(PUBLIC, 'icon-512.png');
    expect(existsSync(filePath)).toBe(true);
    const stats = statSync(filePath);
    expect(stats.size).toBeGreaterThan(1000);
  });

  test('public/robots.txt exists and allows all crawlers', () => {
    const filePath = resolve(PUBLIC, 'robots.txt');
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
  });

  test('manifest.json has required PWA fields', () => {
    const filePath = resolve(PUBLIC, 'manifest.json');
    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content.name).toBeTruthy();
    expect(content.short_name).toBeTruthy();
    expect(content.description).toBeTruthy();
    expect(content.start_url).toBe('/');
    expect(content.display).toBe('standalone');
    expect(content.theme_color).toBeTruthy();
    expect(content.background_color).toBeTruthy();
  });

  test('manifest.json theme_color matches layout viewport config', () => {
    const manifest = JSON.parse(readFileSync(resolve(PUBLIC, 'manifest.json'), 'utf-8'));
    // Layout viewport themeColor is #0F172A (slate-900)
    expect(manifest.theme_color).toBe('#0F172A');
  });

  test('manifest.json has icons for 192x192 and 512x512', () => {
    const manifest = JSON.parse(readFileSync(resolve(PUBLIC, 'manifest.json'), 'utf-8'));
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  test('manifest.json icon files actually exist', () => {
    const manifest = JSON.parse(readFileSync(resolve(PUBLIC, 'manifest.json'), 'utf-8'));
    for (const icon of manifest.icons) {
      const iconPath = resolve(PUBLIC, icon.src.replace(/^\//, ''));
      expect(existsSync(iconPath)).toBe(true);
    }
  });

  test('favicon.svg exists', () => {
    expect(existsSync(resolve(PUBLIC, 'favicon.svg'))).toBe(true);
  });

  test('layout.tsx references og-image.jpg in openGraph metadata', () => {
    const layoutPath = resolve(ROOT, 'app/layout.tsx');
    const content = readFileSync(layoutPath, 'utf-8');
    expect(content).toContain('/og-image.jpg');
    expect(content).toContain('/manifest.json');
    expect(content).toContain('/icon-192.png');
  });
});
