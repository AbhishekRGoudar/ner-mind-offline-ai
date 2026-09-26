import { describe, it, expect } from 'vitest';
import {
  calculateRealLifeTransfer,
  assertNonDiagnosticCopy,
} from '../src/transfer/engine.js';
import { CognitiveObservation } from '../src/types/observation.js';

describe('Real-Life Transfer Engine', () => {
  const patientId = 'pat-ner-001';

  const makeObs = (
    taskId: string,
    context: any,
    score: number
  ): CognitiveObservation => ({
    id: crypto.randomUUID(),
    patientId,
    domain: 'sequencing',
    taskId,
    timestamp: new Date().toISOString(),
    difficulty: 2,
    context,
    metrics: {
      rawScore: score,
      itemsPresented: 4,
      itemsCorrect: Math.round(score * 4),
      completionTimeMs: 15000,
      hesitationCount: 1,
      cueAssistanceCount: 0,
    },
  });

  it('calculates positive transfer delta and confidence weighting across diverse contexts', () => {
    // 1. Baseline Task: Morning Tea Routine
    const baseline = makeObs('morning_tea_baseline', 'kitchen', 0.50);

    // 2. Cross-context training interventions: Cooking -> Market -> Craft
    const training = [
      makeObs('cooking_sequence_drill', 'kitchen', 0.65),
      makeObs('market_preparation_drill', 'market', 0.75),
      makeObs('craft_weaving_drill', 'craft', 0.80),
      makeObs('household_chore_drill', 'household', 0.85),
    ];

    // 3. Post-training Verification Task: Morning Tea Verification
    const verification = makeObs('morning_tea_verification', 'kitchen', 0.80);

    const result = calculateRealLifeTransfer(baseline, verification, training);

    expect(result.baselineScore).toBe(0.50);
    expect(result.verificationScore).toBe(0.80);
    expect(result.transferDelta).toBe(0.30);
    expect(result.percentageChange).toBe(60.0);
    expect(result.contextsTraversed).toEqual(['kitchen', 'market', 'craft', 'household']);
    expect(result.confidenceScore).toBe(1.0); // 4 sessions = 4/4 = 1.0
    expect(result.transferCategory).toBe('positive_transfer');
    expect(result.observedReport).toContain('Observed positive transfer in selected real-life task performance');
  });

  it('detects lower performance in verification and formats neutral review recommendation', () => {
    const baseline = makeObs('morning_tea_baseline', 'kitchen', 0.75);
    const training = [makeObs('cooking_sequence_drill', 'kitchen', 0.50)];
    const verification = makeObs('morning_tea_verification', 'kitchen', 0.45);

    const result = calculateRealLifeTransfer(baseline, verification, training);
    expect(result.transferDelta).toBe(-0.30);
    expect(result.transferCategory).toBe('observed_decline');
    expect(result.observedReport).toContain('Caregiver review recommended');
    expect(result.observedReport).not.toContain('dementia');
  });

  it('strictly rejects any prohibited clinical copy via assertNonDiagnosticCopy', () => {
    expect(() => {
      assertNonDiagnosticCopy('Observed improvement in memory recall.');
    }).not.toThrow();

    expect(() => {
      assertNonDiagnosticCopy('Patient dementia has improved after training.');
    }).toThrow(/Safety Violation/);

    expect(() => {
      assertNonDiagnosticCopy('Memory game cured the patient.');
    }).toThrow(/Safety Violation/);

    expect(() => {
      assertNonDiagnosticCopy('Alzheimer progression rate decreased.');
    }).toThrow(/Safety Violation/);
  });
});
