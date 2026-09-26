import { describe, it, expect } from 'vitest';
import {
  OutboxQueueManager,
  computeIdempotencyHash,
  processServerSyncBatch,
} from '../src/sync/outbox.js';

describe('Offline-First Outbox & Idempotent Sync', () => {
  const patientId = 'pat-ner-001';

  it('computes deterministic idempotency hashes for identical payloads', () => {
    const eventId = crypto.randomUUID();
    const payload = { score: 0.85, domain: 'memory' };
    const ts = '2026-09-22T21:00:00.000Z';

    const hash1 = computeIdempotencyHash(eventId, patientId, payload, ts);
    const hash2 = computeIdempotencyHash(eventId, patientId, payload, ts);
    expect(hash1).toBe(hash2);

    // Changing payload must change hash
    const hashDifferent = computeIdempotencyHash(eventId, patientId, { ...payload, score: 0.90 }, ts);
    expect(hash1).not.toBe(hashDifferent);
  });

  it('manages local outbox lifecycle from pending -> syncing -> synced', () => {
    const manager = new OutboxQueueManager();
    const eventId1 = crypto.randomUUID();
    const eventId2 = crypto.randomUUID();

    manager.enqueue(eventId1, patientId, 'observation_recorded', { score: 0.7 });
    manager.enqueue(eventId2, patientId, 'routine_completed', { routine: 'morning_tea' });

    expect(manager.getPendingEvents().length).toBe(2);

    const batch = manager.createSyncBatch(patientId);
    expect(batch).not.toBeNull();
    expect(batch!.events.length).toBe(2);
    // After batch creation, status should be 'syncing'
    expect(manager.getPendingEvents().length).toBe(0);

    // Simulate server response acknowledging only eventId1
    manager.acknowledgeSynced([eventId1]);
    const all = manager.getAllEvents();
    expect(all.find(e => e.eventId === eventId1)?.status).toBe('synced');
    expect(all.find(e => e.eventId === eventId2)?.status).toBe('syncing');

    // Simulate eventId2 failure
    manager.recordFailure([eventId2], 'Network timeout');
    expect(all.find(e => e.eventId === eventId2)?.status).toBe('failed');
    expect(all.find(e => e.eventId === eventId2)?.retryCount).toBe(1);

    // Failed event should be pending for retry
    expect(manager.getPendingEvents().length).toBe(1);
  });

  it('server rejects duplicates idempotently when duplicate sync batches are delivered', () => {
    const manager = new OutboxQueueManager();
    const eventId = crypto.randomUUID();
    manager.enqueue(eventId, patientId, 'observation_recorded', { score: 0.9 });
    const batch = manager.createSyncBatch(patientId)!;

    const serverKnownEvents = new Set<string>();

    // First arrival
    const res1 = processServerSyncBatch(batch, serverKnownEvents);
    expect(res1.processedCount).toBe(1);
    expect(res1.duplicateCount).toBe(0);
    expect(res1.syncedEventIds).toEqual([eventId]);

    // Second arrival of identical batch (e.g. client retried before receiving ack)
    const res2 = processServerSyncBatch(batch, serverKnownEvents);
    expect(res2.processedCount).toBe(0);
    expect(res2.duplicateCount).toBe(1);
    // Still safely acknowledges to the client so the client marks it as synced
    expect(res2.syncedEventIds).toEqual([eventId]);
  });
});
