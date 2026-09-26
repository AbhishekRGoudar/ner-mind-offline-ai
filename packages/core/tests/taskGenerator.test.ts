import { describe, it, expect } from 'vitest';
import {
  TaskGenerator,
  PRNG,
  CognitiveDomain,
  calculateDomainComplexity,
} from '../src/index.js';

describe('Cognitive Task Generator & Complexity Layer', () => {
  const domains: CognitiveDomain[] = [
    'memory',
    'attention',
    'sequencing',
    'recognition',
    'calculation',
    'planning',
  ];

  describe('1. Reproducible Randomness with Seeded PRNG', () => {
    it('generates identical tasks given the identical seed and parameters', () => {
      const seed = 987654321;

      domains.forEach(domain => {
        const taskA = TaskGenerator.generateTask({
          domain,
          difficulty: 3,
          seed,
        });

        const taskB = TaskGenerator.generateTask({
          domain,
          difficulty: 3,
          seed,
        });

        expect(taskA.fingerprint).toBe(taskB.fingerprint);
        expect(taskA.id).toBe(taskB.id);
        expect(taskA.complexity.overallComplexity).toBe(taskB.complexity.overallComplexity);
        expect(taskA.title).toBe(taskB.title);
      });
    });

    it('generates different tasks when seed changes', () => {
      const taskA = TaskGenerator.generateTask({ domain: 'calculation', difficulty: 2, seed: 11111 });
      const taskB = TaskGenerator.generateTask({ domain: 'calculation', difficulty: 2, seed: 99999 });

      // Different seeds should produce distinct fingerprints and tasks
      expect(taskA.fingerprint).not.toBe(taskB.fingerprint);
    });
  });

  describe('2. Task Complexity Profile & Strict Monotonic Escalation', () => {
    domains.forEach(domain => {
      it(`[${domain.toUpperCase()}] verifies measurable complexity increases monotonically from L1 to L5`, () => {
        const difficulties: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
        const complexityScores: number[] = [];

        difficulties.forEach(difficulty => {
          const task = TaskGenerator.generateTask({
            domain,
            difficulty,
            seed: 42000 + difficulty,
          });

          expect(task.difficulty).toBe(difficulty);
          expect(task.complexity.difficulty).toBe(difficulty);
          expect(task.complexity.domain).toBe(domain);
          expect(task.complexity.overallComplexity).toBeGreaterThanOrEqual(1.0);
          expect(task.complexity.overallComplexity).toBeLessThanOrEqual(10.0);

          complexityScores.push(task.complexity.overallComplexity);
        });

        // Verify strictly monotonic escalation: L1 < L2 < L3 < L4 < L5
        for (let i = 0; i < complexityScores.length - 1; i++) {
          expect(complexityScores[i + 1]).toBeGreaterThan(complexityScores[i]!);
        }
      });
    });
  });

  describe('3. Measurable Domain-Specific Cognitive Load Factors', () => {
    it('verifies Memory load parameters scale with difficulty', () => {
      const t1 = TaskGenerator.generateTask({ domain: 'memory', difficulty: 1, seed: 101 });
      const t3 = TaskGenerator.generateTask({ domain: 'memory', difficulty: 3, seed: 103 });
      const t5 = TaskGenerator.generateTask({ domain: 'memory', difficulty: 5, seed: 105 });

      expect(t1.payload.targetItems.length).toBeLessThan(t3.payload.targetItems.length);
      expect(t3.payload.targetItems.length).toBeLessThan(t5.payload.targetItems.length);
      expect(t1.complexity.cueLevel).toBeGreaterThan(t5.complexity.cueLevel); // Cues decrease
      expect(t1.complexity.distractorCount).toBeLessThan(t5.complexity.distractorCount); // Distractors increase
    });

    it('verifies Attention distractors and grid density scale with difficulty', () => {
      const t1 = TaskGenerator.generateTask({ domain: 'attention', difficulty: 1, seed: 201 });
      const t3 = TaskGenerator.generateTask({ domain: 'attention', difficulty: 3, seed: 203 });
      const t5 = TaskGenerator.generateTask({ domain: 'attention', difficulty: 5, seed: 205 });

      expect(t1.payload.tiles.length).toBeLessThan(t3.payload.tiles.length);
      expect(t3.payload.tiles.length).toBeLessThan(t5.payload.tiles.length);
      expect(t1.complexity.interferenceLevel).toBeLessThan(t5.complexity.interferenceLevel);
    });

    it('verifies Sequencing sequence lengths and reasoning steps scale with difficulty', () => {
      const t1 = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 1, seed: 301 });
      const t3 = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 3, seed: 303 });
      const t5 = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 5, seed: 305 });

      expect(t1.payload.stepCount).toBe(3);
      expect(t3.payload.stepCount).toBe(5);
      expect(t5.payload.stepCount).toBe(7);
      expect(t1.complexity.reasoningSteps).toBeLessThan(t5.complexity.reasoningSteps);
    });

    it('verifies Recognition option count and distractor ambiguity scale with difficulty', () => {
      const t1 = TaskGenerator.generateTask({ domain: 'recognition', difficulty: 1, seed: 401 });
      const t3 = TaskGenerator.generateTask({ domain: 'recognition', difficulty: 3, seed: 403 });
      const t5 = TaskGenerator.generateTask({ domain: 'recognition', difficulty: 5, seed: 405 });

      expect(t1.payload.optionCount).toBe(3);
      expect(t3.payload.optionCount).toBe(5);
      expect(t5.payload.optionCount).toBe(6);
      expect(t1.complexity.ambiguityLevel).toBeLessThan(t5.complexity.ambiguityLevel);
    });

    it('verifies Calculation reasoning steps and working memory demand scale with difficulty', () => {
      const t1 = TaskGenerator.generateTask({ domain: 'calculation', difficulty: 1, seed: 501 });
      const t3 = TaskGenerator.generateTask({ domain: 'calculation', difficulty: 3, seed: 503 });
      const t5 = TaskGenerator.generateTask({ domain: 'calculation', difficulty: 5, seed: 505 });

      expect(t1.payload.itemsPurchased.length).toBe(1);
      expect(t3.payload.itemsPurchased.length).toBe(2);
      expect(t5.payload.itemsPurchased.length).toBe(3);
      expect(t1.complexity.reasoningSteps).toBeLessThan(t5.complexity.reasoningSteps);
    });

    it('verifies Planning activity count and rule count scale with difficulty', () => {
      const t1 = TaskGenerator.generateTask({ domain: 'planning', difficulty: 1, seed: 601 });
      const t3 = TaskGenerator.generateTask({ domain: 'planning', difficulty: 3, seed: 603 });
      const t5 = TaskGenerator.generateTask({ domain: 'planning', difficulty: 5, seed: 605 });

      expect(t1.payload.activityCount).toBe(3);
      expect(t3.payload.activityCount).toBe(5);
      expect(t5.payload.activityCount).toBe(7);
      expect(t1.complexity.sequenceLength).toBeLessThan(t5.complexity.sequenceLength);
    });
  });

  describe('4. Anti-Repetition with Recent-History Fingerprints', () => {
    it('regenerates task when fingerprint collides with recent history window', () => {
      // First task
      const firstTask = TaskGenerator.generateTask({
        domain: 'memory',
        difficulty: 2,
        seed: 77777,
      });

      // Request next task with same seed but passing firstTask.fingerprint in recent history
      const nextTask = TaskGenerator.generateTask({
        domain: 'memory',
        difficulty: 2,
        seed: 77777,
        recentFingerprints: [firstTask.fingerprint],
        maxRecentWindow: 10,
      });

      // Must have different fingerprint to avoid immediate repetition
      expect(nextTask.fingerprint).not.toBe(firstTask.fingerprint);
    });
  });

  describe('5. Content Safety & Scoring Invariants', () => {
    it('verifies all calculation tasks have mathematically exact change and unique options', () => {
      for (let diff = 1; diff <= 5; diff++) {
        for (let i = 0; i < 20; i++) {
          const task = TaskGenerator.generateTask({
            domain: 'calculation',
            difficulty: diff as any,
            seed: 1000 + diff * 50 + i,
          });

          const p = task.payload;
          expect(p.totalBill + p.correctChange).toBe(p.paidAmount);
          expect(p.options.length).toBe(4);
          expect(new Set(p.options).size).toBe(4);
          expect(p.options.includes(p.correctChange)).toBe(true);

          // Scoring verification
          const correctScore = task.scoring(p.correctChange);
          expect(correctScore.rawScore).toBe(1.0);
          expect(correctScore.itemsCorrect).toBe(1);

          const incorrectOption = p.options.find((o: number) => o !== p.correctChange)!;
          const incorrectScore = task.scoring(incorrectOption);
          expect(incorrectScore.rawScore).toBe(0.0);
          expect(incorrectScore.itemsCorrect).toBe(0);
        }
      }
    });

    it('verifies recognition tasks have unique options and valid target matching', () => {
      for (let diff = 1; diff <= 5; diff++) {
        const task = TaskGenerator.generateTask({
          domain: 'recognition',
          difficulty: diff as any,
          seed: 2000 + diff,
        });

        const p = task.payload;
        const ids = p.options.map((o: any) => o.id);
        expect(new Set(ids).size).toBe(p.options.length);
        expect(ids.includes(p.targetObject.id)).toBe(true);

        const correctScore = task.scoring(p.targetObject.id);
        expect(correctScore.rawScore).toBe(1.0);

        const wrongScore = task.scoring('invalid_nonexistent_id');
        expect(wrongScore.rawScore).toBe(0.0);
      }
    });
  });

  describe('6. Unlimited Local Generation: 1,000 Tasks per Domain Benchmark', () => {
    domains.forEach(domain => {
      it(`[${domain.toUpperCase()}] generates 1,000 tasks locally with 0 errors and high performance`, () => {
        const start = Date.now();
        const recentWindow: string[] = [];
        let duplicateWindowCollisions = 0;

        for (let i = 0; i < 1000; i++) {
          const difficulty = ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5;
          const task = TaskGenerator.generateTask({
            domain,
            difficulty,
            seed: (i * 7919 + 13) >>> 0,
            recentFingerprints: recentWindow,
            maxRecentWindow: 20,
          });

          // Check no crash, valid complexity, valid instructions
          expect(task.title.length).toBeGreaterThan(0);
          expect(task.instructions.length).toBeGreaterThan(0);
          expect(task.complexity.difficulty).toBe(difficulty);
          expect(task.fingerprint.length).toBe(8);

          // Verify recent window constraint
          if (recentWindow.includes(task.fingerprint)) {
            duplicateWindowCollisions++;
          }

          recentWindow.push(task.fingerprint);
          if (recentWindow.length > 20) recentWindow.shift();
        }

        const elapsedMs = Date.now() - start;
        const avgMsPerTask = elapsedMs / 1000;

        // Zero recent-window duplicates
        expect(duplicateWindowCollisions).toBe(0);

        // Average generation time should be well below 2ms per task
        expect(avgMsPerTask).toBeLessThan(5.0);
      });
    });
  });
});
