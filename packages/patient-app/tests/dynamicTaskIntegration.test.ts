import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TaskGenerator,
  CognitiveDomain,
  PersonalizationEngine,
  CognitiveObservation,
} from '@ner-mind/core';
import { IndexedDbStorageService } from '../src/storage/indexedDbStorage.js';
import { OfflineStorageService } from '../src/storage/localStorage.js';

describe('Dynamic Cognitive Content Adaptation & Offline Anti-Repetition Integration', () => {
  let fetchSpy: any;
  const domains: CognitiveDomain[] = [
    'memory',
    'attention',
    'sequencing',
    'recognition',
    'calculation',
    'planning',
  ];

  beforeEach(async () => {
    // Zero-network invariant guard: Fail any network attempt
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('NETWORK_VIOLATION: Zero network requests permitted during dynamic question generation and cognitive gameplay');
    });

    await IndexedDbStorageService.resetForTesting();
    await IndexedDbStorageService.init();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('1. 100% Offline Procedural Generation for All 6 Games', () => {
    domains.forEach(domain => {
      it(`[${domain.toUpperCase()}] generates dynamic tasks across all 5 difficulty levels with ZERO network calls`, () => {
        for (let difficulty = 1; difficulty <= 5; difficulty++) {
          const task = TaskGenerator.generateTask({
            domain,
            difficulty: difficulty as any,
            patientProfile: { patientId: 'patient-ner-001' },
          });

          expect(task).toBeDefined();
          expect(task.domain).toBe(domain);
          expect(task.difficulty).toBe(difficulty);
          expect(task.complexity.overallComplexity).toBeGreaterThanOrEqual(1.0);
          expect(task.complexity.overallComplexity).toBeLessThanOrEqual(10.0);
          expect(task.fingerprint.length).toBe(8);
          expect(task.title.length).toBeGreaterThan(0);
          expect(task.instructions.length).toBeGreaterThan(0);
        }

        // Verify zero network calls were attempted
        expect(fetchSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('2. Anti-Repetition Fingerprint Durability Across Simulated Restarts', () => {
    it('persists recent fingerprints in IndexedDB and prevents duplicate task presentation', async () => {
      const patientId = 'patient-ner-001';
      const domain: CognitiveDomain = 'memory';

      // 1. Generate first task and record its fingerprint
      const task1 = TaskGenerator.generateTask({
        domain,
        difficulty: 3,
        seed: 44444,
      });
      await OfflineStorageService.recordTaskFingerprint(patientId, domain, task1.fingerprint);

      // Verify fingerprint is stored
      const storedBefore = OfflineStorageService.getRecentTaskFingerprints(patientId, domain);
      expect(storedBefore).toContain(task1.fingerprint);

      // 2. Simulate complete application restart (re-initialize storage service)
      await IndexedDbStorageService.init();

      // Verify fingerprint survived restart
      const storedAfterRestart = OfflineStorageService.getRecentTaskFingerprints(patientId, domain);
      expect(storedAfterRestart).toContain(task1.fingerprint);

      // 3. Generate next task with same base seed, passing stored fingerprints
      const task2 = TaskGenerator.generateTask({
        domain,
        difficulty: 3,
        seed: 44444,
        recentFingerprints: storedAfterRestart,
      });

      // Must avoid immediate repetition
      expect(task2.fingerprint).not.toBe(task1.fingerprint);
    });
  });

  describe('3. Measurable Complexity Escalation & Regression Loop', () => {
    domains.forEach(domain => {
      it(`[${domain.toUpperCase()}] asserts task complexity strictly increases (L1 < L2 < L3 < L4 < L5) and decreases on regression`, () => {
        const scores: number[] = [];

        // Escalation: Level 1 through 5
        for (let d = 1; d <= 5; d++) {
          const task = TaskGenerator.generateTask({ domain, difficulty: d as any, seed: 1000 + d });
          scores.push(task.complexity.overallComplexity);
        }

        for (let i = 0; i < scores.length - 1; i++) {
          expect(scores[i + 1]).toBeGreaterThan(scores[i]!);
        }

        // Regression: Level 5 down to Level 2
        const taskL5 = TaskGenerator.generateTask({ domain, difficulty: 5, seed: 2005 });
        const taskL2 = TaskGenerator.generateTask({ domain, difficulty: 2, seed: 2002 });

        expect(taskL2.complexity.overallComplexity).toBeLessThan(taskL5.complexity.overallComplexity);
      });
    });
  });

  describe('4. Complete Simulated Gameplay with Online Learning Update', () => {
    it('generates task -> plays game -> records observation -> updates Bayesian personal model with 0 network calls', async () => {
      const patientId = 'patient-ner-001';

      // 1. Generate task
      const task = TaskGenerator.generateTask({
        domain: 'calculation',
        difficulty: 2,
        seed: 55555,
      });

      // 2. Simulate correct answer
      const p = task.payload;
      const scoreResult = task.scoring(p.correctChange);
      expect(scoreResult.rawScore).toBe(1.0);

      // 3. Record task fingerprint
      await OfflineStorageService.recordTaskFingerprint(patientId, 'calculation', task.fingerprint);

      // 4. Record observation
      const obs: CognitiveObservation = {
        id: crypto.randomUUID(),
        patientId,
        domain: 'calculation',
        taskId: 'market_change_calculation',
        timestamp: new Date().toISOString(),
        difficulty: 2,
        context: 'market',
        metrics: {
          rawScore: scoreResult.rawScore,
          itemsPresented: scoreResult.itemsPresented,
          itemsCorrect: scoreResult.itemsCorrect,
          completionTimeMs: 4500,
          hesitationCount: 0,
          cueAssistanceCount: 0,
        },
      };

      await OfflineStorageService.recordObservation(obs);

      // 5. Verify model updated locally
      const model = OfflineStorageService.getPersonalModel();
      expect(model.domainBeliefs.calculation.observationCount).toBe(1);
      expect(model.domainBeliefs.calculation.estimatedAbility).toBeGreaterThan(0.50);

      // 6. Verify task fingerprint is retained in recent tasks
      const recent = OfflineStorageService.getRecentTaskFingerprints(patientId, 'calculation');
      expect(recent).toContain(task.fingerprint);

      // 7. Verify zero network requests
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
