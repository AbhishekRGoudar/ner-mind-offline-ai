import { z } from 'zod';

export const SupportedLanguageEnum = z.enum([
  'en',   // English
  'hi',   // Hindi
  'kn',   // Kannada
  'as',   // Assamese
  'bn',   // Bengali
  'mni',  // Manipuri (Meitei)
  'brx',  // Bodo
  'lus',  // Mizo
  'kha',  // Khasi
  'grt',  // Garo
  'trp',  // Kokborok
  'ten',  // Tenyidie
  'ao',   // Ao
  'lot',  // Lotha
]);

export type PatientProfileLanguage = z.infer<typeof SupportedLanguageEnum>;

export const FamiliarObjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  localLanguageName: z.string().max(80).optional(),
  category: z.enum(['household', 'kitchen', 'craft', 'nature', 'personal']),
  culturalRegionTag: z.string().default('NER'),
  significanceHint: z.string().max(160).optional(),
  consentToUseInGames: z.boolean().default(true),
});

export type FamiliarObject = z.infer<typeof FamiliarObjectSchema>;

export const FamiliarRoutineSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(80),
  steps: z.array(z.string().min(1).max(120)).min(2).max(8),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']),
  consentToUseInSequencing: z.boolean().default(true),
});

export type FamiliarRoutine = z.infer<typeof FamiliarRoutineSchema>;

export const FamilyContactSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(80),
  relationship: z.string().min(1).max(50),
  phoneNumber: z.string().max(20).optional(),
  isEmergencyContact: z.boolean().default(false),
  photoConsentGranted: z.boolean().default(false),
  voiceConsentGranted: z.boolean().default(false),
});

export type FamilyContact = z.infer<typeof FamilyContactSchema>;

export const AccessibilityPreferencesSchema = z.object({
  highContrast: z.boolean().default(true),
  fontSize: z.enum(['standard', 'large', 'extra-large']).default('large'),
  voiceInputEnabled: z.boolean().default(true),
  audioPromptsEnabled: z.boolean().default(true),
  speechRate: z.number().min(0.5).max(1.5).default(0.85), // slightly slower default for elderly clarity
  minimumTouchTargetPx: z.number().int().min(48).default(64),
});

export type AccessibilityPreferences = z.infer<typeof AccessibilityPreferencesSchema>;

export const PersonalMemoryProfileSchema = z.object({
  patientId: z.string().min(1),
  displayName: z.string().min(1).max(60),
  preferredLanguage: SupportedLanguageEnum.default('en'),
  secondaryLanguage: SupportedLanguageEnum.optional(),
  accessibility: AccessibilityPreferencesSchema.default({}),
  familiarObjects: z.array(FamiliarObjectSchema).default([]),
  familiarRoutines: z.array(FamiliarRoutineSchema).default([]),
  familyContacts: z.array(FamilyContactSchema).default([]),
  consent: z.object({
    status: z.enum(['granted', 'pending', 'revoked']).default('granted'),
    consentedBy: z.enum(['patient', 'caregiver', 'legal_guardian']).default('caregiver'),
    grantedAt: z.string().datetime(),
    dataRetentionDays: z.number().int().positive().default(365),
  }),
});

export type PersonalMemoryProfile = z.infer<typeof PersonalMemoryProfileSchema>;

/**
 * Validates and sanitizes a personal memory profile to enforce minimal data collection.
 */
export function validatePersonalMemoryProfile(input: unknown): PersonalMemoryProfile {
  return PersonalMemoryProfileSchema.parse(input);
}
