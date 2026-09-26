import {
  LocalizationService,
  SupportedAppLanguage,
  SUPPORTED_LANGUAGES_META,
} from '../services/LocalizationService.js';
import { CognitiveDomain, SupportedLanguage } from '@ner-mind/core';
import { VoiceService } from './voiceService.js';
import { LanguagePackManager, VoicePackMetadata } from './languagePackManager.js';

export type { SupportedAppLanguage };
export { SUPPORTED_LANGUAGES_META };

export interface VoiceStatus {
  language: SupportedAppLanguage;
  bcp47: string;
  isNativeVoiceFound: boolean;
  voiceName?: string;
  assistantEnabled: boolean;
  statusMessage: string;
  pack?: VoicePackMetadata;
}

export class SpeechService {
  public static synth: SpeechSynthesis | null =
    typeof window !== 'undefined' ? window.speechSynthesis : null;
  public static recognition: any = null;
  public static currentLang: SupportedAppLanguage = 'en';
  public static isEnabled: boolean = true;
  public static voicesCached: SpeechSynthesisVoice[] = [];
  public static activeAudioElement: HTMLAudioElement | null = null;
  public static lastModelError: string | null = null;
  public static currentSpeechId: number = 0;

  // Hardware microphone monitoring via Web Audio API (100% offline native)
  private static audioContext: AudioContext | null = null;
  private static micStream: MediaStream | null = null;
  private static micAnalyser: AnalyserNode | null = null;
  private static micAnimFrame: number | null = null;

  static {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.cacheVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.cacheVoices();
        };
      }
    }
  }

  private static cacheVoices(): void {
    const s = this.synth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    if (!s) return;
    try {
      this.voicesCached = s.getVoices();
    } catch {}
  }

  public static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    VoiceService.setEnabled(enabled);
    if (!enabled) {
      this.stop();
    }
  }

  public static getEnabled(): boolean {
    return this.isEnabled;
  }

  public static setLanguage(lang: SupportedAppLanguage | string): void {
    this.stop(); // Stop any currently playing speech before switching language
    const validLangs: SupportedLanguage[] = [
      'en', 'hi', 'kn', 'as', 'bn', 'mni', 'brx', 'lus', 'kha', 'grt', 'trp', 'ten', 'ao', 'lot',
    ];
    if (validLangs.includes(lang as SupportedLanguage)) {
      this.currentLang = lang as SupportedAppLanguage;
    } else {
      this.currentLang = 'en';
    }
    VoiceService.setLanguage(this.currentLang as any);
  }

  public static getLanguage(): SupportedAppLanguage {
    return this.currentLang;
  }

  public static getBcp47Tag(lang: SupportedAppLanguage = this.currentLang): string {
    return SUPPORTED_LANGUAGES_META[lang]?.bcp47 || 'en-IN';
  }

  public static getLastError(): string | null {
    return this.lastModelError;
  }

  public static clearLastError(): void {
    this.lastModelError = null;
    VoiceService.clearLastError();
  }

  public static getVoiceStatus(lang: SupportedAppLanguage = this.currentLang): VoiceStatus {
    this.cacheVoices();
    const meta = SUPPORTED_LANGUAGES_META[lang] || SUPPORTED_LANGUAGES_META.en;
    const bcp47 = meta.bcp47;
    const prefix = bcp47.slice(0, 2).toLowerCase();
    const pack = LanguagePackManager.getPack(lang as any);

    const matchedVoice = this.voicesCached.find(
      (v) =>
        v.lang.toLowerCase() === bcp47.toLowerCase() ||
        v.lang.toLowerCase().replace('_', '-') === bcp47.toLowerCase() ||
        v.lang.toLowerCase().startsWith(prefix)
    );

    if (matchedVoice) {
      return {
        language: lang,
        bcp47,
        isNativeVoiceFound: true,
        voiceName: matchedVoice.name,
        assistantEnabled: this.isEnabled,
        statusMessage: `Native ${meta.englishName} voice ready (${matchedVoice.name})`,
        pack,
      };
    }

    if (pack.offlineReady && pack.ttsStatus === 'installed') {
      return {
        language: lang,
        bcp47,
        isNativeVoiceFound: true,
        voiceName: pack.modelFamily,
        assistantEnabled: this.isEnabled,
        statusMessage: `Offline Local Voice Engine Active (${pack.modelFamily})`,
        pack,
      };
    }

    return {
      language: lang,
      bcp47,
      isNativeVoiceFound: false,
      voiceName: pack.modelFamily,
      assistantEnabled: this.isEnabled,
      statusMessage: pack.statusMessage,
      pack,
    };
  }

  public static stop(): void {
    this.currentSpeechId++;
    this.stopMicLevelMonitor();

    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
        this.activeAudioElement.currentTime = 0;
        this.activeAudioElement.src = '';
      } catch {}
      this.activeAudioElement = null;
    }

    const s = this.synth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    if (s) {
      try {
        s.cancel();
      } catch {}
    }

    VoiceService.stop();
  }

  /**
   * Centralized speak method supporting in-browser voices, offline models,
   * and strict invariant protection against silent English fallbacks.
   */
  public static speak(
    text: string,
    rate: number = 0.85,
    langOverride?: SupportedAppLanguage,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): void {
    this.stop(); // Stop prior speech immediately
    const speechId = this.currentSpeechId;

    if (!this.isEnabled) {
      if (onEnd) onEnd();
      return;
    }

    const targetLang = (langOverride || this.currentLang) as SupportedAppLanguage;
    const bcp47 = this.getBcp47Tag(targetLang);
    this.cacheVoices();

    const prefix = bcp47.slice(0, 2).toLowerCase();
    const matchedVoice = this.voicesCached.find(
      (v) =>
        v.lang.toLowerCase() === bcp47.toLowerCase() ||
        v.lang.toLowerCase().replace('_', '-') === bcp47.toLowerCase() ||
        v.lang.toLowerCase().startsWith(prefix)
    );

    const s = this.synth || (typeof window !== 'undefined' ? window.speechSynthesis : null);

    // 1. If voice is matched in browser synthesis (en, or installed device voice for regional)
    if (matchedVoice && s) {
      try {
        if (s.paused && typeof s.resume === 'function') {
          s.resume();
        }
        s.cancel();

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
        utterance.pitch = 1.0;
        utterance.lang = bcp47;
        utterance.voice = matchedVoice;

        if (onStart) {
          utterance.onstart = () => {
            if (this.currentSpeechId === speechId) onStart();
          };
        }
        if (onEnd) {
          utterance.onend = () => {
            if (this.currentSpeechId === speechId) onEnd();
          };
          utterance.onerror = () => {
            if (this.currentSpeechId === speechId) onEnd();
          };
        }

        s.speak(utterance);
        if (s.paused && typeof s.resume === 'function') {
          s.resume();
        }
        return;
      } catch (err: any) {
        console.warn('Synthesis speech error:', err);
        if (onEnd) onEnd();
        return;
      }
    }

    // 2. If targetLang has an offline neural model pack (hi, kn, as, bn)
    if (targetLang === 'hi' || targetLang === 'kn' || targetLang === 'as' || targetLang === 'bn') {
      this.speakOfflineModel(text, targetLang, rate, onStart, onEnd, onError).catch((err) => {
        if (this.currentSpeechId === speechId) {
          if (onError) onError(err);
          else if (onEnd) onEnd();
        }
      });
      return;
    }

    // 3. STRICT INVARIANT: Language has no offline voice pack (e.g. mni, lus, etc.)
    // NEVER silently fall back to English!
    const pack = LanguagePackManager.getPack(targetLang as any);
    const langName = pack.name;
    const errorMsg = `${langName} offline voice model is unavailable. Voice pack unavailable offline for ${langName}. Please install the ${langName} voice model.`;
    this.lastModelError = errorMsg;
    console.warn(`[SpeechService] Refusing silent English fallback for ${targetLang}`);

    if (onError) onError(new Error(errorMsg));
    if (onEnd) onEnd();
  }

  public static async speakOfflineModel(
    text: string,
    language: SupportedAppLanguage,
    rate: number = 0.85,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): Promise<boolean> {
    this.stop();
    const speechId = this.currentSpeechId;
    this.lastModelError = null;

    try {
      let audioBlob: Blob | null = null;

      // 1. Local backend offline endpoint
      try {
        const response = await fetch('/api/v1/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language, text, speed: rate }),
        });
        if (response.ok) {
          audioBlob = await response.blob();
        }
      } catch {}

      if (this.currentSpeechId !== speechId) {
        if (onEnd) onEnd();
        return false;
      }

      // 2. Static pre-rendered voice pack asset
      if (!audioBlob) {
        try {
          const manifestRes = await fetch(`/audio/tts/${language}/manifest.json`);
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
              const staticAudioRes = await fetch(`/audio/tts/${language}/${matchedFile.replace('.mp3', '.wav')}`);
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
        const pack = LanguagePackManager.getPack(language as any);
        const langName = pack.name;
        const errorMsg = `${langName} offline voice model is unavailable. Voice pack unavailable offline for ${langName}. Please install the ${langName} voice model.`;
        const modelError = new Error(errorMsg);
        this.lastModelError = errorMsg;
        if (onError) onError(modelError);
        if (onEnd) onEnd();
        return false;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this.activeAudioElement = audio;

      audio.onplay = () => {
        if (this.currentSpeechId === speechId && onStart) onStart();
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.activeAudioElement === audio) {
          this.activeAudioElement = null;
        }
        if (this.currentSpeechId === speechId && onEnd) onEnd();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.activeAudioElement === audio) {
          this.activeAudioElement = null;
        }
        if (this.currentSpeechId === speechId) {
          const err = new Error('Local audio playback encountered an issue.');
          if (onError) onError(err);
          if (onEnd) onEnd();
        }
      };

      await audio.play();
      return true;
    } catch {
      if (this.currentSpeechId !== speechId) return false;
      const pack = LanguagePackManager.getPack(language as any);
      const langName = pack.name;
      const errorMsg = `${langName} offline voice model is unavailable. Voice pack unavailable offline for ${langName}. Please install the ${langName} voice model.`;
      const err = new Error(errorMsg);
      this.lastModelError = errorMsg;
      if (onError) onError(err);
      if (onEnd) onEnd();
      return false;
    }
  }

  public static testVoice(
    langOverride?: SupportedAppLanguage,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): void {
    const targetLang = langOverride || this.currentLang;
    const phrase =
      targetLang === 'hi'
        ? 'नमस्ते, मैं आपकी सहायता के लिए यहाँ हूँ।'
        : targetLang === 'kn'
        ? 'ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ.'
        : LocalizationService.getTestPhrase(targetLang);

    this.speak(phrase, 0.85, targetLang, onStart, onEnd, onError);
  }

  public static speakHeardConfirmation(
    transcript: string,
    langOverride?: SupportedAppLanguage,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    const targetLang = langOverride || this.currentLang;
    const confirmation = LocalizationService.getHeardConfirmation(transcript, targetLang);
    this.speak(confirmation, 0.85, targetLang, onStart, onEnd);
  }

  public static speakGreeting(
    name: string,
    timeOfDay: string,
    langOverride?: SupportedAppLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const greeting = LocalizationService.getGreeting(name, timeOfDay, targetLang);
    this.speak(greeting, 0.85, targetLang);
  }

  public static speakDomainInstruction(
    domain: CognitiveDomain,
    langOverride?: SupportedAppLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const instruction = LocalizationService.getDomainInstruction(domain, targetLang);
    this.speak(instruction, 0.85, targetLang);
  }

  public static speakMissionInstruction(
    missionName: string,
    langOverride?: SupportedAppLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const instruction = LocalizationService.getMissionInstruction(missionName, targetLang);
    this.speak(instruction, 0.85, targetLang);
  }

  public static speakFeedback(
    type: 'correct' | 'incorrect' | 'summary',
    score: number = 0,
    total: number = 0,
    langOverride?: SupportedAppLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const feedback = LocalizationService.getFeedback(type, score, total, targetLang);
    this.speak(feedback, 0.85, targetLang);
  }

  public static speakReminder(
    time: string,
    title: string,
    langOverride?: SupportedAppLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const reminderText = LocalizationService.getReminderSpeech(time, title, targetLang);
    this.speak(reminderText, 0.85, targetLang);
  }

  public static speakFamilyMember(
    name: string,
    relationship: string,
    story: string,
    langOverride?: SupportedAppLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const familySpeech = LocalizationService.getFamilySpeech(name, relationship, story, targetLang);
    this.speak(familySpeech, 0.85, targetLang);
  }

  public static async startMicLevelMonitor(
    onLevel: (level: number) => void,
    onError?: (err: any) => void
  ): Promise<boolean> {
    try {
      this.stopMicLevelMonitor();

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (onError) onError(new Error('Microphone access is not supported by this browser.'));
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micStream = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        onLevel(50);
        return true;
      }

      const ctx = new AudioCtx();
      this.audioContext = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      this.micAnalyser = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!this.micAnalyser) return;
        this.micAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 80) * 100));
        onLevel(normalized);
        this.micAnimFrame = requestAnimationFrame(updateVolume);
      };

      updateVolume();
      return true;
    } catch (err: any) {
      if (onError) onError(err);
      return false;
    }
  }

  public static stopMicLevelMonitor(): void {
    if (this.micAnimFrame !== null) {
      cancelAnimationFrame(this.micAnimFrame);
      this.micAnimFrame = null;
    }
    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.micStream = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.micAnalyser = null;
  }

  public static startListening(
    onResult: (transcript: string) => void,
    onError?: (err: any) => void,
    langOverride?: SupportedAppLanguage,
    onEnd?: () => void
  ): boolean {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      if (onError) {
        onError(
          new Error(
            'Speech recognition requires cloud speech endpoints or Chrome desktop. Offline voice commands and tap-to-speak chips are active.'
          )
        );
      }
      if (onEnd) onEnd();
      return false;
    }

    try {
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch {}
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.getBcp47Tag(langOverride || this.currentLang);

      this.recognition.onresult = (event: any) => {
        if (event.results && event.results[0]) {
          const transcript = event.results[0][0].transcript;
          onResult(transcript);
        }
      };

      this.recognition.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e);
        if (onError) onError(e);
      };

      this.recognition.onend = () => {
        if (onEnd) onEnd();
      };

      this.recognition.start();
      return true;
    } catch (e) {
      if (onError) onError(e);
      if (onEnd) onEnd();
      return false;
    }
  }
}
