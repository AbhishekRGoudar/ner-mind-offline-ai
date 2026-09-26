import {
  CognitiveObservation,
  PersonalMemoryProfile,
  TransferEvaluation,
} from '@ner-mind/core';
import { DatabasePool } from '../db/dbPool.js';

export interface StoredPatient {
  id: string;
  displayName: string;
  caregiverId: string;
  createdAt: string;
  lastSyncedAt: string | null;
  profile: PersonalMemoryProfile;
}

export interface IPatientRepository {
  getPatient(id: string): Promise<StoredPatient | undefined>;
  getAllPatients(): Promise<StoredPatient[]>;
  getObservations(patientId: string): Promise<CognitiveObservation[]>;
  addObservation(obs: CognitiveObservation): Promise<void>;
  getTransferEvaluations(patientId: string): Promise<TransferEvaluation[]>;
  addTransferEvaluation(evaluation: TransferEvaluation): Promise<void>;
  isEventProcessed(eventId: string): Promise<boolean>;
  recordSyncEvent(
    eventId: string,
    patientId: string,
    eventType: string,
    payload: any,
    clientCreatedAt: string,
    clientSeq: number,
    hash: string
  ): Promise<boolean>; // returns true if newly inserted, false if duplicate
  updateLastSync(patientId: string, timestamp: string): Promise<void>;
  getAlertStatus(alertId: string): Promise<AlertReviewStatus>;
  setAlertStatus(alertId: string, status: AlertReviewStatus, updatedBy: string): Promise<void>;
  resetForTesting(): Promise<void>;
}

export type AlertReviewStatus = 'PENDING_REVIEW' | 'REVIEWED' | 'ACKNOWLEDGED';

export class InMemoryPatientRepository implements IPatientRepository {
  private patients = new Map<string, StoredPatient>();
  private observations = new Map<string, CognitiveObservation[]>();
  private transferEvaluations = new Map<string, TransferEvaluation[]>();
  private processedSyncEventIds = new Set<string>();
  private alertStatuses = new Map<string, AlertReviewStatus>();

  constructor() {
    this.seedDefault();
  }

  private seedDefault() {
    const initialPatientId = 'patient-ner-001';
    this.patients.set(initialPatientId, {
      id: initialPatientId,
      displayName: 'Bhaben Sharma',
      caregiverId: 'caregiver-001',
      createdAt: '2026-09-01T10:00:00.000Z',
      lastSyncedAt: null,
      profile: {
        patientId: initialPatientId,
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
        familiarObjects: [],
        familiarRoutines: [],
        familyContacts: [],
        consent: {
          status: 'granted',
          consentedBy: 'caregiver',
          grantedAt: '2026-09-01T10:00:00.000Z',
          dataRetentionDays: 365,
        },
      },
    });
    this.observations.set(initialPatientId, []);
    this.transferEvaluations.set(initialPatientId, []);

    const secondPatientId = 'patient-ner-002';
    this.patients.set(secondPatientId, {
      id: secondPatientId,
      displayName: 'Minoti Baruah',
      caregiverId: 'caregiver-002',
      createdAt: '2026-09-02T10:00:00.000Z',
      lastSyncedAt: null,
      profile: {
        patientId: secondPatientId,
        displayName: 'Minoti Baruah',
        preferredLanguage: 'en',
        secondaryLanguage: 'bn',
        accessibility: {
          highContrast: false,
          fontSize: 'standard',
          voiceInputEnabled: false,
          audioPromptsEnabled: false,
          speechRate: 1.0,
          minimumTouchTargetPx: 48,
        },
        familiarObjects: [],
        familiarRoutines: [],
        familyContacts: [],
        consent: {
          status: 'granted',
          consentedBy: 'caregiver',
          grantedAt: '2026-09-02T10:00:00.000Z',
          dataRetentionDays: 365,
        },
      },
    });
    this.observations.set(secondPatientId, []);
    this.transferEvaluations.set(secondPatientId, []);
  }

  async getPatient(id: string): Promise<StoredPatient | undefined> {
    return this.patients.get(id);
  }

  async getAllPatients(): Promise<StoredPatient[]> {
    return Array.from(this.patients.values());
  }

  async getObservations(patientId: string): Promise<CognitiveObservation[]> {
    return this.observations.get(patientId) || [];
  }

  async addObservation(obs: CognitiveObservation): Promise<void> {
    const list = await this.getObservations(obs.patientId);
    list.push(obs);
    this.observations.set(obs.patientId, list);
  }

  async getTransferEvaluations(patientId: string): Promise<TransferEvaluation[]> {
    return this.transferEvaluations.get(patientId) || [];
  }

  async addTransferEvaluation(evaluation: TransferEvaluation): Promise<void> {
    const list = await this.getTransferEvaluations(evaluation.patientId);
    list.push(evaluation);
    this.transferEvaluations.set(evaluation.patientId, list);
  }

  async isEventProcessed(eventId: string): Promise<boolean> {
    return this.processedSyncEventIds.has(eventId);
  }

  async recordSyncEvent(
    eventId: string,
    _patientId: string,
    _eventType: string,
    _payload: any,
    _clientCreatedAt: string,
    _clientSeq: number,
    _hash: string
  ): Promise<boolean> {
    if (this.processedSyncEventIds.has(eventId)) {
      return false; // Duplicate
    }
    this.processedSyncEventIds.add(eventId);
    return true; // Newly recorded
  }

  async updateLastSync(patientId: string, timestamp: string): Promise<void> {
    const p = this.patients.get(patientId);
    if (p) p.lastSyncedAt = timestamp;
  }

  async getAlertStatus(alertId: string): Promise<AlertReviewStatus> {
    return this.alertStatuses.get(alertId) || 'PENDING_REVIEW';
  }

  async setAlertStatus(alertId: string, status: AlertReviewStatus, _updatedBy: string): Promise<void> {
    this.alertStatuses.set(alertId, status);
  }

  async resetForTesting(): Promise<void> {
    this.patients.clear();
    this.seedDefault();
    this.processedSyncEventIds.clear();
    this.alertStatuses.clear();
    for (const [id] of this.patients) {
      this.observations.set(id, []);
      this.transferEvaluations.set(id, []);
    }
  }

  getProcessedEventIds(): Set<string> {
    return this.processedSyncEventIds;
  }
}

export class PostgresPatientRepository implements IPatientRepository {
  async getPatient(id: string): Promise<StoredPatient | undefined> {
    const res = await DatabasePool.query(
      `SELECT id, display_name, caregiver_id, created_at, last_synced_at, accessibility_config, consent_record, preferred_language, secondary_language
       FROM patients WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
      id: r.id,
      displayName: r.display_name,
      caregiverId: r.caregiver_id,
      createdAt: r.created_at.toISOString(),
      lastSyncedAt: r.last_synced_at ? r.last_synced_at.toISOString() : null,
      profile: {
        patientId: r.id,
        displayName: r.display_name,
        preferredLanguage: r.preferred_language,
        secondaryLanguage: r.secondary_language,
        accessibility: r.accessibility_config,
        familiarObjects: [],
        familiarRoutines: [],
        familyContacts: [],
        consent: r.consent_record,
      },
    };
  }

  async getAllPatients(): Promise<StoredPatient[]> {
    const res = await DatabasePool.query(
      `SELECT id, display_name, caregiver_id, created_at, last_synced_at, accessibility_config, consent_record, preferred_language, secondary_language
       FROM patients ORDER BY created_at DESC`
    );
    return res.rows.map(r => ({
      id: r.id,
      displayName: r.display_name,
      caregiverId: r.caregiver_id,
      createdAt: r.created_at.toISOString(),
      lastSyncedAt: r.last_synced_at ? r.last_synced_at.toISOString() : null,
      profile: {
        patientId: r.id,
        displayName: r.display_name,
        preferredLanguage: r.preferred_language,
        secondaryLanguage: r.secondary_language,
        accessibility: r.accessibility_config,
        familiarObjects: [],
        familiarRoutines: [],
        familyContacts: [],
        consent: r.consent_record,
      },
    }));
  }

  async getObservations(patientId: string): Promise<CognitiveObservation[]> {
    const res = await DatabasePool.query(
      `SELECT id, patient_id, domain, task_id, difficulty, context, raw_score, items_presented, items_correct,
              completion_time_ms, hesitation_count, cue_assistance_count, environmental_factors, observed_at
       FROM cognitive_observations WHERE patient_id = $1 ORDER BY observed_at ASC`,
      [patientId]
    );
    return res.rows.map(r => ({
      id: r.id,
      patientId: r.patient_id,
      domain: r.domain,
      taskId: r.task_id,
      difficulty: r.difficulty,
      context: r.context,
      metrics: {
        rawScore: parseFloat(r.raw_score),
        itemsPresented: r.items_presented,
        itemsCorrect: r.items_correct,
        completionTimeMs: r.completion_time_ms,
        hesitationCount: r.hesitation_count,
        cueAssistanceCount: r.cue_assistance_count,
      },
      environmentalFactors: r.environmental_factors,
      timestamp: r.observed_at.toISOString(),
    }));
  }

  async addObservation(obs: CognitiveObservation): Promise<void> {
    await DatabasePool.query(
      `INSERT INTO cognitive_observations
       (id, patient_id, domain, task_id, difficulty, context, raw_score, items_presented, items_correct, completion_time_ms, hesitation_count, cue_assistance_count, environmental_factors, observed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO NOTHING`,
      [
        obs.id,
        obs.patientId,
        obs.domain,
        obs.taskId,
        obs.difficulty,
        obs.context,
        obs.metrics.rawScore,
        obs.metrics.itemsPresented,
        obs.metrics.itemsCorrect,
        obs.metrics.completionTimeMs,
        obs.metrics.hesitationCount,
        obs.metrics.cueAssistanceCount,
        JSON.stringify(obs.environmentalFactors || {}),
        obs.timestamp,
      ]
    );
  }

  async getTransferEvaluations(patientId: string): Promise<TransferEvaluation[]> {
    const res = await DatabasePool.query(
      `SELECT id, patient_id, domain, baseline_task_id, verification_task_id, baseline_score, verification_score,
              transfer_delta, percentage_change, training_interventions_count, contexts_traversed, confidence_score,
              transfer_category, observed_report, evaluated_at
       FROM transfer_evaluations WHERE patient_id = $1 ORDER BY evaluated_at DESC`,
      [patientId]
    );
    return res.rows.map(r => ({
      patientId: r.patient_id,
      domain: r.domain,
      baselineTaskId: r.baseline_task_id,
      verificationTaskId: r.verification_task_id,
      baselineScore: parseFloat(r.baseline_score),
      verificationScore: parseFloat(r.verification_score),
      transferDelta: parseFloat(r.transfer_delta),
      percentageChange: parseFloat(r.percentage_change),
      trainingInterventionsCount: r.training_interventions_count,
      contextsTraversed: r.contexts_traversed,
      confidenceScore: parseFloat(r.confidence_score),
      transferCategory: r.transfer_category,
      observedReport: r.observed_report,
    }));
  }

  async addTransferEvaluation(evalItem: TransferEvaluation): Promise<void> {
    await DatabasePool.query(
      `INSERT INTO transfer_evaluations
       (patient_id, domain, baseline_task_id, verification_task_id, baseline_score, verification_score, transfer_delta, percentage_change, training_interventions_count, contexts_traversed, confidence_score, transfer_category, observed_report)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        evalItem.patientId,
        evalItem.domain,
        evalItem.baselineTaskId,
        evalItem.verificationTaskId,
        evalItem.baselineScore,
        evalItem.verificationScore,
        evalItem.transferDelta,
        evalItem.percentageChange,
        evalItem.trainingInterventionsCount,
        JSON.stringify(evalItem.contextsTraversed),
        evalItem.confidenceScore,
        evalItem.transferCategory,
        evalItem.observedReport,
      ]
    );
  }

  async isEventProcessed(eventId: string): Promise<boolean> {
    const res = await DatabasePool.query(
      `SELECT 1 FROM sync_events WHERE event_id = $1 LIMIT 1`,
      [eventId]
    );
    return res.rows.length > 0;
  }

  async recordSyncEvent(
    eventId: string,
    patientId: string,
    eventType: string,
    payload: any,
    clientCreatedAt: string,
    clientSeq: number,
    hash: string
  ): Promise<boolean> {
    const res = await DatabasePool.query(
      `INSERT INTO sync_events (event_id, patient_id, event_type, payload, client_created_at, client_sequence_number, idempotency_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId, patientId, eventType, JSON.stringify(payload), clientCreatedAt, clientSeq, hash]
    );
    return res.rows.length > 0;
  }

  async updateLastSync(patientId: string, timestamp: string): Promise<void> {
    await DatabasePool.query(
      `UPDATE patients SET last_synced_at = $1 WHERE id = $2`,
      [timestamp, patientId]
    );
  }

  async getAlertStatus(alertId: string): Promise<AlertReviewStatus> {
    const res = await DatabasePool.query(
      `SELECT status FROM alert_reviews WHERE alert_id = $1`,
      [alertId]
    );
    if (res.rows.length === 0) return 'PENDING_REVIEW';
    return res.rows[0].status as AlertReviewStatus;
  }

  async setAlertStatus(alertId: string, status: AlertReviewStatus, updatedBy: string): Promise<void> {
    await DatabasePool.query(
      `INSERT INTO alert_reviews (alert_id, status, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (alert_id)
       DO UPDATE SET status = EXCLUDED.status, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [alertId, status, updatedBy]
    );
  }

  async resetForTesting(): Promise<void> {
    await DatabasePool.query(`DELETE FROM alert_reviews`);
    await DatabasePool.query(`DELETE FROM cognitive_observations`);
    await DatabasePool.query(`DELETE FROM transfer_evaluations`);
    await DatabasePool.query(`DELETE FROM sync_events`);
  }
}

// Master repository singleton routing to active backend
export class PatientRepository {
  private static defaultRepo: InMemoryPatientRepository = new InMemoryPatientRepository();
  private static postgresRepo: PostgresPatientRepository = new PostgresPatientRepository();

  public static getActiveRepo(): IPatientRepository {
    if (DatabasePool.isAvailable()) {
      return this.postgresRepo;
    }
    return this.defaultRepo;
  }

  public static async getPatient(id: string): Promise<StoredPatient | undefined> {
    return this.getActiveRepo().getPatient(id);
  }

  public static async getAllPatients(): Promise<StoredPatient[]> {
    return this.getActiveRepo().getAllPatients();
  }

  public static async getObservations(patientId: string): Promise<CognitiveObservation[]> {
    return this.getActiveRepo().getObservations(patientId);
  }

  public static async addObservation(obs: CognitiveObservation): Promise<void> {
    return this.getActiveRepo().addObservation(obs);
  }

  public static async getTransferEvaluations(patientId: string): Promise<TransferEvaluation[]> {
    return this.getActiveRepo().getTransferEvaluations(patientId);
  }

  public static async addTransferEvaluation(evaluation: TransferEvaluation): Promise<void> {
    return this.getActiveRepo().addTransferEvaluation(evaluation);
  }

  public static async isEventProcessed(eventId: string): Promise<boolean> {
    return this.getActiveRepo().isEventProcessed(eventId);
  }

  public static async recordSyncEvent(
    eventId: string,
    patientId: string,
    eventType: string,
    payload: any,
    clientCreatedAt: string,
    clientSeq: number,
    hash: string
  ): Promise<boolean> {
    return this.getActiveRepo().recordSyncEvent(
      eventId,
      patientId,
      eventType,
      payload,
      clientCreatedAt,
      clientSeq,
      hash
    );
  }

  public static async updateLastSync(patientId: string, timestamp: string): Promise<void> {
    return this.getActiveRepo().updateLastSync(patientId, timestamp);
  }

  public static async getAlertStatus(alertId: string): Promise<AlertReviewStatus> {
    return this.getActiveRepo().getAlertStatus(alertId);
  }

  public static async setAlertStatus(alertId: string, status: AlertReviewStatus, updatedBy: string): Promise<void> {
    return this.getActiveRepo().setAlertStatus(alertId, status, updatedBy);
  }

  public static async resetForTesting(): Promise<void> {
    return this.getActiveRepo().resetForTesting();
  }

  // Compatibility helper for existing sync batch tests
  public static getProcessedEventIds(): Set<string> {
    return this.defaultRepo.getProcessedEventIds();
  }
}
