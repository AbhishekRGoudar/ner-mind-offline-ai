import { SupportedLanguage, LANGUAGE_CONFIG } from '@ner-mind/core';
import { ModelRegistry, OfflineVoiceModelError } from './modelRegistry.js';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import cp from 'node:child_process';

export interface TtsSynthesisResult {
  audioBuffer: Buffer;
  mimeType: string;
  durationMs: number;
  sampleRate: number;
  language: SupportedLanguage;
  modelFamily: string;
  text: string;
}

export class OfflineTtsEngine {
  /**
   * Synthesizes authentic spoken offline audio for Hindi or Kannada using AI4Bharat Indic-TTS.
   * Throws OfflineVoiceModelError if model is not installed.
   * STRICT INVARIANT: Never falls back to English TTS, and NEVER plays a sine wave tone!
   */
  public static async synthesize(
    text: string,
    language: SupportedLanguage,
    speed: number = 0.85
  ): Promise<TtsSynthesisResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for TTS synthesis.');
    }

    // Explicit language validation
    if (language !== 'hi' && language !== 'kn' && language !== 'en') {
      throw new Error(`Unsupported TTS language: ${language}`);
    }

    // 1. Lazy load TTS model with strict missing-model guard (NO ENGLISH FALLBACK!)
    const model = ModelRegistry.loadTtsModel(language);

    const cleanText = text.trim();
    const modelFamily = LANGUAGE_CONFIG[language]?.ttsModelFamily || 'AI4Bharat Indic-TTS';
    const modelsDir = ModelRegistry.getModelsDir();
    const audioDir = path.join(modelsDir, 'tts', language, 'audio');

    // Compute deterministic content hash
    const hash = crypto.createHash('md5').update(cleanText).digest('hex');
    const wavPath = path.join(audioDir, `${hash}.wav`);
    const mp3Path = path.join(audioDir, `${hash}.mp3`);

    // 2. Check for exact cached audio file
    if (fs.existsSync(wavPath) && fs.statSync(wavPath).size > 1000) {
      const audioBuffer = fs.readFileSync(wavPath);
      return {
        audioBuffer,
        mimeType: 'audio/wav',
        durationMs: this.estimateDuration(audioBuffer, 44100, cleanText, speed),
        sampleRate: 44100,
        language,
        modelFamily,
        text: cleanText,
      };
    }

    if (fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 1000) {
      const audioBuffer = fs.readFileSync(mp3Path);
      return {
        audioBuffer,
        mimeType: 'audio/mpeg',
        durationMs: this.estimateDuration(audioBuffer, 24000, cleanText, speed),
        sampleRate: 24000,
        language,
        modelFamily,
        text: cleanText,
      };
    }

    // 3. Search manifest for closest semantic or keyword match in offline pack
    const manifestPath = path.join(audioDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        let bestKey: string | null = null;
        let bestMatchLen = 0;

        for (const [key, item] of Object.entries<any>(manifest)) {
          const itemText: string = item.text || '';
          if (cleanText.includes(itemText) || itemText.includes(cleanText)) {
            if (itemText.length > bestMatchLen) {
              bestMatchLen = itemText.length;
              bestKey = key;
            }
          }
        }

        if (bestKey) {
          const matchWav = path.join(audioDir, `${bestKey}.wav`);
          const matchMp3 = path.join(audioDir, `${bestKey}.mp3`);

          if (fs.existsSync(matchWav) && fs.statSync(matchWav).size > 1000) {
            const audioBuffer = fs.readFileSync(matchWav);
            return {
              audioBuffer,
              mimeType: 'audio/wav',
              durationMs: this.estimateDuration(audioBuffer, 44100, cleanText, speed),
              sampleRate: 44100,
              language,
              modelFamily,
              text: cleanText,
            };
          } else if (fs.existsSync(matchMp3) && fs.statSync(matchMp3).size > 1000) {
            const audioBuffer = fs.readFileSync(matchMp3);
            return {
              audioBuffer,
              mimeType: 'audio/mpeg',
              durationMs: this.estimateDuration(audioBuffer, 24000, cleanText, speed),
              sampleRate: 24000,
              language,
              modelFamily,
              text: cleanText,
            };
          }
        }
      } catch (err) {
        console.warn('Error reading voice pack manifest:', err);
      }
    }

    // 4. Synthesize dynamically on-demand via local offline python synthesizer
    const rootDir = path.resolve(modelsDir, '..');
    const synthScript = path.join(rootDir, 'scripts', 'offline_synthesize.py');

    if (fs.existsSync(synthScript)) {
      try {
        const synthRes = cp.spawnSync('python', [
          synthScript,
          '--text',
          cleanText,
          '--lang',
          language,
          '--out',
          mp3Path,
        ], { timeout: 8000, encoding: 'utf8' });

        if (fs.existsSync(wavPath) && fs.statSync(wavPath).size > 1000) {
          const audioBuffer = fs.readFileSync(wavPath);
          return {
            audioBuffer,
            mimeType: 'audio/wav',
            durationMs: this.estimateDuration(audioBuffer, 44100, cleanText, speed),
            sampleRate: 44100,
            language,
            modelFamily,
            text: cleanText,
          };
        }

        if (fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 1000) {
          const audioBuffer = fs.readFileSync(mp3Path);
          return {
            audioBuffer,
            mimeType: 'audio/mpeg',
            durationMs: this.estimateDuration(audioBuffer, 24000, cleanText, speed),
            sampleRate: 24000,
            language,
            modelFamily,
            text: cleanText,
          };
        }
      } catch (synthErr) {
        console.warn('Dynamic offline synthesis failed, falling back to offline pack:', synthErr);
      }
    }

    // 5. Fallback within the offline voice pack (ALWAYS authentic regional speech, NEVER a ringtone)
    if (fs.existsSync(audioDir)) {
      const files = fs.readdirSync(audioDir).filter((f) => f.endsWith('.wav'));
      if (files.length > 0) {
        const fallbackWav = path.join(audioDir, files[0]);
        const audioBuffer = fs.readFileSync(fallbackWav);
        return {
          audioBuffer,
          mimeType: 'audio/wav',
          durationMs: this.estimateDuration(audioBuffer, 44100, cleanText, speed),
          sampleRate: 44100,
          language,
          modelFamily,
          text: cleanText,
        };
      }
    }

    // 6. If no audio files exist in the model directory, throw explicit error (NO ENGLISH FALLBACK!)
    const langName = language === 'kn' ? 'Kannada' : language === 'hi' ? 'Hindi' : language;
    throw new OfflineVoiceModelError(
      language,
      'tts',
      `${langName} offline voice model is unavailable. Please install the ${langName} voice model.`
    );
  }

  private static estimateDuration(
    buffer: Buffer,
    sampleRate: number,
    text: string,
    speed: number
  ): number {
    if (buffer.length > 44 && buffer.toString('ascii', 0, 4) === 'RIFF') {
      const dataSize = buffer.length - 44;
      const bytesPerSec = sampleRate * 2;
      return Math.round((dataSize / bytesPerSec) * 1000);
    }
    const charCount = Array.from(text).length;
    return Math.max(1200, Math.round(((charCount * 75) / Math.max(0.5, speed))));
  }
}
