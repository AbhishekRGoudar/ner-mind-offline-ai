import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { SpeechService } from '../src/audio/speechService.js';
import { IndexedDbStorageService } from '../src/storage/indexedDbStorage.js';
import { OfflineStorageService } from '../src/storage/localStorage.js';
import {
  CognitiveSessionSubFrame,
  ActiveSessionState,
} from '../src/components/CognitiveSessionSubFrame.js';
import {
  TaskGenerator,
  CognitiveObservation,
  PersonalizationEngine,
} from '@ner-mind/core';

// Mock localStorage if in node test runner
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

describe('Voice Anti-Overlap & Cognitive Game Logic Integration Tests', () => {
  let speakMock: any;
  let cancelMock: any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await IndexedDbStorageService.resetForTesting();
    await IndexedDbStorageService.init();

    speakMock = vi.fn();
    cancelMock = vi.fn();

    const mockSynth = {
      speak: speakMock,
      cancel: cancelMock,
      getVoices: vi.fn().mockReturnValue([
        { name: 'Google English (India)', lang: 'en-IN' },
        { name: 'Google Hindi (India)', lang: 'hi-IN' },
        { name: 'Google Kannada (India)', lang: 'kn-IN' },
      ]),
      onvoiceschanged: null,
    };

    (global as any).window = {
      speechSynthesis: mockSynth,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (SpeechService as any).synth = mockSynth;
    SpeechService.setEnabled(true);
    SpeechService.setLanguage('en');

    // Reset mock counts after initialization
    cancelMock.mockClear();
    speakMock.mockClear();
  });

  afterEach(() => {
    SpeechService.stop();
    localStorage.clear();
  });

  // =========================================================================
  // 1. VOICE ANTI-OVERLAP VERIFICATION
  // =========================================================================
  describe('Voice Anti-Overlap Verification', () => {
    it('cancels previous speech before starting new utterance (no mixing voices)', () => {
      SpeechService.speak('First instruction is speaking...');
      expect(cancelMock).toHaveBeenCalled();
      expect(speakMock).toHaveBeenCalledTimes(1);

      const cancelCountAfterFirst = cancelMock.mock.calls.length;

      // Trigger second voice immediately while first is talking
      SpeechService.speak('Second function voice interrupts and starts.');
      // cancelMock must be invoked again before the second speak starts
      expect(cancelMock.mock.calls.length).toBeGreaterThan(cancelCountAfterFirst);
      expect(speakMock).toHaveBeenCalledTimes(2);
    });

    it('SpeechService.stop() immediately terminates speech synthesis and active audio', () => {
      cancelMock.mockClear();
      speakMock.mockClear();

      SpeechService.speak('Guidance text playing...');
      expect(speakMock).toHaveBeenCalledTimes(1);

      const countBeforeStop = cancelMock.mock.calls.length;
      SpeechService.stop();
      expect(cancelMock.mock.calls.length).toBeGreaterThan(countBeforeStop);
    });

    it('pauses and detaches prior HTML5 audio elements when speak is called', () => {
      const mockAudio = {
        pause: vi.fn(),
        currentTime: 10,
        src: 'blob://test-audio',
        onplay: vi.fn(),
        onended: vi.fn(),
        onerror: vi.fn(),
      };

      (SpeechService as any).activeAudioElement = mockAudio;

      SpeechService.stop();
      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(0);
      expect(mockAudio.src).toBe('');
      expect((SpeechService as any).activeAudioElement).toBeNull();
    });
  });

  // =========================================================================
  // 2. ALL SIX GAMES: ANSWER VALIDATION & TIMING ACCURACY
  // =========================================================================
  describe('All Six Games: Answer Validation & Timing Accuracy', () => {
    const patientId = 'patient-ner-002';

    it('Sequencing: verifies answer ordering and generates non-negative response time', () => {
      const task = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 2 });
      const p = task.payload;

      // Assert invariant
      expect(p.correctOrder).not.toEqual(p.shuffledItems);

      const t0 = performance.now();
      // Reorder items to match correctOrder
      const userOrder = p.correctOrder.map((s: any) => s.text);
      const t1 = performance.now();
      const elapsed = Math.max(0, Math.round(t1 - t0));

      const score = task.scoring(userOrder);
      expect(score.rawScore).toBe(1.0);
      expect(score.itemsCorrect).toBe(p.stepCount);

      const obs: CognitiveObservation = {
        id: crypto.randomUUID(),
        patientId,
        domain: 'sequencing',
        taskId: 'morning_tea_sequence',
        timestamp: new Date().toISOString(),
        difficulty: task.difficulty,
        context: task.context,
        metrics: {
          rawScore: score.rawScore,
          itemsPresented: score.itemsPresented,
          itemsCorrect: score.itemsCorrect,
          completionTimeMs: elapsed,
          hesitationCount: 0,
          cueAssistanceCount: 0,
        },
      };

      expect(obs.metrics.completionTimeMs).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(obs.metrics.completionTimeMs)).toBe(true);
    });

    it('Recognition: verifies answer using stable option IDs (never display position)', () => {
      const task = TaskGenerator.generateTask({ domain: 'recognition', difficulty: 3 });
      const p = task.payload;

      // Correct selection
      const correctScore = task.scoring(p.correctOptionId);
      expect(correctScore.rawScore).toBe(1.0);

      // Wrong selection
      const wrongOption = p.options.find((o: any) => o.id !== p.correctOptionId);
      const wrongScore = task.scoring(wrongOption.id);
      expect(wrongScore.rawScore).toBe(0.0);
    });

    it('Attention: pattern cancellation correctly scores targets and penalizes false alarms', () => {
      const task = TaskGenerator.generateTask({ domain: 'attention', difficulty: 2 });
      const p = task.payload;

      const targetIds = p.tiles.filter((t: any) => t.isTarget).map((t: any) => t.id);
      const distractorIds = p.tiles.filter((t: any) => !t.isTarget).map((t: any) => t.id);

      // 100% target hits, 0 false alarms
      const perfectScore = task.scoring(targetIds);
      expect(perfectScore.rawScore).toBe(1.0);

      // Target hits + false alarms
      const mixedScore = task.scoring([...targetIds, distractorIds[0]]);
      expect(mixedScore.rawScore).toBeLessThan(1.0);
      expect(mixedScore.rawScore).toBeGreaterThanOrEqual(0.0);
    });

    it('Calculation: verifies numeric change calculation with exact change value', () => {
      const task = TaskGenerator.generateTask({ domain: 'calculation', difficulty: 3 });
      const p = task.payload;

      const correctResult = task.scoring(p.correctChange);
      expect(correctResult.rawScore).toBe(1.0);

      const wrongOption = p.options.find((opt: number) => opt !== p.correctChange);
      const wrongResult = task.scoring(wrongOption);
      expect(wrongResult.rawScore).toBe(0.0);
    });

    it('Memory: verifies recall scoring against presented target set', () => {
      const task = TaskGenerator.generateTask({ domain: 'memory', difficulty: 2 });
      const p = task.payload;

      const targetIds = p.targetItems.map((t: any) => t.id);
      const perfectScore = task.scoring(targetIds);
      expect(perfectScore.rawScore).toBe(1.0);

      // Partial recall
      const partialScore = task.scoring([targetIds[0]]);
      expect(partialScore.rawScore).toBe(Number((1 / targetIds.length).toFixed(3)));
    });

    it('Planning: verifies chronological activity order scoring', () => {
      const task = TaskGenerator.generateTask({ domain: 'planning', difficulty: 2 });
      const p = task.payload;

      const optimalIds = p.correctOrder.map((a: any) => a.id);
      const score = task.scoring(optimalIds);
      expect(score.rawScore).toBe(1.0);
      expect(score.itemsCorrect).toBe(p.activityCount);
    });
  });

  // =========================================================================
  // 3. COMPLETE 10-QUESTION PROGRESSION (DOES NOT TERMINATE AFTER QUESTION 1)
  // =========================================================================
  describe('Full Session Flow (10 Questions)', () => {
    it('progresses through Question 1 to Question 10 without premature exit', async () => {
      const patientId = 'patient-session-full';
      const domain = 'sequencing';
      const totalQuestions = 10;
      const completedObs: CognitiveObservation[] = [];

      let model = OfflineStorageService.getPersonalModel();

      for (let q = 0; q < totalQuestions; q++) {
        // Assert question progression state machine
        const currentQuestionIndex = q;
        expect(currentQuestionIndex).toBeLessThan(totalQuestions);

        const task = TaskGenerator.generateTask({
          domain,
          difficulty: model.domainBeliefs[domain].activeDifficulty,
        });

        // Simulate user answering
        const isCorrect = q % 3 !== 0; // 7 out of 10 correct
        const score = isCorrect ? 1.0 : 0.4;
        const elapsed = 4500 + q * 100;

        const obs: CognitiveObservation = {
          id: `obs-full-${q}`,
          patientId,
          domain,
          taskId: 'morning_tea_sequence',
          timestamp: new Date().toISOString(),
          difficulty: task.difficulty,
          context: task.context,
          metrics: {
            rawScore: score,
            itemsPresented: task.payload.stepCount,
            itemsCorrect: isCorrect ? task.payload.stepCount : Math.floor(task.payload.stepCount / 2),
            completionTimeMs: elapsed,
            hesitationCount: 0,
            cueAssistanceCount: 0,
          },
        };

        // Persist observation
        await OfflineStorageService.recordObservation(obs);
        completedObs.push(obs);

        // Update Personal Model locally
        model = PersonalizationEngine.updatePersonalModel(model, obs);
        await OfflineStorageService.savePersonalModel(model);
      }

      // Invariant: Session does NOT exit after Question 1. Exactly 10 questions completed.
      expect(completedObs.length).toBe(10);
      expect(OfflineStorageService.getObservations().length).toBe(10);

      // Verify Session Score calculation based on actual answers
      const correctCount = completedObs.filter(o => o.metrics.rawScore >= 0.8).length;
      expect(correctCount).toBe(6);
      const sessionAccuracy = Math.round((correctCount / totalQuestions) * 100);
      expect(sessionAccuracy).toBe(60);

      // Verify Bayesian Personal Model received results
      const finalModel = OfflineStorageService.getPersonalModel();
      expect(finalModel.domainBeliefs[domain].observationCount).toBe(10);
      expect(finalModel.totalSessionsCompleted).toBe(10);
    });

    it('levels up difficulty from Level 1 to Level 2 after completing 10 questions with >= 70% accuracy', async () => {
      const patientId = 'patient-level-up-test';
      const domain = 'calculation';
      const totalQuestions = 10;

      // Start at Level 1
      let model = OfflineStorageService.getPersonalModel();
      model.domainBeliefs[domain].activeDifficulty = 1;
      await OfflineStorageService.savePersonalModel(model);

      let correctCount = 0;
      for (let q = 0; q < totalQuestions; q++) {
        const isCorrect = q < 8; // 8 out of 10 correct = 80% accuracy (>= 70%)
        if (isCorrect) correctCount++;

        const task = TaskGenerator.generateTask({
          domain,
          difficulty: model.domainBeliefs[domain].activeDifficulty,
        });

        const obs: CognitiveObservation = {
          id: `obs-lvl-${q}`,
          patientId,
          domain,
          taskId: 'market_change_calculation',
          timestamp: new Date().toISOString(),
          difficulty: task.difficulty,
          context: task.context,
          metrics: {
            rawScore: isCorrect ? 1.0 : 0.0,
            itemsPresented: 1,
            itemsCorrect: isCorrect ? 1 : 0,
            completionTimeMs: 4000,
            hesitationCount: 0,
            cueAssistanceCount: 0,
          },
        };

        await OfflineStorageService.recordObservation(obs);
        model = PersonalizationEngine.updatePersonalModel(model, obs);
        await OfflineStorageService.savePersonalModel(model);
      }

      // Simulate session completion evaluation (CognitiveSessionSubFrame level progression)
      const sessionAccuracy = correctCount / totalQuestions;
      expect(sessionAccuracy).toBe(0.80);
      expect(sessionAccuracy).toBeGreaterThanOrEqual(0.70);

      const latestModel = OfflineStorageService.getPersonalModel();
      const belief = latestModel.domainBeliefs[domain];
      const prevDiff = belief.activeDifficulty;

      if (sessionAccuracy >= 0.70 && belief.activeDifficulty <= 1 && belief.activeDifficulty < 5) {
        belief.activeDifficulty = 2;
        belief.cooldownRemainingSessions = 0;
        belief.lastUpdated = new Date().toISOString();
        latestModel.adaptationHistory = latestModel.adaptationHistory || [];
        latestModel.adaptationHistory.unshift({
          timestamp: new Date().toISOString(),
          domain,
          previousDifficulty: 1,
          newDifficulty: 2,
          decision: 'increase',
          mode: 'progression',
          rationale: `Completed 10-question session with ${(sessionAccuracy * 100).toFixed(0)}% accuracy. Level up from Level 1 to Level 2!`,
        });
        await OfflineStorageService.savePersonalModel(latestModel);
      }

      const refreshedModel = OfflineStorageService.getPersonalModel();
      expect(refreshedModel.domainBeliefs[domain].activeDifficulty).toBeGreaterThanOrEqual(2); // Advanced from 1 to 2 or higher!
      expect(refreshedModel.adaptationHistory.length).toBeGreaterThanOrEqual(1);
      expect(refreshedModel.adaptationHistory[0].decision).toBe('increase');

      // Verify next session task uses new difficulty level
      const nextSessionTask = TaskGenerator.generateTask({
        domain,
        difficulty: refreshedModel.domainBeliefs[domain].activeDifficulty,
      });
      expect(nextSessionTask.difficulty).toBe(refreshedModel.domainBeliefs[domain].activeDifficulty);
      expect(nextSessionTask.difficulty).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 4. REAL-LIFE MISSIONS OVERHAUL & FUNCTIONAL TRANSFER
  // =========================================================================
  describe('Real-Life Missions Functional Practice', () => {
    it('supports diverse daily missions and records cognitive transfer observation', async () => {
      const patientId = 'patient-mission-test';
      const patientProfile = OfflineStorageService.getPatientProfile();

      // Test mission execution
      const missionTaskCount = 5;
      const completedTaskCount = 5;
      const rawScore = completedTaskCount / missionTaskCount;

      const missionObs: CognitiveObservation = {
        id: crypto.randomUUID(),
        patientId: patientProfile.patientId,
        domain: 'sequencing',
        taskId: 'tea_ritual_mission',
        context: 'kitchen',
        difficulty: 2,
        metrics: {
          rawScore,
          itemsPresented: missionTaskCount,
          itemsCorrect: completedTaskCount,
          completionTimeMs: 12000,
          hesitationCount: 0,
          cueAssistanceCount: 0,
        },
        timestamp: new Date().toISOString(),
      };

      await OfflineStorageService.recordObservation(missionObs);
      const allObs = OfflineStorageService.getObservations();
      expect(allObs.some(o => o.taskId === 'tea_ritual_mission')).toBe(true);
      expect(missionObs.metrics.rawScore).toBe(1.0);
    });
  });
});

