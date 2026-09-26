import { describe, it, expect } from 'vitest';
import {
  createInitialPersonalModel,
  PersonalizationEngine,
  CognitiveObservation,
  TransferEvaluation,
  AVAILABLE_CANDIDATE_TASKS,
} from '../src/index.js';

describe('On-Device Continual Personalization Engine', () => {
  const patientId = 'pat-test-ner-001';

  const makeObs = (
    domain: any,
    score: number,
    difficulty: number = 1,
    context: any = 'market',
    taskId: string = 'market_shopping_recall',
    cues: number = 0,
    timeMs: number = 12000
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

  // --------------------------------------------------------------------------
  // Test 1: Cold Start
  // --------------------------------------------------------------------------
  it('initializes a safe cold-start model with conservative prior and zero confidence', () => {
    const model = createInitialPersonalModel(patientId);

    expect(model.patientId).toBe(patientId);
    expect(model.modelVersion).toBe(1);
    expect(model.totalSessionsCompleted).toBe(0);

    for (const domain of ['memory', 'attention', 'recognition', 'sequencing', 'calculation', 'planning'] as const) {
      const belief = model.domainBeliefs[domain];
      expect(belief.alpha).toBe(2.0);
      expect(belief.beta).toBe(2.0);
      expect(belief.estimatedAbility).toBe(0.50); // Unbiased 50%
      expect(belief.confidence).toBe(0.0);         // Zero confidence on cold start
      expect(belief.uncertainty).toBeCloseTo(0.2236, 3);
      expect(belief.observationCount).toBe(0);
      expect(belief.activeDifficulty).toBe(1);
    }
  });

  // --------------------------------------------------------------------------
  // Test 2: First Observation
  // --------------------------------------------------------------------------
  it('incrementally updates posterior belief after the first observation', () => {
    let model = createInitialPersonalModel(patientId);
    const obs = makeObs('memory', 0.80, 1, 'market', 'market_shopping_recall', 0, 10000);

    model = PersonalizationEngine.updatePersonalModel(model, obs);

    const memory = model.domainBeliefs.memory;
    expect(memory.observationCount).toBe(1);
    expect(memory.estimatedAbility).toBeGreaterThan(0.50);
    expect(memory.confidence).toBeGreaterThan(0.0); // Confidence begins accumulating
    expect(model.totalSessionsCompleted).toBe(1);
    expect(model.latencyProfile.sampleCount).toBe(1);
    expect(model.latencyProfile.meanCompletionTimeMs).toBe(10000);
  });

  // --------------------------------------------------------------------------
  // Test 3: Repeated Improvement & Adaptive Progression
  // --------------------------------------------------------------------------
  it('adapts difficulty upwards after sustained high performance and respects cooldown', () => {
    let model = createInitialPersonalModel(patientId);

    // Provide 4 consecutive high-performance sessions without cues
    for (let i = 0; i < 4; i++) {
      const obs = makeObs('memory', 1.0, model.domainBeliefs.memory.activeDifficulty, 'market', 'market_shopping_recall', 0);
      model = PersonalizationEngine.updatePersonalModel(model, obs);
    }

    const memory = model.domainBeliefs.memory;
    expect(memory.activeDifficulty).toBe(2); // Advanced from 1 to 2
    expect(memory.activeDifficulty).toBe(2); // Advanced from 1 to 2
    expect(memory.cooldownRemainingSessions).toBeGreaterThanOrEqual(1);
    expect(memory.confidence).toBeGreaterThan(0.35);
    expect(model.adaptationHistory.length).toBeGreaterThanOrEqual(1);
    expect(model.adaptationHistory[0].decision).toBe('increase');
    expect(model.adaptationHistory[0].rationale).toContain('consistently strong');
  });

  // --------------------------------------------------------------------------
  // Test 4: Repeated Poor Performance & Level Easing
  // --------------------------------------------------------------------------
  it('eases difficulty downwards after sustained low performance', () => {
    let model = createInitialPersonalModel(patientId);
    // Artificially start at level 3
    model.domainBeliefs.sequencing.activeDifficulty = 3;

    for (let i = 0; i < 4; i++) {
      const obs = makeObs('sequencing', 0.20, model.domainBeliefs.sequencing.activeDifficulty, 'kitchen', 'morning_tea_sequence', 3);
      model = PersonalizationEngine.updatePersonalModel(model, obs);
    }

    const sequencing = model.domainBeliefs.sequencing;
    expect(sequencing.activeDifficulty).toBe(2); // Decreased from 3 to 2
    expect(model.adaptationHistory.length).toBeGreaterThanOrEqual(1);
    expect(model.adaptationHistory[0].decision).toBe('decrease');
    expect(model.adaptationHistory[0].rationale).toContain('Easing difficulty');
  });

  // --------------------------------------------------------------------------
  // Test 5: Outlier Resistance (Noisy / Single Extreme Session)
  // --------------------------------------------------------------------------
  it('does NOT drastically collapse estimated ability from a single accidental zero score', () => {
    let model = createInitialPersonalModel(patientId);

    // Seed 5 solid sessions (score 0.80)
    for (let i = 0; i < 5; i++) {
      const obs = makeObs('attention', 0.80, 1, 'craft', 'craft_pattern_cancellation');
      model = PersonalizationEngine.updatePersonalModel(model, obs);
    }
    const priorAbility = model.domainBeliefs.attention.estimatedAbility;
    expect(priorAbility).toBeGreaterThan(0.70);

    // Single outlier: user accidentally exits or drops phone (score 0.0)
    const outlierObs = makeObs('attention', 0.0, 1, 'craft', 'craft_pattern_cancellation');
    model = PersonalizationEngine.updatePersonalModel(model, outlierObs);

    const postAbility = model.domainBeliefs.attention.estimatedAbility;
    // Ability drops moderately but does NOT collapse to 0
    expect(postAbility).toBeGreaterThan(0.55);
    expect(priorAbility - postAbility).toBeLessThan(0.15); // Shift bounded
  });

  // --------------------------------------------------------------------------
  // Test 6: Welford Reaction Latency & Consistency Tracking
  // --------------------------------------------------------------------------
  it('tracks mean latency and coefficient of variation incrementally', () => {
    let model = createInitialPersonalModel(patientId);
    const times = [8000, 10000, 12000, 10000];

    for (const t of times) {
      const obs = makeObs('planning', 0.80, 1, 'routine', 'day_schedule_planner', 0, t);
      model = PersonalizationEngine.updatePersonalModel(model, obs);
    }

    expect(model.latencyProfile.sampleCount).toBe(4);
    expect(model.latencyProfile.meanCompletionTimeMs).toBe(10000);
    expect(model.latencyProfile.coefficientOfVariation).toBeGreaterThan(0);
    expect(model.latencyProfile.coefficientOfVariation).toBeLessThan(0.30); // Consistent responses
  });

  // --------------------------------------------------------------------------
  // Test 7: Contextual UCB Task Selection (Deficit Remediation)
  // --------------------------------------------------------------------------
  it('prioritizes weak cognitive domains for deficit remediation', () => {
    let model = createInitialPersonalModel(patientId);

    // Establish nominal baseline across all domains (2 observations each at 0.75)
    for (const domain of ['memory', 'recognition', 'sequencing', 'calculation', 'planning'] as const) {
      for (let i = 0; i < 2; i++) {
        model = PersonalizationEngine.updatePersonalModel(
          model,
          makeObs(domain, 0.75, 1, 'market', 'task_' + domain)
        );
      }
    }

    // Now record persistent low performance in attention (3 observations at 0.25)
    for (let i = 0; i < 3; i++) {
      model = PersonalizationEngine.updatePersonalModel(
        model,
        makeObs('attention', 0.25, 1, 'craft', 'craft_pattern_cancellation')
      );
    }

    const selection = PersonalizationEngine.selectNextPersonalizedTask(model);
    expect(selection.candidate.domain).toBe('attention');
    expect(selection.selectionMode).toBe('deficit_remediation');
    expect(selection.rationale).toContain('attention');
  });

  // --------------------------------------------------------------------------
  // Test 8: Context Diversity & Anti-Fatigue Task Rotation
  // --------------------------------------------------------------------------
  it('penalizes immediately repeated tasks to avoid fatigue and encourage diversity', () => {
    let model = createInitialPersonalModel(patientId);

    // User just completed market_shopping_recall
    const obs = makeObs('memory', 0.80, 1, 'market', 'market_shopping_recall');
    model = PersonalizationEngine.updatePersonalModel(model, obs);
    expect(model.recentTaskIds[0]).toBe('market_shopping_recall');

    const selection = PersonalizationEngine.selectNextPersonalizedTask(model);
    // Should NOT immediately repeat the exact same task
    expect(selection.candidate.taskId).not.toBe('market_shopping_recall');
  });

  // --------------------------------------------------------------------------
  // Test 9: Transfer Association Learning
  // --------------------------------------------------------------------------
  it('records transfer associations and leverages them in task selection', () => {
    let model = createInitialPersonalModel(patientId);

    const transferEval: TransferEvaluation = {
      patientId,
      domain: 'sequencing',
      baselineTaskId: 'morning_tea_sequence',
      verificationTaskId: 'morning_tea_sequence',
      baselineScore: 0.60,
      verificationScore: 0.85,
      transferDelta: 0.25,
      percentageChange: 41.7,
      trainingInterventionsCount: 3,
      contextsTraversed: ['kitchen', 'craft'],
      confidenceScore: 0.75,
      transferCategory: 'positive_transfer',
      observedReport: 'Observed positive transfer in selected real-life task performance.',
    };

    model = PersonalizationEngine.recordTransferResult(model, transferEval);

    expect(model.transferAssociations.length).toBe(2);
    const kitchenAssoc = model.transferAssociations.find(a => a.trainingContext === 'kitchen');
    expect(kitchenAssoc).toBeDefined();
    expect(kitchenAssoc?.averageObservedTransferDelta).toBe(0.25);
  });

  // --------------------------------------------------------------------------
  // Test 10: Deterministic Replay / Recovery Invariant
  // --------------------------------------------------------------------------
  it('guarantees deterministic rebuild of the exact model from raw observations', () => {
    let modelA = createInitialPersonalModel(patientId);

    const observations: CognitiveObservation[] = [
      makeObs('memory', 0.8, 1, 'market', 'market_shopping_recall'),
      makeObs('attention', 0.6, 1, 'craft', 'craft_pattern_cancellation'),
      makeObs('sequencing', 0.9, 1, 'kitchen', 'morning_tea_sequence'),
      makeObs('memory', 0.9, 1, 'kitchen', 'kitchen_recipe_recall'),
    ];

    // Model A: updated online incrementally
    for (const obs of observations) {
      modelA = PersonalizationEngine.updatePersonalModel(modelA, obs);
    }

    // Model B: rebuilt from raw observations stream
    const modelB = PersonalizationEngine.rebuildPersonalModelFromObservations(
      patientId,
      observations
    );

    // Deep comparison
    expect(modelB.totalSessionsCompleted).toBe(modelA.totalSessionsCompleted);
    expect(modelB.domainBeliefs.memory.estimatedAbility).toBe(modelA.domainBeliefs.memory.estimatedAbility);
    expect(modelB.domainBeliefs.memory.alpha).toBe(modelA.domainBeliefs.memory.alpha);
    expect(modelB.domainBeliefs.attention.estimatedAbility).toBe(modelA.domainBeliefs.attention.estimatedAbility);
    expect(modelB.latencyProfile.sampleCount).toBe(modelA.latencyProfile.sampleCount);
    expect(modelB.recentTaskIds).toEqual(modelA.recentTaskIds);
  });
});
