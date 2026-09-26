import {
  CognitiveObservation,
  PersonalMemoryProfile,
  SyncEvent,
  TransferEvaluation,
} from '@ner-mind/core';
import {
  IndexedDbStorageService,
  DEFAULT_NER_PROFILE,
} from './indexedDbStorage.js';

export { DEFAULT_NER_PROFILE };

/**
 * OfflineStorageService proxy delegating 100% to IndexedDbStorageService.
 * Replaces legacy synchronous localStorage with durable IndexedDB.
 */
export class OfflineStorageService {
  public static isReady(): boolean {
    return IndexedDbStorageService.isReady();
  }

  public static async init(): Promise<void> {
    await IndexedDbStorageService.init();
  }

  public static getPatientProfile(): PersonalMemoryProfile {
    return IndexedDbStorageService.getPatientProfile();
  }

  public static async savePatientProfile(profile: PersonalMemoryProfile): Promise<void> {
    await IndexedDbStorageService.savePatientProfile(profile);
  }

  public static getObservations(): CognitiveObservation[] {
    return IndexedDbStorageService.getObservations();
  }

  public static async recordObservation(observation: CognitiveObservation): Promise<void> {
    await IndexedDbStorageService.recordObservation(observation);
  }

  public static getTransferHistory(): TransferEvaluation[] {
    return IndexedDbStorageService.getTransferHistory();
  }

  public static async recordTransferEvaluation(evaluation: TransferEvaluation): Promise<void> {
    await IndexedDbStorageService.recordTransferEvaluation(evaluation);
  }

  public static async enqueueSyncEvent(eventType: any, payload: Record<string, unknown>): Promise<SyncEvent> {
    return await IndexedDbStorageService.enqueueSyncEvent(eventType, payload);
  }

  public static getPendingSyncCount(): number {
    return IndexedDbStorageService.getPendingSyncCount();
  }

  public static getPendingSyncEvents(): SyncEvent[] {
    return IndexedDbStorageService.getPendingSyncEvents();
  }

  public static async acknowledgeSynced(eventIds: string[]): Promise<void> {
    await IndexedDbStorageService.acknowledgeSynced(eventIds);
  }

  public static getPersonalModel() {
    return IndexedDbStorageService.getPersonalModel();
  }

  public static async savePersonalModel(model: any): Promise<void> {
    await IndexedDbStorageService.savePersonalModel(model);
  }

  public static async rebuildPersonalModel() {
    return await IndexedDbStorageService.rebuildPersonalModel();
  }

  public static getRecentTaskFingerprints(patientId?: string, domain?: any): string[] {
    return IndexedDbStorageService.getRecentTaskFingerprints(patientId, domain);
  }

  public static async recordTaskFingerprint(patientId: string, domain: any, fingerprint: string): Promise<void> {
    await IndexedDbStorageService.recordTaskFingerprint(patientId, domain, fingerprint);
  }
}
