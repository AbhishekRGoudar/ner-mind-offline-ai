import { openDB, IDBPDatabase } from 'idb';
import {
  CognitiveObservation,
  PersonalMemoryProfile,
  SyncEvent,
  SyncEventType,
  computeIdempotencyHash,
  SyncBatchPayload,
  TransferEvaluation,
  PersonalCognitiveModel,
  PersonalizationEngine,
  createInitialPersonalModel,
  CognitiveDomain,
} from '@ner-mind/core';

export const DEFAULT_NER_PROFILE: PersonalMemoryProfile = {
  patientId: 'patient-ner-001',
  displayName: 'Bhaben Sharma',
  preferredLanguage: 'en',
  secondaryLanguage: 'as',
  accessibility: {
    highContrast: true,
    fontSize: 'large',
    voiceInputEnabled: true,
    audioPromptsEnabled: true,
    speechRate: 0.85,
    minimumTouchTargetPx: 64,
  },
  familiarObjects: [
    {
      id: 'obj-1',
      name: 'Assam Tea Leaves',
      category: 'kitchen',
      culturalRegionTag: 'NER',
      significanceHint: 'Fresh Orthodox garden tea',
      consentToUseInGames: true,
    },
    {
      id: 'obj-2',
      name: 'Bamboo Jaapi',
      category: 'craft',
      culturalRegionTag: 'NER',
      significanceHint: 'Traditional conical woven sun hat',
      consentToUseInGames: true,
    },
    {
      id: 'obj-3',
      name: 'Fresh Bamboo Shoot',
      category: 'kitchen',
      culturalRegionTag: 'NER',
      significanceHint: 'Seasonal cooking ingredient',
      consentToUseInGames: true,
    },
    {
      id: 'obj-4',
      name: 'Gamusa',
      category: 'personal',
      culturalRegionTag: 'NER',
      significanceHint: 'Handwoven red and white traditional cloth',
      consentToUseInGames: true,
    },
  ],
  familiarRoutines: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Morning Assam Tea Routine',
      steps: ['Boil water', 'Add tea leaves', 'Add splash of milk', 'Strain into cup'],
      timeOfDay: 'morning',
      consentToUseInSequencing: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Evening Garden Walk',
      steps: ['Put on slippers', 'Walk to backyard tea garden', 'Water basil plant'],
      timeOfDay: 'evening',
      consentToUseInSequencing: true,
    },
  ],
  familyContacts: [
    {
      id: 'cnt-1',
      fullName: 'Pranjal Sharma',
      relationship: 'Son (Caregiver)',
      phoneNumber: '+91 98640 12345',
      isEmergencyContact: true,
      photoConsentGranted: true,
      voiceConsentGranted: true,
    },
  ],
  consent: {
    status: 'granted',
    consentedBy: 'caregiver',
    grantedAt: '2026-09-01T10:00:00.000Z',
    dataRetentionDays: 365,
  },
};

const DB_NAME = 'ner_mind_db';
const DB_VERSION = 3;

/**
 * Robust IndexedDB storage service fulfilling Phase 2.3A requirements:
 * - 100% durable IndexedDB backing for profiles, observations, outbox events, and transfer history.
 * - Idempotent one-time migration from legacy localStorage.
 * - Memory caching for synchronous-speed React state updates without rendering empty/flashing UI states.
 * - In-memory fallback if IndexedDB is not supported in the execution environment (e.g., Node.js unit tests).
 */
export class IndexedDbStorageService {
  private static dbPromise: Promise<IDBPDatabase> | null = null;
  private static sequenceCounter = 0;
  private static initialized = false;

  // In-memory cache synced with IndexedDB
  private static cachedProfile: PersonalMemoryProfile = DEFAULT_NER_PROFILE;
  private static cachedObservations: CognitiveObservation[] = [];
  private static cachedOutbox: SyncEvent[] = [];
  private static cachedTransfers: TransferEvaluation[] = [];
  private static cachedPersonalModel: PersonalCognitiveModel = createInitialPersonalModel(DEFAULT_NER_PROFILE.patientId);
  private static cachedRecentFingerprints: Map<string, string[]> = new Map();

  // Memory fallback storage for non-browser/test environments
  private static memoryStore = {
    profile: new Map<string, PersonalMemoryProfile>(),
    observations: new Map<string, CognitiveObservation>(),
    outbox: new Map<string, SyncEvent>(),
    transfers: [] as TransferEvaluation[],
    personalModel: new Map<string, PersonalCognitiveModel>(),
    recentTasks: new Map<string, any>(),
  };

  public static isReady(): boolean {
    return this.initialized;
  }

  public static async getDB(): Promise<IDBPDatabase | null> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('patient_profile')) {
            db.createObjectStore('patient_profile', { keyPath: 'patientId' });
          }
          if (!db.objectStoreNames.contains('observations')) {
            const obsStore = db.createObjectStore('observations', { keyPath: 'id' });
            obsStore.createIndex('idx_patientId', 'patientId');
            obsStore.createIndex('idx_domain', 'domain');
            obsStore.createIndex('idx_timestamp', 'timestamp');
          }
          if (!db.objectStoreNames.contains('sync_outbox')) {
            const outboxStore = db.createObjectStore('sync_outbox', { keyPath: 'eventId' });
            outboxStore.createIndex('idx_status', 'status');
            outboxStore.createIndex('idx_sequence', 'clientSequenceNumber');
          }
          if (!db.objectStoreNames.contains('transfer_history')) {
            const transferStore = db.createObjectStore('transfer_history', { keyPath: 'id', autoIncrement: true });
            transferStore.createIndex('idx_patientId', 'patientId');
          }
          if (!db.objectStoreNames.contains('personal_model')) {
            db.createObjectStore('personal_model', { keyPath: 'patientId' });
          }
          if (!db.objectStoreNames.contains('recent_tasks')) {
            db.createObjectStore('recent_tasks', { keyPath: 'id' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Initializes the IndexedDB storage service during app bootstrap:
   * 1. Opens IndexedDB connection
   * 2. Migrates legacy localStorage data if required
   * 3. Preloads patient profile, observations, transfer history, personal model, and sync outbox into memory cache
   */
  public static async init(): Promise<void> {
    await this.migrateFromLocalStorageIfNeeded();
    const db = await this.getDB();

    if (db) {
      // 1. Profile
      const p = await db.get('patient_profile', DEFAULT_NER_PROFILE.patientId);
      if (p) {
        this.cachedProfile = p;
      } else {
        await db.put('patient_profile', DEFAULT_NER_PROFILE);
        this.cachedProfile = DEFAULT_NER_PROFILE;
      }

      // 2. Observations
      this.cachedObservations = (await db.getAll('observations')) || [];

      // 3. Outbox
      this.cachedOutbox = (await db.getAll('sync_outbox')) || [];
      for (const e of this.cachedOutbox) {
        if (e.clientSequenceNumber > this.sequenceCounter) {
          this.sequenceCounter = e.clientSequenceNumber;
        }
      }

      // 4. Transfers
      this.cachedTransfers = (await db.getAll('transfer_history')) || [];

      // 5. Personal Cognitive Model (Continual Online Learning)
      const model = await db.get('personal_model', DEFAULT_NER_PROFILE.patientId);
      if (model) {
        this.cachedPersonalModel = model;
      } else if (this.cachedObservations.length > 0) {
        this.cachedPersonalModel = PersonalizationEngine.rebuildPersonalModelFromObservations(
          DEFAULT_NER_PROFILE.patientId,
          this.cachedObservations,
          this.cachedTransfers
        );
        await db.put('personal_model', this.cachedPersonalModel);
      } else {
        this.cachedPersonalModel = createInitialPersonalModel(DEFAULT_NER_PROFILE.patientId);
        await db.put('personal_model', this.cachedPersonalModel);
      }

      // 6. Recent Tasks
      const recentRecords = (await db.getAll('recent_tasks')) || [];
      this.cachedRecentFingerprints.clear();
      recentRecords.forEach((r: any) => {
        const key = `${r.patientId}:${r.domain}`;
        const list = this.cachedRecentFingerprints.get(key) || [];
        this.cachedRecentFingerprints.set(key, [...list, r.fingerprint].slice(-30));
      });
    } else {
      // In-memory fallback
      if (!this.memoryStore.profile.has(DEFAULT_NER_PROFILE.patientId)) {
        this.memoryStore.profile.set(DEFAULT_NER_PROFILE.patientId, DEFAULT_NER_PROFILE);
      }
      this.cachedProfile = this.memoryStore.profile.get(DEFAULT_NER_PROFILE.patientId)!;
      this.cachedObservations = Array.from(this.memoryStore.observations.values());
      this.cachedOutbox = Array.from(this.memoryStore.outbox.values());
      this.cachedTransfers = [...this.memoryStore.transfers];

      if (this.memoryStore.personalModel.has(DEFAULT_NER_PROFILE.patientId)) {
        this.cachedPersonalModel = this.memoryStore.personalModel.get(DEFAULT_NER_PROFILE.patientId)!;
      } else if (this.cachedObservations.length > 0) {
        this.cachedPersonalModel = PersonalizationEngine.rebuildPersonalModelFromObservations(
          DEFAULT_NER_PROFILE.patientId,
          this.cachedObservations,
          this.cachedTransfers
        );
        this.memoryStore.personalModel.set(DEFAULT_NER_PROFILE.patientId, this.cachedPersonalModel);
      } else {
        this.cachedPersonalModel = createInitialPersonalModel(DEFAULT_NER_PROFILE.patientId);
        this.memoryStore.personalModel.set(DEFAULT_NER_PROFILE.patientId, this.cachedPersonalModel);
      }

      this.cachedRecentFingerprints.clear();
      for (const r of this.memoryStore.recentTasks.values()) {
        const key = `${r.patientId}:${r.domain}`;
        const list = this.cachedRecentFingerprints.get(key) || [];
        this.cachedRecentFingerprints.set(key, [...list, r.fingerprint].slice(-30));
      }
    }

    this.initialized = true;
  }

  /**
   * Performs an idempotent one-time migration from legacy localStorage to IndexedDB.
   */
  public static async migrateFromLocalStorageIfNeeded(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;

    try {
      const rawProfile = localStorage.getItem('ner_mind_patient_profile');
      const rawObs = localStorage.getItem('ner_mind_observations');
      const rawOutbox = localStorage.getItem('ner_mind_sync_outbox');

      if (!rawProfile && !rawObs && !rawOutbox) {
        return false;
      }

      const db = await this.getDB();

      if (db) {
        const tx = db.transaction(['patient_profile', 'observations', 'sync_outbox'], 'readwrite');
        if (rawProfile) {
          const profile = JSON.parse(rawProfile);
          await tx.objectStore('patient_profile').put(profile);
          this.cachedProfile = profile;
        }
        if (rawObs) {
          const obsList: CognitiveObservation[] = JSON.parse(rawObs);
          for (const obs of obsList) {
            await tx.objectStore('observations').put(obs);
          }
          this.cachedObservations = obsList;
        }
        if (rawOutbox) {
          const outboxList: SyncEvent[] = JSON.parse(rawOutbox);
          for (const evt of outboxList) {
            await tx.objectStore('sync_outbox').put(evt);
            this.sequenceCounter = Math.max(this.sequenceCounter, evt.clientSequenceNumber);
          }
          this.cachedOutbox = outboxList;
        }
        await tx.done;
      } else {
        if (rawProfile) {
          const p = JSON.parse(rawProfile);
          this.memoryStore.profile.set(p.patientId, p);
          this.cachedProfile = p;
        }
        if (rawObs) {
          const obsList: CognitiveObservation[] = JSON.parse(rawObs);
          obsList.forEach(o => this.memoryStore.observations.set(o.id, o));
          this.cachedObservations = obsList;
        }
        if (rawOutbox) {
          const outboxList: SyncEvent[] = JSON.parse(rawOutbox);
          outboxList.forEach(e => this.memoryStore.outbox.set(e.eventId, e));
          this.cachedOutbox = outboxList;
        }
      }

      // Clear legacy localStorage keys and record migration marker
      localStorage.setItem('ner_mind_migrated_v1', 'true');
      localStorage.removeItem('ner_mind_patient_profile');
      localStorage.removeItem('ner_mind_observations');
      localStorage.removeItem('ner_mind_sync_outbox');
      return true;
    } catch (e) {
      console.warn('[IndexedDB] Migration warning:', e);
      return false;
    }
  }

  // --- PATIENT PROFILE ---

  public static getPatientProfile(): PersonalMemoryProfile {
    return this.cachedProfile;
  }

  public static async savePatientProfile(profile: PersonalMemoryProfile): Promise<void> {
    this.cachedProfile = profile;
    const db = await this.getDB();
    if (db) {
      await db.put('patient_profile', profile);
    } else {
      this.memoryStore.profile.set(profile.patientId, profile);
    }
    await this.enqueueSyncEvent('memory_profile_updated', profile as any);
  }

  // --- OBSERVATIONS ---

  public static getObservations(): CognitiveObservation[] {
    return [...this.cachedObservations];
  }

  public static async recordObservation(observation: CognitiveObservation): Promise<void> {
    this.cachedObservations.push(observation);
    const db = await this.getDB();
    if (db) {
      await db.put('observations', observation);
    } else {
      this.memoryStore.observations.set(observation.id, observation);
    }

    // On-Device Continual Online Learning: Update Personal Cognitive Model
    this.cachedPersonalModel = PersonalizationEngine.updatePersonalModel(
      this.cachedPersonalModel,
      observation
    );
    if (db) {
      await db.put('personal_model', this.cachedPersonalModel);
    } else {
      this.memoryStore.personalModel.set(this.cachedPersonalModel.patientId, this.cachedPersonalModel);
    }

    await this.enqueueSyncEvent('observation_recorded', observation as any);
  }

  // --- TRANSFER EVALUATIONS ---

  public static getTransferHistory(): TransferEvaluation[] {
    return [...this.cachedTransfers];
  }

  public static async recordTransferEvaluation(evaluation: TransferEvaluation): Promise<void> {
    this.cachedTransfers.push(evaluation);
    const db = await this.getDB();
    if (db) {
      await db.put('transfer_history', evaluation);
    } else {
      this.memoryStore.transfers.push(evaluation);
    }

    // Continual Learning: Update Transfer Associations
    this.cachedPersonalModel = PersonalizationEngine.recordTransferResult(
      this.cachedPersonalModel,
      evaluation
    );
    if (db) {
      await db.put('personal_model', this.cachedPersonalModel);
    } else {
      this.memoryStore.personalModel.set(this.cachedPersonalModel.patientId, this.cachedPersonalModel);
    }

    await this.enqueueSyncEvent('transfer_evaluated', evaluation as any);
  }

  // --- PERSONAL COGNITIVE MODEL (ON-DEVICE CONTINUAL LEARNING) ---

  public static getPersonalModel(): PersonalCognitiveModel {
    return this.cachedPersonalModel;
  }

  public static async savePersonalModel(model: PersonalCognitiveModel): Promise<void> {
    this.cachedPersonalModel = model;
    const db = await this.getDB();
    if (db) {
      await db.put('personal_model', model);
    } else {
      this.memoryStore.personalModel.set(model.patientId, model);
    }
  }

  public static async rebuildPersonalModel(): Promise<PersonalCognitiveModel> {
    const profile = this.getPatientProfile();
    const obs = this.getObservations();
    const transfers = this.getTransferHistory();
    const rebuilt = PersonalizationEngine.rebuildPersonalModelFromObservations(
      profile.patientId,
      obs,
      transfers
    );
    await this.savePersonalModel(rebuilt);
    return rebuilt;
  }

  // --- RECENT TASKS & ANTI-REPETITION FINGERPRINTS ---

  public static getRecentTaskFingerprints(patientId?: string, domain?: CognitiveDomain): string[] {
    const pid = patientId || this.cachedProfile.patientId;
    if (!domain) return [];
    const key = `${pid}:${domain}`;
    return this.cachedRecentFingerprints.get(key) || [];
  }

  public static async recordTaskFingerprint(patientId: string, domain: CognitiveDomain, fingerprint: string): Promise<void> {
    const key = `${patientId}:${domain}`;
    const list = this.cachedRecentFingerprints.get(key) || [];
    const updated = [...list, fingerprint].slice(-30);
    this.cachedRecentFingerprints.set(key, updated);

    const record = {
      id: `${patientId}_${domain}_${fingerprint}`,
      patientId,
      domain,
      fingerprint,
      timestamp: new Date().toISOString(),
    };

    const db = await this.getDB();
    if (db) {
      await db.put('recent_tasks', record);
    } else {
      this.memoryStore.recentTasks.set(record.id, record);
    }
  }

  // --- SYNC OUTBOX ---

  public static async enqueueSyncEvent(eventType: SyncEventType, payload: Record<string, unknown>): Promise<SyncEvent> {
    const profile = this.getPatientProfile();
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    this.sequenceCounter++;

    const hash = computeIdempotencyHash(eventId, profile.patientId, payload, timestamp);

    const event: SyncEvent = {
      eventId,
      patientId: profile.patientId,
      eventType,
      payload,
      clientCreatedAt: timestamp,
      clientSequenceNumber: this.sequenceCounter,
      idempotencyHash: hash,
      status: 'pending',
      retryCount: 0,
    };

    this.cachedOutbox.push(event);

    const db = await this.getDB();
    if (db) {
      await db.put('sync_outbox', event);
    } else {
      this.memoryStore.outbox.set(eventId, event);
    }

    return event;
  }

  public static getPendingSyncCount(): number {
    return this.cachedOutbox.filter(e => e.status === 'pending' || e.status === 'failed').length;
  }

  public static getPendingSyncEvents(): SyncEvent[] {
    return this.cachedOutbox.filter(e => e.status === 'pending' || e.status === 'failed');
  }

  public static async createSyncBatch(
    patientId: string,
    limit: number = 50,
    batchId: string = crypto.randomUUID()
  ): Promise<SyncBatchPayload | null> {
    const pending = this.cachedOutbox
      .filter(e => e.status === 'pending' || e.status === 'failed')
      .slice(0, limit);

    if (pending.length === 0) return null;

    const db = await this.getDB();
    if (db) {
      const tx = db.transaction('sync_outbox', 'readwrite');
      for (const e of pending) {
        e.status = 'syncing';
        await tx.store.put(e);
      }
      await tx.done;
    } else {
      for (const e of pending) {
        e.status = 'syncing';
        this.memoryStore.outbox.set(e.eventId, e);
      }
    }

    return {
      batchId,
      patientId,
      deviceTimestamp: new Date().toISOString(),
      events: [...pending],
    };
  }

  public static async acknowledgeSynced(eventIds: string[]): Promise<void> {
    const idSet = new Set(eventIds);
    for (const e of this.cachedOutbox) {
      if (idSet.has(e.eventId)) {
        e.status = 'synced';
      }
    }

    const db = await this.getDB();
    if (db) {
      const tx = db.transaction('sync_outbox', 'readwrite');
      for (const id of eventIds) {
        const item: SyncEvent | undefined = await tx.store.get(id);
        if (item) {
          item.status = 'synced';
          await tx.store.put(item);
        }
      }
      await tx.done;
    } else {
      for (const id of eventIds) {
        const item = this.memoryStore.outbox.get(id);
        if (item) {
          item.status = 'synced';
        }
      }
    }
  }

  public static async markSyncFailed(eventIds: string[], _reason?: string): Promise<void> {
    const idSet = new Set(eventIds);
    for (const e of this.cachedOutbox) {
      if (idSet.has(e.eventId)) {
        e.status = 'failed';
        e.retryCount = (e.retryCount || 0) + 1;
      }
    }

    const db = await this.getDB();
    if (db) {
      const tx = db.transaction('sync_outbox', 'readwrite');
      for (const id of eventIds) {
        const item: SyncEvent | undefined = await tx.store.get(id);
        if (item) {
          item.status = 'failed';
          item.retryCount = (item.retryCount || 0) + 1;
          await tx.store.put(item);
        }
      }
      await tx.done;
    } else {
      for (const id of eventIds) {
        const item = this.memoryStore.outbox.get(id);
        if (item) {
          item.status = 'failed';
          item.retryCount = (item.retryCount || 0) + 1;
        }
      }
    }
  }

  public static async resetForTesting(): Promise<void> {
    this.sequenceCounter = 0;
    this.cachedProfile = { ...DEFAULT_NER_PROFILE };
    this.cachedObservations = [];
    this.cachedOutbox = [];
    this.cachedTransfers = [];
    this.cachedPersonalModel = createInitialPersonalModel(DEFAULT_NER_PROFILE.patientId);
    this.cachedRecentFingerprints.clear();
    this.memoryStore.profile.clear();
    this.memoryStore.observations.clear();
    this.memoryStore.outbox.clear();
    this.memoryStore.transfers = [];
    this.memoryStore.personalModel.clear();
    this.memoryStore.recentTasks.clear();

    const db = await this.getDB();
    if (db) {
      const tx = db.transaction(['patient_profile', 'observations', 'sync_outbox', 'transfer_history', 'personal_model', 'recent_tasks'], 'readwrite');
      await tx.objectStore('patient_profile').clear();
      await tx.objectStore('observations').clear();
      await tx.objectStore('sync_outbox').clear();
      await tx.objectStore('transfer_history').clear();
      await tx.objectStore('personal_model').clear();
      await tx.objectStore('recent_tasks').clear();
      await tx.done;
    }
    this.initialized = true;
  }
}
