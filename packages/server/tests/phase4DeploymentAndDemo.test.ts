import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { runPostgresVerification } from '../scripts/verifyPostgresIntegration.js';

describe('Phase 4 — Deployment Packaging, PostgreSQL Verification Script, and Static Audit', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  // --------------------------------------------------------------------------
  // 1. Docker Compose Configuration Integrity
  // --------------------------------------------------------------------------
  it('verifies docker-compose.yml defines postgres, server, and frontend services with healthchecks', () => {
    const composePath = path.join(rootDir, 'docker-compose.yml');
    expect(fs.existsSync(composePath)).toBe(true);

    const composeContent = fs.readFileSync(composePath, 'utf8');
    // Service 1: PostgreSQL
    expect(composeContent).toContain('ner_mind_postgres');
    expect(composeContent).toContain('image: postgres:16-alpine');
    expect(composeContent).toContain('pg_isready');
    expect(composeContent).toContain('ner_mind_pgdata');

    // Service 2: Server Backend
    expect(composeContent).toContain('ner_mind_server');
    expect(composeContent).toContain('packages/server/Dockerfile');
    expect(composeContent).toContain('service_healthy');
    expect(composeContent).toContain('4000:4000');

    // Service 3: Frontend PWA
    expect(composeContent).toContain('ner_mind_frontend');
    expect(composeContent).toContain('packages/patient-app/Dockerfile');
    expect(composeContent).toContain('3000:80');
    expect(composeContent).toContain('/healthz');
  });

  // --------------------------------------------------------------------------
  // 2. Dockerfile & NGINX Web Server Configuration
  // --------------------------------------------------------------------------
  it('verifies backend and frontend Dockerfiles and NGINX configuration exist and follow production standards', () => {
    const serverDocker = path.join(rootDir, 'packages/server/Dockerfile');
    const clientDocker = path.join(rootDir, 'packages/patient-app/Dockerfile');
    const nginxConf = path.join(rootDir, 'packages/patient-app/nginx.conf');

    expect(fs.existsSync(serverDocker)).toBe(true);
    expect(fs.existsSync(clientDocker)).toBe(true);
    expect(fs.existsSync(nginxConf)).toBe(true);

    const nginxText = fs.readFileSync(nginxConf, 'utf8');
    expect(nginxText).toContain('try_files $uri $uri/ /index.html');
    expect(nginxText).toContain('proxy_pass http://server:4000/api/');
    expect(nginxText).toContain('no-cache, no-store, must-revalidate');
    expect(nginxText).toContain('location /healthz');
  });

  // --------------------------------------------------------------------------
  // 3. PostgreSQL Verification Script Execution
  // --------------------------------------------------------------------------
  it('executes the PostgreSQL verification script and reports accurate environment mode', async () => {
    const report = await runPostgresVerification();
    expect(report).toBeDefined();
    expect(['REAL_POSTGRESQL', 'IN_MEMORY_FALLBACK']).toContain(report.mode);
    expect(Array.isArray(report.results)).toBe(true);
    expect(report.results.length).toBeGreaterThan(0);

    // On host environments where PostgreSQL container is not started,
    // verify it explicitly reports host fallback rather than falsely claiming database execution.
    if (!process.env.DATABASE_URL) {
      expect(report.mode).toBe('IN_MEMORY_FALLBACK');
      expect(report.overallPassed).toBe(false);
    }
  });

  // --------------------------------------------------------------------------
  // 4. Environment Template Security Audit
  // --------------------------------------------------------------------------
  it('ensures .env.example contains placeholder credentials only and .gitignore protects secrets', () => {
    const rootEnvExample = path.join(rootDir, '.env.example');
    const gitignorePath = path.join(rootDir, '.gitignore');

    expect(fs.existsSync(rootEnvExample)).toBe(true);
    expect(fs.existsSync(gitignorePath)).toBe(true);

    const envText = fs.readFileSync(rootEnvExample, 'utf8');
    expect(envText).toContain('CHANGE_THIS_IN_PRODUCTION_PASSWORD');
    expect(envText).toContain('CHANGE_THIS_RANDOM_SECRET_KEY');

    const gitignoreText = fs.readFileSync(gitignorePath, 'utf8');
    expect(gitignoreText).toContain('.env');
    expect(gitignoreText).toContain('.env.local');
  });
});
