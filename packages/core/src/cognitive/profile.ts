import { CognitiveDomain, CognitiveObservation } from '../types/observation.js';

export interface DomainSkillMetrics {
  currentScore: number;          // Smoothed score in [0.0, 1.0]
  observationCount: number;      // Observations in window
  trend: 'improving' | 'stable' | 'declining';
  lastAssessed: string | null;   // ISO-8601 UTC
  meanCompletionTimeMs: number;
  averageCueAssistance: number;
  activeDifficulty: number;      // Current recommended difficulty (1-5)
}

export interface CognitiveProfile {
  patientId: string;
  calculatedAt: string;
  domains: Record<CognitiveDomain, DomainSkillMetrics>;
  observedSummary: string;       // Non-diagnostic observed summary
  reviewRecommended: boolean;    // Neutral flag if repeated decline observed
  reviewReason?: string;
}

const ALL_DOMAINS: CognitiveDomain[] = [
  'memory',
  'attention',
  'recognition',
  'sequencing',
  'calculation',
  'planning',
];

const DEFAULT_EMA_ALPHA = 0.25;
const DEFAULT_WINDOW_SIZE = 10;
const MIN_SAMPLES_FOR_TREND = 3;

/**
 * Calculates a multidimensional cognitive profile from raw observations.
 * Adheres strictly to the Non-Diagnostic Safety Invariant.
 */
export function calculateCognitiveProfile(
  patientId: string,
  observations: CognitiveObservation[],
  options: {
    alpha?: number;
    windowSize?: number;
    declineThreshold?: number; // e.g. 0.45 threshold
  } = {}
): CognitiveProfile {
  const alpha = options.alpha ?? DEFAULT_EMA_ALPHA;
  const windowSize = options.windowSize ?? DEFAULT_WINDOW_SIZE;
  const declineThreshold = options.declineThreshold ?? 0.45;

  const domainObservations: Record<CognitiveDomain, CognitiveObservation[]> = {
    memory: [],
    attention: [],
    recognition: [],
    sequencing: [],
    calculation: [],
    planning: [],
  };

  // Sort chronologically ascending
  const sorted = [...observations].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const obs of sorted) {
    if (obs.patientId === patientId && domainObservations[obs.domain]) {
      domainObservations[obs.domain].push(obs);
    }
  }

  const domains: Record<CognitiveDomain, DomainSkillMetrics> = {} as any;
  let domainsWithDecline = 0;
  const declineNotes: string[] = [];

  for (const domain of ALL_DOMAINS) {
    const rawList = domainObservations[domain];
    // Restrict to sliding window
    const window = rawList.slice(-windowSize);

    if (window.length === 0) {
      domains[domain] = {
        currentScore: 0.5, // neutral baseline default
        observationCount: 0,
        trend: 'stable',
        lastAssessed: null,
        meanCompletionTimeMs: 0,
        averageCueAssistance: 0,
        activeDifficulty: 1,
      };
      continue;
    }

    // Calculate EMA across window
    let ema = window[0].metrics.rawScore;
    let totalTime = 0;
    let totalCues = 0;

    for (let i = 0; i < window.length; i++) {
      const score = window[i].metrics.rawScore;
      if (i > 0) {
        ema = alpha * score + (1 - alpha) * ema;
      }
      totalTime += window[i].metrics.completionTimeMs;
      totalCues += window[i].metrics.cueAssistanceCount;
    }

    const latest = window[window.length - 1];
    const meanTime = Math.round(totalTime / window.length);
    const avgCues = Number((totalCues / window.length).toFixed(2));

    // Determine trend from recent observations
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (window.length >= MIN_SAMPLES_FOR_TREND) {
      const recentScores = window.slice(-3).map(o => o.metrics.rawScore);
      const recentMean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      
      const priorScores = window.slice(0, -3).map(o => o.metrics.rawScore);
      const priorMean = priorScores.length > 0 
        ? priorScores.reduce((a, b) => a + b, 0) / priorScores.length
        : window[0].metrics.rawScore;

      const delta = recentMean - priorMean;
      // Persistent decline requires either recentMean <= declineThreshold,
      // or at least 2 out of 3 recent sessions below decline threshold
      const lowSessionsCount = recentScores.filter(s => s <= declineThreshold).length;

      if (delta >= 0.15 && recentMean >= 0.70) {
        trend = 'improving';
      } else if (lowSessionsCount >= 2 || (recentMean <= declineThreshold && delta <= -0.15)) {
        trend = 'declining';
      }
    }

    if (trend === 'declining') {
      domainsWithDecline++;
      declineNotes.push(domain);
    }

    domains[domain] = {
      currentScore: Math.round(ema * 1000) / 1000,
      observationCount: window.length,
      trend,
      lastAssessed: latest.timestamp,
      meanCompletionTimeMs: meanTime,
      averageCueAssistance: avgCues,
      activeDifficulty: latest.difficulty,
    };
  }

  const reviewRecommended = domainsWithDecline >= 1;
  const reviewReason = reviewRecommended
    ? `Repeated decline observed in selected activity performance (${declineNotes.join(', ')}). Caregiver / health-worker review recommended.`
    : undefined;

  const observedSummary = reviewRecommended
    ? `Observed variation across cognitive domains with repeated decline noted in: ${declineNotes.join(', ')}.`
    : `Observed steady engagement across ${observations.length} total activity observations.`;

  return {
    patientId,
    calculatedAt: new Date().toISOString(),
    domains,
    observedSummary,
    reviewRecommended,
    reviewReason,
  };
}
