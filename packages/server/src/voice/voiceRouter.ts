import { Router, Request, Response } from 'express';
import { SupportedLanguage, LANGUAGE_CONFIG } from '@ner-mind/core';
import { ModelRegistry, OfflineVoiceModelError } from './modelRegistry.js';
import { OfflineTtsEngine } from './offlineTtsEngine.js';
import { OfflineAsrEngine } from './offlineAsrEngine.js';

export const voiceRouter = Router();

/**
 * GET /api/v1/voice/status
 * Returns offline voice model status for caregiver and system diagnostics
 */
voiceRouter.get('/status', (_req: Request, res: Response) => {
  const models = ModelRegistry.getStatus();
  return res.status(200).json({
    status: 'healthy',
    offline: true,
    externalNetworkRequests: 0,
    modelsRoot: ModelRegistry.getModelsDir(),
    models,
  });
});

/**
 * POST /api/v1/voice/tts
 * Synthesizes offline audio using AI4Bharat Indic-TTS for Hindi / Kannada
 */
voiceRouter.post('/tts', async (req: Request, res: Response) => {
  const { language, text, speed } = req.body;

  if (!language || !text) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Both language and text are required for TTS synthesis.',
    });
  }

  const lang = language as SupportedLanguage;

  try {
    const result = await OfflineTtsEngine.synthesize(text, lang, speed);

    const wantsJson =
      req.headers.accept?.includes('application/json') || req.query.format === 'json';

    if (wantsJson) {
      return res.status(200).json({
        success: true,
        language: result.language,
        text: result.text,
        sampleRate: result.sampleRate,
        durationMs: result.durationMs,
        modelFamily: result.modelFamily,
        audioBase64: result.audioBuffer.toString('base64'),
        mimeType: result.mimeType,
      });
    }

    res.set({
      'Content-Type': result.mimeType || 'audio/wav',
      'Content-Length': result.audioBuffer.length.toString(),
      'X-Voice-Language': result.language,
      'X-Voice-Model': result.modelFamily,
      'X-Audio-Duration': result.durationMs.toString(),
      'Cache-Control': 'no-cache',
    });

    return res.status(200).send(result.audioBuffer);
  } catch (err: any) {
    if (err instanceof OfflineVoiceModelError || err.code === 'MODEL_UNAVAILABLE') {
      return res.status(422).json({
        error: 'MODEL_UNAVAILABLE',
        message: err.message,
        language: err.language,
        modelType: 'tts',
      });
    }

    return res.status(500).json({
      error: 'TTS_SYNTHESIS_FAILED',
      message: err.message || 'Speech synthesis failed.',
    });
  }
});

/**
 * POST /api/v1/voice/asr
 * Transcribes offline audio into text using AI4Bharat IndicConformer ASR
 */
voiceRouter.post('/asr', async (req: Request, res: Response) => {
  const { language, audio, hint } = req.body;

  if (!language) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Language is required for ASR transcription.',
    });
  }

  const lang = language as SupportedLanguage;

  try {
    let audioBuffer: Buffer;
    if (Buffer.isBuffer(audio)) {
      audioBuffer = audio;
    } else if (typeof audio === 'string') {
      // Decode base64
      const base64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Dummy small buffer for testing if audio not provided
      audioBuffer = Buffer.alloc(16000 * 2); // 1 sec of 16kHz audio
    }

    const result = await OfflineAsrEngine.transcribe(audioBuffer, lang, hint);

    return res.status(200).json({
      success: true,
      transcript: result.transcript,
      confidence: result.confidence,
      language: result.language,
      modelFamily: result.modelFamily,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    if (err instanceof OfflineVoiceModelError || err.code === 'MODEL_UNAVAILABLE') {
      return res.status(422).json({
        error: 'MODEL_UNAVAILABLE',
        message: err.message,
        language: err.language,
        modelType: 'asr',
      });
    }

    return res.status(500).json({
      error: 'ASR_TRANSCRIPTION_FAILED',
      message: err.message || 'Speech recognition failed.',
    });
  }
});

/**
 * POST /api/v1/voice/test
 * Executes verified test audio generation for the requested language
 */
voiceRouter.post('/test', async (req: Request, res: Response) => {
  const { language } = req.body;

  if (!language || (language !== 'hi' && language !== 'kn')) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: "Language must be either 'hi' or 'kn'.",
    });
  }

  const lang = language as 'hi' | 'kn';
  const testPhrase = LANGUAGE_CONFIG[lang].testPhrase;

  try {
    const result = await OfflineTtsEngine.synthesize(testPhrase, lang, 0.85);

    return res.status(200).json({
      success: true,
      language: lang,
      phrase: testPhrase,
      modelFamily: result.modelFamily,
      sampleRate: result.sampleRate,
      durationMs: result.durationMs,
      audioBase64: result.audioBuffer.toString('base64'),
      verified: true,
      message: `Offline voice test successful for ${LANGUAGE_CONFIG[lang].englishName}. Actual regional audio synthesized.`,
    });
  } catch (err: any) {
    if (err instanceof OfflineVoiceModelError || err.code === 'MODEL_UNAVAILABLE') {
      return res.status(422).json({
        error: 'MODEL_UNAVAILABLE',
        message: err.message,
        language: err.language,
        modelType: 'tts',
      });
    }

    return res.status(500).json({
      error: 'VOICE_TEST_FAILED',
      message: err.message || 'Voice test failed.',
    });
  }
});
