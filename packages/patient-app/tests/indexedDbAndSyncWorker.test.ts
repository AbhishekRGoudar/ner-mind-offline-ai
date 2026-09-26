import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IndexedDbStorageService } from '../src/storage/indexedDbStorage.js';
import { SyncWorker } from '../src/sync/syncWorker.js';
import { CognitiveObservation, TransferEvaluation } from '@ner-mind/core';

describe('Phase 2.3 Client Storage & SyncWorker: Tests 1–9', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await IndexedDbStorageService.resetForTesting();
  });

  // 1. IndexedDB persistence
  it('persists patient profile, observations, and transfer history in storage', async () => {
    const profile = IndexedDbStorageService.getPatientProfile();
    expect(profile.patientId).toBe('patient-ner-001');

    const sampleObs: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: profile.patientId,
      domain: 'memory',
      taskId: 'market_shopping_recall',
      timestamp: new Date().toISOString(),
      difficulty: 2,
      context: 'market',
      metrics: {
        rawScore: 0.85,
        itemsPresented: 5,
        itemsCorrect: 4,
        completionTimeMs: 14200,
        hesitationCount: 1,
        cueAssistanceCount: 0,
      },
    };

    await IndexedDbStorageService.recordObservation(sampleObs);
    const obsList = IndexedDbStorageService.getObservations();
    expect(obsList.length).toBe(1);
    expect(obsList[0].id).toBe(sampleObs.id);

    const sampleTransfer: TransferEvaluation = {
      patientId: profile.patientId,
      domain: 'sequencing',
      baselineTaskId: 'morning_tea_sequence',
      verificationTaskId: 'morning_tea_sequence',
      baselineScore: 0.5,
      verificationScore: 0.8,
      transferDelta: 0.3,
      percentageChange: 60.0,
      trainingInterventionsCount: 2,
      contextsTraversed: ['kitchen', 'market'],
      confidenceScore: 0.8,
      transferCategory: 'positive_transfer',
      observedReport: 'Observed increase in selected tea routine task performance.',
      evaluatedAt: new Date().toISOString(),
    };

    await IndexedDbStorageService.recordTransferEvaluation(sampleTransfer);
    const transfers = IndexedDbStorageService.getTransferHistory();
    expect(transfers.length).toBe(1);
    expect(transfers[0].transferDelta).toBe(0.3);
  });

  // 2. App reload persistence
  it('survives app reload: re-initializing reloads data from storage without loss', async () => {
    const profile = IndexedDbStorageService.getPatientProfile();
    const obs: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: profile.patientId,
      domain: 'calculation',
      taskId: 'market_change_calculation',
      timestamp: new Date().toISOString(),
      difficulty: 1,
      context: 'market',
      metrics: {
        rawScore: 0.9,
        itemsPresented: 4,
        itemsCorrect: 4,
        completionTimeMs: 9800,
        hesitationCount: 0,
        cueAssistanceCount: 0,
      },
    };

    await IndexedDbStorageService.recordObservation(obs);

    // Simulate closing app and re-initializing
    await IndexedDbStorageService.init();

    const reloadedObs = IndexedDbStorageService.getObservations();
    expect(reloadedObs.length).toBe(1);
    expect(reloadedObs[0].taskId).toBe('market_change_calculation');
  });

  // 3. localStorage -> IndexedDB migration
  it('migrates legacy localStorage items to IndexedDB and cleans up legacy keys', async () => {
    // Mock window & localStorage
    const mockStorage: Record<string, string> = {
      ner_mind_patient_profile: JSON.stringify({
        patientId: 'patient-ner-001',
        displayName: 'Migrated Bhaben',
        preferredLanguage: 'as',
        secondaryLanguage: 'en',
        accessibility: {
          highContrast: true,
          fontSize: 'large',
          voiceInputEnabled: true,
          audioPromptsEnabled: true,
          speechRate: 0.85,
          minimumTouchTargetPx: 64,
        },
        familiarObjects: [],
        familiarRoutines: [],
        familyContacts: [],
        consent: {
          status: 'granted',
          consentedBy: 'caregiver',
          grantedAt: '2026-09-01T10:00:00.000Z',
          dataRetentionDays: 365,
        },
      }),
      ner_mind_observations: JSON.stringify([
        {
          id: 'obs-legacy-001',
          patientId: 'patient-ner-001',
          domain: 'attention',
          taskId: 'craft_pattern_cancellation',
          timestamp: '2026-09-01T10:00:00.000Z',
          difficulty: 1,
          context: 'craft',
          metrics: {
            rawScore: 0.75,
            itemsPresented: 8,
            itemsCorrect: 6,
            completionTimeMs: 12000,
            hesitationCount: 1,
            cueAssistanceCount: 0,
          },
        },
      ]),
    };

    // Setup global localStorage mock
    (global as any).window = { addEventListener: () => {} };
    (global as any).localStorage = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => { mockStorage[k] = v; },
      removeItem: (k: string) => { delete mockStorage[k]; },
    };

    const didMigrate = await IndexedDbStorageService.migrateFromLocalStorageIfNeeded();
    expect(didMigrate).toBe(true);

    const profile = IndexedDbStorageService.getPatientProfile();
    expect(profile.displayName).toBe('Migrated Bhaben');

    const obs = IndexedDbStorageService.getObservations();
    expect(obs.some(o => o.id === 'obs-legacy-001')).toBe(true);

    // Legacy keys must be purged
    expect(mockStorage['ner_mind_patient_profile']).toBeUndefined();
    expect(mockStorage['ner_mind_observations']).toBeUndefined();
    expect(mockStorage['ner_mind_migrated_v1']).toBe('true');

    delete (global as any).window;
    delete (global as any).localStorage;
  });

  // 4. Outbox creation
  it('creates offline outbox event with cryptographic idempotency hash on recording observation', async () => {
    const profile = IndexedDbStorageService.getPatientProfile();
    const event = await IndexedDbStorageService.enqueueSyncEvent('observation_recorded', {
      taskId: 'planning_day_schedule',
      score: 0.8,
    });

    expect(event.eventId).toBeDefined();
    expect(event.patientId).toBe(profile.patientId);
    expect(event.status).toBe('pending');
    expect(event.idempotencyHash.startsWith('h_')).toBe(true);
    expect(IndexedDbStorageService.getPendingSyncCount()).toBe(1);
  });

  // 5. SyncWorker successful sync
  it('SyncWorker successfully synchronizes pending batch and acknowledges synced events', async () => {
    await IndexedDbStorageService.enqueueSyncEvent('observation_recorded', {
      taskId: 'test_task',
      score: 0.95,
    });

    const worker = SyncWorker.getInstance();
    worker.setAuthToken('mock-valid-bearer-token');

    // Mock global fetch to simulate server sync endpoint
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/sync')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            processedBatchId: 'batch-123',
            processedCount: 1,
            serverTimestamp: new Date().toISOString(),
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    const success = await worker.syncNow();
    expect(success).toBe(true);
    expect(IndexedDbStorageService.getPendingSyncCount()).toBe(0);
    expect(worker.getStatusInfo().state).toBe('SUCCESS');
  });

  // 6. SyncWorker retry after network failure
  it('SyncWorker handles network failure with exponential backoff scheduling without losing events', async () => {
    await IndexedDbStorageService.enqueueSyncEvent('observation_recorded', {
      taskId: 'network_fail_test',
    });

    const worker = SyncWorker.getInstance();
    worker.setAuthToken('mock-valid-token');

    // Mock fetch throwing network error
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline or connection reset'));

    const success = await worker.syncNow();
    expect(success).toBe(false);

    // Event must remain safely in storage
    expect(IndexedDbStorageService.getPendingSyncCount()).toBe(1);
    const status = worker.getStatusInfo();
    expect(status.state).toBe('ERROR');
    expect(status.retryAttempt).toBe(1);
    worker.destroy();
  });

  // 7. Duplicate event submission
  it('prevents event loss and handles duplicate submissions idempotently', async () => {
    const event = await IndexedDbStorageService.enqueueSyncEvent('observation_recorded', {
      taskId: 'idempotent_task',
    });

    const batch = await IndexedDbStorageService.createSyncBatch('patient-ner-001');
    expect(batch).not.toBeNull();
    expect(batch!.events.length).toBe(1);
    expect(batch!.events[0].eventId).toBe(event.eventId);

    // Acknowledge event
    await IndexedDbStorageService.acknowledgeSynced([event.eventId]);
    expect(IndexedDbStorageService.getPendingSyncCount()).toBe(0);

    // Creating second batch should return null (no duplicate pending events)
    const nextBatch = await IndexedDbStorageService.createSyncBatch('patient-ner-001');
    expect(nextBatch).toBeNull();
  });

  // 8. Concurrent sync prevention
  it('prevents concurrent sync executions using atomic synchronization lock', async () => {
    await IndexedDbStorageService.enqueueSyncEvent('observation_recorded', {
      taskId: 'concurrent_task',
    });

    const worker = SyncWorker.getInstance();
    worker.setAuthToken('mock-valid-token');

    let resolveFetch: any;
    const slowFetchPromise = new Promise(resolve => {
      resolveFetch = resolve;
    });

    global.fetch = vi.fn().mockImplementation(async () => {
      await slowFetchPromise;
      return {
        ok: true,
        status: 200,
        json: async () => ({ processedCount: 1 }),
      };
    });

    // Fire first sync
    const firstSyncPromise = worker.syncNow();

    // Fire second sync concurrently while first is still pending
    const secondSyncResult = await worker.syncNow();

    // Concurrent trigger must be rejected immediately by lock
    expect(secondSyncResult).toBe(false);

    // Unblock first sync
    resolveFetch();
    const firstSyncResult = await firstSyncPromise;
    expect(firstSyncResult).toBe(true);
  });

  // 9. Authentication failure during sync
  it('handles authentication failure (HTTP 401) during sync by retaining outbox and flagging auth required', async () => {
    await IndexedDbStorageService.enqueueSyncEvent('observation_recorded', {
      taskId: 'auth_fail_task',
    });

    const worker = SyncWorker.getInstance();
    worker.setAuthToken('expired-invalid-token');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized', message: 'Session expired' }),
    });

    const success = await worker.syncNow();
    expect(success).toBe(false);
    expect(worker.getStatusInfo().state).toBe('AUTH_REQUIRED');

    // Events are NOT deleted; they remain in outbox for subsequent retry after login
    expect(IndexedDbStorageService.getPendingSyncCount()).toBe(1);
  });
});
