#!/usr/bin/env node
/**
 * Generate PWA icons (192x192, 512x512) and OG image (1200x630)
 * from the favicon.svg source. Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');

const svgSource = readFileSync(resolve(PUBLIC, 'favicon.svg'));

// Generate 192x192 icon
await sharp(svgSource)
  .resize(192, 192)
  .png()
  .toFile(resolve(PUBLIC, 'icon-192.png'));
console.log('Created icon-192.png');

// Generate 512x512 icon
await sharp(svgSource)
  .resize(512, 512)
  .png()
  .toFile(resolve(PUBLIC, 'icon-512.png'));
console.log('Created icon-512.png');

// Generate OG image (1200x630) — branded card with gradient background
const ogWidth = 1200;
const ogHeight = 630;

const ogSvg = Buffer.from(`
<svg width="${ogWidth}" height="${ogHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F172A;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1E293B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0F172A;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#EA580C;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F97316;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${ogWidth}" height="${ogHeight}" fill="url(#bg)" />

  <!-- Accent bar at top -->
  <rect x="0" y="0" width="${ogWidth}" height="6" fill="url(#accent)" />

  <!-- Logo icon (rounded square) -->
  <rect x="80" y="200" width="120" height="120" rx="24" fill="#EA580C" />
  <text x="140" y="285" text-anchor="middle" font-size="68" font-family="Arial, Helvetica, sans-serif" font-weight="bold" fill="white">CQ</text>

  <!-- Title -->
  <text x="230" y="255" font-size="56" font-family="Arial, Helvetica, sans-serif" font-weight="bold" fill="white">CookQuest</text>

  <!-- Subtitle -->
  <text x="230" y="305" font-size="26" font-family="Arial, Helvetica, sans-serif" fill="#94A3B8">Level up your cooking skills</text>

  <!-- Tagline -->
  <text x="80" y="430" font-size="30" font-family="Arial, Helvetica, sans-serif" fill="#CBD5E1">Master cooking through interactive recipes</text>
  <text x="80" y="472" font-size="30" font-family="Arial, Helvetica, sans-serif" fill="#CBD5E1">and gamified learning.</text>

  <!-- Decorative dots -->
  <circle cx="1050" cy="150" r="60" fill="#EA580C" opacity="0.15" />
  <circle cx="1100" cy="500" r="90" fill="#F97316" opacity="0.1" />
  <circle cx="950" cy="350" r="40" fill="#EA580C" opacity="0.1" />

  <!-- Bottom accent bar -->
  <rect x="0" y="${ogHeight - 6}" width="${ogWidth}" height="6" fill="url(#accent)" />
</svg>
`);

await sharp(ogSvg)
  .jpeg({ quality: 90 })
  .toFile(resolve(PUBLIC, 'og-image.jpg'));
console.log('Created og-image.jpg');

console.log('All icons generated successfully!');
