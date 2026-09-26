import { describe, it, expect, vi } from 'vitest';
import { PostgresPatientRepository } from '../src/repository/patientRepository.js';
import { DatabasePool } from '../src/db/dbPool.js';

describe('PostgreSQL Durable Synchronization & Deduplication', () => {
  it('guarantees idempotency via ON CONFLICT (event_id) DO NOTHING', async () => {
    const repo = new PostgresPatientRepository();

    // Mock DatabasePool.query to simulate PostgreSQL database behavior
    const executedQueries: Array<{ text: string; params?: any[] }> = [];
    const insertedEventIds = new Set<string>();

    vi.spyOn(DatabasePool, 'query').mockImplementation(async (text: string, params?: any[]) => {
      executedQueries.push({ text, params });

      if (text.includes('INSERT INTO sync_events')) {
        const eventId = params![0];
        if (insertedEventIds.has(eventId)) {
          // Conflict: DO NOTHING -> return empty rows
          return { rows: [], rowCount: 0 } as any;
        } else {
          insertedEventIds.add(eventId);
          return { rows: [{ event_id: eventId }], rowCount: 1 } as any;
        }
      }

      if (text.includes('SELECT 1 FROM sync_events')) {
        const eventId = params![0];
        return { rows: insertedEventIds.has(eventId) ? [{ 1: 1 }] : [], rowCount: insertedEventIds.has(eventId) ? 1 : 0 } as any;
      }

      return { rows: [], rowCount: 0 } as any;
    });

    const eventId = 'evt-durable-001';
    const patientId = 'patient-ner-001';

    // 1. Initial ingestion before server restart
    const firstAttempt = await repo.recordSyncEvent(
      eventId,
      patientId,
      'observation_recorded',
      { score: 0.9 },
      new Date().toISOString(),
      1,
      'hash_001'
    );
    expect(firstAttempt).toBe(true);

    // Verify it is recorded in the database
    expect(await repo.isEventProcessed(eventId)).toBe(true);

    // 2. Simulate server restart: new repository instance querying the same PostgreSQL database
    const restartedRepo = new PostgresPatientRepository();

    // 3. Re-send identical event (e.g. client retrying)
    const duplicateAttempt = await restartedRepo.recordSyncEvent(
      eventId,
      patientId,
      'observation_recorded',
      { score: 0.9 },
      new Date().toISOString(),
      1,
      'hash_001'
    );

    // Deduplication must reject insertion!
    expect(duplicateAttempt).toBe(false);

    // Verify SQL query uses strict parameterization ($1, $2, ...)
    const insertQuery = executedQueries.find(q => q.text.includes('INSERT INTO sync_events'));
    expect(insertQuery).toBeDefined();
    expect(insertQuery!.text).toContain('$1');
    expect(insertQuery!.text).toContain('$7');
    expect(insertQuery!.text).toContain('ON CONFLICT (event_id) DO NOTHING');

    vi.restoreAllMocks();
  });
});
