import { z } from 'zod';

export const CognitiveDomainEnum = z.enum([
  'memory',
  'attention',
  'recognition',
  'sequencing',
  'calculation',
  'planning',
]);

export type CognitiveDomain = z.infer<typeof CognitiveDomainEnum>;

export const TaskContextEnum = z.enum([
  'market',
  'kitchen',
  'routine',
  'craft',
  'community',
  'household',
  'gardening',
]);

export type TaskContext = z.infer<typeof TaskContextEnum>;

export const InputMethodEnum = z.enum(['touch', 'voice']);
export type InputMethod = z.infer<typeof InputMethodEnum>;

export const ObservationMetricsSchema = z.object({
  rawScore: z.number().min(0.0).max(1.0),
  itemsPresented: z.number().int().min(1),
  itemsCorrect: z.number().int().min(0),
  completionTimeMs: z.number().min(0),
  hesitationCount: z.number().int().min(0).default(0),
  cueAssistanceCount: z.number().int().min(0).default(0),
}).refine(data => data.itemsCorrect <= data.itemsPresented, {
  message: "itemsCorrect cannot exceed itemsPresented",
  path: ["itemsCorrect"],
});

export type ObservationMetrics = z.infer<typeof ObservationMetricsSchema>;

export const EnvironmentalFactorsSchema = z.object({
  timeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional(),
  inputMethod: InputMethodEnum.default('touch'),
  notes: z.string().max(250).optional(),
});

export type EnvironmentalFactors = z.infer<typeof EnvironmentalFactorsSchema>;

export const CognitiveObservationSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().min(1),
  domain: CognitiveDomainEnum,
  taskId: z.string().min(1),
  timestamp: z.string().datetime(),
  difficulty: z.number().int().min(1).max(5),
  context: TaskContextEnum,
  metrics: ObservationMetricsSchema,
  environmentalFactors: EnvironmentalFactorsSchema.optional(),
});

export type CognitiveObservation = z.infer<typeof CognitiveObservationSchema>;
