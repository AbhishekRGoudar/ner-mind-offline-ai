import { describe, it, expect, beforeEach } from 'vitest';
import {
  CognitiveDomainEnum,
  CognitiveDomain,
  PersonalizationEngine,
  TaskGenerator,
  createInitialPersonalModel,
} from '@ner-mind/core';
import { OfflineStorageService } from '../src/storage/localStorage.js';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] || null,
  };
};

describe('Level 5 Mastery / Maintenance & Cross-Context Transfer Integration', () => {
  const patientId = 'pat-mastery-integration';

  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
  });

  it('guarantees Level 5 is the absolute maximum ceiling (NO Level 6 anywhere)', () => {
    let model = createInitialPersonalModel(patientId);
    
    CognitiveDomainEnum.options.forEach((domain: CognitiveDomain) => {
      // Set to Level 5 with strong mastery history
      model.domainBeliefs[domain].activeDifficulty = 5;
      model.domainBeliefs[domain].observationCount = 10;
      model.domainBeliefs[domain].adaptationMode = 'mastery';
      model.domainBeliefs[domain].consecutiveHighSessionsAtL5 = 8;
      model.domainBeliefs[domain].confidence = 0.85;

      // Add a 100% score observation
      model = PersonalizationEngine.updatePersonalModel(model, {
        id: crypto.randomUUID(),
        patientId,
        domain,
        taskId: `${domain}_task`,
        timestamp: new Date().toISOString(),
        difficulty: 5,
        context: 'market',
        metrics: {
          rawScore: 1.0,
          itemsPresented: 5,
          itemsCorrect: 5,
          completionTimeMs: 3500,
          hesitationCount: 0,
          cueAssistanceCount: 0,
        },
      });

      expect(model.domainBeliefs[domain].activeDifficulty).toBeLessThanOrEqual(5);
      expect(model.domainBeliefs[domain].activeDifficulty).toBe(5);
    });

    const rec = PersonalizationEngine.selectNextPersonalizedTask(model);
    expect(rec.recommendedDifficulty).toBeLessThanOrEqual(5);
    expect(rec.recommendedDifficulty).toBe(5);
    expect(rec.adaptationMode).toBe('mastery');
  });

  it('generates Level 5 tasks with dynamic variation and cross-context rotation for all 6 domains', () => {
    CognitiveDomainEnum.options.forEach((domain: CognitiveDomain) => {
      const generatedContexts = new Set<string>();
      const fingerprints = new Set<string>();

      for (let i = 0; i < 12; i++) {
        const task = TaskGenerator.generateTask({
          domain,
          difficulty: 5,
          masteryMode: true,
          seed: 42000 + i * 31,
          recentFingerprints: Array.from(fingerprints),
        });

        expect(task.difficulty).toBe(5);
        expect(task.domain).toBe(domain);
        expect(task.complexity.overallComplexity).toBeGreaterThanOrEqual(0.70); // High Level 5 complexity
        expect(task.instructions).toBeTruthy();
        expect(task.fingerprint).toBeTruthy();

        fingerprints.add(task.fingerprint);
        if (task.context) {
          generatedContexts.add(task.context);
        }
      }

      // Check that multiple unique tasks are generated
      expect(fingerprints.size).toBeGreaterThanOrEqual(5);
      if (domain === 'memory' || domain === 'sequencing' || domain === 'calculation' || domain === 'planning') {
        expect(generatedContexts.size).toBeGreaterThanOrEqual(2);
      }
    });
  });

  it('preserves Level 5 mastery on a single bad session (outlier protection) and exits only on repeated decline', () => {
    let model = createInitialPersonalModel(patientId);
    model.domainBeliefs.memory.activeDifficulty = 5;
    model.domainBeliefs.memory.observationCount = 10;
    model.domainBeliefs.memory.adaptationMode = 'mastery';
    model.domainBeliefs.memory.consecutiveHighSessionsAtL5 = 5;
    model.domainBeliefs.memory.confidence = 0.8;

    // Outlier: single session at 35% accuracy
    model = PersonalizationEngine.updatePersonalModel(model, {
      id: crypto.randomUUID(),
      patientId,
      domain: 'memory',
      taskId: 'memory_task',
      timestamp: new Date().toISOString(),
      difficulty: 5,
      context: 'market',
      metrics: {
        rawScore: 0.35,
        itemsPresented: 10,
        itemsCorrect: 3,
        completionTimeMs: 14000,
        hesitationCount: 2,
        cueAssistanceCount: 2,
      },
    });

    // Outlier protection: remains at Level 5 and in mastery mode
    expect(model.domainBeliefs.memory.activeDifficulty).toBe(5);
    expect(model.domainBeliefs.memory.adaptationMode).toBe('mastery');
    expect(model.domainBeliefs.memory.consecutiveLowSessionsAtL5).toBe(1);

    // Second consecutive weak session: confirmed sustained decline
    model = PersonalizationEngine.updatePersonalModel(model, {
      id: crypto.randomUUID(),
      patientId,
      domain: 'memory',
      taskId: 'memory_task',
      timestamp: new Date().toISOString(),
      difficulty: 5,
      context: 'market',
      metrics: {
        rawScore: 0.30,
        itemsPresented: 10,
        itemsCorrect: 3,
        completionTimeMs: 15000,
        hesitationCount: 3,
        cueAssistanceCount: 2,
      },
    });

    // Exited mastery mode, stepped down to Level 4 remediation
    expect(model.domainBeliefs.memory.activeDifficulty).toBe(4);
    expect(model.domainBeliefs.memory.adaptationMode).toBe('remediation');
    expect(model.adaptationHistory[0].decision).toBe('mastery_exit');
  });

  it('runs 100% offline with zero network requests', async () => {
    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      fetchCalled = true;
      return Promise.reject(new Error('Network access is disabled in offline-native mode'));
    }) as any;

    try {
      let model = createInitialPersonalModel(patientId);
      model.domainBeliefs.calculation.activeDifficulty = 5;
      model.domainBeliefs.calculation.observationCount = 6;
      model.domainBeliefs.calculation.adaptationMode = 'mastery';

      // Generate task
      const task = TaskGenerator.generateTask({
        domain: 'calculation',
        difficulty: 5,
        masteryMode: true,
      });

      // Update model
      const updated = PersonalizationEngine.updatePersonalModel(model, {
        id: crypto.randomUUID(),
        patientId,
        domain: 'calculation',
        taskId: task.id,
        timestamp: new Date().toISOString(),
        difficulty: 5,
        context: task.context,
        metrics: {
          rawScore: 0.95,
          itemsPresented: 5,
          itemsCorrect: 5,
          completionTimeMs: 4000,
          hesitationCount: 0,
          cueAssistanceCount: 0,
        },
      });

      // Select recommendation
      const rec = PersonalizationEngine.selectNextPersonalizedTask(updated);

      expect(fetchCalled).toBe(false);
      expect(updated.domainBeliefs.calculation.activeDifficulty).toBe(5);
      expect(rec.recommendedDifficulty).toBeLessThanOrEqual(5);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
