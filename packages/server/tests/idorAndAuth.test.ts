import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { AuthService } from '../src/auth/rbacMiddleware.js';
import { UserRepository } from '../src/auth/userRepository.js';
import { PatientRepository } from '../src/repository/patientRepository.js';
import { PasswordService } from '../src/auth/passwordService.js';
import { SyncBatchPayload, computeIdempotencyHash } from '@ner-mind/core';

describe('Phase 2.1 Security Audit: IDOR, Auth Hardening & Sync Protection', () => {
  let caregiver1Token: string;
  let caregiver2Token: string;
  let healthWorkerToken: string;

  beforeEach(async () => {
    UserRepository.seedInMemory();
    await PatientRepository.resetForTesting();
    AuthService.clearInMemoryForTesting();

    // Setup Caregiver 1 (assigned to patient-ner-001)
    caregiver1Token = await AuthService.createSession({
      userId: 'caregiver-001',
      username: 'caregiver_pranjal',
      role: 'CAREGIVER',
      patientId: 'patient-ner-001',
    });

    // Setup Caregiver 2 (assigned to patient-ner-002)
    caregiver2Token = await AuthService.createSession({
      userId: 'caregiver-002',
      username: 'caregiver_anita',
      role: 'CAREGIVER',
      patientId: 'patient-ner-002',
    });

    // Setup Health Worker (authorized oversight)
    healthWorkerToken = await AuthService.createSession({
      userId: 'hw-001',
      username: 'health_worker_dutta',
      role: 'HEALTH_WORKER',
    });
  });

  // 1. Caregiver IDOR Prevention
  it('prevents IDOR: Caregiver 1 cannot access unassigned Patient 2 profile (HTTP 403)', async () => {
    // Caregiver 1 attempts to query Patient 2
    const res = await request(app)
      .get('/api/v1/caregiver/patient/patient-ner-002/profile')
      .set('Authorization', `Bearer ${caregiver1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.message).toContain('not the assigned caregiver');
  });

  it('allows authorized access: Caregiver 1 can access assigned Patient 1 profile (HTTP 200)', async () => {
    const res = await request(app)
      .get('/api/v1/caregiver/patient/patient-ner-001/profile')
      .set('Authorization', `Bearer ${caregiver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.patient.id).toBe('patient-ner-001');
  });

  it('allows authorized health worker oversight across patients (HTTP 200)', async () => {
    // Health worker accesses Patient 1
    const res1 = await request(app)
      .get('/api/v1/caregiver/patient/patient-ner-001/profile')
      .set('Authorization', `Bearer ${healthWorkerToken}`);
    expect(res1.status).toBe(200);

    // Health worker accesses Patient 2
    const res2 = await request(app)
      .get('/api/v1/caregiver/patient/patient-ner-002/profile')
      .set('Authorization', `Bearer ${healthWorkerToken}`);
    expect(res2.status).toBe(200);
  });

  // 2. Synchronization Authentication & Ownership Protection
  it('rejects unauthenticated sync attempts (HTTP 401)', async () => {
    const res = await request(app)
      .post('/api/v1/sync')
      .send({ batchId: crypto.randomUUID(), patientId: 'patient-ner-001', deviceTimestamp: new Date().toISOString(), events: [] });

    expect(res.status).toBe(401);
  });

  it('rejects forged sync batch: Caregiver 1 cannot submit sync for unassigned Patient 2 (HTTP 403)', async () => {
    const res = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send({
        batchId: crypto.randomUUID(),
        patientId: 'patient-ner-002',
        deviceTimestamp: new Date().toISOString(),
        events: [],
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('rejects forged event: event patientId must strictly match batch patientId (HTTP 400)', async () => {
    const eventId = crypto.randomUUID();
    const ts = new Date().toISOString();
    const payload = {
      id: crypto.randomUUID(),
      patientId: 'patient-ner-002', // Mismatched!
      domain: 'memory',
      taskId: 'market_shopping_recall',
      timestamp: ts,
      difficulty: 1,
      context: 'market',
      metrics: { rawScore: 0.8, itemsPresented: 5, itemsCorrect: 4, completionTimeMs: 12000, hesitationCount: 0, cueAssistanceCount: 0 },
    };

    const forgedBatch: SyncBatchPayload = {
      batchId: crypto.randomUUID(),
      patientId: 'patient-ner-001',
      deviceTimestamp: ts,
      events: [
        {
          eventId,
          patientId: 'patient-ner-002', // Tampered!
          eventType: 'observation_recorded',
          payload,
          clientCreatedAt: ts,
          clientSequenceNumber: 1,
          idempotencyHash: computeIdempotencyHash(eventId, 'patient-ner-002', payload, ts),
          status: 'pending',
          retryCount: 0,
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${caregiver1Token}`)
      .send(forgedBatch);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('does not match batch patientId');
  });

  // 3. Account Lockout Protection
  it('triggers account lockout after 5 consecutive failed login attempts (HTTP 423)', async () => {
    const username = 'caregiver_pranjal';

    // 5 consecutive failed attempts
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username, password: 'WrongPassword123!' });
      expect(res.status).toBe(401);
    }

    // 6th attempt must be rejected with HTTP 423 Locked
    const lockedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: 'WrongPassword123!' });

    expect(lockedRes.status).toBe(423);
    expect(lockedRes.body.error).toBe('Account Locked');
    expect(lockedRes.body.message).toContain('temporarily locked');

    // Even with the correct password, locked account is blocked
    const correctResDuringLock = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: 'CaregiverSecurePass123!' });

    expect(correctResDuringLock.status).toBe(423);
  });

  // 4. Session Revocation & Logout
  it('revokes session on logout and rejects subsequent token requests (HTTP 401)', async () => {
    // Generate valid token
    const token = await AuthService.createSession({
      userId: 'caregiver-001',
      username: 'caregiver_pranjal',
      role: 'CAREGIVER',
      patientId: 'patient-ner-001',
    });

    // Verify token works before logout
    const preLogoutRes = await request(app)
      .get('/api/v1/caregiver/patients')
      .set('Authorization', `Bearer ${token}`);
    expect(preLogoutRes.status).toBe(200);

    // Call logout endpoint
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('Logged out successfully.');

    // Attempt to reuse revoked token must be rejected with HTTP 401
    const postLogoutRes = await request(app)
      .get('/api/v1/caregiver/patients')
      .set('Authorization', `Bearer ${token}`);
    expect(postLogoutRes.status).toBe(401);
    expect(postLogoutRes.body.message).toContain('Invalid, revoked, or expired');
  });

  // 5. Persistent Session Validation with Token Hashing
  it('hashes session tokens with SHA-256 and validates persistence', async () => {
    const rawToken = await AuthService.createSession({
      userId: 'hw-001',
      username: 'health_worker_dutta',
      role: 'HEALTH_WORKER',
    });

    const expectedHash = PasswordService.hashToken(rawToken);
    expect(expectedHash).toHaveLength(64); // 256-bit hex

    // Verify user can be retrieved from token
    const user = await AuthService.getSessionUser(rawToken);
    expect(user).not.toBeNull();
    expect(user!.username).toBe('health_worker_dutta');
    expect(user!.role).toBe('HEALTH_WORKER');
  });
});
