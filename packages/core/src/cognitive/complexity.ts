import { z } from 'zod';
import { CognitiveDomain, CognitiveDomainEnum } from '../types/observation.js';

export const TaskComplexityProfileSchema = z.object({
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  domain: CognitiveDomainEnum,
  itemCount: z.number().int().min(1),
  ruleCount: z.number().int().min(1),
  distractorCount: z.number().int().min(0),
  sequenceLength: z.number().int().min(0),
  ambiguityLevel: z.number().min(1).max(5),      // 1 (distinct/obvious) to 5 (subtle perceptual/category ambiguity)
  timePressure: z.number().min(0).max(5),        // 0 (none) to 5 (rapid)
  reasoningSteps: z.number().int().min(1).max(5),
  cueLevel: z.number().int().min(0).max(3),      // 3 (full hints), 2 (moderate), 1 (minimal), 0 (none)
  memoryLoad: z.number().int().min(1).max(5),
  interferenceLevel: z.number().min(1).max(5),
  overallComplexity: z.number().min(1.0).max(10.0),
});

export type TaskComplexityProfile = z.infer<typeof TaskComplexityProfileSchema>;

/**
 * Calculates a domain-appropriate composite complexity score in [1.0, 10.0].
 * Emphasizes the primary cognitive constraints of each specific domain.
 */
export function calculateDomainComplexity(params: {
  domain: CognitiveDomain;
  difficulty: 1 | 2 | 3 | 4 | 5;
  itemCount: number;
  ruleCount: number;
  distractorCount: number;
  sequenceLength: number;
  ambiguityLevel: number;
  reasoningSteps: number;
  cueLevel: number;
  memoryLoad: number;
  interferenceLevel: number;
}): number {
  const { domain, difficulty, itemCount, ruleCount, distractorCount, sequenceLength, ambiguityLevel, reasoningSteps, cueLevel, memoryLoad, interferenceLevel } = params;

  let raw = 0;

  switch (domain) {
    case 'memory': {
      // Memory: Item count + memory load + distractors - cue assistance
      const cuePenalty = (3 - cueLevel) * 0.6; // lower cueing increases complexity
      raw = (itemCount * 0.8) + (memoryLoad * 0.9) + (distractorCount * 0.3) + cuePenalty;
      break;
    }
    case 'attention': {
      // Attention: Visual density (itemCount + distractorCount) + interference + ambiguity
      const totalVisualItems = itemCount + distractorCount;
      raw = (totalVisualItems * 0.25) + (interferenceLevel * 0.9) + (ambiguityLevel * 0.6);
      break;
    }
    case 'sequencing': {
      // Sequencing: Sequence length + reasoning steps + ordering rules
      raw = (sequenceLength * 0.9) + (reasoningSteps * 0.8) + (ruleCount * 0.5);
      break;
    }
    case 'recognition': {
      // Recognition: Ambiguity + distractor count + visual similarity
      raw = (ambiguityLevel * 1.1) + (distractorCount * 0.6) + (itemCount * 0.4) + (interferenceLevel * 0.5);
      break;
    }
    case 'calculation': {
      // Calculation: Reasoning steps + memory load + rule count
      raw = (reasoningSteps * 1.1) + (memoryLoad * 0.9) + (ruleCount * 0.7) + (distractorCount * 0.2);
      break;
    }
    case 'planning': {
      // Planning: Task count + sequence length + rule constraints + reasoning steps
      raw = (itemCount * 0.7) + (sequenceLength * 0.6) + (ruleCount * 0.8) + (reasoningSteps * 0.7);
      break;
    }
  }

  // Anchor and bound to [1.0, 10.0] mapped tightly to difficulty levels
  // Level 1: ~1.5 - 2.8, Level 2: ~3.0 - 4.5, Level 3: ~4.7 - 6.2, Level 4: ~6.4 - 7.9, Level 5: ~8.1 - 9.8
  const baseOffset = (difficulty - 1) * 1.8;
  const scaled = 1.2 + baseOffset + Math.min(1.4, Math.max(0.1, (raw * 0.18)));
  return Number(Math.min(10.0, Math.max(1.0, scaled)).toFixed(2));
}
