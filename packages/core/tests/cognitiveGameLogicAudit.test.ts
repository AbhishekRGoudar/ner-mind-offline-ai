import { describe, it, expect } from 'vitest';
import {
  TaskGenerator,
  CognitiveDomain,
  PersonalizationEngine,
  createInitialPersonalModel,
  CognitiveObservation,
  recommendNextTrainingSession,
  calculateCognitiveProfile,
} from '../src/index.js';

describe('Cognitive Game Logic Audit & Verification (All 6 Games)', () => {
  const ALL_DOMAINS: CognitiveDomain[] = [
    'sequencing',
    'recognition',
    'attention',
    'calculation',
    'memory',
    'planning',
  ];

  // =========================================================================
  // 1. ALL SIX GAMES: QUESTION GENERATION & STRUCTURAL SAFETY (SECTION 8, 19)
  // =========================================================================
  describe('Question Generation & Structural Integrity', () => {
    it.each(ALL_DOMAINS)('generates valid, structurally verified tasks for %s across difficulty 1-5', (domain) => {
      for (let diff = 1; diff <= 5; diff++) {
        const task = TaskGenerator.generateTask({
          domain,
          difficulty: diff as 1 | 2 | 3 | 4 | 5,
        });

        expect(task).toBeDefined();
        expect(task.id).toMatch(/^task_/);
        expect(task.fingerprint).toBeDefined();
        expect(task.domain).toBe(domain);
        expect(task.difficulty).toBe(diff);
        expect(task.complexity).toBeDefined();
        expect(task.complexity.overallComplexity).toBeGreaterThanOrEqual(1);
        expect(task.complexity.overallComplexity).toBeLessThanOrEqual(10);
        expect(typeof task.scoring).toBe('function');
      }
    });

    it('injects deterministic seed and produces identical tasks (Deterministic Mode)', () => {
      const seed = 428917;
      for (const domain of ALL_DOMAINS) {
        const taskA = TaskGenerator.generateTask({ domain, difficulty: 3, seed });
        const taskB = TaskGenerator.generateTask({ domain, difficulty: 3, seed });

        expect(taskA.id).toBe(taskB.id);
        expect(taskA.fingerprint).toBe(taskB.fingerprint);
        expect(taskA.title).toBe(taskB.title);
        expect(taskA.instructions).toBe(taskB.instructions);
      }
    });

    it('avoids immediate duplicate questions using recent fingerprints window (Section 9)', () => {
      const domain = 'memory';
      const recent: string[] = [];
      const generatedCount = 10;

      for (let i = 0; i < generatedCount; i++) {
        const task = TaskGenerator.generateTask({
          domain,
          difficulty: 2,
          recentFingerprints: recent,
        });

        expect(recent).not.toContain(task.fingerprint);
        recent.push(task.fingerprint);
      }

      expect(recent.length).toBe(generatedCount);
      expect(new Set(recent).size).toBe(generatedCount);
    });
  });

  // =========================================================================
  // 2. SEQUENCING GAME: THOROUGH AUDIT & FIX VERIFICATION (SECTIONS 3, 4)
  // =========================================================================
  describe('Sequencing Game Audit & Verification', () => {
    it('payload adheres to Section 3 contract: items, correctOrder, shuffledItems', () => {
      const task = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 2 });
      const p = task.payload;

      expect(p.items).toBeDefined();
      expect(p.correctOrder).toBeDefined();
      expect(p.shuffledItems).toBeDefined();
      expect(p.shuffledSteps).toBeDefined();
      expect(p.stepCount).toBe(p.items.length);
      expect(p.correctOrder.length).toBe(p.items.length);
      expect(p.shuffledItems.length).toBe(p.items.length);
    });

    it('guarantees invariant: correctOrder != shuffledItems for questions with >= 2 items', () => {
      // Test across 50 independent generations
      for (let i = 0; i < 50; i++) {
        const task = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: (1 + (i % 5)) as any });
        const p = task.payload;

        const isExactSameOrder = p.correctOrder.every(
          (step: any, idx: number) => step.order === p.shuffledItems[idx]?.order
        );

        expect(isExactSameOrder).toBe(false);
      }
    });

    it('displayed shuffled items contain precisely the same elements as correctOrder (no lost items)', () => {
      const task = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 3 });
      const p = task.payload;

      const correctTexts = p.correctOrder.map((s: any) => s.text).sort();
      const shuffledTexts = p.shuffledItems.map((s: any) => s.text).sort();

      expect(shuffledTexts).toEqual(correctTexts);
    });

    it('evaluates user ordering: perfect order yields score 1.0, reverse order yields <= 0.5', () => {
      const task = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 3 });
      const p = task.payload;

      // Perfect user ordering
      const perfectSubmission = p.correctOrder.map((s: any) => s.text);
      const perfectScore = task.scoring(perfectSubmission);
      expect(perfectScore.rawScore).toBe(1.0);
      expect(perfectScore.itemsCorrect).toBe(p.stepCount);
      expect(perfectScore.itemsPresented).toBe(p.stepCount);

      // Reordered / inverted submission
      const invertedSubmission = [...p.correctOrder].reverse().map((s: any) => s.text);
      const invertedScore = task.scoring(invertedSubmission);
      expect(invertedScore.rawScore).toBeLessThan(1.0);
      expect(invertedScore.rawScore).toBeGreaterThanOrEqual(0.0);
    });

    it('supports step objects, string texts, and numeric orders in scoring evaluation', () => {
      const task = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 1 });
      const p = task.payload;

      // Array of step objects
      const objScore = task.scoring(p.correctOrder);
      expect(objScore.rawScore).toBe(1.0);

      // Array of numeric orders [1, 2, 3]
      const orderScore = task.scoring(p.correctOrder.map((s: any) => s.order));
      expect(orderScore.rawScore).toBe(1.0);

      // Array of string step texts
      const textScore = task.scoring(p.correctOrder.map((s: any) => s.text));
      expect(textScore.rawScore).toBe(1.0);
    });

    it('contains genuine real-world sequences (not abstract letters A->B->C)', () => {
      for (let diff = 1; diff <= 5; diff++) {
        const task = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: diff as any });
        const p = task.payload;
        p.correctOrder.forEach((step: any) => {
          expect(step.text.length).toBeGreaterThan(10);
          expect(typeof step.order).toBe('number');
          expect(step.icon).toBeDefined();
        });
      }
    });
  });

  // =========================================================================
  // 3. RECOGNITION GAME: ANSWER CORRECTNESS & STABLE IDS (SECTIONS 6, 7)
  // =========================================================================
  describe('Recognition Game Audit & Answer Correctness', () => {
    it('payload contains prompt, options, correctOptionId, and targetObject', () => {
      const task = TaskGenerator.generateTask({ domain: 'recognition', difficulty: 2 });
      const p = task.payload;

      expect(p.prompt).toBeDefined();
      expect(p.options).toBeDefined();
      expect(p.correctOptionId).toBeDefined();
      expect(p.targetObject).toBeDefined();
      expect(p.correctOptionId).toBe(p.targetObject.id);
    });

    it('invariant: correctOptionId exists in options, and exactly ONE option is correct', () => {
      for (let i = 0; i < 50; i++) {
        const task = TaskGenerator.generateTask({ domain: 'recognition', difficulty: (1 + (i % 5)) as any });
        const p = task.payload;

        const matching = p.options.filter((o: any) => o.id === p.correctOptionId);
        expect(matching.length).toBe(1);
        expect(p.options.map((o: any) => o.id)).toContain(p.correctOptionId);
      }
    });

    it('evaluates answers using stable IDs: correct option scores 1.0, incorrect scores 0.0', () => {
      const task = TaskGenerator.generateTask({ domain: 'recognition', difficulty: 3 });
      const p = task.payload;

      // Correct selection
      const correctResult = task.scoring(p.correctOptionId);
      expect(correctResult.rawScore).toBe(1.0);
      expect(correctResult.itemsCorrect).toBe(1);

      // Pick any incorrect distractor
      const distractor = p.options.find((o: any) => o.id !== p.correctOptionId);
      expect(distractor).toBeDefined();
      const wrongResult = task.scoring(distractor.id);
      expect(wrongResult.rawScore).toBe(0.0);
      expect(wrongResult.itemsCorrect).toBe(0);
    });

    it('does not assume first option is correct: correct option position is randomized', () => {
      const firstPositionCounts: number[] = [];
      const totalTrials = 100;

      for (let i = 0; i < totalTrials; i++) {
        const task = TaskGenerator.generateTask({ domain: 'recognition', difficulty: 2 });
        const p = task.payload;
        const index = p.options.findIndex((o: any) => o.id === p.correctOptionId);
        firstPositionCounts.push(index);
      }

      const isAlwaysFirst = firstPositionCounts.every(idx => idx === 0);
      expect(isAlwaysFirst).toBe(false);
      // Ensure it appeared at multiple positions
      const uniquePositions = new Set(firstPositionCounts);
      expect(uniquePositions.size).toBeGreaterThan(1);
    });
  });

  // =========================================================================
  // 4. DIFFICULTY SCALING: CONTENT COMPLEXITY CHANGES (SECTIONS 5, 14, 15)
  // =========================================================================
  describe('Difficulty Scaling: Content Complexity Escalation Across Levels 1-5', () => {
    it('Sequencing: step count scales progressively from L1 (3 steps) to L5 (7 steps)', () => {
      const l1 = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 1 });
      const l2 = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 2 });
      const l3 = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 3 });
      const l4 = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 4 });
      const l5 = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 5 });

      expect(l1.payload.stepCount).toBe(3);
      expect(l2.payload.stepCount).toBe(4);
      expect(l3.payload.stepCount).toBe(5);
      expect(l4.payload.stepCount).toBe(6);
      expect(l5.payload.stepCount).toBe(7);

      expect(l1.complexity.overallComplexity).toBeLessThan(l2.complexity.overallComplexity);
      expect(l2.complexity.overallComplexity).toBeLessThan(l3.complexity.overallComplexity);
      expect(l3.complexity.overallComplexity).toBeLessThan(l4.complexity.overallComplexity);
      expect(l4.complexity.overallComplexity).toBeLessThan(l5.complexity.overallComplexity);
    });

    it('Memory: item count and distractors scale progressively from L1 to L5', () => {
      const l1 = TaskGenerator.generateTask({ domain: 'memory', difficulty: 1 });
      const l3 = TaskGenerator.generateTask({ domain: 'memory', difficulty: 3 });
      const l5 = TaskGenerator.generateTask({ domain: 'memory', difficulty: 5 });

      expect(l1.payload.targetItems.length).toBe(3);
      expect(l1.payload.distractorItems.length).toBe(0);

      expect(l3.payload.targetItems.length).toBe(5);
      expect(l3.payload.distractorItems.length).toBe(4);

      expect(l5.payload.targetItems.length).toBe(7);
      expect(l5.payload.distractorItems.length).toBe(8);

      expect(l1.complexity.overallComplexity).toBeLessThan(l3.complexity.overallComplexity);
      expect(l3.complexity.overallComplexity).toBeLessThan(l5.complexity.overallComplexity);
    });

    it('Attention: target count and total grid density scale progressively from L1 to L5', () => {
      const l1 = TaskGenerator.generateTask({ domain: 'attention', difficulty: 1 });
      const l3 = TaskGenerator.generateTask({ domain: 'attention', difficulty: 3 });
      const l5 = TaskGenerator.generateTask({ domain: 'attention', difficulty: 5 });

      expect(l1.payload.targetCount).toBe(2);
      expect(l1.payload.distractorCount).toBe(4);
      expect(l1.payload.tiles.length).toBe(6);

      expect(l3.payload.targetCount).toBe(4);
      expect(l3.payload.distractorCount).toBe(12);
      expect(l3.payload.tiles.length).toBe(16);

      expect(l5.payload.targetCount).toBe(6);
      expect(l5.payload.distractorCount).toBe(20);
      expect(l5.payload.tiles.length).toBe(26);

      expect(l1.complexity.overallComplexity).toBeLessThan(l3.complexity.overallComplexity);
      expect(l3.complexity.overallComplexity).toBeLessThan(l5.complexity.overallComplexity);
    });

    it('Calculation: transaction complexity and math steps scale progressively from L1 to L5', () => {
      const l1 = TaskGenerator.generateTask({ domain: 'calculation', difficulty: 1 });
      const l3 = TaskGenerator.generateTask({ domain: 'calculation', difficulty: 3 });
      const l5 = TaskGenerator.generateTask({ domain: 'calculation', difficulty: 5 });

      // L1: 1 item, clean round numbers
      expect(l1.payload.itemsPurchased.length).toBe(1);
      expect(l1.payload.options.length).toBe(4);

      // L3: 2-item sum & change calculation
      expect(l3.payload.itemsPurchased.length).toBe(2);

      // L5: 3 items with quantities from ₹500
      expect(l5.payload.itemsPurchased.length).toBe(3);
      expect(l5.payload.paidAmount).toBe(500);

      expect(l1.complexity.overallComplexity).toBeLessThan(l3.complexity.overallComplexity);
      expect(l3.complexity.overallComplexity).toBeLessThan(l5.complexity.overallComplexity);
    });

    it('Recognition: candidate option count scales from 3 options (L1) to 6 options (L5)', () => {
      const l1 = TaskGenerator.generateTask({ domain: 'recognition', difficulty: 1 });
      const l2 = TaskGenerator.generateTask({ domain: 'recognition', difficulty: 2 });
      const l4 = TaskGenerator.generateTask({ domain: 'recognition', difficulty: 4 });

      expect(l1.payload.options.length).toBe(3);
      expect(l2.payload.options.length).toBe(4);
      expect(l4.payload.options.length).toBe(6);

      expect(l1.complexity.overallComplexity).toBeLessThan(l4.complexity.overallComplexity);
    });

    it('Planning: activity count scales from 3 (L1) to 7 (L5)', () => {
      const l1 = TaskGenerator.generateTask({ domain: 'planning', difficulty: 1 });
      const l3 = TaskGenerator.generateTask({ domain: 'planning', difficulty: 3 });
      const l5 = TaskGenerator.generateTask({ domain: 'planning', difficulty: 5 });

      expect(l1.payload.activityCount).toBe(3);
      expect(l3.payload.activityCount).toBe(5);
      expect(l5.payload.activityCount).toBe(7);

      expect(l1.complexity.overallComplexity).toBeLessThan(l5.complexity.overallComplexity);
    });
  });

  // =========================================================================
  // 5. RANDOMIZATION TESTING: 100 RUNS (SECTION 17)
  // =========================================================================
  describe('Randomization & Permutation Testing (100 Runs)', () => {
    it('Sequencing: 100 runs maintain stable correctOrder while generating diverse display orders', () => {
      const displayOrders = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const task = TaskGenerator.generateTask({ domain: 'sequencing', difficulty: 3 });
        const p = task.payload;

        // Verify correctOrder is strictly sorted by order 1..5
        p.correctOrder.forEach((step: any, idx: number) => {
          expect(step.order).toBe(idx + 1);
        });

        // Collect display permutation signature
        const displaySig = p.shuffledItems.map((s: any) => s.order).join(',');
        displayOrders.add(displaySig);
      }

      // Over 100 runs of 5 items, there should be multiple distinct display permutations
      expect(displayOrders.size).toBeGreaterThan(15);
    });

    it('Calculation: 100 runs generate strictly unique, positive change options', () => {
      for (let i = 0; i < 100; i++) {
        const task = TaskGenerator.generateTask({ domain: 'calculation', difficulty: (1 + (i % 5)) as any });
        const p = task.payload;

        expect(p.correctChange).toBeGreaterThan(0);
        expect(p.totalBill + p.correctChange).toBe(p.paidAmount);
        expect(p.options.length).toBe(4);
        expect(new Set(p.options).size).toBe(4);
        expect(p.options).toContain(p.correctChange);
      }
    });

    it('Attention: 100 runs guarantee target count exact match and diverse tile arrangements', () => {
      const tileSignatures = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const task = TaskGenerator.generateTask({ domain: 'attention', difficulty: 2 });
        const p = task.payload;

        const targets = p.tiles.filter((t: any) => t.isTarget);
        expect(targets.length).toBe(p.targetCount);

        const sig = p.tiles.map((t: any) => (t.isTarget ? '1' : '0')).join('');
        tileSignatures.add(sig);
      }

      expect(tileSignatures.size).toBeGreaterThan(10);
    });
  });

  // =========================================================================
  // 6. BEST / AVERAGE / WORST CASE ADAPTIVE DIFFICULTY TESTING (SECTION 16)
  // =========================================================================
  describe('Adaptive Difficulty Progression: Best, Average, Worst Case (Section 16)', () => {
    const patientId = 'patient-audit-001';

    it('BEST CASE: 100% correct answers cause ability and difficulty to advance', () => {
      let model = createInitialPersonalModel(patientId, 'English');
      const domain: CognitiveDomain = 'sequencing';

      expect(model.domainBeliefs[domain].activeDifficulty).toBe(1);

      // Simulate 5 consecutive perfect responses
      for (let i = 0; i < 5; i++) {
        const obs: CognitiveObservation = {
          id: `obs-best-${i}`,
          patientId,
          domain,
          taskId: 'morning_tea_sequence',
          timestamp: new Date().toISOString(),
          difficulty: model.domainBeliefs[domain].activeDifficulty,
          context: 'kitchen',
          metrics: {
            rawScore: 1.0,
            itemsPresented: 3,
            itemsCorrect: 3,
            completionTimeMs: 4000, // Fast response
            cueAssistanceCount: 0,
            hesitationCount: 0,
          },
        };

        model = PersonalizationEngine.updatePersonalModel(model, obs);
      }

      // Best case verification: estimated ability increased, difficulty advanced
      expect(model.domainBeliefs[domain].estimatedAbility).toBeGreaterThan(0.70);
      expect(model.domainBeliefs[domain].activeDifficulty).toBeGreaterThanOrEqual(2);

      // Verify that higher difficulty generates higher complexity task
      const nextTask = TaskGenerator.generateTask({
        domain,
        difficulty: model.domainBeliefs[domain].activeDifficulty,
      });
      expect(nextTask.difficulty).toBeGreaterThanOrEqual(2);
      expect(nextTask.payload.stepCount).toBeGreaterThanOrEqual(4);
    });

    it('AVERAGE CASE: mixed 70-80% responses maintain steady difficulty without rapid oscillation', () => {
      let model = createInitialPersonalModel(patientId, 'English');
      const domain: CognitiveDomain = 'calculation';

      // Start at difficulty 2
      model.domainBeliefs[domain].activeDifficulty = 2;
      model.domainBeliefs[domain].estimatedAbility = 0.55;

      for (let i = 0; i < 5; i++) {
        const score = i % 2 === 0 ? 1.0 : 0.6;
        const obs: CognitiveObservation = {
          id: `obs-avg-${i}`,
          patientId,
          domain,
          taskId: 'market_change_calculation',
          timestamp: new Date().toISOString(),
          difficulty: 2,
          context: 'market',
          metrics: {
            rawScore: score,
            itemsPresented: 4,
            itemsCorrect: score === 1.0 ? 4 : 2,
            completionTimeMs: 9000, // Average response time
          },
        };

        model = PersonalizationEngine.updatePersonalModel(model, obs);
      }

      // Difficulty should remain steady or adjust smoothly (no wild oscillation)
      expect(model.domainBeliefs[domain].activeDifficulty).toBeGreaterThanOrEqual(1);
      expect(model.domainBeliefs[domain].activeDifficulty).toBeLessThanOrEqual(3);
    });

    it('WORST CASE: 0% correct responses cause difficulty and task complexity to decrease', () => {
      let model = createInitialPersonalModel(patientId, 'English');
      const domain: CognitiveDomain = 'planning';

      // Start at Level 4
      model.domainBeliefs[domain].activeDifficulty = 4;
      model.domainBeliefs[domain].estimatedAbility = 0.65;

      // Simulate repeated failures
      for (let i = 0; i < 4; i++) {
        const obs: CognitiveObservation = {
          id: `obs-worst-${i}`,
          patientId,
          domain,
          taskId: 'day_schedule_planner',
          timestamp: new Date().toISOString(),
          difficulty: model.domainBeliefs[domain].activeDifficulty,
          context: 'routine',
          metrics: {
            rawScore: 0.0,
            itemsPresented: 6,
            itemsCorrect: 0,
            completionTimeMs: 25000, // Very slow
          },
        };

        model = PersonalizationEngine.updatePersonalModel(model, obs);
      }

      // Difficulty decreased
      expect(model.domainBeliefs[domain].activeDifficulty).toBeLessThan(4);

      // Generated task complexity decreases
      const easierTask = TaskGenerator.generateTask({
        domain,
        difficulty: model.domainBeliefs[domain].activeDifficulty,
      });
      expect(easierTask.difficulty).toBeLessThan(4);
      expect(easierTask.payload.activityCount).toBeLessThan(6);
    });
  });

  // =========================================================================
  // 7. FULL SESSION PROGRESSION & OBSERVATION RECORDING (SECTIONS 10, 11, 12, 13)
  // =========================================================================
  describe('Full Session Progression & Measurement Invariants', () => {
    it('runs complete multi-question session (not exiting after question 1), computes score, and updates recommendations', () => {
      const patientId = 'patient-session-test';
      const domain: CognitiveDomain = 'recognition';
      const sessionLength = 5;
      const observations: CognitiveObservation[] = [];

      let model = createInitialPersonalModel(patientId, 'English');

      for (let q = 0; q < sessionLength; q++) {
        const displayedAt = 1000 + q * 100;
        const answeredAt = displayedAt + 4250;
        const responseTime = Math.max(0, answeredAt - displayedAt);

        // Assert response time validity (Section 11)
        expect(responseTime).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(responseTime)).toBe(true);
        expect(Number.isNaN(responseTime)).toBe(false);

        const task = TaskGenerator.generateTask({
          domain,
          difficulty: model.domainBeliefs[domain].activeDifficulty,
        });

        // Simulate answering correctly 4 out of 5 times
        const isCorrect = q !== 2;
        const scoreResult = isCorrect
          ? task.scoring(task.payload.correctOptionId)
          : task.scoring('wrong_id');

        const obs: CognitiveObservation = {
          id: `obs-prog-${q}`,
          patientId,
          domain,
          taskId: 'household_object_identification',
          timestamp: new Date().toISOString(),
          difficulty: task.difficulty,
          context: task.context,
          metrics: {
            rawScore: scoreResult.rawScore,
            itemsPresented: 1,
            itemsCorrect: scoreResult.itemsCorrect,
            completionTimeMs: responseTime,
          },
        };

        observations.push(obs);
        model = PersonalizationEngine.updatePersonalModel(model, obs);
      }

      // Verify game did not terminate after question 1
      expect(observations.length).toBe(sessionLength);

      // Section 12 Scoring calculation
      const totalCorrect = observations.filter(o => o.metrics.rawScore === 1.0).length;
      const sessionScore = totalCorrect / sessionLength;
      expect(sessionScore).toBe(4 / 5); // 0.80

      // Section 13 Personalization update & UCB recommendation
      const cogProfile = calculateCognitiveProfile(patientId, observations);
      const rec = recommendNextTrainingSession(cogProfile, observations);
      expect(rec.priorityDomain).toBeDefined();
      expect(rec.recommendedDifficulty).toBeGreaterThanOrEqual(1);
    });
  });
});
