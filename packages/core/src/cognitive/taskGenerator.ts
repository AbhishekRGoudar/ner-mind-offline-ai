import { CognitiveDomain, TaskContext } from '../types/observation.js';
import { PRNG } from './prng.js';
import { TaskComplexityProfile, calculateDomainComplexity, TaskComplexityProfileSchema } from './complexity.js';
import { REGIONAL_MEMORY_ITEMS, RegionalMemoryItem } from './templates/memoryItems.js';
import { REGIONAL_ATTENTION_MOTIFS, AttentionMotif } from './templates/attentionMotifs.js';
import { SEQUENCING_ROUTINE_TEMPLATES, RoutineStep, generateParameterizedRoutine } from './templates/sequencingRoutines.js';
import { REGIONAL_RECOGNITION_OBJECTS, RegionalRecognitionObject } from './templates/recognitionObjects.js';
import { MARKET_GOODS, MarketGood } from './templates/calculationScenarios.js';
import { PlanningScheduleTemplate, PlanActivity, generateProceduralSchedule } from './templates/planningSchedules.js';
import { SupportedLanguage } from '../types/language.js';
import {
  LOCALIZED_RECOGNITION_OBJECTS,
  LOCALIZED_MEMORY_ITEMS,
  LOCALIZED_SEQUENCING_ROUTINES,
  LOCALIZED_PLANNING_ACTIVITIES,
  LOCALIZED_MARKET_GOODS,
  formatLocalizedPair,
} from './templates/localizedGameContent.js';

export interface GenerateTaskOptions {
  domain: CognitiveDomain;
  difficulty: 1 | 2 | 3 | 4 | 5;
  context?: TaskContext;
  masteryMode?: boolean;
  seed?: number;
  patientProfile?: { patientId: string; preferredLanguage?: string };
  language?: SupportedLanguage;
  recentFingerprints?: string[];
  maxRecentWindow?: number;
}

export interface TaskScoringResult {
  rawScore: number;
  itemsPresented: number;
  itemsCorrect: number;
  hesitationCount?: number;
  cueAssistanceCount?: number;
  details?: string;
}

export interface GeneratedCognitiveTask<TPayload = any> {
  id: string;
  fingerprint: string;
  domain: CognitiveDomain;
  difficulty: 1 | 2 | 3 | 4 | 5;
  context: TaskContext;
  seed: number;
  title: string;
  instructions: string;
  complexity: TaskComplexityProfile;
  payload: TPayload;
  scoring: (userResponse: any) => TaskScoringResult;
}

/**
 * Deterministic hash function (FNV-1a 32-bit hex)
 */
function hashString(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export class TaskGenerator {
  /**
   * Generates a dynamic, fully verified, procedural cognitive task.
   * Guarantees:
   * - No immediate duplicate fingerprints in recent history.
   * - Strict measurable task complexity profile matching difficulty level.
   * - 100% offline, zero network requests, reproducible seeded randomness.
   */
  static generateTask(options: GenerateTaskOptions): GeneratedCognitiveTask {
    const {
      domain,
      difficulty,
      context,
      masteryMode = false,
      seed: initialSeed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0,
      recentFingerprints = [],
      maxRecentWindow = 25,
      language,
      patientProfile,
    } = options;

    const effectiveLanguage: SupportedLanguage = (language || patientProfile?.preferredLanguage || 'en') as SupportedLanguage;
    const boundedDifficulty = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const recentSet = new Set(recentFingerprints.slice(-maxRecentWindow));

    const DOMAIN_CROSS_CONTEXTS: Record<CognitiveDomain, TaskContext[]> = {
      memory: ['market', 'kitchen', 'household', 'gardening'],
      attention: ['craft', 'household', 'market'],
      sequencing: ['kitchen', 'routine', 'craft'],
      recognition: ['household', 'kitchen', 'craft'],
      calculation: ['market', 'household', 'kitchen'],
      planning: ['routine', 'household', 'community'],
    };

    let currentSeed = initialSeed;
    const MAX_ATTEMPTS = 50;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const prng = new PRNG(currentSeed);
      const effectiveContext = context || (masteryMode && boundedDifficulty === 5
        ? prng.choice(DOMAIN_CROSS_CONTEXTS[domain])
        : undefined);

      const candidateTask = this.buildTaskForDomain(domain, boundedDifficulty, effectiveContext, currentSeed, prng, effectiveLanguage);

      // Validate structural safety
      const validationError = this.validateTaskStructure(candidateTask);
      if (validationError) {
        currentSeed = (currentSeed + 0x9e3779b9 + attempt) >>> 0;
        continue;
      }

      // Check anti-repetition fingerprint
      if (recentSet.has(candidateTask.fingerprint) && attempt < MAX_ATTEMPTS - 1) {
        currentSeed = (currentSeed + 0x9e3779b9 + attempt) >>> 0;
        continue;
      }

      return candidateTask;
    }

    // Fallback: return candidate generated with latest seed
    const fallbackPrng = new PRNG(currentSeed);
    const fallbackContext = context || (masteryMode && boundedDifficulty === 5
      ? fallbackPrng.choice(DOMAIN_CROSS_CONTEXTS[domain])
      : undefined);
    return this.buildTaskForDomain(domain, boundedDifficulty, fallbackContext, currentSeed, fallbackPrng, effectiveLanguage);
  }

  // --------------------------------------------------------------------------
  // DOMAIN BUILDERS
  // --------------------------------------------------------------------------

  private static buildTaskForDomain(
    domain: CognitiveDomain,
    difficulty: 1 | 2 | 3 | 4 | 5,
    preferredContext: TaskContext | undefined,
    seed: number,
    prng: PRNG,
    language: SupportedLanguage = 'en'
  ): GeneratedCognitiveTask {
    switch (domain) {
      case 'memory':
        return this.buildMemoryTask(difficulty, preferredContext, seed, prng, language);
      case 'attention':
        return this.buildAttentionTask(difficulty, preferredContext, seed, prng, language);
      case 'sequencing':
        return this.buildSequencingTask(difficulty, preferredContext, seed, prng, language);
      case 'recognition':
        return this.buildRecognitionTask(difficulty, preferredContext, seed, prng, language);
      case 'calculation':
        return this.buildCalculationTask(difficulty, preferredContext, seed, prng, language);
      case 'planning':
        return this.buildPlanningTask(difficulty, preferredContext, seed, prng, language);
    }
  }

  // 1. MEMORY BUILDER
  private static buildMemoryTask(
    difficulty: 1 | 2 | 3 | 4 | 5,
    preferredContext: TaskContext | undefined,
    seed: number,
    prng: PRNG,
    language: SupportedLanguage = 'en'
  ): GeneratedCognitiveTask {
    // Difficulty progression:
    // L1: 3 items, 0 distractors, cueLevel 3 (high assistance)
    // L2: 4 items, 2 distractors, cueLevel 2 (moderate assistance)
    // L3: 5 items, 4 distractors, cueLevel 1 (low assistance)
    // L4: 6 items, 6 distractors, cueLevel 0 (no assistance)
    // L5: 7 items, 8 distractors, cueLevel 0 (no assistance, cross-category interference)
    const itemCount = Math.min(7, 2 + difficulty);
    const distractorCount = (difficulty - 1) * 2;
    const cueLevel = Math.max(0, 3 - (difficulty - 1));
    const memoryLoad = difficulty;
    const interferenceLevel = difficulty;

    // Filter by context if matching, else pool
    let pool = preferredContext
      ? REGIONAL_MEMORY_ITEMS.filter(it => it.context === preferredContext)
      : REGIONAL_MEMORY_ITEMS;
    if (pool.length < itemCount + distractorCount) {
      pool = REGIONAL_MEMORY_ITEMS;
    }

    const shuffled = prng.shuffle(pool);
    const targetItems = shuffled.slice(0, itemCount);
    const distractors = shuffled.slice(itemCount, itemCount + distractorCount);
    const recallCandidates = prng.shuffle([...targetItems, ...distractors]);

    const contextUsed = preferredContext || targetItems[0]?.context || 'market';

    const complexity: TaskComplexityProfile = {
      difficulty,
      domain: 'memory',
      itemCount,
      ruleCount: 1,
      distractorCount,
      sequenceLength: 0,
      ambiguityLevel: difficulty,
      timePressure: difficulty,
      reasoningSteps: 1,
      cueLevel,
      memoryLoad,
      interferenceLevel,
      overallComplexity: calculateDomainComplexity({
        domain: 'memory',
        difficulty,
        itemCount,
        ruleCount: 1,
        distractorCount,
        sequenceLength: 0,
        ambiguityLevel: difficulty,
        reasoningSteps: 1,
        cueLevel,
        memoryLoad,
        interferenceLevel,
      }),
    };

    const targetIdsSorted = targetItems.map(t => t.id).sort().join(',');
    const fingerprint = hashString(`mem:${difficulty}:${contextUsed}:${targetIdsSorted}:${distractorCount}`);

    const localizedTargetItems = targetItems.map(t => {
      const loc = LOCALIZED_MEMORY_ITEMS[t.id];
      const localizedName = loc ? formatLocalizedPair(loc, language) : t.name;
      const localizedLocal = loc
        ? (language === 'hi' ? loc.hi : language === 'kn' ? loc.kn : loc.en)
        : t.name;
      return { ...t, name: localizedName, localName: localizedLocal };
    });
    const localizedDistractors = distractors.map(d => {
      const loc = LOCALIZED_MEMORY_ITEMS[d.id];
      const localizedName = loc ? formatLocalizedPair(loc, language) : d.name;
      const localizedLocal = loc
        ? (language === 'hi' ? loc.hi : language === 'kn' ? loc.kn : loc.en)
        : d.name;
      return { ...d, name: localizedName, localName: localizedLocal };
    });
    const localizedCandidates = recallCandidates.map(c => {
      const loc = LOCALIZED_MEMORY_ITEMS[c.id];
      const localizedName = loc ? formatLocalizedPair(loc, language) : c.name;
      const localizedLocal = loc
        ? (language === 'hi' ? loc.hi : language === 'kn' ? loc.kn : loc.en)
        : c.name;
      return { ...c, name: localizedName, localName: localizedLocal };
    });

    let title = `Market & Household Memory Recall (Level ${difficulty})`;
    let instructions = `Study the ${itemCount} items carefully. When ready, touch the items you recall from memory.`;
    if (language === 'hi') {
      title = `बाज़ार एवं घरेलू स्मृति स्मरण (स्तर ${difficulty})`;
      instructions = `इन ${itemCount} वस्तुओं को ध्यान से देखें। तैयार होने पर, अपनी याददाश्त से वस्तुओं को स्पर्श करें।`;
    } else if (language === 'kn') {
      title = `ಮಾರುಕಟ್ಟೆ ಮತ್ತು ಮನೆಯ ನೆನಪಿನ ಶಕ್ತಿ (ಹಂತ ${difficulty})`;
      instructions = `ಈ ${itemCount} ವಸ್ತುಗಳನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಗಮನಿಸಿ. ಸಿದ್ಧವಾದಾಗ, ನೆನಪಿನಲ್ಲಿರುವ ವಸ್ತುಗಳನ್ನು ಸ್ಪರ್ಶಿಸಿ.`;
    }

    return {
      id: `task_mem_${fingerprint}`,
      fingerprint,
      domain: 'memory',
      difficulty,
      context: contextUsed,
      seed,
      title,
      instructions,
      complexity,
      payload: {
        targetItems: localizedTargetItems,
        distractorItems: localizedDistractors,
        recallCandidates: localizedCandidates,
        cueLevel,
        studyTimeLimitSec: Math.max(10, 25 - difficulty * 2),
      },
      scoring: (selectedIds: string[]) => {
        const selectedSet = new Set(selectedIds || []);
        let correct = 0;
        targetItems.forEach(t => {
          if (selectedSet.has(t.id)) correct++;
        });
        const rawScore = Number((correct / targetItems.length).toFixed(3));
        return {
          rawScore,
          itemsPresented: targetItems.length,
          itemsCorrect: correct,
          details: `Correctly recalled ${correct} of ${targetItems.length} items.`,
        };
      },
    };
  }

  // 2. ATTENTION BUILDER
  private static buildAttentionTask(
    difficulty: 1 | 2 | 3 | 4 | 5,
    preferredContext: TaskContext | undefined,
    seed: number,
    prng: PRNG,
    language: SupportedLanguage = 'en'
  ): GeneratedCognitiveTask {
    // L1: 2 targets, 4 distractors (distinct family, grid 6)
    // L2: 3 targets, 8 distractors (grid 11)
    // L3: 4 targets, 12 distractors (similar shapes, grid 16)
    // L4: 5 targets, 16 distractors (high visual interference, grid 21)
    // L5: 6 targets, 20 distractors (high density & fine visual discrimination, grid 26)
    const targetCount = 1 + difficulty;
    const distractorCount = difficulty * 4;
    const ambiguityLevel = difficulty;
    const interferenceLevel = difficulty;
    const cueLevel = Math.max(0, 3 - (difficulty - 1));

    const targetMotif = prng.choice(REGIONAL_ATTENTION_MOTIFS);

    // Pick distractors: at high difficulty, pick from same/similar visual group
    let distractorPool = REGIONAL_ATTENTION_MOTIFS.filter(m => m.id !== targetMotif.id);
    if (difficulty >= 3) {
      const similarPool = distractorPool.filter(m => m.visualSimilarityGroup === targetMotif.visualSimilarityGroup);
      if (similarPool.length >= 3) {
        distractorPool = similarPool;
      }
    }

    const tiles: { id: string; icon: string; name: string; isTarget: boolean }[] = [];
    for (let i = 0; i < targetCount; i++) {
      tiles.push({
        id: `t_${i}_${targetMotif.id}`,
        icon: targetMotif.icon,
        name: targetMotif.name,
        isTarget: true,
      });
    }

    for (let i = 0; i < distractorCount; i++) {
      const d = distractorPool[i % distractorPool.length]!;
      tiles.push({
        id: `d_${i}_${d.id}`,
        icon: d.icon,
        name: d.name,
        isTarget: false,
      });
    }

    const shuffledTiles = prng.shuffle(tiles);
    const contextUsed = preferredContext || targetMotif.context || 'craft';

    const complexity: TaskComplexityProfile = {
      difficulty,
      domain: 'attention',
      itemCount: targetCount,
      ruleCount: 1,
      distractorCount,
      sequenceLength: 0,
      ambiguityLevel,
      timePressure: difficulty,
      reasoningSteps: 1,
      cueLevel,
      memoryLoad: 1,
      interferenceLevel,
      overallComplexity: calculateDomainComplexity({
        domain: 'attention',
        difficulty,
        itemCount: targetCount,
        ruleCount: 1,
        distractorCount,
        sequenceLength: 0,
        ambiguityLevel,
        reasoningSteps: 1,
        cueLevel,
        memoryLoad: 1,
        interferenceLevel,
      }),
    };

    const fingerprint = hashString(`att:${difficulty}:${targetMotif.id}:${targetCount}:${distractorCount}`);

    let title = `Craft Pattern Attention & Cancellation (Level ${difficulty})`;
    let instructions = `Find and touch all ${targetCount} ${targetMotif.name} (${targetMotif.icon}) patterns among the craft motifs.`;
    if (language === 'hi') {
      title = `शिल्प पैटर्न एकाग्रता एवं चयन (स्तर ${difficulty})`;
      instructions = `शिल्प डिज़ाइनों में से सभी ${targetCount} ${targetMotif.name} (${targetMotif.icon}) पैटर्न खोजें और स्पर्श करें।`;
    } else if (language === 'kn') {
      title = `ಕುಶಲಕಲೆ ಮಾದರಿ ಗಮನ ಮತ್ತು ರದ್ದತಿ (ಹಂತ ${difficulty})`;
      instructions = `ಕುಶಲಕಲೆ ವಿನ್ಯಾಸಗಳಲ್ಲಿ ಎಲ್ಲಾ ${targetCount} ${targetMotif.name} (${targetMotif.icon}) ಮಾದರಿಗಳನ್ನು ಹುಡುಕಿ ಸ್ಪರ್ಶಿಸಿ.`;
    }

    return {
      id: `task_att_${fingerprint}`,
      fingerprint,
      domain: 'attention',
      difficulty,
      context: contextUsed,
      seed,
      title,
      instructions,
      complexity,
      payload: {
        targetMotif,
        tiles: shuffledTiles,
        targetCount,
        distractorCount,
      },
      scoring: (tappedTileIds: string[]) => {
        const tappedSet = new Set(tappedTileIds || []);
        let correct = 0;
        let incorrect = 0;

        tiles.forEach(t => {
          if (t.isTarget && tappedSet.has(t.id)) correct++;
          if (!t.isTarget && tappedSet.has(t.id)) incorrect++;
        });

        // Bounded penalty for false alarms
        const netScore = Math.max(0, correct - incorrect * 0.5);
        const rawScore = Number((netScore / targetCount).toFixed(3));
        return {
          rawScore: Math.min(1.0, rawScore),
          itemsPresented: targetCount,
          itemsCorrect: correct,
          details: `Found ${correct} of ${targetCount} targets with ${incorrect} false taps.`,
        };
      },
    };
  }

  // 3. SEQUENCING BUILDER
  private static buildSequencingTask(
    difficulty: 1 | 2 | 3 | 4 | 5,
    preferredContext: TaskContext | undefined,
    seed: number,
    prng: PRNG,
    language: SupportedLanguage = 'en'
  ): GeneratedCognitiveTask {
    // Progression:
    // L1: 3 steps, daily hygiene/drinking routine
    // L2: 4 steps, standard daily routine
    // L3: 5 steps, cooking / gardening multi-step
    // L4: 6 steps, handloom weaving / weekly medicines with strict constraints
    // L5: 7 steps, Bihu feast / wild honey extraction with branching constraints
    const template = generateParameterizedRoutine(difficulty, prng, preferredContext);
    const sequenceLength = template.steps.length;
    const reasoningSteps = difficulty;
    const ruleCount = difficulty >= 3 ? 2 : 1;
    const ambiguityLevel = difficulty;
    const interferenceLevel = Math.max(1, difficulty - 1);
    const cueLevel = Math.max(0, 3 - (difficulty - 1));

    // Shuffle steps for patient presentation - ensure strictly shuffled (correctOrder != shuffledItems)
    let shuffledSteps = prng.shuffle(template.steps);
    if (template.steps.length >= 2) {
      let isIdentical = true;
      let shuffleTries = 0;
      while (isIdentical && shuffleTries < 25) {
        isIdentical = template.steps.every((s, i) => s.order === shuffledSteps[i]?.order);
        if (isIdentical) {
          shuffledSteps = prng.shuffle(template.steps);
          shuffleTries++;
        }
      }
      // If still identical after 25 tries, swap adjacent items to guarantee non-identity
      if (template.steps.every((s, i) => s.order === shuffledSteps[i]?.order)) {
        const copy = [...shuffledSteps];
        const tmp = copy[0];
        copy[0] = copy[1];
        copy[1] = tmp;
        shuffledSteps = copy;
      }
    }

    const contextUsed = preferredContext || template.context;

    const complexity: TaskComplexityProfile = {
      difficulty,
      domain: 'sequencing',
      itemCount: sequenceLength,
      ruleCount,
      distractorCount: 0,
      sequenceLength,
      ambiguityLevel,
      timePressure: difficulty,
      reasoningSteps,
      cueLevel,
      memoryLoad: difficulty,
      interferenceLevel,
      overallComplexity: calculateDomainComplexity({
        domain: 'sequencing',
        difficulty,
        itemCount: sequenceLength,
        ruleCount,
        distractorCount: 0,
        sequenceLength,
        ambiguityLevel,
        reasoningSteps,
        cueLevel,
        memoryLoad: difficulty,
        interferenceLevel,
      }),
    };

    const stepOrderSig = template.steps.map(s => s.text).join('|');
    const fingerprint = hashString(`seq:${difficulty}:${template.id}:${sequenceLength}:${stepOrderSig}`);

    const baseTemplateId = template.id.replace(/_[0-9]+$/, '');
    const routineLoc = (LOCALIZED_SEQUENCING_ROUTINES && (LOCALIZED_SEQUENCING_ROUTINES[template.id] || LOCALIZED_SEQUENCING_ROUTINES[baseTemplateId])) || undefined;
    let title = `${template.title} (Level ${difficulty})`;
    let instructions = `Arrange the ${sequenceLength} steps into their proper chronological order from first to last.`;
    if (language === 'hi') {
      title = `${routineLoc?.title.hi || template.title} (स्तर ${difficulty})`;
      instructions = `इन ${sequenceLength} चरणों को उनके सही कालानुक्रमिक क्रम में पहले से आख़िरी तक व्यवस्थित करें।`;
    } else if (language === 'kn') {
      title = `${routineLoc?.title.kn || template.title} (ಹಂತ ${difficulty})`;
      instructions = `ಈ ${sequenceLength} ಹಂತಗಳನ್ನು ಮೊದಲಿನಿಂದ ಕೊನೆಯವರೆಗೆ ಸರಿಯಾದ ಕಾಲಾನುಕ್ರಮದಲ್ಲಿ ಜೋಡಿಸಿ.`;
    }

    const localizedCorrectSteps = template.steps.map(s => {
      const stepPair = routineLoc?.steps[s.order];
      return {
        ...s,
        text: stepPair ? formatLocalizedPair(stepPair, language) : s.text,
      };
    });

    const localizedShuffledSteps = shuffledSteps.map(s => {
      const stepPair = routineLoc?.steps[s.order];
      return {
        ...s,
        text: stepPair ? formatLocalizedPair(stepPair, language) : s.text,
      };
    });

    return {
      id: `task_seq_${fingerprint}`,
      fingerprint,
      domain: 'sequencing',
      difficulty,
      context: contextUsed,
      seed,
      title,
      instructions,
      complexity,
      payload: {
        templateId: template.id,
        items: localizedCorrectSteps,
        correctOrder: localizedCorrectSteps,
        shuffledItems: localizedShuffledSteps,
        shuffledSteps: localizedShuffledSteps,
        stepCount: sequenceLength,
      },
      scoring: (orderedStepTextsOrIds: (number | string | RoutineStep)[]) => {
        let correctPositions = 0;
        template.steps.forEach((correctStep, idx) => {
          const locStep = localizedCorrectSteps[idx];
          const userVal = orderedStepTextsOrIds[idx];
          if (
            userVal === correctStep.order ||
            userVal === correctStep.text ||
            (locStep && userVal === locStep.text) ||
            (typeof userVal === 'object' && userVal !== null && (
              (userVal as any).order === correctStep.order ||
              (userVal as any).text === correctStep.text ||
              (locStep && (userVal as any).text === locStep.text)
            ))
          ) {
            correctPositions++;
          }
        });

        const rawScore = Number((correctPositions / sequenceLength).toFixed(3));
        return {
          rawScore,
          itemsPresented: sequenceLength,
          itemsCorrect: correctPositions,
          details: `Placed ${correctPositions} of ${sequenceLength} steps in exact chronological position.`,
        };
      },
    };
  }

  // 4. RECOGNITION BUILDER
  private static buildRecognitionTask(
    difficulty: 1 | 2 | 3 | 4 | 5,
    preferredContext: TaskContext | undefined,
    seed: number,
    prng: PRNG,
    language: SupportedLanguage = 'en'
  ): GeneratedCognitiveTask {
    // Progression:
    // L1: 3 candidate options, high contrast categories (e.g. vessel vs apparel vs tool)
    // L2: 4 candidate options, moderate contrast
    // L3: 5 candidate options, within similar category
    // L4: 6 candidate options, subtle functional attribute discrimination
    // L5: 6 candidate options, fine perceptual & cultural attribute discrimination
    const optionCount = Math.min(6, 2 + difficulty);
    const distractorCount = optionCount - 1;
    const ambiguityLevel = difficulty;
    const interferenceLevel = difficulty;
    const cueLevel = Math.max(0, 3 - (difficulty - 1));

    const target = prng.choice(REGIONAL_RECOGNITION_OBJECTS);

    let distractorPool = REGIONAL_RECOGNITION_OBJECTS.filter(o => o.id !== target.id);
    if (difficulty >= 3) {
      const sameCategory = distractorPool.filter(o => o.category === target.category || o.material === target.material);
      if (sameCategory.length >= distractorCount) {
        distractorPool = sameCategory;
      }
    } else {
      // Level 1-2: Pick distinct categories for clarity
      const distinctCategory = distractorPool.filter(o => o.category !== target.category);
      if (distinctCategory.length >= distractorCount) {
        distractorPool = distinctCategory;
      }
    }

    const selectedDistractors = prng.sample(distractorPool, distractorCount);
    const allOptions = prng.shuffle([target, ...selectedDistractors]);
    const contextUsed = preferredContext || target.context;

    const complexity: TaskComplexityProfile = {
      difficulty,
      domain: 'recognition',
      itemCount: 1,
      ruleCount: 1,
      distractorCount,
      sequenceLength: 0,
      ambiguityLevel,
      timePressure: difficulty,
      reasoningSteps: Math.min(3, 1 + Math.floor(difficulty / 2)),
      cueLevel,
      memoryLoad: Math.min(4, difficulty),
      interferenceLevel,
      overallComplexity: calculateDomainComplexity({
        domain: 'recognition',
        difficulty,
        itemCount: 1,
        ruleCount: 1,
        distractorCount,
        sequenceLength: 0,
        ambiguityLevel,
        reasoningSteps: Math.min(3, 1 + Math.floor(difficulty / 2)),
        cueLevel,
        memoryLoad: Math.min(4, difficulty),
        interferenceLevel,
      }),
    };

    const distractorIds = selectedDistractors.map(d => d.id).sort().join(',');
    const fingerprint = hashString(`rec:${difficulty}:${target.id}:${distractorIds}`);

    const targetLoc = LOCALIZED_RECOGNITION_OBJECTS[target.id];
    const targetNameFormatted = targetLoc ? formatLocalizedPair(targetLoc.name, language) : target.name;
    const targetLocalName = targetLoc
      ? (language === 'hi' ? targetLoc.name.hi : language === 'kn' ? targetLoc.name.kn : targetLoc.name.en)
      : target.name;
    const targetDescFormatted = targetLoc && language !== 'en' ? targetLoc.description[language] : target.description;

    const localizedTarget = {
      ...target,
      name: targetNameFormatted,
      localName: targetLocalName,
      description: targetDescFormatted,
    };

    const localizedOptions = allOptions.map(o => {
      const oLoc = LOCALIZED_RECOGNITION_OBJECTS[o.id];
      const oLocalName = oLoc
        ? (language === 'hi' ? oLoc.name.hi : language === 'kn' ? oLoc.name.kn : oLoc.name.en)
        : o.name;
      return {
        ...o,
        name: oLoc ? formatLocalizedPair(oLoc.name, language) : o.name,
        localName: oLocalName,
        description: oLoc && language !== 'en' ? oLoc.description[language] : o.description,
      };
    });

    let title = `Household & Cultural Object Recognition (Level ${difficulty})`;
    let instructions = `Look at the description: "${targetDescFormatted}". Touch its correct traditional name from the ${optionCount} options.`;
    if (language === 'hi') {
      title = `घरेलू एवं सांस्कृतिक वस्तु पहचान (स्तर ${difficulty})`;
      instructions = `विवरण देखें: "${targetDescFormatted}"। ${optionCount} विकल्पों में से इसका सही नाम चुनें।`;
    } else if (language === 'kn') {
      title = `ಮನೆ ಹಾಗೂ ಸಾಂಸ್ಕೃತಿಕ ವಸ್ತು ಗುರುತಿಸುವಿಕೆ (ಹಂತ ${difficulty})`;
      instructions = `ವಿವರಣೆಯನ್ನು ನೋಡಿ: "${targetDescFormatted}". ${optionCount} ಆಯ್ಕೆಗಳಲ್ಲಿ ಸರಿಯಾದ ಹೆಸರನ್ನು ಆಯ್ಕೆಮಾಡಿ.`;
    }

    return {
      id: `task_rec_${fingerprint}`,
      fingerprint,
      domain: 'recognition',
      difficulty,
      context: contextUsed,
      seed,
      title,
      instructions,
      complexity,
      payload: {
        prompt: instructions,
        targetObject: localizedTarget,
        options: localizedOptions,
        correctOptionId: target.id,
        optionCount,
      },
      scoring: (selectedId: string) => {
        const isCorrect = selectedId === target.id;
        return {
          rawScore: isCorrect ? 1.0 : 0.0,
          itemsPresented: 1,
          itemsCorrect: isCorrect ? 1 : 0,
          details: isCorrect ? `Identified ${targetNameFormatted} correctly.` : `Selected incorrect object. Correct was ${targetNameFormatted}.`,
        };
      },
    };
  }

  // 5. CALCULATION BUILDER
  private static buildCalculationTask(
    difficulty: 1 | 2 | 3 | 4 | 5,
    preferredContext: TaskContext | undefined,
    seed: number,
    prng: PRNG,
    language: SupportedLanguage = 'en'
  ): GeneratedCognitiveTask {
    // Progression:
    // L1: 1 item, clean round numbers (e.g. ₹30 from ₹50 -> ₹20), 4 distinct options
    // L2: 1 item with ₹5 increments (e.g. ₹45 from ₹100 -> ₹55), 4 distinct options
    // L3: 2-item sum & change calculation (e.g. ₹35 + ₹45 = ₹80, paid ₹100 -> ₹20)
    // L4: Multi-item purchase with quantities (e.g. 2 x ₹35 + ₹50 = ₹120, paid ₹200 -> ₹80)
    // L5: 3 items / bundled purchase with budget comparison / change from ₹500 (e.g. 2 x ₹65 + ₹120 = ₹250, paid ₹500 -> ₹250)
    const reasoningSteps = difficulty;
    const workingMemoryDemand = difficulty;
    const ruleCount = difficulty >= 3 ? 2 : 1;
    const cueLevel = Math.max(0, 3 - (difficulty - 1));

    let itemsPurchased: { name: string; quantity: number; unitPrice: number; totalPrice: number }[] = [];
    let totalBill = 0;
    let paidAmount = 0;

    const availableGoods = prng.shuffle(MARKET_GOODS);

    if (difficulty === 1) {
      // 1 item, clean ₹10 price
      const g = availableGoods[0]!;
      const unitPrice = prng.choice([20, 30, 40]);
      itemsPurchased = [{ name: g.name, quantity: 1, unitPrice, totalPrice: unitPrice }];
      totalBill = unitPrice;
      paidAmount = unitPrice === 40 ? 50 : 50;
      if (paidAmount <= totalBill) paidAmount = 100;
    } else if (difficulty === 2) {
      // 1 item with ₹5 increments
      const g = availableGoods[0]!;
      const unitPrice = prng.choice([25, 35, 45, 55, 65]);
      itemsPurchased = [{ name: g.name, quantity: 1, unitPrice, totalPrice: unitPrice }];
      totalBill = unitPrice;
      paidAmount = unitPrice > 50 ? 100 : 50;
    } else if (difficulty === 3) {
      // 2 items sum
      const g1 = availableGoods[0]!;
      const g2 = availableGoods[1]!;
      const p1 = prng.choice([25, 30, 35]);
      const p2 = prng.choice([20, 30, 45]);
      totalBill = p1 + p2;
      itemsPurchased = [
        { name: g1.name, quantity: 1, unitPrice: p1, totalPrice: p1 },
        { name: g2.name, quantity: 1, unitPrice: p2, totalPrice: p2 },
      ];
      paidAmount = totalBill <= 50 ? 50 : 100;
      if (paidAmount <= totalBill) paidAmount = 200;
    } else if (difficulty === 4) {
      // Multi-item with quantity: 2x item 1 + 1x item 2
      const g1 = availableGoods[0]!;
      const g2 = availableGoods[1]!;
      const p1 = prng.choice([25, 30, 40]);
      const p2 = prng.choice([35, 50, 60]);
      const q1 = 2;
      totalBill = (p1 * q1) + p2;
      itemsPurchased = [
        { name: g1.name, quantity: q1, unitPrice: p1, totalPrice: p1 * q1 },
        { name: g2.name, quantity: 1, unitPrice: p2, totalPrice: p2 },
      ];
      paidAmount = totalBill <= 100 ? 100 : 200;
      if (paidAmount <= totalBill) paidAmount = 500;
    } else {
      // Level 5: 3 items with quantities from ₹500
      const g1 = availableGoods[0]!;
      const g2 = availableGoods[1]!;
      const g3 = availableGoods[2]!;
      const p1 = prng.choice([30, 40, 50]);
      const p2 = prng.choice([55, 65, 75]);
      const p3 = prng.choice([40, 50, 60]);
      const q1 = 2;
      totalBill = (p1 * q1) + p2 + p3;
      itemsPurchased = [
        { name: g1.name, quantity: q1, unitPrice: p1, totalPrice: p1 * q1 },
        { name: g2.name, quantity: 1, unitPrice: p2, totalPrice: p2 },
        { name: g3.name, quantity: 1, unitPrice: p3, totalPrice: p3 },
      ];
      paidAmount = 500;
    }

    const correctChange = paidAmount - totalBill;

    // Generate 4 strictly unique options
    const optionSet = new Set<number>([correctChange]);
    const candidateOffsets = [5, -5, 10, -10, 15, -15, 20, -20, 25, -25];

    for (const offset of prng.shuffle(candidateOffsets)) {
      const candidate = correctChange + offset;
      if (candidate > 0 && candidate !== correctChange && !optionSet.has(candidate)) {
        optionSet.add(candidate);
        if (optionSet.size >= 4) break;
      }
    }

    // Fallback if needed
    let fallbackOffset = 1;
    while (optionSet.size < 4) {
      const val = correctChange + (fallbackOffset * 5);
      if (val > 0 && !optionSet.has(val)) optionSet.add(val);
      fallbackOffset++;
    }

    const optionsList = prng.shuffle(Array.from(optionSet));
    const contextUsed = preferredContext || 'market';

    const complexity: TaskComplexityProfile = {
      difficulty,
      domain: 'calculation',
      itemCount: itemsPurchased.length,
      ruleCount,
      distractorCount: 3,
      sequenceLength: 0,
      ambiguityLevel: difficulty,
      timePressure: difficulty,
      reasoningSteps,
      cueLevel,
      memoryLoad: workingMemoryDemand,
      interferenceLevel: difficulty,
      overallComplexity: calculateDomainComplexity({
        domain: 'calculation',
        difficulty,
        itemCount: itemsPurchased.length,
        ruleCount,
        distractorCount: 3,
        sequenceLength: 0,
        ambiguityLevel: difficulty,
        reasoningSteps,
        cueLevel,
        memoryLoad: workingMemoryDemand,
        interferenceLevel: difficulty,
      }),
    };

    const localizedItemsPurchased = itemsPurchased.map(item => {
      const matchingGood = availableGoods.find(g => g.name === item.name);
      const locPair = matchingGood ? LOCALIZED_MARKET_GOODS[matchingGood.id] : undefined;
      return {
        ...item,
        name: locPair ? formatLocalizedPair(locPair, language) : item.name,
      };
    });

    const itemDesc = localizedItemsPurchased.map(i => `${i.quantity}x ${i.name}`).join(' + ');
    const itemSig = itemsPurchased.map(i => `${i.quantity}x${i.name}@${i.unitPrice}`).join(';');
    const fingerprint = hashString(`calc:${difficulty}:${itemSig}:${totalBill}:${paidAmount}:${correctChange}`);

    let title = `Market Grocery Change Calculation (Level ${difficulty})`;
    let instructions = `You are purchasing ${itemDesc}. Total bill is ₹${totalBill}. You paid with ₹${paidAmount}. What change should the vendor return?`;
    if (language === 'hi') {
      title = `दैनिक बाज़ार खरीदारी एवं शेष राशि की गणना (स्तर ${difficulty})`;
      instructions = `आप ${itemDesc} खरीद रहे हैं। कुल बिल ₹${totalBill} है। आपने ₹${paidAmount} दिए। दुकानदार को कितने रुपये वापस करने चाहिए?`;
    } else if (language === 'kn') {
      title = `ಮಾರುಕಟ್ಟೆ ಖರೀದಿ ಮತ್ತು ಉಳಿದ ಹಣದ ಲೆಕ್ಕಾಚಾರ (ಹಂತ ${difficulty})`;
      instructions = `ನೀವು ${itemDesc} ಖರೀದಿಸುತ್ತಿದ್ದೀರಿ. ಒಟ್ಟು ಮೊತ್ತ ₹${totalBill}. ನೀವು ₹${paidAmount} ನೀಡಿದ್ದೀರಿ. ವ್ಯಾಪಾರಿ ಎಷ್ಟು ಹಣವನ್ನು ಮರಳಿ ನೀಡಬೇಕು?`;
    }

    return {
      id: `task_calc_${fingerprint}`,
      fingerprint,
      domain: 'calculation',
      difficulty,
      context: contextUsed,
      seed,
      title,
      instructions,
      complexity,
      payload: {
        itemsPurchased: localizedItemsPurchased,
        totalBill,
        paidAmount,
        correctChange,
        options: optionsList,
      },
      scoring: (selectedChangeVal: number) => {
        const isCorrect = Number(selectedChangeVal) === correctChange;
        return {
          rawScore: isCorrect ? 1.0 : 0.0,
          itemsPresented: 1,
          itemsCorrect: isCorrect ? 1 : 0,
          details: isCorrect
            ? `Correct change of ₹${correctChange} selected.`
            : `Selected ₹${selectedChangeVal}. Correct change was ₹${correctChange} (₹${paidAmount} - ₹${totalBill}).`,
        };
      },
    };
  }

  // 6. PLANNING BUILDER
  private static buildPlanningTask(
    difficulty: 1 | 2 | 3 | 4 | 5,
    preferredContext: TaskContext | undefined,
    seed: number,
    prng: PRNG,
    language: SupportedLanguage = 'en'
  ): GeneratedCognitiveTask {
    // Progression:
    // L1: 3 activities, non-conflicting schedule
    // L2: 4 activities, chronological sequencing
    // L3: 5 activities with prerequisites (e.g. harvest before cooking)
    // L4: 6 activities with transit time, banking hours, multi-prerequisites
    // L5: 7 activities with multiple prerequisites & conflicting trade-offs
    const template = generateProceduralSchedule(difficulty, prng, preferredContext);
    const activityCount = template.activities.length;
    const reasoningSteps = difficulty;
    const ruleCount = template.rules.length;
    const ambiguityLevel = difficulty;
    const cueLevel = Math.max(0, 3 - (difficulty - 1));

    let shuffledActivities = prng.shuffle(template.activities);
    if (template.activities.length >= 2) {
      let isIdentical = true;
      let shuffleTries = 0;
      while (isIdentical && shuffleTries < 25) {
        isIdentical = template.activities.every((a, i) => a.id === shuffledActivities[i]?.id);
        if (isIdentical) {
          shuffledActivities = prng.shuffle(template.activities);
          shuffleTries++;
        }
      }
      if (template.activities.every((a, i) => a.id === shuffledActivities[i]?.id)) {
        const copy = [...shuffledActivities];
        const tmp = copy[0];
        copy[0] = copy[1];
        copy[1] = tmp;
        shuffledActivities = copy;
      }
    }
    const contextUsed = preferredContext || template.context;

    const complexity: TaskComplexityProfile = {
      difficulty,
      domain: 'planning',
      itemCount: activityCount,
      ruleCount,
      distractorCount: 0,
      sequenceLength: activityCount,
      ambiguityLevel,
      timePressure: difficulty,
      reasoningSteps,
      cueLevel,
      memoryLoad: difficulty,
      interferenceLevel: difficulty,
      overallComplexity: calculateDomainComplexity({
        domain: 'planning',
        difficulty,
        itemCount: activityCount,
        ruleCount,
        distractorCount: 0,
        sequenceLength: activityCount,
        ambiguityLevel,
        reasoningSteps,
        cueLevel,
        memoryLoad: difficulty,
        interferenceLevel: difficulty,
      }),
    };

    const actSig = template.activities.map(a => a.name).join('|');
    const fingerprint = hashString(`plan:${difficulty}:${template.id}:${actSig}`);

    const localizedActivities = template.activities.map(a => {
      const locPair = LOCALIZED_PLANNING_ACTIVITIES[a.id];
      return {
        ...a,
        name: locPair ? formatLocalizedPair(locPair, language) : a.name,
      };
    });

    const localizedShuffledActivities = shuffledActivities.map(a => {
      const locPair = LOCALIZED_PLANNING_ACTIVITIES[a.id];
      return {
        ...a,
        name: locPair ? formatLocalizedPair(locPair, language) : a.name,
      };
    });

    let title = `${template.title} (Level ${difficulty})`;
    let instructions = `Organize your day by arranging these ${activityCount} activities into the best chronological order.`;
    if (language === 'hi') {
      title = `दैनिक दिनचर्या एवं कार्य प्राथमिकता योजना (स्तर ${difficulty})`;
      instructions = `इस दैनिक दिनचर्या के लिए इन ${activityCount} कार्यों को सही क्रम में व्यवस्थित करें।`;
    } else if (language === 'kn') {
      title = `ದೈನಂದಿನ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ಆದ್ಯತೆ ಯೋಜನೆ (ಹಂತ ${difficulty})`;
      instructions = `ಈ ದೈನಂದಿನ ವೇಳಾಪಟ್ಟಿಗಾಗಿ ಈ ${activityCount} ಕಾರ್ಯಗಳನ್ನು ಸೂಕ್ತ ಕಾಲಾನುಕ್ರಮದಲ್ಲಿ ಜೋಡಿಸಿ.`;
    }

    return {
      id: `task_plan_${fingerprint}`,
      fingerprint,
      domain: 'planning',
      difficulty,
      context: contextUsed,
      seed,
      title,
      instructions,
      complexity,
      payload: {
        templateId: template.id,
        items: localizedActivities,
        correctOrder: localizedActivities,
        shuffledItems: localizedShuffledActivities,
        shuffledActivities: localizedShuffledActivities,
        rules: template.rules,
        activityCount,
      },
      scoring: (orderedActivityIds: string[]) => {
        let correctPositions = 0;
        template.activities.forEach((act, idx) => {
          if (orderedActivityIds[idx] === act.id) {
            correctPositions++;
          }
        });

        const rawScore = Number((correctPositions / activityCount).toFixed(3));
        return {
          rawScore,
          itemsPresented: activityCount,
          itemsCorrect: correctPositions,
          details: `Scheduled ${correctPositions} of ${activityCount} activities in optimal position.`,
        };
      },
    };
  }

  // --------------------------------------------------------------------------
  // CONTENT SAFETY & VALIDATION
  // --------------------------------------------------------------------------

  private static validateTaskStructure(task: GeneratedCognitiveTask): string | null {
    if (!task.title || !task.instructions) return "Missing title or instructions";
    if (!task.fingerprint) return "Missing fingerprint";
    if (!task.complexity) return "Missing complexity profile";

    // Validate complexity schema
    const parseResult = TaskComplexityProfileSchema.safeParse(task.complexity);
    if (!parseResult.success) {
      return `Invalid complexity profile: ${parseResult.error.message}`;
    }

    if (task.difficulty < 1 || task.difficulty > 5) return "Invalid difficulty level";

    if (task.domain === 'calculation') {
      const p = task.payload;
      if (p.correctChange <= 0) return "Non-positive change";
      if (p.totalBill + p.correctChange !== p.paidAmount) return "Arithmetic mismatch";
      if (new Set(p.options).size !== p.options.length) return "Duplicate calculation options";
      if (!p.options.includes(p.correctChange)) return "Correct change not in options";
    }

    if (task.domain === 'recognition') {
      const p = task.payload;
      const ids = p.options.map((o: any) => o.id);
      if (new Set(ids).size !== ids.length) return "Duplicate recognition options";
      if (!ids.includes(p.targetObject.id)) return "Target object not in options";
      if (p.correctOptionId !== p.targetObject.id) return "Correct option ID mismatch";
      const matchingCount = p.options.filter((o: any) => o.id === p.correctOptionId).length;
      if (matchingCount !== 1) return "Exactly one correct option must exist";
    }

    if (task.domain === 'attention') {
      const p = task.payload;
      const targets = p.tiles.filter((t: any) => t.isTarget);
      if (targets.length !== p.targetCount) return "Target tile count mismatch";
      if (p.tiles.length !== p.targetCount + p.distractorCount) return "Total tile count mismatch";
    }

    if (task.domain === 'sequencing') {
      const p = task.payload;
      if (p.shuffledSteps.length !== p.stepCount) return "Sequencing step count mismatch";
      if (p.items.length !== p.stepCount || p.correctOrder.length !== p.stepCount) return "Sequencing array length mismatch";
      const itemOrders = new Set(p.items.map((i: any) => i.order));
      if (itemOrders.size !== p.stepCount) return "Duplicate sequence step orders";
      if (p.stepCount >= 2) {
        const isIdentical = p.correctOrder.every((step: any, idx: number) => step.order === p.shuffledItems[idx]?.order);
        if (isIdentical) return "Sequencing shuffled order cannot match correct order";
      }
    }

    if (task.domain === 'planning') {
      const p = task.payload;
      if (p.shuffledActivities.length !== p.activityCount) return "Planning activity count mismatch";
      if (p.items.length !== p.activityCount || p.correctOrder.length !== p.activityCount) return "Planning array length mismatch";
      const actIds = new Set(p.items.map((a: any) => a.id));
      if (actIds.size !== p.activityCount) return "Duplicate planning activity ids";
      if (p.activityCount >= 2) {
        const isIdentical = p.correctOrder.every((act: any, idx: number) => act.id === p.shuffledItems[idx]?.id);
        if (isIdentical) return "Planning shuffled order cannot match correct order";
      }
    }

    return null;
  }
}
