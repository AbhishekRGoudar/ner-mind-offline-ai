import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IndexedDbStorageService } from '../src/storage/indexedDbStorage.js';
import { LocalAuthService } from '../src/auth/localAuthService.js';
import { LocalCaregiverService } from '../src/caregiver/localCaregiverService.js';
import {
  CognitiveObservation,
  TransferEvaluation,
  PersonalizationEngine,
} from '@ner-mind/core';

describe('Phase 4: On-Device Continual Personalization & Safe Replay Integration', () => {
  let fetchSpy: any;
  const patientId = 'patient-ner-001';

  const makeObs = (
    domain: any,
    score: number,
    difficulty: number = 1,
    context: any = 'market',
    taskId: string = 'market_shopping_recall',
    cues: number = 0,
    timeMs: number = 11000
  ): CognitiveObservation => ({
    id: crypto.randomUUID(),
    patientId,
    domain,
    taskId,
    timestamp: new Date().toISOString(),
    difficulty,
    context,
    metrics: {
      rawScore: score,
      itemsPresented: 5,
      itemsCorrect: Math.round(score * 5),
      completionTimeMs: timeMs,
      hesitationCount: cues,
      cueAssistanceCount: cues,
    },
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    fetchSpy = vi.fn().mockRejectedValue(new Error('Network access is prohibited in offline mode.'));
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('navigator', { onLine: false });

    await IndexedDbStorageService.resetForTesting();
    LocalAuthService.logout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Cold Start & Default State
  // --------------------------------------------------------------------------
  it('initializes a safe cold start personal model in IndexedDB with zero confidence', async () => {
    const model = IndexedDbStorageService.getPersonalModel();

    expect(model.patientId).toBe(patientId);
    expect(model.totalSessionsCompleted).toBe(0);
    expect(model.modelVersion).toBe(1);

    for (const d of ['memory', 'attention', 'recognition', 'sequencing', 'calculation', 'planning'] as const) {
      expect(model.domainBeliefs[d].confidence).toBe(0.0);
      expect(model.domainBeliefs[d].estimatedAbility).toBe(0.50);
      expect(model.domainBeliefs[d].observationCount).toBe(0);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 2. Incremental Online Learning via recordObservation()
  // --------------------------------------------------------------------------
  it('incrementally updates personal model immediately upon recordObservation()', async () => {
    const obs = makeObs('memory', 0.80, 1, 'market', 'market_shopping_recall', 0, 9500);
    await IndexedDbStorageService.recordObservation(obs);

    const model = IndexedDbStorageService.getPersonalModel();
    expect(model.totalSessionsCompleted).toBe(1);
    expect(model.domainBeliefs.memory.observationCount).toBe(1);
    expect(model.domainBeliefs.memory.estimatedAbility).toBeGreaterThan(0.50);
    expect(model.domainBeliefs.memory.confidence).toBeGreaterThan(0.0);
    expect(model.latencyProfile.sampleCount).toBe(1);
    expect(model.latencyProfile.meanCompletionTimeMs).toBe(9500);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 3. Difficulty Adaptation & Anti-Hysteresis Cooldown
  // --------------------------------------------------------------------------
  it('advances difficulty and logs clinical rationale after sustained high performance', async () => {
    for (let i = 0; i < 4; i++) {
      const currentDiff = IndexedDbStorageService.getPersonalModel().domainBeliefs.memory.activeDifficulty;
      const obs = makeObs('memory', 1.0, currentDiff, 'market', 'market_shopping_recall', 0);
      await IndexedDbStorageService.recordObservation(obs);
    }

    const model = IndexedDbStorageService.getPersonalModel();
    expect(model.domainBeliefs.memory.activeDifficulty).toBe(2);
    expect(model.domainBeliefs.memory.cooldownRemainingSessions).toBeGreaterThanOrEqual(1);
    expect(model.adaptationHistory.length).toBeGreaterThanOrEqual(1);

    const latestAdapt = model.adaptationHistory[0];
    expect(latestAdapt.decision).toBe('increase');
    expect(latestAdapt.domain).toBe('memory');
    expect(latestAdapt.rationale).toContain('consistently strong');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 4. Transfer Association Learning via recordTransferEvaluation()
  // --------------------------------------------------------------------------
  it('learns transfer associations when transfer evaluations are recorded', async () => {
    const transferEval: TransferEvaluation = {
      patientId,
      domain: 'sequencing',
      baselineTaskId: 'morning_tea_sequence',
      verificationTaskId: 'morning_tea_sequence',
      baselineScore: 0.60,
      verificationScore: 0.88,
      transferDelta: 0.28,
      percentageChange: 46.7,
      trainingInterventionsCount: 3,
      contextsTraversed: ['kitchen', 'routine'],
      confidenceScore: 0.75,
      transferCategory: 'positive_transfer',
      observedReport: 'Observed positive transfer in selected real-life task performance.',
    };

    await IndexedDbStorageService.recordTransferEvaluation(transferEval);

    const model = IndexedDbStorageService.getPersonalModel();
    expect(model.transferAssociations.length).toBe(2);
    const kitchenAssoc = model.transferAssociations.find(a => a.trainingContext === 'kitchen');
    expect(kitchenAssoc).toBeDefined();
    expect(kitchenAssoc?.averageObservedTransferDelta).toBe(0.28);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 5. Contextual UCB Personalized Task Selection
  // --------------------------------------------------------------------------
  it('selects personalized next task balancing deficits and uncertainty', async () => {
    // Record solid calculation performance
    for (let i = 0; i < 3; i++) {
      await IndexedDbStorageService.recordObservation(
        makeObs('calculation', 0.90, 1, 'market', 'market_change_calculation')
      );
    }

    // Record low planning performance
    for (let i = 0; i < 3; i++) {
      await IndexedDbStorageService.recordObservation(
        makeObs('planning', 0.30, 1, 'routine', 'day_schedule_planner')
      );
    }

    const model = IndexedDbStorageService.getPersonalModel();
    const selection = PersonalizationEngine.selectNextPersonalizedTask(model);

    expect(selection).toBeDefined();
    expect(selection.candidate).toBeDefined();
    expect(selection.rationale.length).toBeGreaterThan(0);
    expect(selection.priorityScore).toBeGreaterThan(0);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 6. Deterministic Replay / Safe Rebuild from Raw Observations
  // --------------------------------------------------------------------------
  it('rebuilds the identical personal model from raw stored observations', async () => {
    // Record a stream of diverse observations
    await IndexedDbStorageService.recordObservation(makeObs('memory', 0.8, 1, 'market', 'market_shopping_recall'));
    await IndexedDbStorageService.recordObservation(makeObs('attention', 0.7, 1, 'craft', 'craft_pattern_cancellation'));
    await IndexedDbStorageService.recordObservation(makeObs('sequencing', 0.9, 1, 'kitchen', 'morning_tea_sequence'));

    const beforeRebuild = IndexedDbStorageService.getPersonalModel();

    // Trigger rebuild from authoritative raw observations stream
    const rebuilt = await IndexedDbStorageService.rebuildPersonalModel();

    expect(rebuilt.totalSessionsCompleted).toBe(beforeRebuild.totalSessionsCompleted);
    expect(rebuilt.domainBeliefs.memory.estimatedAbility).toBe(beforeRebuild.domainBeliefs.memory.estimatedAbility);
    expect(rebuilt.domainBeliefs.attention.estimatedAbility).toBe(beforeRebuild.domainBeliefs.attention.estimatedAbility);
    expect(rebuilt.domainBeliefs.sequencing.estimatedAbility).toBe(beforeRebuild.domainBeliefs.sequencing.estimatedAbility);
    expect(rebuilt.latencyProfile.sampleCount).toBe(beforeRebuild.latencyProfile.sampleCount);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 7. Caregiver Dashboard Integration
  // --------------------------------------------------------------------------
  it('exposes personal model insights in LocalCaregiverService dashboard query offline', async () => {
    const session = await LocalAuthService.login('caregiver_pranjal', 'CaregiverSecurePass123!');

    await IndexedDbStorageService.recordObservation(makeObs('memory', 0.85, 1, 'market', 'market_shopping_recall'));

    const dashboard = await LocalCaregiverService.getDashboardData(patientId, session);

    expect(dashboard.personalModel).toBeDefined();
    expect(dashboard.personalModel.totalSessionsCompleted).toBe(1);
    expect(dashboard.personalModel.domainBeliefs.memory.observationCount).toBe(1);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
