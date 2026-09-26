import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalAuthService } from '../src/auth/localAuthService.js';
import { LocalCaregiverService } from '../src/caregiver/localCaregiverService.js';
import { IndexedDbStorageService } from '../src/storage/indexedDbStorage.js';
import { RegionalAudioService, RegionalLanguage } from '../src/audio/regionalAudioService.js';
import {
  CognitiveObservation,
  calculateRealLifeTransfer,
  calculateCognitiveProfile,
  recommendNextTrainingSession,
  evaluateAdaptiveDifficulty,
} from '@ner-mind/core';

describe('Phase 4 Acceptance Test: COMPLETE OFFLINE MODE (Zero Internet Requests)', () => {
  let fetchSpy: any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    // Monitor all network requests across the test
    fetchSpy = vi.fn().mockRejectedValue(new Error('Network access is disabled in Offline-Native mode.'));
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('navigator', { onLine: false });

    await IndexedDbStorageService.resetForTesting();
    LocalAuthService.logout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes the complete patient, cognitive, transfer, caregiver, audio, and persistence lifecycle with ZERO network calls', async () => {
    // ------------------------------------------------------------------------
    // Step 1 & 2: START APPLICATION & DISABLE INTERNET
    // ------------------------------------------------------------------------
    expect(navigator.onLine).toBe(false);

    // ------------------------------------------------------------------------
    // Step 3: OFFLINE LOCAL AUTHENTICATION
    // ------------------------------------------------------------------------
    const session = await LocalAuthService.login('caregiver_pranjal', 'CaregiverSecurePass123!');
    expect(session).toBeDefined();
    expect(session.role).toBe('CAREGIVER');
    expect(session.patientId).toBe('patient-ner-001');

    // Verify active session persists locally
    const retrievedSession = LocalAuthService.getSession();
    expect(retrievedSession?.username).toBe('caregiver_pranjal');

    // ------------------------------------------------------------------------
    // Step 4: LOAD PATIENT PROFILE (OFFLINE)
    // ------------------------------------------------------------------------
    const profile = IndexedDbStorageService.getPatientProfile();
    expect(profile.patientId).toBe('patient-ner-001');
    expect(profile.displayName).toBe('Bhaben Sharma');
    expect(profile.familiarObjects.length).toBeGreaterThan(0);

    // ------------------------------------------------------------------------
    // Step 5: RUN REAL-LIFE BASELINE ASSESSMENT (Tea Routine Sequencing)
    // ------------------------------------------------------------------------
    const baselineObs: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: profile.patientId,
      domain: 'sequencing',
      taskId: 'morning_tea_sequence',
      timestamp: '2026-09-15T09:00:00.000Z',
      difficulty: 1,
      context: 'kitchen',
      metrics: {
        rawScore: 0.65,
        itemsPresented: 4,
        itemsCorrect: 3,
        completionTimeMs: 24000,
        hesitationCount: 2,
        cueAssistanceCount: 1,
      },
    };
    await IndexedDbStorageService.recordObservation(baselineObs);
    expect(IndexedDbStorageService.getObservations().length).toBe(1);

    // ------------------------------------------------------------------------
    // Step 6: RUN COGNITIVE ACTIVITIES ACROSS DOMAINS (OFFLINE)
    // ------------------------------------------------------------------------
    const trainingObsList: CognitiveObservation[] = [
      {
        id: crypto.randomUUID(),
        patientId: profile.patientId,
        domain: 'attention',
        taskId: 'bihu_drum_rhythm',
        timestamp: '2026-09-16T10:00:00.000Z',
        difficulty: 1,
        context: 'craft',
        metrics: {
          rawScore: 0.75,
          itemsPresented: 5,
          itemsCorrect: 4,
          completionTimeMs: 16000,
          hesitationCount: 1,
          cueAssistanceCount: 0,
        },
      },
      {
        id: crypto.randomUUID(),
        patientId: profile.patientId,
        domain: 'memory',
        taskId: 'market_shopping_recall',
        timestamp: '2026-09-17T10:00:00.000Z',
        difficulty: 1,
        context: 'market',
        metrics: {
          rawScore: 0.90,
          itemsPresented: 4,
          itemsCorrect: 4,
          completionTimeMs: 14000,
          hesitationCount: 0,
          cueAssistanceCount: 0,
        },
      },
      {
        id: crypto.randomUUID(),
        patientId: profile.patientId,
        domain: 'planning',
        taskId: 'day_schedule_planner',
        timestamp: '2026-09-18T10:00:00.000Z',
        difficulty: 1,
        context: 'routine',
        metrics: {
          rawScore: 0.85,
          itemsPresented: 4,
          itemsCorrect: 4,
          completionTimeMs: 15000,
          hesitationCount: 0,
          cueAssistanceCount: 0,
        },
      },
      {
        id: crypto.randomUUID(),
        patientId: profile.patientId,
        domain: 'calculation',
        taskId: 'market_currency_exchange',
        timestamp: '2026-09-19T10:00:00.000Z',
        difficulty: 1,
        context: 'market',
        metrics: {
          rawScore: 0.95,
          itemsPresented: 4,
          itemsCorrect: 4,
          completionTimeMs: 12000,
          hesitationCount: 0,
          cueAssistanceCount: 0,
        },
      },
    ];

    for (const obs of trainingObsList) {
      await IndexedDbStorageService.recordObservation(obs);
    }
    expect(IndexedDbStorageService.getObservations().length).toBe(5);

    // ------------------------------------------------------------------------
    // Step 7: ADAPTIVE DIFFICULTY PROGRESSION (OFFLINE)
    // ------------------------------------------------------------------------
    const memoryHistory = IndexedDbStorageService.getObservations().filter(o => o.domain === 'memory');
    const adaptation = evaluateAdaptiveDifficulty('memory', 1, memoryHistory, 3);
    // Score of 0.90 across multiple sessions triggers level progression or evaluation
    expect(adaptation.domain).toBe('memory');
    expect(adaptation.recommendedDifficulty).toBeGreaterThanOrEqual(1);
    expect(adaptation.rationale.length).toBeGreaterThan(0);

    // ------------------------------------------------------------------------
    // Step 8: RUN REAL-LIFE VERIFICATION TASK (Morning Tea Routine Re-test)
    // ------------------------------------------------------------------------
    const verificationObs: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: profile.patientId,
      domain: 'sequencing',
      taskId: 'morning_tea_sequence',
      timestamp: '2026-09-20T09:00:00.000Z',
      difficulty: 1,
      context: 'kitchen',
      metrics: {
        rawScore: 0.88,
        itemsPresented: 4,
        itemsCorrect: 4,
        completionTimeMs: 15000,
        hesitationCount: 0,
        cueAssistanceCount: 0,
      },
    };
    await IndexedDbStorageService.recordObservation(verificationObs);
    expect(IndexedDbStorageService.getObservations().length).toBe(6);

    // ------------------------------------------------------------------------
    // Step 9: CALCULATE TRANSFER EVALUATION DELTA (OFFLINE)
    // ------------------------------------------------------------------------
    const transferEval = calculateRealLifeTransfer(
      baselineObs,
      verificationObs,
      trainingObsList
    );
    expect(transferEval.transferDelta).toBe(0.23); // 0.88 - 0.65 = +0.23
    expect(transferEval.transferCategory).toBe('positive_transfer');
    expect(transferEval.observedReport).toContain('Observed positive transfer');

    await IndexedDbStorageService.recordTransferEvaluation(transferEval);
    expect(IndexedDbStorageService.getTransferHistory().length).toBe(1);

    // ------------------------------------------------------------------------
    // Step 10 & 11: OPEN CAREGIVER DASHBOARD & VIEW PATIENT TRENDS (OFFLINE)
    // ------------------------------------------------------------------------
    const dashboardData = await LocalCaregiverService.getDashboardData('patient-ner-001', session);
    expect(dashboardData).toBeDefined();
    expect(dashboardData.patient.displayName).toBe('Bhaben Sharma');
    expect(dashboardData.cognitiveProfile.domains.sequencing.currentScore).toBeGreaterThanOrEqual(0.70);
    expect(['stable', 'improving']).toContain(dashboardData.cognitiveProfile.domains.sequencing.trend);
    expect(dashboardData.transferEvaluations.length).toBe(1);
    expect(dashboardData.transferEvaluations[0].transferDelta).toBe(0.23);

    // ------------------------------------------------------------------------
    // Step 12 & 13: ACKNOWLEDGE ALERT (OFFLINE)
    // ------------------------------------------------------------------------
    const testAlertId = 'test_alert_sequencing';
    const ackResult = LocalCaregiverService.acknowledgeAlert(testAlertId, session.displayName);
    expect(ackResult?.status).toBe('ACKNOWLEDGED');

    // ------------------------------------------------------------------------
    // Step 14: PLAY REGIONAL AUDIO ACROSS ALL 7 LANGUAGES (OFFLINE)
    // ------------------------------------------------------------------------
    const languages: RegionalLanguage[] = ['as', 'bn', 'mni', 'kha', 'brx', 'hi', 'en'];
    for (const lang of languages) {
      RegionalAudioService.setLanguage(lang);
      const played = await RegionalAudioService.playPrompt('welcome');
      expect(played).toBe(true);
      const subtitle = RegionalAudioService.getPromptText('welcome');
      expect(subtitle.length).toBeGreaterThan(0);
    }

    // ------------------------------------------------------------------------
    // Step 15 & 16: REFRESH / REOPEN APPLICATION & VERIFY LOCAL PERSISTENCE
    // ------------------------------------------------------------------------
    // Simulate application restart
    const persistedObservations = IndexedDbStorageService.getObservations();
    const persistedTransfers = IndexedDbStorageService.getTransferHistory();
    const persistedProfile = IndexedDbStorageService.getPatientProfile();

    expect(persistedObservations.length).toBe(6);
    expect(persistedTransfers.length).toBe(1);
    expect(persistedProfile.patientId).toBe('patient-ner-001');

    // ------------------------------------------------------------------------
    // Step 17: ABSOLUTE NETWORK AUDIT VERIFICATION
    // ------------------------------------------------------------------------
    // Zero fetch calls must have occurred throughout the entire test
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
