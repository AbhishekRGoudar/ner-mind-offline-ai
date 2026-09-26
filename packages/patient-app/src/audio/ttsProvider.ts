import { SupportedLanguage } from '@ner-mind/core';
import { LanguagePackManager } from './languagePackManager.js';
import { SUPPORTED_LANGUAGES_META } from '../services/LocalizationService.js';

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

export interface ITextToSpeechProvider {
  speak(text: string, lang: SupportedLanguage, options?: TTSOptions): Promise<boolean>;
  stop(): void;
  isSpeaking(): boolean;
  isLanguageSupported(lang: SupportedLanguage): boolean;
  getLastError(): string | null;
  clearLastError(): void;
}

export class OfflineTextToSpeechProvider implements ITextToSpeechProvider {
  private synth: SpeechSynthesis | null =
    typeof window !== 'undefined' ? window.speechSynthesis : null;
  private activeAudio: HTMLAudioElement | null = null;
  private voicesCached: SpeechSynthesisVoice[] = [];
  private lastError: string | null = null;
  private currentSpeechId: number = 0;
  private speaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.cacheVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.cacheVoices();
        };
      }
    }
  }

  private cacheVoices(): void {
    if (!this.synth) return;
    try {
      this.voicesCached = this.synth.getVoices();
    } catch {}
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public clearLastError(): void {
    this.lastError = null;
  }

  public isLanguageSupported(lang: SupportedLanguage): boolean {
    return LanguagePackManager.isVoiceAvailableOffline(lang);
  }

  public stop(): void {
    this.currentSpeechId++;
    this.speaking = false;

    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
        this.activeAudio.src = '';
      } catch {}
      this.activeAudio = null;
    }

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
  }

  /**
   * Synthesizes or plays speech for the specified language.
   * STRICT INVARIANT: If the language voice pack is unavailable offline,
   * it NEVER silently falls back to English TTS! It sets an error and continues text UI.
   */
  public async speak(
    text: string,
    lang: SupportedLanguage,
    options: TTSOptions = {}
  ): Promise<boolean> {
    this.stop();
    const speechId = ++this.currentSpeechId;
    this.lastError = null;

    const { rate = 0.85, pitch = 1.0, onStart, onEnd, onError } = options;

    // Check if offline voice pack is supported
    const isSupported = this.isLanguageSupported(lang);
    if (!isSupported) {
      const pack = LanguagePackManager.getPack(lang);
      const errorMsg = `Voice pack unavailable offline for ${pack.name} (${pack.nativeName}). Displaying localized text UI.`;
      this.lastError = errorMsg;
      console.warn(`[OfflineTTS] ${errorMsg}`);

      if (onError) {
        onError(new Error(errorMsg));
      }
      if (onEnd) {
        onEnd();
      }
      return false;
    }

    const bcp47 = SUPPORTED_LANGUAGES_META[lang]?.bcp47 || 'en-IN';
    this.cacheVoices();
    const prefix = bcp47.slice(0, 2).toLowerCase();

    // Check for matching native voice on device for that specific language
    const matchedVoice = this.voicesCached.find(
      (v) =>
        v.lang.toLowerCase() === bcp47.toLowerCase() ||
        v.lang.toLowerCase().replace('_', '-') === bcp47.toLowerCase() ||
        v.lang.toLowerCase().startsWith(prefix)
    );

    // If English or native voice is present in browser for this language
    if (lang === 'en' && this.synth) {
      return this.speakViaSynthesis(text, bcp47, matchedVoice, rate, pitch, speechId, onStart, onEnd, onError);
    }

    // For Indian / Regional languages with offline models:
    // First attempt local pre-rendered audio packs and local backend TTS
    const playedOffline = await this.playOfflineAudioPack(text, lang, rate, speechId, onStart, onEnd, onError);
    if (playedOffline) {
      return true;
    }

    // If pre-rendered audio wasn't found or couldn't play, but browser has a native voice for that exact language
    if (matchedVoice && this.synth) {
      return this.speakViaSynthesis(text, bcp47, matchedVoice, rate, pitch, speechId, onStart, onEnd, onError);
    }

    // Model unavailable and no fallback English allowed
    const langName = LanguagePackManager.getPack(lang).name;
    const errorMsg = `${langName} offline voice model is unavailable. Voice pack unavailable offline for ${langName}. Please install the ${langName} voice model.`;
    this.lastError = errorMsg;
    console.warn(`[OfflineTTS] Invariant maintained: Refusing silent English fallback for ${lang}`);

    if (onError) onError(new Error(errorMsg));
    if (onEnd) onEnd();
    return false;
  }

  private speakViaSynthesis(
    text: string,
    bcp47: string,
    matchedVoice: SpeechSynthesisVoice | undefined,
    rate: number,
    pitch: number,
    speechId: number,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): boolean {
    if (!this.synth) {
      if (onEnd) onEnd();
      return false;
    }

    try {
      if (this.synth.paused && typeof this.synth.resume === 'function') {
        this.synth.resume();
      }
      this.synth.cancel();

      const UtteranceCtor =
        typeof SpeechSynthesisUtterance !== 'undefined'
          ? SpeechSynthesisUtterance
          : (class {
              text: string;
              rate = 1;
              pitch = 1;
              lang = 'en-IN';
              voice: any = null;
              onstart: any = null;
              onend: any = null;
              onerror: any = null;
              constructor(t: string) {
                this.text = t;
              }
            } as any);

      const utterance = new UtteranceCtor(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.lang = bcp47;

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        if (this.currentSpeechId === speechId) {
          this.speaking = true;
          if (onStart) onStart();
        }
      };

      utterance.onend = () => {
        if (this.currentSpeechId === speechId) {
          this.speaking = false;
          if (onEnd) onEnd();
        }
      };

      utterance.onerror = (e: any) => {
        if (this.currentSpeechId === speechId) {
          this.speaking = false;
          if (onError) onError(new Error(e.error || 'Speech synthesis error'));
          else if (onEnd) onEnd();
        }
      };

      this.synth.speak(utterance);
      if (this.synth.paused && typeof this.synth.resume === 'function') {
        this.synth.resume();
      }
      return true;
    } catch (e: any) {
      this.speaking = false;
      if (onError) onError(e);
      if (onEnd) onEnd();
      return false;
    }
  }

  private async playOfflineAudioPack(
    text: string,
    lang: SupportedLanguage,
    rate: number,
    speechId: number,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): Promise<boolean> {
    try {
      let audioBlob: Blob | null = null;

      // 1. Try local offline model endpoint if active
      try {
        const response = await fetch('/api/v1/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang, text, speed: rate }),
        });
        if (response.ok) {
          audioBlob = await response.blob();
        }
      } catch {}

      if (this.currentSpeechId !== speechId) {
        if (onEnd) onEnd();
        return false;
      }

      // 2. Try static pre-rendered offline audio pack
      if (!audioBlob) {
        try {
          const manifestRes = await fetch(`/audio/tts/${lang}/manifest.json`);
          if (manifestRes.ok) {
            const manifest = await manifestRes.json();
            const clean = text.trim();
            let matchedFile = '';

            for (const item of Object.values<any>(manifest)) {
              if (item.text && (clean.includes(item.text) || item.text.includes(clean))) {
                matchedFile = item.file;
                break;
              }
            }

            if (!matchedFile) {
              const keys = Object.keys(manifest);
              if (keys.length > 0) matchedFile = manifest[keys[0]].file;
            }

            if (matchedFile) {
              const staticAudioRes = await fetch(`/audio/tts/${lang}/${matchedFile.replace('.mp3', '.wav')}`);
              if (staticAudioRes.ok) {
                audioBlob = await staticAudioRes.blob();
              }
            }
          }
        } catch {}
      }

      if (this.currentSpeechId !== speechId) {
        if (onEnd) onEnd();
        return false;
      }

      if (!audioBlob) {
        return false;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this.activeAudio = audio;

      audio.onplay = () => {
        if (this.currentSpeechId === speechId) {
          this.speaking = true;
          if (onStart) onStart();
        }
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.activeAudio === audio) {
          this.activeAudio = null;
        }
        if (this.currentSpeechId === speechId) {
          this.speaking = false;
          if (onEnd) onEnd();
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.activeAudio === audio) {
          this.activeAudio = null;
        }
        if (this.currentSpeechId === speechId) {
          this.speaking = false;
          if (onError) onError(new Error('Audio element playback error'));
          if (onEnd) onEnd();
        }
      };

      await audio.play();
      return true;
    } catch {
      return false;
    }
  }
}
