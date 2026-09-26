import { CognitiveDomain, CognitiveObservation, TaskContext } from '../types/observation.js';
import { CognitiveProfile } from '../cognitive/profile.js';

export interface AdaptationDecision {
  domain: CognitiveDomain;
  currentDifficulty: number;
  recommendedDifficulty: number;
  decision: 'increase' | 'decrease' | 'maintain';
  rationale: string;
  cooldownRemainingSessions: number;
  adaptationMode?: 'exploration' | 'remediation' | 'progression' | 'mastery' | 'maintenance';
}

export interface TrainingRecommendation {
  priorityDomain: CognitiveDomain;
  recommendedDifficulty: number;
  recommendedContext: TaskContext;
  recommendedTaskId: string;
  rationale: string;
  targetFocus: 'maintenance' | 'strengthening' | 'recovery';
  adaptationMode?: 'exploration' | 'remediation' | 'progression' | 'mastery' | 'maintenance';
}

const MIN_WINDOW_FOR_ADAPTATION = 3;
const COOLDOWN_SESSIONS = 2;
const PROGRESSION_THRESHOLD = 0.85;
const EASING_THRESHOLD = 0.45;

/**
 * Deterministically evaluates adaptive difficulty for a specific cognitive domain.
 * Strictly explainable, testable, and free of non-deterministic heuristics or black-box LLMs.
 */
export function evaluateAdaptiveDifficulty(
  domain: CognitiveDomain,
  currentDifficulty: number,
  recentDomainObservations: CognitiveObservation[],
  sessionsSinceLastChange: number = 2
): AdaptationDecision {
  const boundedCurrentDifficulty = Math.max(1, Math.min(5, currentDifficulty));

  // Anti-hysteresis check: prevent oscillation if in cooldown
  if (sessionsSinceLastChange < COOLDOWN_SESSIONS) {
    return {
      domain,
      currentDifficulty: boundedCurrentDifficulty,
      recommendedDifficulty: boundedCurrentDifficulty,
      decision: 'maintain',
      rationale: `Difficulty locked in cooldown period (${sessionsSinceLastChange}/${COOLDOWN_SESSIONS} sessions completed) to ensure stability.`,
      cooldownRemainingSessions: COOLDOWN_SESSIONS - sessionsSinceLastChange,
    };
  }

  // Need at least MIN_WINDOW_FOR_ADAPTATION observations to change difficulty
  if (recentDomainObservations.length < MIN_WINDOW_FOR_ADAPTATION) {
    return {
      domain,
      currentDifficulty: boundedCurrentDifficulty,
      recommendedDifficulty: boundedCurrentDifficulty,
      decision: 'maintain',
      rationale: `Insufficient observations (${recentDomainObservations.length}/${MIN_WINDOW_FOR_ADAPTATION}) in domain '${domain}' to adjust difficulty. Maintaining current level.`,
      cooldownRemainingSessions: 0,
    };
  }

  // Evaluate the last W observations
  const window = recentDomainObservations.slice(-MIN_WINDOW_FOR_ADAPTATION);
  const scores = window.map(o => o.metrics.rawScore);
  const meanScore = scores.reduce((sum, s) => sum + s, 0) / window.length;
  const totalCues = window.reduce((sum, o) => sum + o.metrics.cueAssistanceCount, 0);

  // Progression rule: Consistent high performance without excessive cue dependence
  if (meanScore >= PROGRESSION_THRESHOLD && totalCues === 0) {
    if (boundedCurrentDifficulty < 5) {
      return {
        domain,
        currentDifficulty: boundedCurrentDifficulty,
        recommendedDifficulty: boundedCurrentDifficulty + 1,
        decision: 'increase',
        rationale: `Consistent high observed accuracy (${(meanScore * 100).toFixed(1)}% ≥ 85%) across ${MIN_WINDOW_FOR_ADAPTATION} consecutive sessions without assistance cues. Advancing to level ${boundedCurrentDifficulty + 1}.`,
        cooldownRemainingSessions: COOLDOWN_SESSIONS,
      };
    } else {
      return {
        domain,
        currentDifficulty: 5,
        recommendedDifficulty: 5,
        decision: 'maintain',
        rationale: `Consistent high observed accuracy at maximum difficulty level 5. Entering Mastery/Maintenance Mode to verify cross-context consistency and real-life transfer.`,
        cooldownRemainingSessions: 0,
        adaptationMode: 'mastery',
      };
    }
  }

  // Easing rule: Persistent low performance or high cue reliance across the window
  if (meanScore <= EASING_THRESHOLD || (meanScore < 0.50 && totalCues >= 3)) {
    if (boundedCurrentDifficulty > 1) {
      return {
        domain,
        currentDifficulty: boundedCurrentDifficulty,
        recommendedDifficulty: boundedCurrentDifficulty - 1,
        decision: 'decrease',
        rationale: `Persistent low observed accuracy (${(meanScore * 100).toFixed(1)}% ≤ 45%) across ${MIN_WINDOW_FOR_ADAPTATION} consecutive sessions. Decreasing difficulty to level ${boundedCurrentDifficulty - 1} to build confidence.`,
        cooldownRemainingSessions: COOLDOWN_SESSIONS,
      };
    } else {
      return {
        domain,
        currentDifficulty: 1,
        recommendedDifficulty: 1,
        decision: 'maintain',
        rationale: `Observed performance low but already at minimum difficulty level 1. Providing enhanced visual/audio guidance.`,
        cooldownRemainingSessions: 0,
      };
    }
  }

  // Maintenance rule: Stable observed performance within nominal bounds
  return {
    domain,
    currentDifficulty: boundedCurrentDifficulty,
    recommendedDifficulty: boundedCurrentDifficulty,
    decision: 'maintain',
    rationale: `Observed performance (${(meanScore * 100).toFixed(1)}%) is stable within target operational bounds (45% - 85%).`,
    cooldownRemainingSessions: 0,
  };
}

const DOMAIN_TASKS: Record<CognitiveDomain, { taskId: string; defaultContext: TaskContext }[]> = {
  memory: [
    { taskId: 'market_shopping_recall', defaultContext: 'market' },
    { taskId: 'kitchen_recipe_recall', defaultContext: 'kitchen' },
    { taskId: 'family_garden_recall', defaultContext: 'gardening' },
  ],
  attention: [
    { taskId: 'craft_pattern_matching', defaultContext: 'craft' },
    { taskId: 'market_stall_search', defaultContext: 'market' },
    { taskId: 'household_find_item', defaultContext: 'household' },
  ],
  recognition: [
    { taskId: 'household_object_naming', defaultContext: 'household' },
    { taskId: 'regional_spice_recognition', defaultContext: 'kitchen' },
    { taskId: 'community_landmark_id', defaultContext: 'community' },
  ],
  sequencing: [
    { taskId: 'morning_tea_sequence', defaultContext: 'kitchen' },
    { taskId: 'market_trip_preparation', defaultContext: 'routine' },
    { taskId: 'traditional_weaving_steps', defaultContext: 'craft' },
  ],
  calculation: [
    { taskId: 'market_currency_change', defaultContext: 'market' },
    { taskId: 'grocery_budget_tally', defaultContext: 'household' },
    { taskId: 'recipe_quantity_halving', defaultContext: 'kitchen' },
  ],
  planning: [
    { taskId: 'day_schedule_planner', defaultContext: 'routine' },
    { taskId: 'route_to_community_center', defaultContext: 'community' },
    { taskId: 'festival_prep_checklist', defaultContext: 'household' },
  ],
};

/**
 * Recommends the next personalized training session based on the multidimensional profile.
 * Rotates context to ensure cross-context transfer generalization.
 */
export function recommendNextTrainingSession(
  profile: CognitiveProfile,
  recentObservations: CognitiveObservation[]
): TrainingRecommendation {
  // Find domain with lowest score or least recent observation
  let priorityDomain: CognitiveDomain = 'memory';
  let lowestScore = Infinity;

  const domains = Object.keys(profile.domains) as CognitiveDomain[];

  for (const domain of domains) {
    const metrics = profile.domains[domain];
    // Bias towards domains with declining trend or lowest score
    let effectiveScore = metrics.currentScore;
    if (metrics.trend === 'declining') effectiveScore -= 0.25;

    if (effectiveScore < lowestScore) {
      lowestScore = effectiveScore;
      priorityDomain = domain;
    }
  }

  const domainMetrics = profile.domains[priorityDomain];
  const isMastery = domainMetrics.activeDifficulty === 5 && domainMetrics.currentScore >= 0.8;
  const targetFocus: 'maintenance' | 'strengthening' | 'recovery' =
    domainMetrics.trend === 'declining'
      ? 'recovery'
      : isMastery
      ? 'maintenance'
      : domainMetrics.currentScore >= 0.8
      ? 'strengthening'
      : 'maintenance';

  // Cross-context rotation: pick a context that wasn't used in the immediate previous session
  const availableTasks = DOMAIN_TASKS[priorityDomain];
  const lastObs = recentObservations.filter(o => o.domain === priorityDomain).slice(-1)[0];
  const lastContext = lastObs?.context;

  const candidateTask = availableTasks.find(t => t.defaultContext !== lastContext) ?? availableTasks[0];

  return {
    priorityDomain,
    recommendedDifficulty: domainMetrics.activeDifficulty,
    recommendedContext: candidateTask.defaultContext,
    recommendedTaskId: candidateTask.taskId,
    targetFocus,
    adaptationMode: isMastery ? 'mastery' : undefined,
    rationale: isMastery
      ? `Selected ${priorityDomain} (Level 5 Mastery Mode) utilizing ${candidateTask.defaultContext} context for cross-context consistency and real-life transfer verification.`
      : `Selected ${priorityDomain} (${targetFocus} mode, level ${domainMetrics.activeDifficulty}) utilizing ${candidateTask.defaultContext} context for cross-context generalization.`,
  };
}
