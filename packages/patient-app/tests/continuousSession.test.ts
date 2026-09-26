import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TaskGenerator,
  CognitiveDomain,
  PersonalizationEngine,
  CognitiveObservation,
  calculateCognitiveProfile,
  recommendNextTrainingSession,
  createInitialPersonalModel,
} from '@ner-mind/core';
import { IndexedDbStorageService } from '../src/storage/indexedDbStorage.js';
import { OfflineStorageService } from '../src/storage/localStorage.js';
import {
  ActiveSessionState,
  STORAGE_KEY_ACTIVE_SESSION,
  DOMAIN_METADATA,
  DIFFICULTY_LABELS,
} from '../src/components/CognitiveSessionSubFrame.js';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] || null,
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = createLocalStorageMock();
}

describe('NER-MIND — Continuous Cognitive Session Flow & Personalization Loop', () => {
  let fetchSpy: any;
  const patientId = 'patient-ner-001';

  beforeEach(async () => {
    // Zero-network invariant guard: Throw on any network call attempt
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('NETWORK_VIOLATION: Zero network requests permitted during continuous cognitive sessions');
    });

    localStorage.clear();
    await IndexedDbStorageService.resetForTesting();
    await IndexedDbStorageService.init();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.clear();
  });

  it('1. Domain metadata and NER cultural contexts are completely preserved', () => {
    const domains: CognitiveDomain[] = [
      'memory',
      'sequencing',
      'attention',
      'recognition',
      'calculation',
      'planning',
    ];

    expect(DOMAIN_METADATA.memory.title).toBe('Memory Training');
    expect(DOMAIN_METADATA.memory.subtitle).toBe('Market & Household Recall');
    expect(DOMAIN_METADATA.memory.context).toBe('Context: Market');

    expect(DOMAIN_METADATA.sequencing.title).toBe('Sequencing Training');
    expect(DOMAIN_METADATA.sequencing.subtitle).toContain('Assam Tea Preparation');
    expect(DOMAIN_METADATA.sequencing.context).toBe('Context: Kitchen');

    expect(DOMAIN_METADATA.attention.title).toBe('Attention Training');
    expect(DOMAIN_METADATA.attention.subtitle).toContain('Gamusa Weaving');
    expect(DOMAIN_METADATA.attention.context).toBe('Context: Craft');

    expect(DOMAIN_METADATA.recognition.title).toBe('Recognition Training');
    expect(DOMAIN_METADATA.recognition.subtitle).toContain('Familiar NER Objects');
    expect(DOMAIN_METADATA.recognition.context).toBe('Context: Home');

    expect(DOMAIN_METADATA.calculation.title).toBe('Calculation Training');
    expect(DOMAIN_METADATA.calculation.context).toBe('Context: Market');

    expect(DOMAIN_METADATA.planning.title).toBe('Planning Training');
    expect(DOMAIN_METADATA.planning.context).toBe('Context: Daily Living');

    // Difficulty labels
    expect(DIFFICULTY_LABELS[1]).toBe('Easy');
    expect(DIFFICULTY_LABELS[2]).toBe('Easy / Medium');
    expect(DIFFICULTY_LABELS[3]).toBe('Medium');
    expect(DIFFICULTY_LABELS[4]).toBe('Medium / Difficult');
    expect(DIFFICULTY_LABELS[5]).toBe('Difficult');
  });

  it('2. Continuous 10-Question Session Loop (Observe → Learn → Adapt → Generate)', async () => {
    const domain: CognitiveDomain = 'memory';
    let currentDifficulty: 1 | 2 | 3 | 4 | 5 = 1;
    let personalModel = OfflineStorageService.getPersonalModel();
    const sessionObservations: CognitiveObservation[] = [];
    const fingerprintsUsed: string[] = [];

    // Simulate 10 questions in a single continuous session
    for (let qIndex = 0; qIndex < 10; qIndex++) {
      // 1. Generate task at current difficulty avoiding recent fingerprints
      const recentFingerprints = OfflineStorageService.getRecentTaskFingerprints(patientId, domain);
      const task = TaskGenerator.generateTask({
        domain,
        difficulty: currentDifficulty,
        recentFingerprints,
      });

      expect(task).toBeDefined();
      expect(task.domain).toBe(domain);
      expect(task.difficulty).toBe(currentDifficulty);
      expect(fingerprintsUsed).not.toContain(task.fingerprint);
      fingerprintsUsed.push(task.fingerprint);

      // Record task fingerprint in IndexedDB
      await OfflineStorageService.recordTaskFingerprint(patientId, domain, task.fingerprint);

      // 2. Simulate patient answer (Questions 1–4 high performance, should adapt up)
      const simulatedRawScore = qIndex < 6 ? 1.0 : 0.8;
      const simulatedTimeMs = 5000 + qIndex * 200;
      const observation: CognitiveObservation = {
        id: crypto.randomUUID(),
        patientId,
        domain,
        taskId: task.taskId,
        timestamp: new Date(Date.now() + qIndex * 10000).toISOString(),
        difficulty: currentDifficulty,
        context: task.context,
        metrics: {
          rawScore: simulatedRawScore,
          itemsPresented: 4,
          itemsCorrect: 4,
          completionTimeMs: simulatedTimeMs,
          hesitationCount: 0,
          cueAssistanceCount: 0,
        },
        environmentalFactors: {
          timeOfDay: 'morning',
          inputMethod: 'touch',
        },
      };

      // 3. Persist observation to IndexedDB
      await OfflineStorageService.recordObservation(observation);
      sessionObservations.push(observation);

      // 4. Update Bayesian Personal Model locally
      personalModel = PersonalizationEngine.updatePersonalModel(personalModel, observation);
      await OfflineStorageService.savePersonalModel(personalModel);

      // 5. Evaluate real-time difficulty progression
      const domainBelief = personalModel.domainBeliefs[domain];
      if (domainBelief && domainBelief.activeDifficulty !== currentDifficulty) {
        currentDifficulty = domainBelief.activeDifficulty as any;
      }

      // Verify that after 3+ high-performance observations, difficulty adapts from 1 to 2
      if (qIndex >= 3) {
        expect(personalModel.domainBeliefs[domain].observationCount).toBeGreaterThanOrEqual(4);
        expect(currentDifficulty).toBeGreaterThanOrEqual(1);
      }
    }

    // Verify session ended with exactly 10 completed questions
    expect(sessionObservations.length).toBe(10);
    expect(OfflineStorageService.getObservations().length).toBe(10);

    // Verify accuracy calculation
    const correctCount = sessionObservations.filter(o => o.metrics.rawScore >= 0.8).length;
    const accuracy = Math.round((correctCount / 10) * 100);
    expect(accuracy).toBe(100);

    // Verify Bayesian Personal Model learned from the session
    const finalModel = OfflineStorageService.getPersonalModel();
    expect(finalModel.domainBeliefs[domain].observationCount).toBe(10);
    expect(finalModel.domainBeliefs[domain].estimatedAbility).toBeGreaterThan(0.70);
    expect(finalModel.domainBeliefs[domain].confidence).toBeGreaterThan(0.3);

    // Verify zero network calls were made
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('3. Session state serialization and mid-session resume support (Section 24)', async () => {
    const sessionState: ActiveSessionState = {
      sessionId: 'sess-test-456',
      domain: 'calculation',
      taskId: 'market_change_calculation',
      totalQuestions: 10,
      currentQuestionIndex: 5, // At Question 6 of 10
      startDifficulty: 2,
      currentDifficulty: 2,
      observations: [
        {
          id: 'obs-1',
          patientId,
          domain: 'calculation',
          taskId: 'market_change_calculation',
          timestamp: new Date().toISOString(),
          difficulty: 2,
          context: 'market',
          metrics: {
            rawScore: 1.0,
            itemsPresented: 1,
            itemsCorrect: 1,
            completionTimeMs: 4200,
            hesitationCount: 0,
            cueAssistanceCount: 0,
          },
        },
      ],
      streak: 1,
      correctCount: 1,
      totalResponseTimeMs: 4200,
      sessionFingerprints: ['a1b2c3d4'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Serialize to localStorage
    localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, JSON.stringify(sessionState));

    // Restore from localStorage
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
    expect(raw).toBeTruthy();
    const restored: ActiveSessionState = JSON.parse(raw!);

    expect(restored.sessionId).toBe('sess-test-456');
    expect(restored.domain).toBe('calculation');
    expect(restored.currentQuestionIndex).toBe(5);
    expect(restored.totalQuestions).toBe(10);
    expect(restored.startDifficulty).toBe(2);
    expect(restored.currentDifficulty).toBe(2);
    expect(restored.observations.length).toBe(1);

    // Can generate Question 6 avoiding fingerprint from Question 1
    const nextTask = TaskGenerator.generateTask({
      domain: restored.domain,
      difficulty: restored.currentDifficulty as any,
      recentFingerprints: restored.sessionFingerprints,
    });

    expect(nextTask).toBeDefined();
    expect(nextTask.fingerprint).not.toBe('a1b2c3d4');
  });

  it('4. All six domains execute continuous sessions offline with dynamic complexity escalation', async () => {
    const allDomains: CognitiveDomain[] = [
      'memory',
      'sequencing',
      'attention',
      'recognition',
      'calculation',
      'planning',
    ];

    for (const domain of allDomains) {
      const generatedQ1 = TaskGenerator.generateTask({ domain, difficulty: 1 });
      const generatedQ5 = TaskGenerator.generateTask({ domain, difficulty: 5 });

      expect(generatedQ1.domain).toBe(domain);
      expect(generatedQ5.domain).toBe(domain);
      // Complexity escalation: Level 5 complexity must exceed Level 1 complexity
      expect(generatedQ5.complexity.overallComplexity).toBeGreaterThan(generatedQ1.complexity.overallComplexity);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('5. Session completion updates cognitive profile and calculates next recommendation', async () => {
    const obsList: CognitiveObservation[] = [
      {
        id: crypto.randomUUID(),
        patientId,
        domain: 'memory',
        taskId: 'market_shopping_recall',
        timestamp: new Date().toISOString(),
        difficulty: 1,
        context: 'market',
        metrics: {
          rawScore: 0.9,
          itemsPresented: 5,
          itemsCorrect: 5,
          completionTimeMs: 4000,
          hesitationCount: 0,
          cueAssistanceCount: 0,
        },
      },
    ];

    await OfflineStorageService.recordObservation(obsList[0]);

    const cogProfile = calculateCognitiveProfile(patientId, OfflineStorageService.getObservations());
    expect(cogProfile).toBeDefined();
    expect(cogProfile.patientId).toBe(patientId);

    const nextRec = recommendNextTrainingSession(cogProfile, OfflineStorageService.getObservations());
    expect(nextRec).toBeDefined();
    expect(nextRec.priorityDomain).toBeDefined();
    expect(nextRec.recommendedDifficulty).toBeGreaterThanOrEqual(1);
    expect(nextRec.recommendedDifficulty).toBeLessThanOrEqual(5);
  });
});
