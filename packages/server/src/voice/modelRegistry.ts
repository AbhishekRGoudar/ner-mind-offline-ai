import fs from 'node:fs';
import path from 'node:path';
import { SupportedLanguage, LANGUAGE_CONFIG } from '@ner-mind/core';

export class OfflineVoiceModelError extends Error {
  public code: string;
  public language: string;
  public modelType: 'asr' | 'tts';

  constructor(language: string, modelType: 'asr' | 'tts', customMessage?: string) {
    const langName = language === 'kn' ? 'Kannada' : language === 'hi' ? 'Hindi' : language;
    const msg =
      customMessage ||
      `${langName} offline voice model is unavailable. Please install the ${langName} voice model.`;
    super(msg);
    this.name = 'OfflineVoiceModelError';
    this.code = 'MODEL_UNAVAILABLE';
    this.language = language;
    this.modelType = modelType;
  }
}

export interface ModelDetail {
  installed: boolean;
  loaded: boolean;
  version: string;
  modelFamily: string;
  officialSource: string;
  path: string;
  missingFiles: string[];
}

export interface LanguageVoiceStatus {
  locale: string;
  asr: ModelDetail;
  tts: ModelDetail;
}

function findDefaultModelsDir(): string {
  if (process.env.VOICE_MODELS_DIR) return process.env.VOICE_MODELS_DIR;
  let curr = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(curr, 'models');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return path.resolve(process.cwd(), 'models');
}

export class ModelRegistry {
  private static modelsDir: string = findDefaultModelsDir();

  // Track lazy loaded models in memory
  private static loadedModels: Map<string, any> = new Map();

  public static setModelsDir(dir: string): void {
    this.modelsDir = dir;
    this.loadedModels.clear();
  }

  public static getModelsDir(): string {
    return this.modelsDir;
  }

  /**
   * Evaluates offline model status for all supported languages
   */
  public static getStatus(): Record<SupportedLanguage, LanguageVoiceStatus> {
    const nonEnglishLangs: SupportedLanguage[] = [
      'hi', 'kn', 'as', 'bn', 'mni', 'brx', 'lus', 'kha', 'grt', 'trp', 'ten', 'ao', 'lot'
    ];

    const result: Record<string, LanguageVoiceStatus> = {
      en: {
        locale: 'en-IN',
        asr: {
          installed: true,
          loaded: true,
          version: '1.0.0',
          modelFamily: 'Standard In-Browser / Local ASR',
          officialSource: 'local',
          path: 'builtin',
          missingFiles: [],
        },
        tts: {
          installed: true,
          loaded: true,
          version: '1.0.0',
          modelFamily: 'Standard In-Browser / Local TTS',
          officialSource: 'local',
          path: 'builtin',
          missingFiles: [],
        },
      },
    };

    for (const lang of nonEnglishLangs) {
      result[lang] = {
        locale: LANGUAGE_CONFIG[lang]?.locale || `${lang}-IN`,
        asr: this.checkModel('asr', lang, [
          'model.manifest.json',
          'config.yaml',
          'tokenizer.model',
          'model.nemo',
        ]),
        tts: this.checkModel('tts', lang, [
          'model.manifest.json',
          'config.json',
          'phonemes.json',
          'fastpitch/checkpoint_fastpitch.pth',
          'hifigan/best_model.pth',
        ]),
      };
    }

    return result as Record<SupportedLanguage, LanguageVoiceStatus>;
  }

  /**
   * Lazy load ASR model into memory.
   * Throws explicit OfflineVoiceModelError if model is unavailable.
   * NEVER falls back to English!
   */
  public static loadAsrModel(lang: SupportedLanguage): any {
    if (lang === 'en') {
      return { lang: 'en', type: 'builtin' };
    }

    const key = `asr:${lang}`;
    if (this.loadedModels.has(key)) {
      return this.loadedModels.get(key);
    }

    const status = this.checkModel('asr', lang, [
      'model.manifest.json',
      'config.yaml',
      'tokenizer.model',
      'model.nemo',
    ]);

    if (!status.installed) {
      throw new OfflineVoiceModelError(lang, 'asr');
    }

    // Lazy load the model manifest and config
    const manifestPath = path.join(this.modelsDir, 'asr', lang, 'model.manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const loadedInstance = {
      lang,
      type: 'asr',
      modelFamily: manifest.modelFamily,
      architecture: manifest.architecture,
      sampleRate: manifest.sampleRate || 16000,
      loadedAt: new Date().toISOString(),
    };

    this.loadedModels.set(key, loadedInstance);
    return loadedInstance;
  }

  /**
   * Lazy load TTS model into memory.
   * Throws explicit OfflineVoiceModelError if model is unavailable.
   * NEVER falls back to English!
   */
  public static loadTtsModel(lang: SupportedLanguage): any {
    if (lang === 'en') {
      return { lang: 'en', type: 'builtin' };
    }

    const key = `tts:${lang}`;
    if (this.loadedModels.has(key)) {
      return this.loadedModels.get(key);
    }

    const status = this.checkModel('tts', lang, [
      'model.manifest.json',
      'config.json',
      'phonemes.json',
      'fastpitch/checkpoint_fastpitch.pth',
      'hifigan/best_model.pth',
    ]);

    if (!status.installed) {
      throw new OfflineVoiceModelError(lang, 'tts');
    }

    // Lazy load the model manifest and config
    const manifestPath = path.join(this.modelsDir, 'tts', lang, 'model.manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const configPath = path.join(this.modelsDir, 'tts', lang, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const loadedInstance = {
      lang,
      type: 'tts',
      modelFamily: manifest.modelFamily,
      acousticModel: manifest.acousticModel,
      vocoderModel: manifest.vocoderModel,
      sampleRate: manifest.sampleRate || 22050,
      config,
      loadedAt: new Date().toISOString(),
    };

    this.loadedModels.set(key, loadedInstance);
    return loadedInstance;
  }

  public static isModelLoaded(type: 'asr' | 'tts', lang: SupportedLanguage): boolean {
    return this.loadedModels.has(`${type}:${lang}`);
  }

  private static checkModel(
    type: 'asr' | 'tts',
    lang: SupportedLanguage,
    expectedFiles: string[]
  ): ModelDetail {
    const dir = path.join(this.modelsDir, type, lang);
    const missing: string[] = [];
    const exists = fs.existsSync(dir);

    if (exists) {
      for (const file of expectedFiles) {
        if (!fs.existsSync(path.join(dir, file))) {
          missing.push(file);
        }
      }
    } else {
      missing.push(...expectedFiles);
    }

    const installed = exists && missing.length === 0;
    const config = LANGUAGE_CONFIG[lang];
    const family = type === 'asr' ? config?.asrModelFamily : config?.ttsModelFamily;
    const source = type === 'asr' ? config?.officialAsrSource : config?.officialTtsSource;

    return {
      installed,
      loaded: this.loadedModels.has(`${type}:${lang}`),
      version: '1.0.0',
      modelFamily: family || 'AI4Bharat Indic Model',
      officialSource: source || 'local',
      path: dir,
      missingFiles: missing,
    };
  }
}
