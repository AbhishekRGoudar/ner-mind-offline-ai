import { describe, it, expect } from 'vitest';
import {
  createInitialPersonalModel,
  PersonalizationEngine,
  CognitiveObservation,
  CognitiveDomain,
  CognitiveDomainEnum,
  TaskGenerator,
  AVAILABLE_CANDIDATE_TASKS,
} from '../src/index.js';

describe('Level 5 Mastery / Maintenance Mode & Cross-Context Transfer', () => {
  const patientId = 'pat-mastery-test';

  const makeObs = (
    domain: CognitiveDomain,
    score: number,
    difficulty: number = 5,
    context: any = 'market',
    cues: number = 0,
    timeMs: number = 4000
  ): CognitiveObservation => ({
    id: crypto.randomUUID(),
    patientId,
    domain,
    taskId: `${domain}_task_level_${difficulty}`,
    timestamp: new Date().toISOString(),
    difficulty,
    context,
    metrics: {
      rawScore: score,
      itemsPresented: 10,
      itemsCorrect: Math.round(score * 10),
      completionTimeMs: timeMs,
      hesitationCount: cues,
      cueAssistanceCount: cues,
    },
  });

  it('enforces Level 5 as the strict maximum ceiling (NO Level 6)', () => {
    let model = createInitialPersonalModel(patientId);
    
    // Set memory domain to Level 5 with established history
    model.domainBeliefs.memory.activeDifficulty = 5;
    model.domainBeliefs.memory.observationCount = 5;
    model.domainBeliefs.memory.consecutiveHighSessionsAtL5 = 5;
    model.domainBeliefs.memory.adaptationMode = 'mastery';

    // Simulate 10 perfect sessions
    for (let i = 0; i < 10; i++) {
      model = PersonalizationEngine.updatePersonalModel(
        model,
        makeObs('memory', 1.0, 5, 'market', 0, 3000)
      );
      expect(model.domainBeliefs.memory.activeDifficulty).toBeLessThanOrEqual(5);
      expect(model.domainBeliefs.memory.activeDifficulty).toBe(5);
    }

    // Recommendation must strictly recommend difficulty <= 5
    const rec = PersonalizationEngine.selectNextPersonalizedTask(model);
    expect(rec.recommendedDifficulty).toBeLessThanOrEqual(5);
    expect(model.domainBeliefs.memory.activeDifficulty).toBe(5);
  });

  it('activates Mastery Mode only after sustained evidence at Level 5', () => {
    let model = createInitialPersonalModel(patientId);
    model.domainBeliefs.memory.activeDifficulty = 5;
    model.domainBeliefs.memory.observationCount = 3;
    model.domainBeliefs.memory.confidence = 0.5;
    expect(model.domainBeliefs.memory.adaptationMode).toBe('exploration');

    // Session 1: strong
    model = PersonalizationEngine.updatePersonalModel(
      model,
      makeObs('memory', 0.90, 5, 'market', 0, 3800)
    );
    // Not yet mastery after only 1 session
    expect(model.domainBeliefs.memory.consecutiveHighSessionsAtL5).toBe(1);
    expect(model.domainBeliefs.memory.adaptationMode).not.toBe('mastery');

    // Session 2: strong
    model = PersonalizationEngine.updatePersonalModel(
      model,
      makeObs('memory', 0.92, 5, 'kitchen', 0, 3700)
    );
    expect(model.domainBeliefs.memory.consecutiveHighSessionsAtL5).toBe(2);
    expect(model.domainBeliefs.memory.adaptationMode).not.toBe('mastery');

    // Session 3: strong
    model = PersonalizationEngine.updatePersonalModel(
      model,
      makeObs('memory', 0.95, 5, 'household', 0, 3500)
    );
    // Sustained high confidence & 3 sessions -> Mastery Mode activates!
    expect(model.domainBeliefs.memory.consecutiveHighSessionsAtL5).toBe(3);
    expect(model.domainBeliefs.memory.adaptationMode).toBe('mastery');
    expect(model.domainBeliefs.memory.contextsTestedAtL5).toContain('market');
    expect(model.domainBeliefs.memory.contextsTestedAtL5).toContain('kitchen');
    expect(model.domainBeliefs.memory.contextsTestedAtL5).toContain('household');
  });

  it('protects against single-session outliers at Level 5', () => {
    let model = createInitialPersonalModel(patientId);
    model.domainBeliefs.memory.activeDifficulty = 5;
    model.domainBeliefs.memory.observationCount = 5;
    model.domainBeliefs.memory.consecutiveHighSessionsAtL5 = 4;
    model.domainBeliefs.memory.adaptationMode = 'mastery';
    model.domainBeliefs.memory.confidence = 0.6;

    // Single bad session (40% accuracy)
    model = PersonalizationEngine.updatePersonalModel(
      model,
      makeObs('memory', 0.40, 5, 'market', 2, 14000)
    );

    // Outlier protection: do NOT drop difficulty immediately or terminate mastery
    expect(model.domainBeliefs.memory.activeDifficulty).toBe(5);
    expect(model.domainBeliefs.memory.adaptationMode).toBe('mastery');
    expect(model.domainBeliefs.memory.consecutiveLowSessionsAtL5).toBe(1);

    // Followed by strong session
    model = PersonalizationEngine.updatePersonalModel(
      model,
      makeObs('memory', 0.92, 5, 'kitchen', 0, 4000)
    );
    expect(model.domainBeliefs.memory.activeDifficulty).toBe(5);
    expect(model.domainBeliefs.memory.adaptationMode).toBe('mastery');
    expect(model.domainBeliefs.memory.consecutiveLowSessionsAtL5).toBe(0);
  });

  it('exits Mastery Mode on repeated, sustained weak performance and steps down to Level 4', () => {
    let model = createInitialPersonalModel(patientId);
    model.domainBeliefs.memory.activeDifficulty = 5;
    model.domainBeliefs.memory.observationCount = 5;
    model.domainBeliefs.memory.adaptationMode = 'mastery';
    model.domainBeliefs.memory.consecutiveHighSessionsAtL5 = 3;

    // First weak session (absorbed by outlier protection)
    model = PersonalizationEngine.updatePersonalModel(
      model,
      makeObs('memory', 0.35, 5, 'market', 3, 16000)
    );
    expect(model.domainBeliefs.memory.activeDifficulty).toBe(5);
    expect(model.domainBeliefs.memory.consecutiveLowSessionsAtL5).toBe(1);

    // Second weak session -> repeated weak performance!
    model = PersonalizationEngine.updatePersonalModel(
      model,
      makeObs('memory', 0.30, 5, 'market', 3, 18000)
    );

    // Exits mastery and eases to Level 4 remediation
    expect(model.domainBeliefs.memory.activeDifficulty).toBe(4);
    expect(model.domainBeliefs.memory.adaptationMode).toBe('remediation');
  });

  it('generates rich, varied Level 5 tasks across rotating contexts in Mastery Mode for all 6 domains', () => {
    CognitiveDomainEnum.options.forEach((domain: CognitiveDomain) => {
      const fingerprints = new Set<string>();
      const contexts = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const task = TaskGenerator.generateTask({
          domain,
          difficulty: 5,
          masteryMode: true,
          seed: 1000 + i * 77,
          recentFingerprints: Array.from(fingerprints),
        });

        expect(task.difficulty).toBe(5);
        expect(task.domain).toBe(domain);
        expect(task.complexity.overallComplexity).toBeGreaterThanOrEqual(0.7); // Level 5 complexity
        expect(task.instructions.length).toBeGreaterThan(0);
        expect(task.fingerprint.length).toBeGreaterThan(0);

        fingerprints.add(task.fingerprint);
        if (task.context) {
          contexts.add(task.context);
        }
      }

      // Verification of variation: multiple unique tasks generated
      expect(fingerprints.size).toBeGreaterThanOrEqual(5);
      // Context variation where applicable
      if (domain === 'memory' || domain === 'sequencing' || domain === 'calculation' || domain === 'planning') {
        expect(contexts.size).toBeGreaterThanOrEqual(2);
      }
    });
  });

  it('remains stable across 30+ simulated sessions without oscillation', () => {
    let model = createInitialPersonalModel(patientId);
    model.domainBeliefs.memory.activeDifficulty = 4;
    model.domainBeliefs.memory.observationCount = 4;
    model.domainBeliefs.memory.confidence = 0.5;

    // Progress from 4 to 5
    for (let i = 0; i < 3; i++) {
      model = PersonalizationEngine.updatePersonalModel(
        model,
        makeObs('memory', 0.90, 4, 'market', 0, 3800)
      );
    }

    expect(model.domainBeliefs.memory.activeDifficulty).toBe(5);

    // Simulate 35 Level 5 sessions with realistic human variance (mostly high, occasional slump)
    const simulatedAccuracies = [
      0.90, 0.95, 0.92, 0.91, 0.94, // Mastery entered
      0.88, 0.90, 0.92, 0.89, 0.91,
      0.45, // Outlier (absorbed)
      0.91, 0.93, 0.90, 0.88, 0.92,
      0.89, 0.91, 0.94, 0.92, 0.90,
      0.50, // Outlier (absorbed)
      0.90, 0.89, 0.93, 0.91, 0.92,
      0.90, 0.92, 0.94, 0.89, 0.91,
      0.92, 0.93, 0.90
    ];

    let difficultyTransitions = 0;
    let currentDiff = model.domainBeliefs.memory.activeDifficulty;

    simulatedAccuracies.forEach((acc, idx) => {
      model = PersonalizationEngine.updatePersonalModel(
        model,
        makeObs(
          'memory',
          acc,
          5,
          idx % 3 === 0 ? 'market' : idx % 3 === 1 ? 'kitchen' : 'household',
          acc < 0.6 ? 1 : 0,
          4000 + Math.random() * 500
        )
      );

      if (model.domainBeliefs.memory.activeDifficulty !== currentDiff) {
        difficultyTransitions++;
        currentDiff = model.domainBeliefs.memory.activeDifficulty;
      }
      expect(model.domainBeliefs.memory.activeDifficulty).toBeLessThanOrEqual(5);
    });

    // Zero unwanted oscillations back and forth between 4 and 5
    expect(difficultyTransitions).toBe(0);
    expect(model.domainBeliefs.memory.activeDifficulty).toBe(5);
    expect(model.domainBeliefs.memory.adaptationMode).toBe('mastery');
  });

  it('uses non-diagnostic phrasing in recommendations and caregiver evaluation', () => {
    let model = createInitialPersonalModel(patientId);
    model.domainBeliefs.memory.activeDifficulty = 5;
    model.domainBeliefs.memory.observationCount = 6;
    model.domainBeliefs.memory.adaptationMode = 'mastery';
    model.domainBeliefs.memory.consecutiveHighSessionsAtL5 = 4;
    model.domainBeliefs.memory.contextsTestedAtL5 = ['market', 'kitchen', 'household'];

    const memoryTasks = AVAILABLE_CANDIDATE_TASKS.filter(t => t.domain === 'memory');
    const rec = PersonalizationEngine.selectNextPersonalizedTask(model, memoryTasks);
    expect(rec.rationale).not.toMatch(/cured|recovered|brain damage|dementia reversed/i);
    expect(rec.rationale).toMatch(/mastery|maintenance|cross-context/i);
    expect(rec.recommendedDifficulty).toBe(5);
    expect(rec.adaptationMode).toBe('mastery');
  });
});
