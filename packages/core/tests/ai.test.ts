import { describe, it, expect, vi } from 'vitest';
import {
  getActivityNarrative,
  DETERMINISTIC_FALLBACK_TEMPLATES,
  LlmAdapter,
} from '../src/ai/abstraction.js';

describe('AI Abstraction & Safety Enclosure', () => {
  it('returns deterministic localized template when no LLM is configured', async () => {
    const res = await getActivityNarrative({
      taskId: 'market_shopping_recall',
      domain: 'memory',
      difficulty: 2,
      language: 'as',
      context: 'market',
    });

    expect(res.title).toBe(DETERMINISTIC_FALLBACK_TEMPLATES.as.market_shopping_recall.title);
    expect(res.instructions).toContain('বজাৰৰ');
    expect(res.encouragement).toBeDefined();
  });

  it('supports multiple regional languages offline', async () => {
    const bengali = await getActivityNarrative({
      taskId: 'morning_tea_sequence',
      domain: 'sequencing',
      difficulty: 1,
      language: 'bn',
      context: 'kitchen',
    });
    expect(bengali.title).toBe('সকালের চা তৈরি');

    const bodo = await getActivityNarrative({
      taskId: 'morning_tea_sequence',
      domain: 'sequencing',
      difficulty: 1,
      language: 'brx',
      context: 'kitchen',
    });
    expect(bodo.title).toBe('फुंनि साहा बानायनाय');
  });

  it('safely falls back to deterministic template if LLM throws or fails', async () => {
    const brokenLlm: LlmAdapter = {
      generateStructuredContent: vi.fn().mockRejectedValue(new Error('Connection to llama.cpp failed')),
    };

    const res = await getActivityNarrative(
      {
        taskId: 'craft_pattern_matching',
        domain: 'attention',
        difficulty: 3,
        language: 'en',
        context: 'craft',
      },
      brokenLlm
    );

    expect(res.title).toBe('Traditional Craft Pattern');
    expect(brokenLlm.generateStructuredContent).toHaveBeenCalled();
  });

  it('safely falls back to deterministic template if LLM generates prohibited clinical copy', async () => {
    const maliciousOrHallucinatingLlm: LlmAdapter = {
      generateStructuredContent: vi.fn().mockResolvedValue({
        title: "Dementia Exercise",
        instructions: "This cures dementia disease progression.",
        audioPromptText: "Cure your memory.",
        encouragement: "Good",
      }),
    };

    const res = await getActivityNarrative(
      {
        taskId: 'market_shopping_recall',
        domain: 'memory',
        difficulty: 2,
        language: 'en',
        context: 'market',
      },
      maliciousOrHallucinatingLlm
    );

    // Fallback template must be used instead!
    expect(res.title).toBe('Market Shopping List');
    expect(res.instructions).not.toContain('cures dementia');
  });
});
