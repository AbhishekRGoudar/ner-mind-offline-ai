import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { AuditLogger } from '../src/security/auditLogger.js';
import express from 'express';
import { createRateLimiter } from '../src/security/rateLimiter.js';

describe('Security Baseline (OWASP ASVS)', () => {
  it('enforces secure HTTP headers via Helmet', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);

    // OWASP required security headers
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('redacts sensitive credentials from audit logs', () => {
    const entry = AuditLogger.log({
      eventType: 'AUTH_LOGIN',
      actorId: 'caregiver-001',
      ipAddress: '127.0.0.1',
      outcome: 'SUCCESS',
      metadata: {
        username: 'caregiver_pranjal',
        password: 'SuperSecretPassword!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        normalInfo: 'NonSensitiveData',
      },
    });

    expect(entry.metadata?.username).toBe('caregiver_pranjal');
    expect(entry.metadata?.password).toBe('[REDACTED]');
    expect(entry.metadata?.token).toBe('[REDACTED]');
    expect(entry.metadata?.normalInfo).toBe('NonSensitiveData');
  });

  it('triggers HTTP 429 when rate limit threshold is exceeded', async () => {
    // Create test app with tight rate limit
    const testApp = express();
    testApp.use(createRateLimiter({ windowMs: 1000, maxRequests: 3 }));
    testApp.get('/test-rate', (_req, res) => res.json({ ok: true }));

    // Send 3 requests within limit
    await request(testApp).get('/test-rate').expect(200);
    await request(testApp).get('/test-rate').expect(200);
    await request(testApp).get('/test-rate').expect(200);

    // 4th request must be rejected with 429 Too Many Requests
    const res = await request(testApp).get('/test-rate');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too Many Requests');
    expect(res.headers['retry-after']).toBeDefined();
  });
});
