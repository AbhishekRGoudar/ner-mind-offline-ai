import { CognitiveObservation } from '../types/observation.js';

export interface TransferEvaluation {
  patientId: string;
  domain: string;
  baselineTaskId: string;
  verificationTaskId: string;
  baselineScore: number;
  verificationScore: number;
  transferDelta: number;          // V - B
  percentageChange: number;       // ((V - B) / max(0.01, B)) * 100
  trainingInterventionsCount: number;
  contextsTraversed: string[];
  confidenceScore: number;        // [0.0, 1.0]
  transferCategory: 'positive_transfer' | 'neutral_transfer' | 'observed_decline';
  observedReport: string;         // Strictly non-diagnostic report
}

const FORBIDDEN_WORDS = ['dementia', 'cure', 'alzheimer', 'stage', 'progression rate', 'cognitive decline disease'];

/**
 * Validates that report text contains no prohibited diagnostic claims.
 */
export function assertNonDiagnosticCopy(text: string): void {
  const lower = text.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (lower.includes(word)) {
      throw new Error(`Safety Violation: Text contains prohibited clinical term '${word}'. Observed-performance language only is permitted.`);
    }
  }
}

/**
 * Calculates Real-Life Transfer Delta between baseline and post-training verification tasks.
 * Measures whether cognitive exercise gains transfer to everyday functional tasks across contexts.
 */
export function calculateRealLifeTransfer(
  baseline: CognitiveObservation,
  verification: CognitiveObservation,
  trainingSessions: CognitiveObservation[]
): TransferEvaluation {
  if (baseline.domain !== verification.domain) {
    throw new Error(`Domain mismatch: baseline is in domain '${baseline.domain}', verification is in domain '${verification.domain}'.`);
  }

  const baselineScore = baseline.metrics.rawScore;
  const verificationScore = verification.metrics.rawScore;
  const delta = Number((verificationScore - baselineScore).toFixed(3));
  
  // Safe denominator percentage change
  const baselineSafe = Math.max(0.05, baselineScore);
  const percentageChange = Number((((verificationScore - baselineScore) / baselineSafe) * 100).toFixed(1));

  // Extract unique contexts trained across
  const uniqueContexts = Array.from(
    new Set(trainingSessions.map(s => s.context))
  );

  // Confidence is proportional to the number of cross-context training sessions completed
  const confidenceScore = Number(Math.min(1.0, trainingSessions.length / 4).toFixed(2));

  let transferCategory: 'positive_transfer' | 'neutral_transfer' | 'observed_decline';
  let observedReport: string;

  if (delta >= 0.10) {
    transferCategory = 'positive_transfer';
    observedReport = `Observed positive transfer in selected real-life task performance (+${(delta * 100).toFixed(1)}% observed score change across ${uniqueContexts.length} training context${uniqueContexts.length > 1 ? 's' : ''}).`;
  } else if (delta <= -0.10) {
    transferCategory = 'observed_decline';
    observedReport = `Observed lower performance in selected real-life task (${(delta * 100).toFixed(1)}% observed score change). Caregiver review recommended.`;
  } else {
    transferCategory = 'neutral_transfer';
    observedReport = `Observed stable performance in selected real-life task (${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}% change). Maintenance ongoing.`;
  }

  // Enforce Non-Diagnostic Safety Invariant
  assertNonDiagnosticCopy(observedReport);

  return {
    patientId: baseline.patientId,
    domain: baseline.domain,
    baselineTaskId: baseline.taskId,
    verificationTaskId: verification.taskId,
    baselineScore,
    verificationScore,
    transferDelta: delta,
    percentageChange,
    trainingInterventionsCount: trainingSessions.length,
    contextsTraversed: uniqueContexts,
    confidenceScore,
    transferCategory,
    observedReport,
  };
}
