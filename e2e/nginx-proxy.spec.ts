import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

test.describe('Nginx Reverse Proxy — Configuration Validation', () => {

  test('nginx/nginx.conf.template exists', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    expect(existsSync(confPath)).toBe(true);
  });

  test('nginx/Dockerfile exists and uses nginx:alpine', () => {
    const dockerfilePath = resolve(ROOT, 'nginx/Dockerfile');
    expect(existsSync(dockerfilePath)).toBe(true);
    const content = readFileSync(dockerfilePath, 'utf-8');
    expect(content).toContain('nginx');
    expect(content).toContain('alpine');
  });

  test('nginx config routes / to frontend upstream', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('upstream frontend');
    expect(content).toContain('cookquest-web:3000');
    expect(content).toMatch(/location \/\s*\{/);
    expect(content).toContain('proxy_pass http://frontend');
  });

  test('nginx config routes /api/ to backend upstream', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('upstream backend');
    expect(content).toContain('cookquest-api:3003');
    expect(content).toMatch(/location \/api\//);
    expect(content).toContain('proxy_pass http://backend');
  });

  test('nginx config routes /uploads/ to backend', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toMatch(/location \/uploads\//);
  });

  test('nginx config has SSL configuration with modern http2 directive', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('listen 443 ssl');
    expect(content).toContain('http2 on');
    expect(content).toContain('ssl_certificate');
    expect(content).toContain('ssl_certificate_key');
    // Should NOT use deprecated "listen 443 ssl http2" syntax
    expect(content).not.toContain('listen 443 ssl http2');
  });

  test('nginx config has HTTP to HTTPS redirect', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('listen 80');
    expect(content).toContain('return 301 https://');
  });

  test('nginx config has ACME challenge location for Let\'s Encrypt', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('.well-known/acme-challenge');
    expect(content).toContain('/var/www/certbot');
  });

  test('nginx config has security headers including Permissions-Policy', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('Strict-Transport-Security');
    expect(content).toContain('X-Frame-Options');
    expect(content).toContain('X-Content-Type-Options');
    expect(content).toContain('Referrer-Policy');
    expect(content).toContain('Permissions-Policy');
  });

  test('nginx config has gzip enabled', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('gzip on');
    expect(content).toContain('gzip_types');
  });

  test('nginx config has rate limiting for API', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('limit_req_zone');
    expect(content).toContain('limit_req zone=api_limit');
  });

  test('nginx config uses DOMAIN envsubst variable', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('${DOMAIN}');
  });

  test('docker-compose.yml has nginx service with prod profile', () => {
    const composePath = resolve(ROOT, 'docker-compose.yml');
    const content = readFileSync(composePath, 'utf-8');
    expect(content).toContain('nginx');
    expect(content).toContain('profiles:');
  });

  test('docker-compose.yml sets NGINX_ENVSUBST_FILTER to protect nginx variables', () => {
    const composePath = resolve(ROOT, 'docker-compose.yml');
    const content = readFileSync(composePath, 'utf-8');
    expect(content).toContain('NGINX_ENVSUBST_FILTER');
  });

  test('docker-compose.yml has certbot service', () => {
    const composePath = resolve(ROOT, 'docker-compose.yml');
    const content = readFileSync(composePath, 'utf-8');
    expect(content).toContain('certbot');
  });

  test('.env.example includes DOMAIN variable', () => {
    const envPath = resolve(ROOT, '.env.example');
    const content = readFileSync(envPath, 'utf-8');
    expect(content).toContain('DOMAIN');
  });

  test('nginx config has proxy headers for all locations', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('X-Real-IP');
    expect(content).toContain('X-Forwarded-For');
    expect(content).toContain('X-Forwarded-Proto');
  });

  test('nginx config sets client_max_body_size for API uploads', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('client_max_body_size');
  });

  test('nginx config has /health proxy to backend', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toMatch(/location \/health/);
  });

  test('nginx config does not have orphaned proxy_cache_valid without proxy_cache', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    // If proxy_cache_valid is present, proxy_cache_path must also be present
    if (content.includes('proxy_cache_valid')) {
      expect(content).toContain('proxy_cache_path');
    }
  });

  test('SSL bootstrap script exists', () => {
    const scriptPath = resolve(ROOT, 'scripts/init-ssl.sh');
    expect(existsSync(scriptPath)).toBe(true);
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('certbot');
    expect(content).toContain('self-signed');
  });

  test('nginx config has SSL hardening (TLS 1.2+, session config)', () => {
    const confPath = resolve(ROOT, 'nginx/nginx.conf.template');
    const content = readFileSync(confPath, 'utf-8');
    expect(content).toContain('ssl_protocols TLSv1.2 TLSv1.3');
    expect(content).toContain('ssl_session_cache');
    expect(content).toContain('ssl_session_tickets off');
  });
});
