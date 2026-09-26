import { z } from 'zod';
import { CognitiveDomain, CognitiveDomainEnum, TaskContext, TaskContextEnum } from '../types/observation.js';

export const AdaptationModeSchema = z.enum([
  'exploration',
  'remediation',
  'progression',
  'mastery',
  'maintenance',
]);

export type AdaptationMode = z.infer<typeof AdaptationModeSchema>;

export const DomainBeliefSchema = z.object({
  domain: CognitiveDomainEnum,
  alpha: z.number().min(0.1),                // Beta shape alpha (success pseudo-counts)
  beta: z.number().min(0.1),                 // Beta shape beta (failure pseudo-counts)
  estimatedAbility: z.number().min(0.0).max(1.0), // Posterior mean alpha / (alpha + beta)
  uncertainty: z.number().min(0.0).max(1.0),      // Posterior standard deviation
  confidence: z.number().min(0.0).max(1.0),       // Bounded confidence [0.0, 1.0]
  observationCount: z.number().int().min(0),
  trend: z.enum(['improving', 'stable', 'declining']),
  activeDifficulty: z.number().int().min(1).max(5),
  cooldownRemainingSessions: z.number().int().min(0).default(0),
  adaptationMode: AdaptationModeSchema.default('exploration'),
  consecutiveHighSessionsAtL5: z.number().int().min(0).default(0),
  consecutiveLowSessionsAtL5: z.number().int().min(0).default(0),
  contextsTestedAtL5: z.array(TaskContextEnum).default([]),
  lastUpdated: z.string(),
});

export type DomainBelief = z.infer<typeof DomainBeliefSchema>;

export const LatencyProfileSchema = z.object({
  meanCompletionTimeMs: z.number().min(0),
  varianceCompletionTimeMs: z.number().min(0),
  standardDeviationMs: z.number().min(0),
  coefficientOfVariation: z.number().min(0),
  sampleCount: z.number().int().min(0),
});

export type LatencyProfile = z.infer<typeof LatencyProfileSchema>;

export const TransferAssociationSchema = z.object({
  domain: CognitiveDomainEnum,
  trainingContext: TaskContextEnum,
  associatedTaskCount: z.number().int().min(0),
  averageObservedTransferDelta: z.number(), // Observed verification - baseline delta
  confidenceScore: z.number().min(0.0).max(1.0),
  lastEvaluated: z.string(),
});

export type TransferAssociation = z.infer<typeof TransferAssociationSchema>;

export const AdaptationEventSchema = z.object({
  timestamp: z.string(),
  domain: CognitiveDomainEnum,
  previousDifficulty: z.number().int().min(1).max(5),
  newDifficulty: z.number().int().min(1).max(5),
  decision: z.enum(['increase', 'decrease', 'maintain', 'mastery_enter', 'mastery_maintain', 'mastery_exit']),
  rationale: z.string(),
  mode: AdaptationModeSchema.optional(),
});

export type AdaptationEvent = z.infer<typeof AdaptationEventSchema>;

export const PersonalCognitiveModelSchema = z.object({
  patientId: z.string().min(1),
  modelVersion: z.number().int().min(1).default(1),
  schemaVersion: z.number().int().min(1).default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  domainBeliefs: z.record(CognitiveDomainEnum, DomainBeliefSchema),
  latencyProfile: LatencyProfileSchema,
  difficultyTolerance: z.record(z.string(), z.object({
    attempts: z.number().int().min(0),
    successRate: z.number().min(0.0).max(1.0),
  })),
  transferAssociations: z.array(TransferAssociationSchema),
  adaptationHistory: z.array(AdaptationEventSchema),
  recentTaskIds: z.array(z.string()).max(10),
  totalSessionsCompleted: z.number().int().min(0),
});

export type PersonalCognitiveModel = z.infer<typeof PersonalCognitiveModelSchema>;

export interface TaskCandidate {
  taskId: string;
  domain: CognitiveDomain;
  defaultContext: TaskContext;
  description: string;
  isRealLifeTask?: boolean;
}

export interface PersonalizedTaskSelection {
  candidate: TaskCandidate;
  recommendedDifficulty: number;
  priorityScore: number;
  selectionMode: 'deficit_remediation' | 'uncertainty_exploration' | 'transfer_verification' | 'maintenance';
  adaptationMode?: AdaptationMode;
  rationale: string;
  domainConfidence: number;
  estimatedAbility: number;
}

/**
 * Standard cultural tasks across all 6 cognitive domains for NER elderly users.
 */
export const AVAILABLE_CANDIDATE_TASKS: TaskCandidate[] = [
  // 1. Memory
  { taskId: 'market_shopping_recall', domain: 'memory', defaultContext: 'market', description: 'Assam tea and market item recall' },
  { taskId: 'kitchen_recipe_recall', domain: 'memory', defaultContext: 'kitchen', description: 'Traditional recipe ingredient recall' },
  { taskId: 'family_garden_recall', domain: 'memory', defaultContext: 'gardening', description: 'Garden flora and tool recognition' },

  // 2. Attention
  { taskId: 'craft_pattern_cancellation', domain: 'attention', defaultContext: 'craft', description: 'Gamusa weaving pattern target search' },
  { taskId: 'market_stall_search', domain: 'attention', defaultContext: 'market', description: 'Finding target produce among distractors' },
  { taskId: 'nature_sound_match', domain: 'attention', defaultContext: 'community', description: 'Discriminating target birdsong and ambient sounds' },

  // 3. Recognition
  { taskId: 'household_object_identification', domain: 'recognition', defaultContext: 'household', description: 'Naming bell metal bowls, jaapi, and gamusa' },
  { taskId: 'regional_flora_identification', domain: 'recognition', defaultContext: 'gardening', description: 'Identifying Kopou Phool and bamboo species' },
  { taskId: 'community_elder_match', domain: 'recognition', defaultContext: 'community', description: 'Matching community members with roles' },

  // 4. Sequencing
  { taskId: 'morning_tea_sequence', domain: 'sequencing', defaultContext: 'kitchen', description: 'Ordering Assam tea preparation steps' },
  { taskId: 'market_trip_preparation', domain: 'sequencing', defaultContext: 'routine', description: 'Bag, money, list preparation sequence' },
  { taskId: 'bamboo_weaving_steps', domain: 'sequencing', defaultContext: 'craft', description: 'Traditional bamboo basket weaving order' },

  // 5. Calculation
  { taskId: 'market_change_calculation', domain: 'calculation', defaultContext: 'market', description: 'Weekly bazaar currency exchange and change' },
  { taskId: 'recipe_quantity_halving', domain: 'calculation', defaultContext: 'kitchen', description: 'Halving ingredient amounts for 2 servings' },
  { taskId: 'utility_coin_count', domain: 'calculation', defaultContext: 'household', description: 'Counting small denominations for daily purchase' },

  // 6. Planning
  { taskId: 'day_schedule_planner', domain: 'planning', defaultContext: 'routine', description: 'Balancing medicine, walk, meals, and social visits' },
  { taskId: 'route_to_community_center', domain: 'planning', defaultContext: 'community', description: 'Choosing safe route avoiding steep paths' },
  { taskId: 'festival_prep_checklist', domain: 'planning', defaultContext: 'household', description: 'Bihu celebration preparation schedule' },
];

/**
 * Creates a clean, safe cold-start Personal Cognitive Model for a new patient.
 * Uses an unbiased conservative prior Beta(2, 2) with zero initial confidence.
 */
export function createInitialPersonalModel(patientId: string): PersonalCognitiveModel {
  const now = new Date().toISOString();

  const domainBeliefs: Record<CognitiveDomain, DomainBelief> = {
    memory: createInitialDomainBelief('memory', now),
    attention: createInitialDomainBelief('attention', now),
    recognition: createInitialDomainBelief('recognition', now),
    sequencing: createInitialDomainBelief('sequencing', now),
    calculation: createInitialDomainBelief('calculation', now),
    planning: createInitialDomainBelief('planning', now),
  };

  return {
    patientId,
    modelVersion: 1,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    domainBeliefs,
    latencyProfile: {
      meanCompletionTimeMs: 0,
      varianceCompletionTimeMs: 0,
      standardDeviationMs: 0,
      coefficientOfVariation: 0,
      sampleCount: 0,
    },
    difficultyTolerance: {
      '1': { attempts: 0, successRate: 0.5 },
      '2': { attempts: 0, successRate: 0.5 },
      '3': { attempts: 0, successRate: 0.5 },
      '4': { attempts: 0, successRate: 0.5 },
      '5': { attempts: 0, successRate: 0.5 },
    },
    transferAssociations: [],
    adaptationHistory: [],
    recentTaskIds: [],
    totalSessionsCompleted: 0,
  };
}

function createInitialDomainBelief(domain: CognitiveDomain, timestamp: string): DomainBelief {
  const alpha0 = 2.0;
  const beta0 = 2.0;
  const mean = alpha0 / (alpha0 + beta0); // 0.50
  const variance = (alpha0 * beta0) / ((alpha0 + beta0) ** 2 * (alpha0 + beta0 + 1)); // 0.05
  const uncertainty = Math.sqrt(variance); // ~0.2236

  return {
    domain,
    alpha: alpha0,
    beta: beta0,
    estimatedAbility: mean,
    uncertainty: Number(uncertainty.toFixed(4)),
    confidence: 0.0, // Cold start = 0 confidence
    observationCount: 0,
    trend: 'stable',
    activeDifficulty: 1,
    cooldownRemainingSessions: 0,
    adaptationMode: 'exploration',
    consecutiveHighSessionsAtL5: 0,
    consecutiveLowSessionsAtL5: 0,
    contextsTestedAtL5: [],
    lastUpdated: timestamp,
  };
}
