import { CognitiveDomain, SupportedLanguage } from '@ner-mind/core';
import { LanguagePackManager, VoicePackMetadata } from './languagePackManager.js';
import { OfflineTextToSpeechProvider, ITextToSpeechProvider } from './ttsProvider.js';
import { OfflineSpeechRecognitionProvider, ISpeechRecognitionProvider } from './sttProvider.js';
import { LocalizationService, SUPPORTED_LANGUAGES_META } from '../services/LocalizationService.js';

export interface VoiceStatus {
  language: SupportedLanguage;
  bcp47: string;
  isNativeVoiceFound: boolean;
  voiceName?: string;
  assistantEnabled: boolean;
  statusMessage: string;
  pack: VoicePackMetadata;
}

export class VoiceService {
  private static ttsProvider: ITextToSpeechProvider = new OfflineTextToSpeechProvider();
  private static sttProvider: ISpeechRecognitionProvider = new OfflineSpeechRecognitionProvider();
  private static currentLang: SupportedLanguage = 'en';
  private static isEnabled: boolean = true;

  public static initialize(): void {
    LanguagePackManager.initialize();
  }

  public static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public static getEnabled(): boolean {
    return this.isEnabled;
  }

  public static setLanguage(lang: SupportedLanguage | string): void {
    this.stop();
    const validLangs: SupportedLanguage[] = [
      'en', 'hi', 'kn', 'as', 'bn', 'mni', 'brx', 'lus', 'kha', 'grt', 'trp', 'ten', 'ao', 'lot',
    ];
    if (validLangs.includes(lang as SupportedLanguage)) {
      this.currentLang = lang as SupportedLanguage;
    } else {
      this.currentLang = 'en';
    }
  }

  public static getLanguage(): SupportedLanguage {
    return this.currentLang;
  }

  public static getBcp47Tag(lang: SupportedLanguage = this.currentLang): string {
    return SUPPORTED_LANGUAGES_META[lang]?.bcp47 || 'en-IN';
  }

  public static getLastError(): string | null {
    return this.ttsProvider.getLastError();
  }

  public static clearLastError(): void {
    this.ttsProvider.clearLastError();
  }

  public static getVoiceStatus(lang: SupportedLanguage = this.currentLang): VoiceStatus {
    const pack = LanguagePackManager.getPack(lang);
    const meta = SUPPORTED_LANGUAGES_META[lang];

    return {
      language: lang,
      bcp47: meta.bcp47,
      isNativeVoiceFound: pack.offlineReady && pack.ttsStatus === 'installed',
      voiceName: pack.modelFamily,
      assistantEnabled: this.isEnabled,
      statusMessage: pack.statusMessage,
      pack,
    };
  }

  public static stop(): void {
    this.ttsProvider.stop();
    this.sttProvider.stopListening();
    this.sttProvider.stopMicLevelMonitor();
  }

  public static async speak(
    text: string,
    rate: number = 0.85,
    langOverride?: SupportedLanguage,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): Promise<boolean> {
    if (!this.isEnabled) {
      if (onEnd) onEnd();
      return false;
    }

    const targetLang = langOverride || this.currentLang;
    return this.ttsProvider.speak(text, targetLang, {
      rate,
      onStart,
      onEnd,
      onError,
    });
  }

  public static testVoice(
    langOverride?: SupportedLanguage,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): void {
    const targetLang = langOverride || this.currentLang;
    const phrase = LocalizationService.getTestPhrase(targetLang);
    this.speak(phrase, 0.85, targetLang, onStart, onEnd, onError);
  }

  public static speakGreeting(
    name: string,
    timeOfDay: string,
    langOverride?: SupportedLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const greeting = LocalizationService.getGreeting(name, timeOfDay, targetLang);
    this.speak(greeting, 0.85, targetLang);
  }

  public static speakDomainInstruction(
    domain: CognitiveDomain,
    langOverride?: SupportedLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const instruction = LocalizationService.getDomainInstruction(domain, targetLang);
    this.speak(instruction, 0.85, targetLang);
  }

  public static speakMissionInstruction(
    missionName: string,
    langOverride?: SupportedLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const instruction = LocalizationService.getMissionInstruction(missionName, targetLang);
    this.speak(instruction, 0.85, targetLang);
  }

  public static speakFeedback(
    type: 'correct' | 'incorrect' | 'summary',
    score: number = 0,
    total: number = 0,
    langOverride?: SupportedLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const feedback = LocalizationService.getFeedback(type, score, total, targetLang);
    this.speak(feedback, 0.85, targetLang);
  }

  public static speakReminder(
    time: string,
    title: string,
    langOverride?: SupportedLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const reminderText = LocalizationService.getReminderSpeech(time, title, targetLang);
    this.speak(reminderText, 0.85, targetLang);
  }

  public static speakFamilyMember(
    name: string,
    relationship: string,
    story: string,
    langOverride?: SupportedLanguage
  ): void {
    const targetLang = langOverride || this.currentLang;
    const familySpeech = LocalizationService.getFamilySpeech(name, relationship, story, targetLang);
    this.speak(familySpeech, 0.85, targetLang);
  }

  public static speakHeardConfirmation(
    transcript: string,
    langOverride?: SupportedLanguage,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    const targetLang = langOverride || this.currentLang;
    const confirmation = LocalizationService.getHeardConfirmation(transcript, targetLang);
    this.speak(confirmation, 0.85, targetLang, onStart, onEnd);
  }

  public static startListening(
    onResult: (transcript: string) => void,
    onError?: (err: Error) => void,
    langOverride?: SupportedLanguage,
    onEnd?: () => void
  ): boolean {
    const targetLang = langOverride || this.currentLang;
    return this.sttProvider.startListening(targetLang, {
      onResult,
      onError,
      onEnd,
    });
  }

  public static stopListening(): void {
    this.sttProvider.stopListening();
  }

  public static startMicLevelMonitor(
    onLevel: (level: number) => void,
    onError?: (err: Error) => void
  ): Promise<boolean> {
    return this.sttProvider.startMicLevelMonitor(onLevel, onError);
  }

  public static stopMicLevelMonitor(): void {
    this.sttProvider.stopMicLevelMonitor();
  }
}
