import { describe, it, expect } from 'vitest';
import {
  evaluateAdaptiveDifficulty,
  recommendNextTrainingSession,
} from '../src/adaptive/engine.js';
import { CognitiveObservation } from '../src/types/observation.js';
import { calculateCognitiveProfile } from '../src/cognitive/profile.js';

describe('Adaptive Difficulty Engine', () => {
  const patientId = 'pat-ner-001';

  const makeObs = (score: number, cues: number = 0, difficulty: number = 2): CognitiveObservation => ({
    id: crypto.randomUUID(),
    patientId,
    domain: 'memory',
    taskId: 'market_shopping_recall',
    timestamp: new Date().toISOString(),
    difficulty,
    context: 'market',
    metrics: {
      rawScore: score,
      itemsPresented: 5,
      itemsCorrect: Math.round(score * 5),
      completionTimeMs: 10000,
      hesitationCount: 0,
      cueAssistanceCount: cues,
    },
  });

  it('respects anti-hysteresis cooldown and locks difficulty', () => {
    const observations = [makeObs(0.95), makeObs(0.95), makeObs(0.95)];
    // Sessions since last change = 0 (just changed)
    const result = evaluateAdaptiveDifficulty('memory', 2, observations, 0);
    expect(result.decision).toBe('maintain');
    expect(result.recommendedDifficulty).toBe(2);
    expect(result.cooldownRemainingSessions).toBe(2);
    expect(result.rationale).toContain('cooldown period');
  });

  it('does NOT adjust difficulty when fewer than 3 observations exist', () => {
    const observations = [makeObs(0.99), makeObs(0.99)];
    const result = evaluateAdaptiveDifficulty('memory', 2, observations, 2);
    expect(result.decision).toBe('maintain');
    expect(result.recommendedDifficulty).toBe(2);
    expect(result.rationale).toContain('Insufficient observations (2/3)');
  });

  it('advances difficulty after 3 consecutive high performances without cue assistance', () => {
    const observations = [makeObs(0.90, 0), makeObs(0.88, 0), makeObs(0.92, 0)];
    const result = evaluateAdaptiveDifficulty('memory', 2, observations, 2);
    expect(result.decision).toBe('increase');
    expect(result.recommendedDifficulty).toBe(3);
    expect(result.rationale).toContain('Advancing to level 3');
  });

  it('caps difficulty progression at maximum level 5', () => {
    const observations = [makeObs(0.95, 0), makeObs(0.95, 0), makeObs(0.95, 0)];
    const result = evaluateAdaptiveDifficulty('memory', 5, observations, 2);
    expect(result.decision).toBe('maintain');
    expect(result.recommendedDifficulty).toBe(5);
    expect(result.rationale).toContain('maximum difficulty level 5');
  });

  it('does NOT decrease difficulty from a single isolated low score', () => {
    // 2 high scores, 1 low score -> average = (0.85 + 0.85 + 0.30) / 3 = 0.667 (in maintenance range)
    const observations = [makeObs(0.85), makeObs(0.85), makeObs(0.30)];
    const result = evaluateAdaptiveDifficulty('memory', 3, observations, 2);
    expect(result.decision).toBe('maintain');
    expect(result.recommendedDifficulty).toBe(3);
  });

  it('eases difficulty after 3 consecutive low performances', () => {
    const observations = [makeObs(0.40), makeObs(0.35), makeObs(0.30)];
    const result = evaluateAdaptiveDifficulty('memory', 3, observations, 2);
    expect(result.decision).toBe('decrease');
    expect(result.recommendedDifficulty).toBe(2);
    expect(result.rationale).toContain('Decreasing difficulty to level 2');
  });

  it('floors difficulty easing at minimum level 1', () => {
    const observations = [makeObs(0.30), makeObs(0.30), makeObs(0.30)];
    const result = evaluateAdaptiveDifficulty('memory', 1, observations, 2);
    expect(result.decision).toBe('maintain');
    expect(result.recommendedDifficulty).toBe(1);
    expect(result.rationale).toContain('minimum difficulty level 1');
  });

  it('recommends next training session rotating context for cross-context transfer', () => {
    const obsList = [
      makeObs(0.85, 0, 2), // context: market
    ];
    const profile = calculateCognitiveProfile(patientId, obsList);
    const recommendation = recommendNextTrainingSession(profile, obsList);

    expect(recommendation).toBeDefined();
    expect(recommendation.priorityDomain).toBeDefined();
    // Context should be suggested
    expect(recommendation.recommendedContext).toBeDefined();
    expect(recommendation.recommendedDifficulty).toBeGreaterThanOrEqual(1);
  });
});
