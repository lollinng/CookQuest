import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

describe('Docker Setup', () => {
  describe('docker-compose.yml', () => {
    const composePath = resolve(ROOT, 'docker-compose.yml');

    it('should exist at project root', () => {
      expect(existsSync(composePath)).toBe(true);
    });

    it('should define cookquest-web service', () => {
      const content = readFileSync(composePath, 'utf-8');
      expect(content).toContain('cookquest-web');
    });

    it('should define cookquest-api service', () => {
      const content = readFileSync(composePath, 'utf-8');
      expect(content).toContain('cookquest-api');
    });

    it('should expose frontend on port 3000', () => {
      const content = readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/3000:3000/);
    });

    it('should expose backend on port 3003', () => {
      const content = readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/3003:3003/);
    });

    it('should define a shared network', () => {
      const content = readFileSync(composePath, 'utf-8');
      expect(content).toContain('cookquest_network');
    });
  });

  describe('Frontend Dockerfile', () => {
    const dockerfilePath = resolve(ROOT, 'Dockerfile');

    it('should exist at project root', () => {
      expect(existsSync(dockerfilePath)).toBe(true);
    });

    it('should use Node.js base image', () => {
      const content = readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/FROM node:/);
    });

    it('should set working directory', () => {
      const content = readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/WORKDIR/);
    });

    it('should install dependencies', () => {
      const content = readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/npm ci/);
    });
  });

  describe('Backend Dockerfile', () => {
    const dockerfilePath = resolve(ROOT, 'backend/node-services/api-server/Dockerfile');

    it('should exist in backend directory', () => {
      expect(existsSync(dockerfilePath)).toBe(true);
    });

    it('should use Node.js base image', () => {
      const content = readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/FROM node:/);
    });

    it('should set working directory', () => {
      const content = readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/WORKDIR/);
    });

    it('should expose the correct port', () => {
      const content = readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/EXPOSE 3003/);
    });
  });

  describe('.dockerignore', () => {
    const ignorePath = resolve(ROOT, '.dockerignore');

    it('should exist at project root', () => {
      expect(existsSync(ignorePath)).toBe(true);
    });

    it('should exclude node_modules', () => {
      const content = readFileSync(ignorePath, 'utf-8');
      expect(content).toContain('node_modules');
    });

    it('should exclude .next', () => {
      const content = readFileSync(ignorePath, 'utf-8');
      expect(content).toContain('.next');
    });
  });
});
