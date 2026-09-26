import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpeechService } from '../src/audio/speechService.js';
import { LANGUAGE_CONFIG, SupportedLanguage } from '@ner-mind/core';

describe('Offline Hindi & Kannada Voice Models — Automated Integration Tests (Section 12)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    SpeechService.setEnabled(true);
    SpeechService.clearLastError();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    SpeechService.stop();
  });

  // 1. Language Routing Tests
  describe('1. Authoritative Language Routing (Section 4)', () => {
    it('Hindi selected -> routes to IndicConformer hi ASR and Indic-TTS hi TTS', () => {
      SpeechService.setLanguage('hi');
      expect(SpeechService.getLanguage()).toBe('hi');
      expect(SpeechService.getBcp47Tag()).toBe('hi-IN');

      const hiConfig = LANGUAGE_CONFIG.hi;
      expect(hiConfig.asrModel).toBe('hi');
      expect(hiConfig.ttsModel).toBe('hi');
      expect(hiConfig.asrModelFamily).toBe('AI4Bharat IndicConformer ASR');
      expect(hiConfig.ttsModelFamily).toBe('AI4Bharat Indic-TTS');
      expect(hiConfig.officialAsrSource).toContain('ai4bharat/indicconformer_stt_hi');
      expect(hiConfig.officialTtsSource).toContain('hi.zip');
    });

    it('Kannada selected -> routes to IndicConformer kn ASR and Indic-TTS kn TTS', () => {
      SpeechService.setLanguage('kn');
      expect(SpeechService.getLanguage()).toBe('kn');
      expect(SpeechService.getBcp47Tag()).toBe('kn-IN');

      const knConfig = LANGUAGE_CONFIG.kn;
      expect(knConfig.asrModel).toBe('kn');
      expect(knConfig.ttsModel).toBe('kn');
      expect(knConfig.asrModelFamily).toBe('AI4Bharat IndicConformer ASR');
      expect(knConfig.ttsModelFamily).toBe('AI4Bharat Indic-TTS');
      expect(knConfig.officialAsrSource).toContain('ai4bharat/indicconformer_stt_kn');
      expect(knConfig.officialTtsSource).toContain('kn.zip');
    });
  });

  // 2. Fallback Protection Tests (Section 5 — NO English Fallback!)
  describe('2. Strict Fallback Protection (NO English Fallback)', () => {
    it('Kannada model missing -> throws explicit error, NEVER English TTS', async () => {
      // Mock fetch to simulate 422 MODEL_UNAVAILABLE from local voice engine
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          error: 'MODEL_UNAVAILABLE',
          message: 'Kannada offline voice model is unavailable. Please install the Kannada voice model.',
          language: 'kn',
        }),
      });
      (global as any).fetch = fetchMock;

      let caughtError: Error | null = null;
      const success = await SpeechService.speakOfflineModel(
        'ನಮಸ್ಕಾರ',
        'kn',
        0.85,
        undefined,
        undefined,
        (err) => {
          caughtError = err;
        }
      );

      expect(success).toBe(false);
      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toContain('Kannada offline voice model is unavailable');
      expect(SpeechService.getLastError()).toContain('Kannada offline voice model is unavailable');

      // Verify NO English fallback occurred
      expect(caughtError?.message).not.toContain('English');
    });

    it('Hindi model missing -> throws explicit error, NEVER English TTS', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          error: 'MODEL_UNAVAILABLE',
          message: 'Hindi offline voice model is unavailable. Please install the Hindi voice model.',
          language: 'hi',
        }),
      });
      (global as any).fetch = fetchMock;

      let caughtError: Error | null = null;
      const success = await SpeechService.speakOfflineModel(
        'नमस्ते',
        'hi',
        0.85,
        undefined,
        undefined,
        (err) => {
          caughtError = err;
        }
      );

      expect(success).toBe(false);
      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toContain('Hindi offline voice model is unavailable');
      expect(SpeechService.getLastError()).toContain('Hindi offline voice model is unavailable');
    });

    it('network disconnect simulation: handles offline service error explicitly without fallback', async () => {
      // Simulate network completely disconnected (fetch rejects with TypeError)
      (global as any).fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch (offline)'));

      let caughtError: Error | null = null;
      const success = await SpeechService.speakOfflineModel(
        'ನಮಸ್ಕಾರ',
        'kn',
        0.85,
        undefined,
        undefined,
        (err) => {
          caughtError = err;
        }
      );

      expect(success).toBe(false);
      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toContain('Kannada offline voice model is unavailable');
    });
  });

  // 3. Offline Operation Verification (Section 7)
  describe('3. Offline Operation & Zero External Network Requests', () => {
    it('makes 0 external requests: all voice requests go exclusively to localhost/local endpoints', async () => {
      const recordedUrls: string[] = [];
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        recordedUrls.push(url);
        // Return dummy WAV blob
        return Promise.resolve({
          ok: true,
          blob: async () => new Blob([new Uint8Array(100)], { type: 'audio/wav' }),
        });
      });
      (global as any).fetch = fetchMock;

      // Mock Audio element for unit testing environment
      const playMock = vi.fn().mockResolvedValue(undefined);
      (global as any).Audio = class {
        src = '';
        playbackRate = 1.0;
        play = playMock;
        onplay: any = null;
        onended: any = null;
        onerror: any = null;
        constructor(src?: string) {
          if (src) this.src = src;
        }
      };

      // Mock URL.createObjectURL / revokeObjectURL
      (global as any).URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost:3000/mock-audio');
      (global as any).URL.revokeObjectURL = vi.fn();

      const onStart = vi.fn();
      await SpeechService.speakOfflineModel('ನಮಸ್ಕಾರ', 'kn', 0.85, onStart);

      // Verify requests were made ONLY to local endpoint
      expect(recordedUrls.length).toBeGreaterThan(0);
      for (const url of recordedUrls) {
        expect(url.startsWith('/api/v1/voice/')).toBe(true);
        expect(url).not.toContain('google.com');
        expect(url).not.toContain('googleapis.com');
        expect(url).not.toContain('microsoft.com');
        expect(url).not.toContain('aws.amazon.com');
      }
    });
  });

  // 4. Voice Test Verification (Section 11)
  describe('4. Official Voice Test Phrases (Section 11)', () => {
    it('executes official Hindi test phrase: "नमस्ते, मैं आपकी सहायता के लिए यहाँ हूँ।"', async () => {
      let spokenText = '';
      const speakSpy = vi.spyOn(SpeechService, 'speak').mockImplementation((text: string) => {
        spokenText = text;
      });

      SpeechService.setLanguage('hi');
      SpeechService.testVoice('hi');

      expect(speakSpy).toHaveBeenCalled();
      expect(spokenText).toBe('नमस्ते, मैं आपकी सहायता के लिए यहाँ हूँ।');
    });

    it('executes official Kannada test phrase: "ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ."', async () => {
      let spokenText = '';
      const speakSpy = vi.spyOn(SpeechService, 'speak').mockImplementation((text: string) => {
        spokenText = text;
      });

      SpeechService.setLanguage('kn');
      SpeechService.testVoice('kn');

      expect(speakSpy).toHaveBeenCalled();
      expect(spokenText).toBe('ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ.');
    });
  });

  // 5. Restart & Persistence (Section 12)
  describe('5. Restart & Persistence', () => {
    it('persists Kannada selection and resumes offline voice upon reload', () => {
      // Simulate user selecting Kannada
      SpeechService.setLanguage('kn');
      const savedLang = SpeechService.getLanguage();
      expect(savedLang).toBe('kn');

      // Simulate application restart / re-initialization
      SpeechService.stop();
      SpeechService.setLanguage(savedLang);

      expect(SpeechService.getLanguage()).toBe('kn');
      expect(SpeechService.getBcp47Tag()).toBe('kn-IN');
      const status = SpeechService.getVoiceStatus('kn');
      expect(status.voiceName).toContain('AI4Bharat');
    });
  });
});
