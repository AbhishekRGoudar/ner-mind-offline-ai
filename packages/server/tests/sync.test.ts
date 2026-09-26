import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { PatientRepository } from '../src/repository/patientRepository.js';
import { AuthService } from '../src/auth/rbacMiddleware.js';
import { SyncBatchPayload, computeIdempotencyHash } from '@ner-mind/core';

describe('Idempotent Sync Service', () => {
  let authToken: string;

  beforeEach(async () => {
    await PatientRepository.resetForTesting();
    authToken = await AuthService.createSession({
      userId: 'caregiver-001',
      username: 'caregiver_pranjal',
      role: 'CAREGIVER',
      patientId: 'patient-ner-001',
    });
  });

  const createSampleBatch = (eventId1: string, eventId2: string): SyncBatchPayload => {
    const p1 = {
      id: crypto.randomUUID(),
      patientId: 'patient-ner-001',
      domain: 'memory',
      taskId: 'market_shopping_recall',
      timestamp: new Date().toISOString(),
      difficulty: 2,
      context: 'market',
      metrics: {
        rawScore: 0.8,
        itemsPresented: 5,
        itemsCorrect: 4,
        completionTimeMs: 14000,
        hesitationCount: 0,
        cueAssistanceCount: 0,
      },
    };

    const p2 = {
      id: crypto.randomUUID(),
      patientId: 'patient-ner-001',
      domain: 'sequencing',
      taskId: 'morning_tea_sequence',
      timestamp: new Date().toISOString(),
      difficulty: 1,
      context: 'kitchen',
      metrics: {
        rawScore: 1.0,
        itemsPresented: 4,
        itemsCorrect: 4,
        completionTimeMs: 9000,
        hesitationCount: 0,
        cueAssistanceCount: 0,
      },
    };

    const ts = new Date().toISOString();

    return {
      batchId: crypto.randomUUID(),
      patientId: 'patient-ner-001',
      deviceTimestamp: ts,
      events: [
        {
          eventId: eventId1,
          patientId: 'patient-ner-001',
          eventType: 'observation_recorded',
          payload: p1,
          clientCreatedAt: ts,
          clientSequenceNumber: 1,
          idempotencyHash: computeIdempotencyHash(eventId1, 'patient-ner-001', p1, ts),
          status: 'pending',
          retryCount: 0,
        },
        {
          eventId: eventId2,
          patientId: 'patient-ner-001',
          eventType: 'observation_recorded',
          payload: p2,
          clientCreatedAt: ts,
          clientSequenceNumber: 2,
          idempotencyHash: computeIdempotencyHash(eventId2, 'patient-ner-001', p2, ts),
          status: 'pending',
          retryCount: 0,
        },
      ],
    };
  };

  it('processes incoming sync batch and commits observations to repository', async () => {
    const eventId1 = crypto.randomUUID();
    const eventId2 = crypto.randomUUID();
    const batch = createSampleBatch(eventId1, eventId2);

    const res = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${authToken}`)
      .send(batch);

    expect(res.status).toBe(200);
    expect(res.body.processedCount).toBe(2);
    expect(res.body.duplicateCount).toBe(0);
    expect(res.body.syncedEventIds).toContain(eventId1);
    expect(res.body.syncedEventIds).toContain(eventId2);

    // Verify stored in repository
    const stored = await PatientRepository.getObservations('patient-ner-001');
    expect(stored.length).toBe(2);
  });

  it('guarantees idempotency when identical sync batch is re-sent', async () => {
    const eventId1 = crypto.randomUUID();
    const eventId2 = crypto.randomUUID();
    const batch = createSampleBatch(eventId1, eventId2);

    // Initial transmission
    const res1 = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${authToken}`)
      .send(batch);
    expect(res1.body.processedCount).toBe(2);
    expect(res1.body.duplicateCount).toBe(0);

    // Duplicate re-transmission (e.g. offline patient app retry after network drop)
    const res2 = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${authToken}`)
      .send(batch);
    expect(res2.status).toBe(200);
    expect(res2.body.processedCount).toBe(0);
    expect(res2.body.duplicateCount).toBe(2);
    // Still acknowledges the event IDs so patient app can clear outbox
    expect(res2.body.syncedEventIds).toContain(eventId1);
    expect(res2.body.syncedEventIds).toContain(eventId2);

    // Repository observation count should NOT have doubled
    const storedAfter = await PatientRepository.getObservations('patient-ner-001');
    expect(storedAfter.length).toBe(2);
  });

  it('rejects malformed sync payload with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ invalid: 'payload' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid Payload');
  });
});
