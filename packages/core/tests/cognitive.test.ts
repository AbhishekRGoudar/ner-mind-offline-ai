import { describe, it, expect } from 'vitest';
import { calculateCognitiveProfile } from '../src/cognitive/profile.js';
import { CognitiveObservation } from '../src/types/observation.js';

describe('Cognitive Profile Engine', () => {
  const patientId = 'pat-ner-001';

  const createObservation = (
    domain: any,
    score: number,
    difficulty: number = 2,
    timestampOffsetMinutes: number = 0
  ): CognitiveObservation => ({
    id: crypto.randomUUID(),
    patientId,
    domain,
    taskId: `${domain}_sample_task`,
    timestamp: new Date(Date.now() + timestampOffsetMinutes * 60000).toISOString(),
    difficulty,
    context: 'market',
    metrics: {
      rawScore: score,
      itemsPresented: 5,
      itemsCorrect: Math.round(score * 5),
      completionTimeMs: 12000,
      hesitationCount: 1,
      cueAssistanceCount: 0,
    },
  });

  it('calculates a 6-domain multidimensional profile without collapsing to single brain score', () => {
    const observations: CognitiveObservation[] = [
      createObservation('memory', 0.8, 2, 0),
      createObservation('attention', 0.9, 3, 10),
      createObservation('sequencing', 0.7, 2, 20),
    ];

    const profile = calculateCognitiveProfile(patientId, observations);

    expect(profile.patientId).toBe(patientId);
    expect(profile.domains.memory.observationCount).toBe(1);
    expect(profile.domains.memory.currentScore).toBe(0.8);
    expect(profile.domains.attention.currentScore).toBe(0.9);
    expect(profile.domains.sequencing.currentScore).toBe(0.7);
    // Untested domains should have default neutral baseline
    expect(profile.domains.calculation.observationCount).toBe(0);
    expect(profile.domains.planning.observationCount).toBe(0);
    expect(profile.domains.recognition.observationCount).toBe(0);
  });

  it('applies EMA smoothing across sequential observations', () => {
    // EMA with alpha=0.25:
    // obs 0: 0.60
    // obs 1: 0.80 -> 0.25*0.80 + 0.75*0.60 = 0.20 + 0.45 = 0.65
    // obs 2: 0.90 -> 0.25*0.90 + 0.75*0.65 = 0.225 + 0.4875 = 0.7125 ~ 0.713
    const observations: CognitiveObservation[] = [
      createObservation('memory', 0.6, 2, 0),
      createObservation('memory', 0.8, 2, 10),
      createObservation('memory', 0.9, 2, 20),
    ];

    const profile = calculateCognitiveProfile(patientId, observations, { alpha: 0.25 });
    expect(profile.domains.memory.currentScore).toBeCloseTo(0.713, 2);
  });

  it('does not plunge cognitive score due to one isolated low score', () => {
    const observations: CognitiveObservation[] = [
      createObservation('memory', 0.85, 3, 0),
      createObservation('memory', 0.85, 3, 10),
      createObservation('memory', 0.85, 3, 20),
      // Isolated bad session (fatigue / distraction)
      createObservation('memory', 0.20, 3, 30),
    ];

    const profile = calculateCognitiveProfile(patientId, observations, { alpha: 0.25 });
    // Prior EMA was 0.85. With alpha=0.25: 0.25*0.20 + 0.75*0.85 = 0.05 + 0.6375 = 0.688
    expect(profile.domains.memory.currentScore).toBeGreaterThan(0.65);
    // Should NOT trigger decline alert on isolated mistake
    expect(profile.reviewRecommended).toBe(false);
  });

  it('triggers neutral review recommendation upon repeated persistent decline without clinical claims', () => {
    const observations: CognitiveObservation[] = [
      createObservation('memory', 0.75, 3, 0),
      createObservation('memory', 0.35, 3, 10),
      createObservation('memory', 0.30, 3, 20),
      createObservation('memory', 0.25, 3, 30),
    ];

    const profile = calculateCognitiveProfile(patientId, observations);
    expect(profile.reviewRecommended).toBe(true);
    expect(profile.reviewReason).toContain('Repeated decline observed in selected activity performance');
    // Ensure strict non-diagnostic copy (no "dementia", "progression", etc.)
    expect(profile.reviewReason).not.toContain('dementia');
    expect(profile.reviewReason).not.toContain('progression');
  });
});
