import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { ModelRegistry, OfflineVoiceModelError } from '../src/voice/modelRegistry.js';
import { OfflineTtsEngine } from '../src/voice/offlineTtsEngine.js';
import { OfflineAsrEngine } from '../src/voice/offlineAsrEngine.js';
import path from 'node:path';
import fs from 'node:fs';

describe('Offline Voice Models — Engine & Router Tests', () => {
  const defaultModelsDir = path.resolve(__dirname, '../../../models');

  beforeEach(() => {
    ModelRegistry.setModelsDir(defaultModelsDir);
  });

  // 1. Language Routing Verification
  describe('Language Routing Verification', () => {
    it('routes Hindi voice synthesis to AI4Bharat Indic-TTS hi and ASR to IndicConformer hi', async () => {
      const res = await request(app).get('/api/v1/voice/status');
      expect(res.status).toBe(200);
      expect(res.body.offline).toBe(true);
      expect(res.body.externalNetworkRequests).toBe(0);

      const hi = res.body.models.hi;
      expect(hi.locale).toBe('hi-IN');
      expect(hi.asr.modelFamily).toBe('AI4Bharat IndicConformer ASR');
      expect(hi.tts.modelFamily).toBe('AI4Bharat Indic-TTS');
      expect(hi.asr.installed).toBe(true);
      expect(hi.tts.installed).toBe(true);
    });

    it('routes Kannada voice synthesis to AI4Bharat Indic-TTS kn and ASR to IndicConformer kn', async () => {
      const res = await request(app).get('/api/v1/voice/status');
      expect(res.status).toBe(200);

      const kn = res.body.models.kn;
      expect(kn.locale).toBe('kn-IN');
      expect(kn.asr.modelFamily).toBe('AI4Bharat IndicConformer ASR');
      expect(kn.tts.modelFamily).toBe('AI4Bharat Indic-TTS');
      expect(kn.asr.installed).toBe(true);
      expect(kn.tts.installed).toBe(true);
    });
  });

  // 2. Strict Fallback Protection (NO ENGLISH FALLBACK!)
  describe('Strict Fallback Protection (NO English Fallback)', () => {
    it('returns explicit MODEL_UNAVAILABLE error when Kannada TTS model is missing, NEVER English', async () => {
      // Point registry to non-existent temporary directory
      ModelRegistry.setModelsDir('/tmp/empty_models_dir_' + Date.now());

      const res = await request(app)
        .post('/api/v1/voice/tts')
        .send({ language: 'kn', text: 'ನಮಸ್ಕಾರ' });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('MODEL_UNAVAILABLE');
      expect(res.body.message).toContain('Kannada offline voice model is unavailable');
      expect(res.body.language).toBe('kn');
    });

    it('returns explicit MODEL_UNAVAILABLE error when Hindi TTS model is missing, NEVER English', async () => {
      ModelRegistry.setModelsDir('/tmp/empty_models_dir_' + Date.now());

      const res = await request(app)
        .post('/api/v1/voice/tts')
        .send({ language: 'hi', text: 'नमस्ते' });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('MODEL_UNAVAILABLE');
      expect(res.body.message).toContain('Hindi offline voice model is unavailable');
      expect(res.body.language).toBe('hi');
    });

    it('returns explicit MODEL_UNAVAILABLE error when Kannada ASR model is missing', async () => {
      ModelRegistry.setModelsDir('/tmp/empty_models_dir_' + Date.now());

      const res = await request(app)
        .post('/api/v1/voice/asr')
        .send({ language: 'kn', audio: '' });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('MODEL_UNAVAILABLE');
      expect(res.body.message).toContain('Kannada offline voice model is unavailable');
      expect(res.body.language).toBe('kn');
    });

    it('OfflineTtsEngine throws OfflineVoiceModelError directly when model is absent', async () => {
      ModelRegistry.setModelsDir('/tmp/empty_models_dir_' + Date.now());

      await expect(OfflineTtsEngine.synthesize('ನಮಸ್ಕಾರ', 'kn')).rejects.toThrow(
        OfflineVoiceModelError
      );
      await expect(OfflineTtsEngine.synthesize('ನಮಸ್ಕಾರ', 'kn')).rejects.toThrow(
        /Kannada offline voice model is unavailable/
      );
    });

    it('OfflineAsrEngine throws OfflineVoiceModelError directly when model is absent', async () => {
      ModelRegistry.setModelsDir('/tmp/empty_models_dir_' + Date.now());

      await expect(OfflineAsrEngine.transcribe(Buffer.alloc(100), 'hi')).rejects.toThrow(
        OfflineVoiceModelError
      );
      await expect(OfflineAsrEngine.transcribe(Buffer.alloc(100), 'hi')).rejects.toThrow(
        /Hindi offline voice model is unavailable/
      );
    });
  });

  // 3. Lazy Model Loading Verification
  describe('Lazy Model Loading', () => {
    it('does not load models into memory until explicitly requested', () => {
      expect(ModelRegistry.isModelLoaded('tts', 'kn')).toBe(false);
      expect(ModelRegistry.isModelLoaded('asr', 'kn')).toBe(false);

      // Load Kannada TTS
      ModelRegistry.loadTtsModel('kn');
      expect(ModelRegistry.isModelLoaded('tts', 'kn')).toBe(true);
      expect(ModelRegistry.isModelLoaded('asr', 'kn')).toBe(false);

      // Load Kannada ASR
      ModelRegistry.loadAsrModel('kn');
      expect(ModelRegistry.isModelLoaded('asr', 'kn')).toBe(true);
    });

    it('reuses loaded models across successive calls', () => {
      const first = ModelRegistry.loadTtsModel('hi');
      const second = ModelRegistry.loadTtsModel('hi');
      expect(first).toBe(second);
    });
  });

  // 4. Offline Voice Synthesis & WAV Verification
  describe('Offline Voice Synthesis & WAV Generation', () => {
    it('synthesizes authentic WAV audio for Kannada with RIFF header and elderly pacing', async () => {
      const res = await request(app)
        .post('/api/v1/voice/tts')
        .send({
          language: 'kn',
          text: 'ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ.',
          speed: 0.85,
        });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('audio/wav');
      expect(res.header['x-voice-language']).toBe('kn');
      expect(res.header['x-voice-model']).toBe('AI4Bharat Indic-TTS');

      const body = res.body; // Buffer in supertest
      expect(Buffer.isBuffer(body)).toBe(true);
      expect(body.length).toBeGreaterThan(44);
      // Verify RIFF header
      expect(body.toString('ascii', 0, 4)).toBe('RIFF');
      expect(body.toString('ascii', 8, 12)).toBe('WAVE');
      expect(body.toString('ascii', 12, 16)).toBe('fmt ');
    });

    it('synthesizes authentic WAV audio for Hindi with RIFF header', async () => {
      const res = await request(app)
        .post('/api/v1/voice/tts')
        .send({
          language: 'hi',
          text: 'नमस्ते, मैं आपकी सहायता के लिए यहाँ हूँ।',
          speed: 0.85,
        });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('audio/wav');
      expect(res.header['x-voice-language']).toBe('hi');
      expect(res.header['x-voice-model']).toBe('AI4Bharat Indic-TTS');

      const body = res.body;
      expect(body.toString('ascii', 0, 4)).toBe('RIFF');
      expect(body.toString('ascii', 8, 12)).toBe('WAVE');
    });

    it('supports JSON response format with base64 audio payload', async () => {
      const res = await request(app)
        .post('/api/v1/voice/tts')
        .set('Accept', 'application/json')
        .send({
          language: 'kn',
          text: 'ಆಟ ಪ್ರಾರಂಭಿಸಿ',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.language).toBe('kn');
      expect(typeof res.body.audioBase64).toBe('string');
      expect(res.body.audioBase64.length).toBeGreaterThan(100);
    });
  });

  // 5. Offline ASR Transcription Verification
  describe('Offline ASR Transcription', () => {
    it('transcribes Kannada audio input using IndicConformer ASR', async () => {
      // Synthesize audio to test ASR round-trip
      const ttsResult = await OfflineTtsEngine.synthesize('ನಮಸ್ಕಾರ, ನನಗೆ ಸಹಾಯ ಬೇಕು', 'kn');

      const res = await request(app)
        .post('/api/v1/voice/asr')
        .send({
          language: 'kn',
          audio: ttsResult.audioBuffer.toString('base64'),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.language).toBe('kn');
      expect(res.body.modelFamily).toBe('AI4Bharat IndicConformer ASR');
      expect(res.body.confidence).toBeGreaterThanOrEqual(0.85);
      expect(res.body.transcript).toContain('ನಮಸ್ಕಾರ');
    });

    it('transcribes Hindi audio input using IndicConformer ASR', async () => {
      const ttsResult = await OfflineTtsEngine.synthesize('नमस्ते, मुझे सहायता चाहिए', 'hi');

      const res = await request(app)
        .post('/api/v1/voice/asr')
        .send({
          language: 'hi',
          audio: ttsResult.audioBuffer.toString('base64'),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.language).toBe('hi');
      expect(res.body.modelFamily).toBe('AI4Bharat IndicConformer ASR');
      expect(res.body.transcript).toContain('नमस्ते');
    });
  });

  // 6. Voice Test Endpoint Verification (Section 11)
  describe('Official Voice Test Verification (Section 11)', () => {
    it('executes official Hindi test phrase "नमस्ते, मैं आपकी सहायता के लिए यहाँ हूँ।"', async () => {
      const res = await request(app)
        .post('/api/v1/voice/test')
        .send({ language: 'hi' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.language).toBe('hi');
      expect(res.body.phrase).toBe('नमस्ते, मैं आपकी सहायता के लिए यहाँ हूँ।');
      expect(res.body.verified).toBe(true);
      expect(res.body.modelFamily).toBe('AI4Bharat Indic-TTS');
      expect(res.body.audioBase64.length).toBeGreaterThan(100);
    });

    it('executes official Kannada test phrase "ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ."', async () => {
      const res = await request(app)
        .post('/api/v1/voice/test')
        .send({ language: 'kn' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.language).toBe('kn');
      expect(res.body.phrase).toBe('ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ.');
      expect(res.body.verified).toBe(true);
      expect(res.body.modelFamily).toBe('AI4Bharat Indic-TTS');
      expect(res.body.audioBase64.length).toBeGreaterThan(100);
    });
  });
});
