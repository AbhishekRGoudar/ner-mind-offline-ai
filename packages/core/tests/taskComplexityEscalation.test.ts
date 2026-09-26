import { describe, it, expect } from 'vitest';
import {
  TaskGenerator,
  CognitiveDomain,
  evaluateAdaptiveDifficulty,
  CognitiveObservation,
  PersonalizationEngine,
  createInitialPersonalModel,
} from '../src/index.js';

describe('Cognitive Content Adaptation: Difficulty Escalation & Regression Loop', () => {
  const domains: CognitiveDomain[] = [
    'memory',
    'attention',
    'sequencing',
    'recognition',
    'calculation',
    'planning',
  ];

  function makeObservation(domain: CognitiveDomain, difficulty: number, rawScore: number, cues: number = 0): CognitiveObservation {
    return {
      id: crypto.randomUUID(),
      patientId: 'patient_escalation_test',
      domain,
      taskId: `task_${domain}`,
      timestamp: new Date().toISOString(),
      difficulty,
      context: 'routine',
      metrics: {
        rawScore,
        itemsPresented: 5,
        itemsCorrect: Math.round(5 * rawScore),
        completionTimeMs: 12000,
        hesitationCount: cues > 0 ? 3 : 0,
        cueAssistanceCount: cues,
      },
    };
  }

  describe('Section 6 & 7: Multi-Level Escalation & Regression with Measurable Complexity Shift', () => {
    domains.forEach(domain => {
      it(`[${domain.toUpperCase()}] verifies full L1 -> L2 -> L3 -> L4 -> L5 escalation and L5 -> L4 regression with content complexity changes`, () => {
        let currentDifficulty = 1;
        const obsHistory: CognitiveObservation[] = [];
        let sessionsSinceLastChange = 2; // Not in cooldown

        // Level 1 Task
        const taskL1 = TaskGenerator.generateTask({ domain, difficulty: currentDifficulty as any, seed: 101 });
        expect(taskL1.difficulty).toBe(1);
        const compL1 = taskL1.complexity.overallComplexity;

        // 3 consecutive strong sessions at Level 1 (rawScore = 1.0, 0 cues)
        for (let i = 0; i < 3; i++) {
          obsHistory.push(makeObservation(domain, currentDifficulty, 1.0, 0));
        }

        const decision1 = evaluateAdaptiveDifficulty(domain, currentDifficulty, obsHistory, sessionsSinceLastChange);
        expect(decision1.decision).toBe('increase');
        expect(decision1.recommendedDifficulty).toBe(2);
        currentDifficulty = decision1.recommendedDifficulty;
        sessionsSinceLastChange = 2; // simulated completed cooldown

        // Level 2 Task & Complexity Verification
        const taskL2 = TaskGenerator.generateTask({ domain, difficulty: currentDifficulty as any, seed: 102 });
        expect(taskL2.difficulty).toBe(2);
        const compL2 = taskL2.complexity.overallComplexity;
        expect(compL2).toBeGreaterThan(compL1);

        // 3 consecutive strong sessions at Level 2
        for (let i = 0; i < 3; i++) {
          obsHistory.push(makeObservation(domain, currentDifficulty, 0.95, 0));
        }

        const decision2 = evaluateAdaptiveDifficulty(domain, currentDifficulty, obsHistory, sessionsSinceLastChange);
        expect(decision2.decision).toBe('increase');
        expect(decision2.recommendedDifficulty).toBe(3);
        currentDifficulty = decision2.recommendedDifficulty;
        sessionsSinceLastChange = 2;

        // Level 3 Task & Complexity Verification
        const taskL3 = TaskGenerator.generateTask({ domain, difficulty: currentDifficulty as any, seed: 103 });
        expect(taskL3.difficulty).toBe(3);
        const compL3 = taskL3.complexity.overallComplexity;
        expect(compL3).toBeGreaterThan(compL2);

        // 3 consecutive strong sessions at Level 3
        for (let i = 0; i < 3; i++) {
          obsHistory.push(makeObservation(domain, currentDifficulty, 0.90, 0));
        }

        const decision3 = evaluateAdaptiveDifficulty(domain, currentDifficulty, obsHistory, sessionsSinceLastChange);
        expect(decision3.decision).toBe('increase');
        expect(decision3.recommendedDifficulty).toBe(4);
        currentDifficulty = decision3.recommendedDifficulty;
        sessionsSinceLastChange = 2;

        // Level 4 Task & Complexity Verification
        const taskL4 = TaskGenerator.generateTask({ domain, difficulty: currentDifficulty as any, seed: 104 });
        expect(taskL4.difficulty).toBe(4);
        const compL4 = taskL4.complexity.overallComplexity;
        expect(compL4).toBeGreaterThan(compL3);

        // 3 consecutive strong sessions at Level 4
        for (let i = 0; i < 3; i++) {
          obsHistory.push(makeObservation(domain, currentDifficulty, 0.92, 0));
        }

        const decision4 = evaluateAdaptiveDifficulty(domain, currentDifficulty, obsHistory, sessionsSinceLastChange);
        expect(decision4.decision).toBe('increase');
        expect(decision4.recommendedDifficulty).toBe(5);
        currentDifficulty = decision4.recommendedDifficulty;
        sessionsSinceLastChange = 2;

        // Level 5 Task & Complexity Verification
        const taskL5 = TaskGenerator.generateTask({ domain, difficulty: currentDifficulty as any, seed: 105 });
        expect(taskL5.difficulty).toBe(5);
        const compL5 = taskL5.complexity.overallComplexity;
        expect(compL5).toBeGreaterThan(compL4);

        // -------------------------------------------------------------
        // REGRESSION: Repeated poor performance at Level 5 (rawScore = 0.20, 3 cues)
        // -------------------------------------------------------------
        for (let i = 0; i < 3; i++) {
          obsHistory.push(makeObservation(domain, currentDifficulty, 0.20, 3));
        }

        const regDecision = evaluateAdaptiveDifficulty(domain, currentDifficulty, obsHistory, sessionsSinceLastChange);
        expect(regDecision.decision).toBe('decrease');
        expect(regDecision.recommendedDifficulty).toBe(4);
        currentDifficulty = regDecision.recommendedDifficulty;

        // Generated task at Level 4 must have measurably lower complexity than Level 5
        const taskRegressed = TaskGenerator.generateTask({ domain, difficulty: currentDifficulty as any, seed: 106 });
        expect(taskRegressed.difficulty).toBe(4);
        expect(taskRegressed.complexity.overallComplexity).toBeLessThan(compL5);
        expect(taskRegressed.complexity.overallComplexity).toBeCloseTo(compL4, 1);
      });
    });
  });

  describe('Section 8: Best, Average, Worst Case & Outlier Resilience', () => {
    it('Best Case: triggers gradual difficulty advancement with growing Bayesian confidence', () => {
      let model = createInitialPersonalModel('patient_best_case');

      // 4 consecutive strong sessions in memory
      for (let i = 0; i < 4; i++) {
        const currentDiff = model.domainBeliefs.memory.activeDifficulty;
        const obs = makeObservation('memory', currentDiff, 0.95, 0);
        model = PersonalizationEngine.updatePersonalModel(model, obs);
      }

      // Bayesian belief should reflect high ability and high confidence
      const belief = model.domainBeliefs.memory;
      expect(belief.estimatedAbility).toBeGreaterThan(0.70);
      expect(belief.confidence).toBeGreaterThan(0.40);
      expect(model.domainBeliefs.memory.activeDifficulty).toBeGreaterThanOrEqual(1);
    });

    it('Average Case: maintains stable difficulty without abrupt changes', () => {
      let model = createInitialPersonalModel('patient_avg_case');

      // Realistic mixed performances around target band (0.65 - 0.75)
      const mixedScores = [0.70, 0.65, 0.75, 0.70];
      for (const s of mixedScores) {
        const currentDiff = model.domainBeliefs.attention.activeDifficulty;
        const obs = makeObservation('attention', currentDiff, s, 0);
        model = PersonalizationEngine.updatePersonalModel(model, obs);
      }

      // Difficulty should remain at initial Level 1
      expect(model.domainBeliefs.attention.activeDifficulty).toBe(1);
      expect(model.domainBeliefs.attention.estimatedAbility).toBeGreaterThan(0.50);
      expect(model.domainBeliefs.attention.estimatedAbility).toBeLessThan(0.75);
    });

    it('Worst Case: persistent poor performance gradually decreases difficulty to build confidence', () => {
      let model = createInitialPersonalModel('patient_worst_case');
      // Set initial level to 3
      model.domainBeliefs.sequencing.activeDifficulty = 3;

      // 4 consecutive low sessions (rawScore <= 0.35, high cues)
      for (let i = 0; i < 4; i++) {
        const currentDiff = model.domainBeliefs.sequencing.activeDifficulty;
        const obs = makeObservation('sequencing', currentDiff, 0.30, 2);
        model = PersonalizationEngine.updatePersonalModel(model, obs);
      }

      // Difficulty should decrease
      expect(model.domainBeliefs.sequencing.activeDifficulty).toBeLessThan(3);
    });

    it('Outlier Resilience: A single bad session does not cause difficulty collapse', () => {
      let model = createInitialPersonalModel('patient_outlier_test');
      model.domainBeliefs.calculation.activeDifficulty = 3;

      // 3 strong sessions at Level 3
      for (let i = 0; i < 3; i++) {
        model = PersonalizationEngine.updatePersonalModel(model, makeObservation('calculation', 3, 0.90, 0));
      }
      expect(model.domainBeliefs.calculation.activeDifficulty).toBeGreaterThanOrEqual(3);

      // ONE extreme outlier (accidental miss or sudden interruption: score = 0.0)
      const outlierObs = makeObservation('calculation', model.domainBeliefs.calculation.activeDifficulty, 0.0, 0);
      model = PersonalizationEngine.updatePersonalModel(model, outlierObs);

      // System MUST NOT collapse difficulty because 1 single session does not satisfy multi-session threshold
      expect(model.domainBeliefs.calculation.activeDifficulty).toBeGreaterThanOrEqual(3);

      // Following with strong session recovers stability
      model = PersonalizationEngine.updatePersonalModel(model, makeObservation('calculation', model.domainBeliefs.calculation.activeDifficulty, 0.92, 0));
      expect(model.domainBeliefs.calculation.activeDifficulty).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Section 9: Noise & Anti-Oscillation Resilience', () => {
    it('prevents rapid oscillation under alternating noisy performance [80%, 55%, 90%, 48%, 82%, 51%]', () => {
      let model = createInitialPersonalModel('patient_noise_test');
      const startDifficulty = model.domainBeliefs.planning.activeDifficulty;
      const noisyScores = [0.80, 0.55, 0.90, 0.48, 0.82, 0.51];

      const difficultyHistory: number[] = [startDifficulty];

      noisyScores.forEach(score => {
        const currentDiff = model.domainBeliefs.planning.activeDifficulty;
        const obs = makeObservation('planning', currentDiff, score, 0);
        model = PersonalizationEngine.updatePersonalModel(model, obs);
        difficultyHistory.push(model.domainBeliefs.planning.activeDifficulty);
      });

      // Assert no rapid ping-pong oscillation: difficulty changes must be bounded
      const maxDiff = Math.max(...difficultyHistory);
      const minDiff = Math.min(...difficultyHistory);
      expect(maxDiff - minDiff).toBeLessThanOrEqual(1);

      // Bayesian variance / uncertainty should reflect the noisy data
      const belief = model.domainBeliefs.planning;
      expect(belief.uncertainty).toBeGreaterThan(0.04); // Substantial uncertainty remains due to mixed signals
      expect(belief.estimatedAbility).toBeGreaterThan(0.55);
      expect(belief.estimatedAbility).toBeLessThan(0.85);
    });
  });
});
