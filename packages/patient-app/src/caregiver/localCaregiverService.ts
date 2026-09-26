import {
  CognitiveObservation,
  CognitiveProfile,
  calculateCognitiveProfile,
  TransferEvaluation,
  PersonalCognitiveModel,
} from '@ner-mind/core';
import { IndexedDbStorageService } from '../storage/indexedDbStorage.js';
import { OfflineStorageService } from '../storage/localStorage.js';
import { LocalSession, LocalAuthService } from '../auth/localAuthService.js';
import { SpeechService } from '../audio/speechService.js';

export interface CaregiverPatientSummary {
  id: string;
  displayName: string;
  caregiverId: string;
  preferredLanguage: string;
  secondaryLanguage?: string;
  totalObservations: number;
  lastActive: string;
}

export interface CaregiverAlertItem {
  id: string;
  patientId: string;
  domain: string;
  severity: 'WARNING' | 'NEUTRAL_NOTICE';
  message: string;
  status: 'PENDING_REVIEW' | 'ACKNOWLEDGED';
  detectedAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface LanguageAuditLog {
  id: string;
  patientId: string;
  previousLanguage: string;
  newLanguage: string;
  changedBy: string;
  changedByRole: string;
  timestamp: string;
}

export const STORAGE_KEY_LANGUAGE_AUDIT_LOGS = 'ner_mind_language_audit_logs';

export class LocalCaregiverService {
  private static localAlertsStore: Map<string, CaregiverAlertItem> = new Map();

  /**
   * Returns list of patients authorized for the logged-in session.
   * Runs 100% locally from IndexedDB.
   */
  public static async getPatients(session: LocalSession): Promise<CaregiverPatientSummary[]> {
    const profile = IndexedDbStorageService.getPatientProfile();
    const obs = IndexedDbStorageService.getObservations();

    // Default primary demo patient
    const patient1: CaregiverPatientSummary = {
      id: profile.patientId,
      displayName: profile.displayName,
      caregiverId: '11111111-1111-1111-1111-111111111111', // Pranjal
      preferredLanguage: profile.preferredLanguage,
      secondaryLanguage: profile.secondaryLanguage,
      totalObservations: obs.length,
      lastActive: obs[obs.length - 1]?.timestamp || new Date().toISOString(),
    };

    // Second test patient for IDOR separation verification
    const patient2: CaregiverPatientSummary = {
      id: 'patient-ner-002',
      displayName: 'Anupama Barua',
      caregiverId: '22222222-2222-2222-2222-222222222222', // Anita
      preferredLanguage: 'as',
      secondaryLanguage: 'en',
      totalObservations: 0,
      lastActive: '2026-09-01T10:00:00.000Z',
    };

    const allPatients = [patient1, patient2];

    if (session.role === 'ADMIN' || session.role === 'HEALTH_WORKER') {
      return allPatients;
    }

    if (session.role === 'CAREGIVER') {
      return allPatients.filter((p) => p.caregiverId === session.userId || p.id === session.patientId);
    }

    if (session.role === 'PATIENT') {
      return allPatients.filter((p) => p.id === session.patientId);
    }

    return [];
  }

  /**
   * Retrieves complete dashboard data (Profile, Domain Radar, Transfer History, Observations, Alerts).
   * Runs 100% offline using deterministic calculations.
   */
  public static async getDashboardData(
    patientId: string,
    session: LocalSession
  ): Promise<{
    patient: CaregiverPatientSummary;
    cognitiveProfile: CognitiveProfile;
    transferEvaluations: TransferEvaluation[];
    observations: CognitiveObservation[];
    alerts: CaregiverAlertItem[];
    personalModel: PersonalCognitiveModel;
  }> {
    if (!LocalAuthService.isAuthorizedForPatient(session, patientId)) {
      throw new Error(`Unauthorized: You are not authorized to access patient '${patientId}'.`);
    }

    const patients = await this.getPatients(session);
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      throw new Error(`Patient '${patientId}' not found.`);
    }

    const observations = IndexedDbStorageService.getObservations().filter(
      (o) => o.patientId === patientId
    );
    const transferEvaluations = IndexedDbStorageService.getTransferHistory().filter(
      (t) => t.patientId === patientId
    );
    const personalModel = IndexedDbStorageService.getPersonalModel();

    // Compute deterministic cognitive profile across 6 domains
    const cognitiveProfile = calculateCognitiveProfile(patientId, observations);

    // Compute deterministic alerts based on observed performance trends
    const alerts = this.computeLocalAlerts(patientId, cognitiveProfile, observations);

    return {
      patient,
      cognitiveProfile,
      transferEvaluations,
      observations,
      alerts,
      personalModel,
    };
  }

  /**
   * Evaluates repeated performance trends to generate strictly neutral non-diagnostic alerts.
   */
  private static computeLocalAlerts(
    patientId: string,
    profile: CognitiveProfile,
    observations: CognitiveObservation[]
  ): CaregiverAlertItem[] {
    const alerts: CaregiverAlertItem[] = [];

    for (const [domainName, domainData] of Object.entries(profile.domains)) {
      // Check for declining trend across multiple observations
      if (domainData.trend === 'declining' && domainData.observationCount >= 2) {
        const alertId = `alert_${patientId}_${domainName}`;
        const existing = this.localAlertsStore.get(alertId);

        alerts.push(
          existing || {
            id: alertId,
            patientId,
            domain: domainName.toUpperCase(),
            severity: 'WARNING',
            message: `Repeated decline observed in ${domainName} task performance over ${domainData.observationCount} sessions. Caregiver / health-worker review recommended.`,
            status: 'PENDING_REVIEW',
            detectedAt: observations[observations.length - 1]?.timestamp || new Date().toISOString(),
          }
        );
      }
    }

    return alerts;
  }

  /**
   * Acknowledges a pending alert locally without internet.
   */
  public static acknowledgeAlert(
    alertId: string,
    reviewedBy: string
  ): CaregiverAlertItem | null {
    let alert = this.localAlertsStore.get(alertId);
    if (!alert) {
      alert = {
        id: alertId,
        patientId: 'patient-ner-001',
        domain: 'ATTENTION',
        severity: 'WARNING',
        message: 'Repeated decline observed in task performance. Caregiver review recommended.',
        status: 'ACKNOWLEDGED',
        detectedAt: new Date().toISOString(),
        acknowledgedBy: reviewedBy,
        acknowledgedAt: new Date().toISOString(),
      };
    } else {
      alert.status = 'ACKNOWLEDGED';
      alert.acknowledgedBy = reviewedBy;
      alert.acknowledgedAt = new Date().toISOString();
    }

    this.localAlertsStore.set(alertId, alert);
    return alert;
  }

  /**
   * Exports patient data locally as JSON or CSV (Zero network required).
   */
  public static exportReportOffline(patientId: string, format: 'json' | 'csv'): void {
    const profile = IndexedDbStorageService.getPatientProfile();
    const obs = IndexedDbStorageService.getObservations();
    const transfers = IndexedDbStorageService.getTransferHistory();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let mimeType = 'application/json';
    let fileExtension = 'json';
    let content = '';

    if (format === 'json') {
      content = JSON.stringify(
        {
          exportNotice: 'NER-Mind Local Offline Report (Non-Diagnostic Evaluation)',
          generatedAt: new Date().toISOString(),
          patient: profile,
          personalCognitiveModel: IndexedDbStorageService.getPersonalModel(),
          observations: obs,
          transferEvaluations: transfers,
        },
        null,
        2
      );
    } else {
      mimeType = 'text/csv';
      fileExtension = 'csv';
      const headers = ['id', 'patientId', 'domain', 'taskId', 'rawScore', 'difficulty', 'context', 'timestamp'];
      const rows = obs.map((o) => [
        o.id,
        o.patientId,
        o.domain,
        o.taskId,
        o.metrics.rawScore,
        o.difficulty,
        o.context,
        o.timestamp,
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ner_mind_report_${patientId}_${timestamp}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Updates patient language preference strictly from authorized Caregiver / Doctor account.
   * Patients CANNOT invoke this method. Records an audit entry.
   * Requirement 1, 5, 6, 7, 8
   */
  public static async updatePatientLanguage(
    patientId: string,
    newLanguage: string,
    session: LocalSession
  ): Promise<{ success: boolean; auditLog: LanguageAuditLog }> {
    // 1. Strict Authorization Check
    if (session.role === 'PATIENT') {
      throw new Error(
        'Access Denied: Patients cannot configure application language. Language selection is controlled exclusively by authorized Caregivers/Doctors.'
      );
    }

    if (!LocalAuthService.isAuthorizedForPatient(session, patientId)) {
      throw new Error(
        `Unauthorized: You do not have permissions to manage language configuration for patient '${patientId}'.`
      );
    }

    // 2. Read previous language from local patient profile
    let previousLanguage = 'en';
    try {
      const currentProfile = OfflineStorageService.getPatientProfile();
      if (currentProfile && currentProfile.preferredLanguage) {
        previousLanguage = currentProfile.preferredLanguage;
      }
    } catch {
      const dbProfile = IndexedDbStorageService.getPatientProfile();
      if (dbProfile && dbProfile.preferredLanguage) {
        previousLanguage = dbProfile.preferredLanguage;
      }
    }

    // 3. Create Audit Log Entry
    const auditLog: LanguageAuditLog = {
      id: `lang_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      previousLanguage,
      newLanguage,
      changedBy: session.displayName || session.userId,
      changedByRole: session.role,
      timestamp: new Date().toISOString(),
    };

    this.saveLanguageAuditLog(auditLog);

    // 4. Persist to local patient profile in OfflineStorageService and IndexedDbStorageService
    try {
      const currentProfile = OfflineStorageService.getPatientProfile();
      await OfflineStorageService.savePatientProfile({
        ...currentProfile,
        preferredLanguage: newLanguage as any,
      });
    } catch (e) {
      console.warn('Could not update OfflineStorageService profile:', e);
    }

    try {
      const dbProfile = IndexedDbStorageService.getPatientProfile();
      await IndexedDbStorageService.savePatientProfile({
        ...dbProfile,
        preferredLanguage: newLanguage as any,
      });
    } catch (e) {
      console.warn('Could not update IndexedDbStorageService profile:', e);
    }

    // 5. Store in local persistent storage for instant reload & offline operation
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ner_mind_patient_language', newLanguage);
    }

    // 6. Voice Synchronization (Patient UI Language -> Voice Assistant Language)
    SpeechService.setLanguage(newLanguage);

    // 7. Dispatch events so all patient components update reactively
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ner_mind_language_changed', {
          detail: { patientId, previousLanguage, newLanguage, auditLog },
        })
      );
      window.dispatchEvent(new Event('storage'));
    }

    return { success: true, auditLog };
  }

  /**
   * Retrieves all language change audit logs for a given patient.
   */
  public static getLanguageAuditLogs(patientId: string): LanguageAuditLog[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY_LANGUAGE_AUDIT_LOGS);
        if (stored) {
          const logs: LanguageAuditLog[] = JSON.parse(stored);
          return logs.filter((l) => l.patientId === patientId);
        }
      }
    } catch {}
    return [];
  }

  /**
   * Appends an audit log entry locally to persistent storage.
   */
  private static saveLanguageAuditLog(log: LanguageAuditLog): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY_LANGUAGE_AUDIT_LOGS);
        const logs: LanguageAuditLog[] = stored ? JSON.parse(stored) : [];
        logs.unshift(log); // newest first
        // keep up to 100 recent entries
        const trimmed = logs.slice(0, 100);
        localStorage.setItem(STORAGE_KEY_LANGUAGE_AUDIT_LOGS, JSON.stringify(trimmed));
      }
    } catch (e) {
      console.warn('Failed saving language audit log:', e);
    }
  }
}

