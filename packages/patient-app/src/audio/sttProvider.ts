import { SupportedLanguage } from '@ner-mind/core';
import { SUPPORTED_LANGUAGES_META } from '../services/LocalizationService.js';
import { LanguagePackManager } from './languagePackManager.js';

export interface STTOptions {
  onResult: (transcript: string) => void;
  onError?: (err: Error) => void;
  onEnd?: () => void;
  continuous?: boolean;
}

export interface ISpeechRecognitionProvider {
  startListening(lang: SupportedLanguage, options: STTOptions): boolean;
  stopListening(): void;
  isListening(): boolean;
  startMicLevelMonitor(onLevel: (level: number) => void, onError?: (err: Error) => void): Promise<boolean>;
  stopMicLevelMonitor(): void;
  isSupported(lang: SupportedLanguage): boolean;
}

export class OfflineSpeechRecognitionProvider implements ISpeechRecognitionProvider {
  private recognition: any = null;
  private listening: boolean = false;

  // Web Audio API hardware microphone volume monitor (100% offline native)
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micAnimFrame: number | null = null;

  public isListening(): boolean {
    return this.listening;
  }

  public isSupported(lang: SupportedLanguage): boolean {
    const pack = LanguagePackManager.getPack(lang);
    return pack.sttStatus === 'installed';
  }

  public startListening(lang: SupportedLanguage, options: STTOptions): boolean {
    const { onResult, onError, onEnd, continuous = false } = options;

    if (!this.isSupported(lang)) {
      const pack = LanguagePackManager.getPack(lang);
      const msg = `Speech recognition is unavailable offline for ${pack.name}. Please use on-screen touch response.`;
      if (onError) onError(new Error(msg));
      if (onEnd) onEnd();
      return false;
    }

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      if (onError) {
        onError(
          new Error('Microphone speech recognition engine is unavailable in this environment. On-screen controls active.')
        );
      }
      if (onEnd) onEnd();
      return false;
    }

    try {
      this.stopListening();

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = continuous;
      this.recognition.interimResults = false;
      this.recognition.lang = SUPPORTED_LANGUAGES_META[lang]?.bcp47 || 'en-IN';

      this.recognition.onstart = () => {
        this.listening = true;
      };

      this.recognition.onresult = (event: any) => {
        if (event.results && event.results[0]) {
          const transcript = event.results[0][0].transcript;
          onResult(transcript);
        }
      };

      this.recognition.onerror = (e: any) => {
        this.listening = false;
        if (onError) onError(new Error(e.error || 'Speech recognition error'));
      };

      this.recognition.onend = () => {
        this.listening = false;
        if (onEnd) onEnd();
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      this.listening = false;
      if (onError) onError(err);
      if (onEnd) onEnd();
      return false;
    }
  }

  public stopListening(): void {
    this.listening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
  }

  /**
   * Real-time microphone audio volume detector using Web Audio API
   * 100% offline-native, verifies physical mic hardware without network.
   */
  public async startMicLevelMonitor(
    onLevel: (level: number) => void,
    onError?: (err: Error) => void
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

  public stopMicLevelMonitor(): void {
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
}
