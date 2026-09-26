import {
  CognitiveObservation,
  calculateRealLifeTransfer,
} from '@ner-mind/core';
import { IndexedDbStorageService } from '../storage/indexedDbStorage.js';

export const DEMO_PATIENT_ID = 'patient-ner-001';
export const DEMO_NOTICE = 'DEMO/SYNTHETIC DATA ONLY — FOR SIH EVALUATION. NOT A CLINICAL DIAGNOSIS.';

/**
 * Seeds a realistic 7-day synthetic patient trajectory illustrating the closed-loop USP:
 * Day 1: Real-life Baseline (Morning Tea Routine Sequencing: 65%)
 * Days 2-4: Targeted Cognitive Activities (Attention & Memory Drills: 72% -> 85%)
 * Days 5-6: Cross-Context Drills (Market Shopping & Routine Planning: 82% -> 88%)
 * Day 7: Real-Life Verification Task (Post-training Tea Routine: 88%)
 * Result: +0.23 Transfer Delta (Verified Transfer) + Caregiver Alert Review.
 */
export async function seedDemoScenario(): Promise<{
  observationsCount: number;
  transferEvaluationsCount: number;
  transferDelta: number;
}> {
  await IndexedDbStorageService.resetForTesting();

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 7);

  const getIsoDate = (dayOffset: number, hour: number = 9): string => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 15, 0, 0);
    return d.toISOString();
  };

  // Day 1: Real-Life Baseline (Tea Routine Sequencing)
  const day1BaselineObs: CognitiveObservation = {
    id: crypto.randomUUID(),
    patientId: DEMO_PATIENT_ID,
    domain: 'sequencing',
    taskId: 'morning_tea_sequence',
    timestamp: getIsoDate(0, 9),
    difficulty: 1,
    context: 'kitchen',
    metrics: {
      rawScore: 0.65,
      itemsPresented: 4,
      itemsCorrect: 3,
      completionTimeMs: 24000,
      hesitationCount: 2,
      cueAssistanceCount: 1,
    },
  };

  // Day 2: Attention Drill
  const day2AttentionObs: CognitiveObservation = {
    id: crypto.randomUUID(),
    patientId: DEMO_PATIENT_ID,
    domain: 'attention',
    taskId: 'bihu_drum_rhythm',
    timestamp: getIsoDate(1, 10),
    difficulty: 1,
    context: 'craft',
    metrics: {
      rawScore: 0.72,
      itemsPresented: 5,
      itemsCorrect: 4,
      completionTimeMs: 16000,
      hesitationCount: 1,
      cueAssistanceCount: 0,
    },
  };

  // Day 3: Memory Recall Drill (Adapted to Difficulty 2)
  const day3MemoryObs: CognitiveObservation = {
    id: crypto.randomUUID(),
    patientId: DEMO_PATIENT_ID,
    domain: 'memory',
    taskId: 'market_shopping_recall',
    timestamp: getIsoDate(2, 10),
    difficulty: 2,
    context: 'market',
    metrics: {
      rawScore: 0.80,
      itemsPresented: 5,
      itemsCorrect: 4,
      completionTimeMs: 15500,
      hesitationCount: 1,
      cueAssistanceCount: 0,
    },
  };

  // Day 4: Attention Drill (Higher Difficulty)
  const day4AttentionObs: CognitiveObservation = {
    id: crypto.randomUUID(),
    patientId: DEMO_PATIENT_ID,
    domain: 'attention',
    taskId: 'bihu_drum_rhythm',
    timestamp: getIsoDate(3, 11),
    difficulty: 2,
    context: 'community',
    metrics: {
      rawScore: 0.85,
      itemsPresented: 6,
      itemsCorrect: 5,
      completionTimeMs: 14000,
      hesitationCount: 0,
      cueAssistanceCount: 0,
    },
  };

  // Day 5: Cross-Context Planning Drill
  const day5PlanningObs: CognitiveObservation = {
    id: crypto.randomUUID(),
    patientId: DEMO_PATIENT_ID,
    domain: 'planning',
    taskId: 'day_schedule_planner',
    timestamp: getIsoDate(4, 10),
    difficulty: 2,
    context: 'routine',
    metrics: {
      rawScore: 0.82,
      itemsPresented: 4,
      itemsCorrect: 3,
      completionTimeMs: 18000,
      hesitationCount: 1,
      cueAssistanceCount: 0,
    },
  };

  // Day 6: Cross-Context Calculation Drill
  const day6CalculationObs: CognitiveObservation = {
    id: crypto.randomUUID(),
    patientId: DEMO_PATIENT_ID,
    domain: 'calculation',
    taskId: 'market_currency_exchange',
    timestamp: getIsoDate(5, 11),
    difficulty: 2,
    context: 'market',
    metrics: {
      rawScore: 0.88,
      itemsPresented: 4,
      itemsCorrect: 4,
      completionTimeMs: 13000,
      hesitationCount: 0,
      cueAssistanceCount: 0,
    },
  };

  // Day 7: Real-Life Verification (Post-training Morning Tea Routine)
  const day7VerificationObs: CognitiveObservation = {
    id: crypto.randomUUID(),
    patientId: DEMO_PATIENT_ID,
    domain: 'sequencing',
    taskId: 'morning_tea_sequence',
    timestamp: getIsoDate(6, 9),
    difficulty: 1,
    context: 'kitchen',
    metrics: {
      rawScore: 0.88,
      itemsPresented: 4,
      itemsCorrect: 4,
      completionTimeMs: 15000,
      hesitationCount: 0,
      cueAssistanceCount: 0,
    },
  };

  const syntheticObservations = [
    day1BaselineObs,
    day2AttentionObs,
    day3MemoryObs,
    day4AttentionObs,
    day5PlanningObs,
    day6CalculationObs,
    day7VerificationObs,
  ];

  // Save observations into IndexedDB storage
  for (const obs of syntheticObservations) {
    await IndexedDbStorageService.recordObservation(obs);
  }

  // Intermediate training sessions for transfer calculation
  const trainingInterventions = [
    day2AttentionObs,
    day3MemoryObs,
    day4AttentionObs,
    day5PlanningObs,
    day6CalculationObs,
  ];

  // Compute actual deterministic transfer delta using core algorithm
  const transferEval = calculateRealLifeTransfer(
    day1BaselineObs,
    day7VerificationObs,
    trainingInterventions
  );

  await IndexedDbStorageService.recordTransferEvaluation(transferEval);

  return {
    observationsCount: syntheticObservations.length,
    transferEvaluationsCount: 1,
    transferDelta: transferEval.transferDelta,
  };
}
