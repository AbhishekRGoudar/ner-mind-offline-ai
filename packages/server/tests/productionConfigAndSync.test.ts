import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../src/app.js';
import { AuthService } from '../src/auth/rbacMiddleware.js';
import { PatientRepository } from '../src/repository/patientRepository.js';
import { computeIdempotencyHash, SyncBatchPayload } from '@ner-mind/core';

describe('Phase 3D, 3F, 3H — Production Configuration, Reconnect Sync, and Security Verification', () => {
  beforeEach(async () => {
    await PatientRepository.resetForTesting();
  });

  // --------------------------------------------------------------------------
  // 9. Reconnect Synchronization (Phase 3B / 3H.9)
  // --------------------------------------------------------------------------
  it('processes batch sync events after reconnecting with deduplication and authentication', async () => {
    // 1. Generate auth session for caregiver assigned to patient-ner-001
    const sessionToken = await AuthService.createSession({
      userId: 'caregiver-001',
      username: 'caregiver_pranjal',
      role: 'CAREGIVER',
      patientId: 'patient-ner-001',
    });

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const observationPayload = {
      id: crypto.randomUUID(),
      patientId: 'patient-ner-001',
      domain: 'attention' as const,
      taskId: 'bihu_drum_rhythm',
      timestamp,
      difficulty: 1,
      context: 'festival',
      metrics: {
        rawScore: 0.88,
        itemsPresented: 5,
        itemsCorrect: 4,
        completionTimeMs: 14200,
        hesitationCount: 0,
        cueAssistanceCount: 0,
      },
    };

    const syncPayload: SyncBatchPayload = {
      batchId: crypto.randomUUID(),
      patientId: 'patient-ner-001',
      deviceTimestamp: timestamp,
      events: [
        {
          eventId,
          patientId: 'patient-ner-001',
          eventType: 'observation_recorded',
          payload: observationPayload,
          clientCreatedAt: timestamp,
          clientSequenceNumber: 1,
          idempotencyHash: computeIdempotencyHash(eventId, 'patient-ner-001', observationPayload, timestamp),
          status: 'pending',
          retryCount: 0,
        },
      ],
    };

    // First upload: should succeed and record 1 processed event
    const firstRes = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send(syncPayload);

    expect(firstRes.status).toBe(200);
    expect(firstRes.body.processedCount).toBe(1);
    expect(firstRes.body.duplicateCount).toBe(0);
    expect(firstRes.body.syncedEventIds).toContain(eventId);

    // Second upload with the exact same eventId (idempotent reconnect retry)
    const duplicateRes = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send(syncPayload);

    expect(duplicateRes.status).toBe(200);
    // Deduplicated: should report 0 new processed events and 1 duplicate without error
    expect(duplicateRes.body.processedCount).toBe(0);
    expect(duplicateRes.body.duplicateCount).toBe(1);
  });

  // --------------------------------------------------------------------------
  // 11. Environment Configuration & Security Headers (Phase 3D / 3F / 3H.11)
  // --------------------------------------------------------------------------
  it('enforces strict Content-Security-Policy, HSTS, and CORS in production configuration', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);

    // Verify Helmet Content Security Policy
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");

    // Verify Cross-Origin-Resource-Policy
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');

    // Verify HSTS
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');

    // Verify CORS preflight
    const preflightRes = await request(app)
      .options('/api/v1/sync')
      .set('Origin', 'https://ner-mind.assam.gov.in')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

    expect(preflightRes.status).toBe(204);
    expect(preflightRes.headers['access-control-allow-methods']).toContain('POST');
  });

  // --------------------------------------------------------------------------
  // 12. No Secrets in Production Frontend Bundle (Phase 3F / 3H.12)
  // --------------------------------------------------------------------------
  it('scans client production build output to ensure no secrets or database credentials leaked', () => {
    const distDir = path.resolve(__dirname, '../../patient-app/dist');
    expect(fs.existsSync(distDir), 'patient-app dist directory must exist').toBe(true);

    const sensitivePatterns = [
      /postgres:\/\//i,
      /postgresql:\/\//i,
      /ner_secure_password/i,
      /SESSION_SECRET/i,
      /BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY/i,
      /scrypt\$/i,
    ];

    const filesToScan: string[] = [];
    function collectFiles(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          collectFiles(fullPath);
        } else if (/\.(js|html|css|json)$/i.test(entry.name)) {
          filesToScan.push(fullPath);
        }
      }
    }

    collectFiles(distDir);
    expect(filesToScan.length).toBeGreaterThan(0);

    for (const filePath of filesToScan) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of sensitivePatterns) {
        const match = pattern.test(content);
        expect(
          match,
          `Security violation: Sensitive pattern ${pattern} detected in client bundle file ${path.basename(filePath)}`
        ).toBe(false);
      }
    }
  });
});
