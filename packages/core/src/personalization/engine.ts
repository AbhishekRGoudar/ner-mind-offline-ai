import { CognitiveObservation, CognitiveDomain } from '../types/observation.js';
import { TransferEvaluation, assertNonDiagnosticCopy } from '../transfer/engine.js';
import {
  PersonalCognitiveModel,
  DomainBelief,
  LatencyProfile,
  TaskCandidate,
  PersonalizedTaskSelection,
  AVAILABLE_CANDIDATE_TASKS,
  createInitialPersonalModel,
  AdaptationMode,
} from './model.js';

const RECENCY_DISCOUNT_FACTOR = 0.95; // Memory decay parameter gamma for non-stationary skill tracking
const COOLDOWN_SESSIONS = 2;          // Anti-hysteresis cooldown sessions
const PROGRESSION_THRESHOLD = 0.80;   // Sustained high accuracy triggers level progression
const EASING_THRESHOLD = 0.45;        // Sustained low accuracy triggers level decrease
const MIN_SESSIONS_FOR_ADAPTATION = 3;// Minimum observations needed to adapt difficulty

/**
 * On-Device Continual Personalization Engine.
 * Implements lightweight Bayesian Beta-Binomial online estimation, Welford response latency tracking,
 * Contextual UCB task selection, and deterministic replay recovery.
 */
export class PersonalizationEngine {
  /**
   * Incremental Online Learning: Updates the personal cognitive model from a single observation.
   * Runs in < 1 ms on-device without internet or server access.
   */
  public static updatePersonalModel(
    currentModel: PersonalCognitiveModel,
    observation: CognitiveObservation
  ): PersonalCognitiveModel {
    const timestamp = observation.timestamp || new Date().toISOString();
    const domain = observation.domain;

    // Deep clone to ensure immutability
    const updated: PersonalCognitiveModel = JSON.parse(JSON.stringify(currentModel));
    updated.updatedAt = timestamp;
    updated.totalSessionsCompleted += 1;

    // 1. Update Domain Belief (Bayesian Beta-Binomial Conjugate Update)
    const belief = updated.domainBeliefs[domain] || {
      domain,
      alpha: 2.0,
      beta: 2.0,
      estimatedAbility: 0.5,
      uncertainty: 0.2236,
      confidence: 0.0,
      observationCount: 0,
      trend: 'stable' as const,
      activeDifficulty: 1,
      cooldownRemainingSessions: 0,
      adaptationMode: 'exploration' as AdaptationMode,
      consecutiveHighSessionsAtL5: 0,
      consecutiveLowSessionsAtL5: 0,
      contextsTestedAtL5: [],
      lastUpdated: timestamp,
    };
    const n = Math.max(1, observation.metrics.itemsPresented);
    const k = Math.min(n, Math.max(0, observation.metrics.itemsCorrect));

    // Discount prior pseudo-counts by gamma to allow tracking longitudinal adaptation
    const discountedAlpha = RECENCY_DISCOUNT_FACTOR * belief.alpha;
    const discountedBeta = RECENCY_DISCOUNT_FACTOR * belief.beta;

    // Bayesian posterior update
    const newAlpha = discountedAlpha + k;
    const newBeta = discountedBeta + (n - k);
    const totalMass = newAlpha + newBeta;

    const estimatedAbility = Number((newAlpha / totalMass).toFixed(4));
    const variance = (newAlpha * newBeta) / (totalMass ** 2 * (totalMass + 1));
    const uncertainty = Number(Math.sqrt(variance).toFixed(4));

    // Model Confidence: Scales from 0.0 (cold start mass = 4) up to 1.0 (effective mass >= 20)
    const confidence = Number(
      Math.min(1.0, Math.max(0.0, (totalMass - 4.0) / 16.0)).toFixed(3)
    );

    // Track trend: Compare new observation against prior belief
    let trend = belief.trend;
    const delta = observation.metrics.rawScore - belief.estimatedAbility;
    if (belief.observationCount >= 2) {
      if (delta >= 0.15 && observation.metrics.rawScore >= 0.70) {
        trend = 'improving';
      } else if (delta <= -0.15 && observation.metrics.rawScore <= 0.50) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    }

    // Adaptive Difficulty Progression & Mastery Tracking with Anti-Hysteresis Cooldown
    let newDifficulty = belief.activeDifficulty;
    let cooldownRemaining = Math.max(0, belief.cooldownRemainingSessions - 1);
    let adaptationMode: AdaptationMode = belief.adaptationMode || 'exploration';
    let consecutiveHigh = belief.consecutiveHighSessionsAtL5 || 0;
    let consecutiveLow = belief.consecutiveLowSessionsAtL5 || 0;
    let contextsTested = [...(belief.contextsTestedAtL5 || [])];
    let adaptationEvent: any = null;

    if (observation.context && (observation.difficulty === 5 || newDifficulty === 5)) {
      if (!contextsTested.includes(observation.context)) {
        contextsTested.push(observation.context);
      }
    }

    if (cooldownRemaining === 0 && (belief.observationCount + 1 >= MIN_SESSIONS_FOR_ADAPTATION || belief.activeDifficulty === 5)) {
      if (estimatedAbility >= PROGRESSION_THRESHOLD && observation.metrics.cueAssistanceCount === 0) {
        consecutiveLow = 0;
        if (newDifficulty < 5) {
          const prev = newDifficulty;
          newDifficulty += 1;
          cooldownRemaining = COOLDOWN_SESSIONS;
          adaptationMode = newDifficulty === 5 ? 'maintenance' : 'progression';
          adaptationEvent = {
            timestamp,
            domain,
            previousDifficulty: prev,
            newDifficulty,
            decision: 'increase' as const,
            mode: adaptationMode,
            rationale: `Estimated ability (${(estimatedAbility * 100).toFixed(1)}% ≥ 80%) consistently strong across ${belief.observationCount + 1} observed sessions without assistance cues. Advancing difficulty to level ${newDifficulty}.`,
          };
        } else {
          // Strictly capped at Level 5 — Absolutely NO Level 6.
          newDifficulty = 5;
          if (observation.metrics.rawScore >= 0.80) {
            consecutiveHigh += 1;
          }
          if (consecutiveHigh >= 3 && confidence >= 0.40) {
            if (adaptationMode !== 'mastery') {
              adaptationMode = 'mastery';
              adaptationEvent = {
                timestamp,
                domain,
                previousDifficulty: 5,
                newDifficulty: 5,
                decision: 'mastery_enter' as const,
                mode: 'mastery' as const,
                rationale: `Sustained high accuracy (${(estimatedAbility * 100).toFixed(1)}% ≥ 85%) at Level 5 across ${consecutiveHigh} observed sessions. Entered Mastery/Maintenance Mode to verify cross-context consistency and real-life transfer.`,
              };
            }
          }
        }
      } else if (estimatedAbility <= EASING_THRESHOLD || (estimatedAbility < 0.50 && observation.metrics.cueAssistanceCount >= 2)) {
        if (newDifficulty === 5) {
          // Level 5 Outlier Protection vs Repeated Weak Evidence
          consecutiveLow += 1;
          consecutiveHigh = 0;
          if (consecutiveLow >= 2) {
            // Sustained decline: step down to Level 4 remediation
            const prev = newDifficulty;
            newDifficulty = 4;
            cooldownRemaining = COOLDOWN_SESSIONS;
            const wasMastery = adaptationMode === 'mastery';
            adaptationMode = 'remediation';
            consecutiveLow = 0;
            contextsTested = [];
            adaptationEvent = {
              timestamp,
              domain,
              previousDifficulty: prev,
              newDifficulty: 4,
              decision: wasMastery ? 'mastery_exit' as const : 'decrease' as const,
              mode: adaptationMode,
              rationale: `Estimated ability (${(estimatedAbility * 100).toFixed(1)}% ≤ 45%) across repeated weak sessions at Level 5. Easing difficulty to Level 4 remediation to rebuild confidence.`,
            };
          }
          // If consecutiveLow is 1, outlier protection prevents premature collapse
        } else if (newDifficulty > 1) {
          const prev = newDifficulty;
          newDifficulty -= 1;
          cooldownRemaining = COOLDOWN_SESSIONS;
          const wasMastery = adaptationMode === 'mastery';
          adaptationMode = 'remediation';
          consecutiveHigh = 0;
          consecutiveLow = 0;
          contextsTested = [];
          adaptationEvent = {
            timestamp,
            domain,
            previousDifficulty: prev,
            newDifficulty,
            decision: wasMastery ? 'mastery_exit' as const : 'decrease' as const,
            mode: adaptationMode,
            rationale: `Estimated ability (${(estimatedAbility * 100).toFixed(1)}% ≤ 45%) across recent observations indicates task fatigue or strain. Easing difficulty to level ${newDifficulty} to build confidence.`,
          };
        }
      } else {
        // Normal variability (e.g. 50% - 80% accuracy)
        if (newDifficulty === 5) {
          if (observation.metrics.rawScore >= 0.80) {
            consecutiveHigh += 1;
            consecutiveLow = 0;
            if (consecutiveHigh >= 3 && confidence >= 0.40 && adaptationMode !== 'mastery') {
              adaptationMode = 'mastery';
              adaptationEvent = {
                timestamp,
                domain,
                previousDifficulty: 5,
                newDifficulty: 5,
                decision: 'mastery_enter' as const,
                mode: 'mastery' as const,
                rationale: `Sustained high accuracy at Level 5 across ${consecutiveHigh} observed sessions. Entered Mastery/Maintenance Mode.`,
              };
            }
          } else if (observation.metrics.rawScore < 0.60) {
            consecutiveLow += 1;
            consecutiveHigh = 0;
            if (consecutiveLow >= 2) {
              newDifficulty = 4;
              cooldownRemaining = COOLDOWN_SESSIONS;
              adaptationMode = 'remediation';
              consecutiveLow = 0;
              contextsTested = [];
              adaptationEvent = {
                timestamp,
                domain,
                previousDifficulty: 5,
                newDifficulty: 4,
                decision: 'mastery_exit' as const,
                mode: 'remediation' as const,
                rationale: `Repeated low performance at Level 5 indicates task strain. Easing difficulty to Level 4 remediation.`,
              };
            }
          }
        }
      }
    }

    // Invariant: Difficulty is strictly bounded to [1, 5]
    newDifficulty = Math.max(1, Math.min(5, newDifficulty)) as 1 | 2 | 3 | 4 | 5;

    if (adaptationEvent) {
      assertNonDiagnosticCopy(adaptationEvent.rationale);
      updated.adaptationHistory.unshift(adaptationEvent);
      // Keep last 25 adaptation events
      if (updated.adaptationHistory.length > 25) {
        updated.adaptationHistory = updated.adaptationHistory.slice(0, 25);
      }
    }

    // Save updated domain belief
    updated.domainBeliefs[domain] = {
      domain,
      alpha: Number(newAlpha.toFixed(3)),
      beta: Number(newBeta.toFixed(3)),
      estimatedAbility,
      uncertainty,
      confidence,
      observationCount: belief.observationCount + 1,
      trend,
      activeDifficulty: newDifficulty,
      cooldownRemainingSessions: cooldownRemaining,
      adaptationMode,
      consecutiveHighSessionsAtL5: consecutiveHigh,
      consecutiveLowSessionsAtL5: consecutiveLow,
      contextsTestedAtL5: contextsTested,
      lastUpdated: timestamp,
    };

    // 2. Update Reaction Latency Profile using Welford's Algorithm
    const completionTime = observation.metrics.completionTimeMs;
    if (completionTime > 0) {
      updated.latencyProfile = this.updateLatencyProfileWelford(
        updated.latencyProfile,
        completionTime
      );
    }

    // 3. Update Difficulty Tolerance Mapping
    const diffKey = String(observation.difficulty);
    const existingTol = updated.difficultyTolerance[diffKey] || { attempts: 0, successRate: 0.5 };
    const newAttempts = existingTol.attempts + 1;
    const newSuccessRate = Number(
      ((existingTol.successRate * existingTol.attempts + observation.metrics.rawScore) / newAttempts).toFixed(3)
    );
    updated.difficultyTolerance[diffKey] = {
      attempts: newAttempts,
      successRate: newSuccessRate,
    };

    // 4. Update Recent Task History Buffer
    const recentTasks = [observation.taskId, ...updated.recentTaskIds.filter(id => id !== observation.taskId)];
    updated.recentTaskIds = recentTasks.slice(0, 8);

    return updated;
  }

  /**
   * Updates reaction latency running mean, variance, and coefficient of variation (Welford's one-pass algorithm).
   */
  private static updateLatencyProfileWelford(
    profile: LatencyProfile,
    newTimeMs: number
  ): LatencyProfile {
    const k = profile.sampleCount + 1;
    const delta = newTimeMs - profile.meanCompletionTimeMs;
    const newMean = profile.meanCompletionTimeMs + delta / k;
    const delta2 = newTimeMs - newMean;
    const newM2 = profile.varianceCompletionTimeMs * Math.max(1, profile.sampleCount - 1) + delta * delta2;
    const newVariance = k > 1 ? newM2 / (k - 1) : 0;
    const newStdDev = Math.sqrt(newVariance);
    const cv = newMean > 0 ? Number((newStdDev / newMean).toFixed(3)) : 0;

    return {
      meanCompletionTimeMs: Math.round(newMean),
      varianceCompletionTimeMs: Math.round(newVariance),
      standardDeviationMs: Math.round(newStdDev),
      coefficientOfVariation: cv,
      sampleCount: k,
    };
  }

  /**
   * Updates transfer associations from an observed Real-Life Transfer Evaluation.
   * Tracks which training contexts associate with positive functional task changes.
   */
  public static recordTransferResult(
    model: PersonalCognitiveModel,
    transferEval: TransferEvaluation
  ): PersonalCognitiveModel {
    const updated: PersonalCognitiveModel = JSON.parse(JSON.stringify(model));
    const domain = transferEval.domain as CognitiveDomain;

    for (const context of transferEval.contextsTraversed) {
      const existingIdx = updated.transferAssociations.findIndex(
        a => a.domain === domain && a.trainingContext === context
      );

      if (existingIdx >= 0) {
        const existing = updated.transferAssociations[existingIdx];
        const newCount = existing.associatedTaskCount + 1;
        const newDelta = Number(
          ((existing.averageObservedTransferDelta * existing.associatedTaskCount + transferEval.transferDelta) / newCount).toFixed(3)
        );
        updated.transferAssociations[existingIdx] = {
          domain,
          trainingContext: context as any,
          associatedTaskCount: newCount,
          averageObservedTransferDelta: newDelta,
          confidenceScore: Number(Math.min(1.0, newCount / 3).toFixed(2)),
          lastEvaluated: new Date().toISOString(),
        };
      } else {
        updated.transferAssociations.push({
          domain,
          trainingContext: context as any,
          associatedTaskCount: 1,
          averageObservedTransferDelta: transferEval.transferDelta,
          confidenceScore: 0.33,
          lastEvaluated: new Date().toISOString(),
        });
      }
    }

    return updated;
  }

  /**
   * Contextual UCB Personalized Task Selection Algorithm.
   * Balances deficit remediation, uncertainty exploration, anti-fatigue context diversity, and real-life transfer.
   */
  public static selectNextPersonalizedTask(
    model: PersonalCognitiveModel,
    availableTasks: TaskCandidate[] = AVAILABLE_CANDIDATE_TASKS
  ): PersonalizedTaskSelection {
    const totalSessions = Math.max(1, model.totalSessionsCompleted);

    // Compute task candidate scores
    let bestTask: TaskCandidate = availableTasks[0];
    let highestScore = -Infinity;
    let selectedMode: 'deficit_remediation' | 'uncertainty_exploration' | 'transfer_verification' | 'maintenance' = 'maintenance';
    let rationale = '';

    for (const candidate of availableTasks) {
      const belief = model.domainBeliefs[candidate.domain] || {
        domain: candidate.domain,
        alpha: 2.0,
        beta: 2.0,
        estimatedAbility: 0.5,
        uncertainty: 0.2236,
        confidence: 0.0,
        observationCount: 0,
        trend: 'stable' as const,
        activeDifficulty: 1,
        cooldownRemainingSessions: 0,
        adaptationMode: 'exploration' as AdaptationMode,
        consecutiveHighSessionsAtL5: 0,
        consecutiveLowSessionsAtL5: 0,
        contextsTestedAtL5: [],
        lastUpdated: model.updatedAt,
      };

      // 1. Deficit Priority Component: Higher score for lower estimated ability
      const deficitWeight = 0.40;
      const deficitScore = (1.0 - belief.estimatedAbility) * deficitWeight;

      // 2. Uncertainty / Exploration Bonus (UCB): c * sqrt(ln(N) / (n_d + 1))
      const explorationWeight = 0.25;
      const explorationScore =
        explorationWeight * Math.sqrt(Math.log(totalSessions + 1) / (belief.observationCount + 1));

      // 3. Recency & Anti-Fatigue Diversity Penalty
      const recencyWeight = 0.20;
      let diversityScore = recencyWeight;
      const lastIndex = model.recentTaskIds.indexOf(candidate.taskId);
      if (lastIndex === 0) {
        diversityScore = -0.50; // Strongly penalize immediately repeated task
      } else if (lastIndex === 1) {
        diversityScore = -0.20;
      }

      // 4. Transfer Association Bonus & Level 5 Mastery Bonus
      const transferWeight = 0.15;
      let transferScore = 0;
      const association = model.transferAssociations.find(
        a => a.domain === candidate.domain && a.trainingContext === candidate.defaultContext
      );
      if (association && association.averageObservedTransferDelta > 0) {
        transferScore = Math.min(transferWeight, association.averageObservedTransferDelta * transferWeight);
      }

      // Mastery Mode Priority: boost untested contexts and transfer verification
      let masteryScore = 0;
      if (belief.adaptationMode === 'mastery') {
        // Boost candidate if its context hasn't been tested at L5 yet
        if (!belief.contextsTestedAtL5?.includes(candidate.defaultContext)) {
          masteryScore += 0.25;
        }
        // Boost transfer verification
        masteryScore += 0.20;
      }

      // Aggregate UCB Score
      const totalScore = deficitScore + explorationScore + diversityScore + transferScore + masteryScore;

      if (totalScore > highestScore) {
        highestScore = totalScore;
        bestTask = candidate;

        // Classify selection mode
        if (belief.adaptationMode === 'mastery') {
          selectedMode = 'transfer_verification';
          rationale = `Domain '${candidate.domain}' has achieved Level 5 Mastery (estimated ability ${(belief.estimatedAbility * 100).toFixed(0)}%). Prioritizing cross-context consistency (${candidate.defaultContext} context) and real-life transfer verification.`;
        } else if (explorationScore > deficitScore && belief.confidence < 0.40) {
          selectedMode = 'uncertainty_exploration';
          rationale = `Domain '${candidate.domain}' has high uncertainty (${belief.observationCount} session(s) observed, confidence ${(belief.confidence * 100).toFixed(0)}%). Selected ${candidate.description} for exploratory calibration.`;
        } else if (belief.trend === 'declining' || belief.estimatedAbility < 0.60) {
          selectedMode = 'deficit_remediation';
          rationale = `Observed performance in '${candidate.domain}' is at ${(belief.estimatedAbility * 100).toFixed(0)}% (trend: ${belief.trend}). Prioritizing targeted reinforcement using ${candidate.defaultContext} context.`;
        } else if (transferScore > 0.05) {
          selectedMode = 'transfer_verification';
          rationale = `Selected ${candidate.description} in ${candidate.defaultContext} context due to positive observed association with functional daily transfer (+${(association!.averageObservedTransferDelta * 100).toFixed(1)}% delta).`;
        } else {
          selectedMode = 'maintenance';
          rationale = `Routine cognitive maintenance in '${candidate.domain}' (estimated ability ${(belief.estimatedAbility * 100).toFixed(0)}%, level ${belief.activeDifficulty}).`;
        }
      }
    }

    assertNonDiagnosticCopy(rationale);

    const targetBelief = model.domainBeliefs[bestTask.domain] || {
      domain: bestTask.domain,
      alpha: 2.0,
      beta: 2.0,
      estimatedAbility: 0.5,
      uncertainty: 0.2236,
      confidence: 0.0,
      observationCount: 0,
      trend: 'stable' as const,
      activeDifficulty: 1,
      cooldownRemainingSessions: 0,
      adaptationMode: 'exploration' as AdaptationMode,
      consecutiveHighSessionsAtL5: 0,
      consecutiveLowSessionsAtL5: 0,
      contextsTestedAtL5: [],
      lastUpdated: model.updatedAt,
    };

    // Absolute invariant: recommendedDifficulty is strictly capped at Level 5
    const boundedRecommendedDiff = Math.min(5, Math.max(1, targetBelief.activeDifficulty));

    return {
      candidate: bestTask,
      recommendedDifficulty: boundedRecommendedDiff,
      priorityScore: Number(highestScore.toFixed(3)),
      selectionMode: selectedMode,
      adaptationMode: targetBelief.adaptationMode,
      rationale,
      domainConfidence: targetBelief.confidence,
      estimatedAbility: targetBelief.estimatedAbility,
    };
  }

  /**
   * Deterministic Replay Recovery Invariant:
   * Reconstructs the complete personal cognitive model from the immutable chronological raw observations stream.
   * Guarantees that raw observations remain the single source of truth.
   */
  public static rebuildPersonalModelFromObservations(
    patientId: string,
    observations: CognitiveObservation[],
    transferEvaluations: TransferEvaluation[] = []
  ): PersonalCognitiveModel {
    // Sort observations chronologically ascending
    const sortedObs = [...observations].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let model = createInitialPersonalModel(patientId);

    // Replay observations in order
    for (const obs of sortedObs) {
      if (obs.patientId === patientId) {
        model = this.updatePersonalModel(model, obs);
      }
    }

    // Replay transfer evaluations in order
    for (const t of transferEvaluations) {
      if (t.patientId === patientId) {
        model = this.recordTransferResult(model, t);
      }
    }

    return model;
  }
}
