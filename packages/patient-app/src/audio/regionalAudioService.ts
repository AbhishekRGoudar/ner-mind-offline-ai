import { SpeechService } from './speechService';

export type RegionalLanguage = 'as' | 'bn' | 'mni' | 'kha' | 'brx' | 'hi' | 'en';

export type PromptCue =
  | 'welcome'
  | 'instructions'
  | 'success'
  | 'retry'
  | 'encouragement'
  | 'navigation'
  | 'status';

export interface PromptEntry {
  text: string;
  file?: string;
}

export interface LanguageManifest {
  language: RegionalLanguage;
  name: string;
  prompts: Record<PromptCue, PromptEntry>;
}

// 100% Bundled in-memory language manifests: Zero network requests needed
export const BUNDLED_LANGUAGE_MANIFESTS: Record<RegionalLanguage, LanguageManifest> = {
  en: {
    language: 'en',
    name: 'English',
    prompts: {
      welcome: { text: 'Welcome to NER-Mind. Let us begin today with gentle activities.', file: 'welcome.mp3' },
      instructions: { text: 'Look closely at the screen and tap the correct items.', file: 'instructions.mp3' },
      success: { text: 'Wonderful job! You completed this activity successfully.', file: 'success.mp3' },
      retry: { text: 'Take your time. Let us try once more together.', file: 'retry.mp3' },
      encouragement: { text: 'You are doing very well. Keep going!', file: 'encouragement.mp3' },
      navigation: { text: 'Tap the button to move forward to the next step.', file: 'navigation.mp3' },
      status: { text: 'Offline Mode Active. All your personal data is safely stored on this device.', file: 'status.mp3' },
    },
  },
  as: {
    language: 'as',
    name: 'Assamese (অসমীয়া)',
    prompts: {
      welcome: { text: 'NER-Mind লৈ স্বাগতম। আহক আমি সহজ অনুশীলনেৰে আৰম্ভ কৰোঁ।', file: 'welcome.mp3' },
      instructions: { text: 'স্ক্ৰীণলৈ ভালদৰে চাওক আৰু সঠিক বস্তুটো বাছনি কৰক।', file: 'instructions.mp3' },
      success: { text: 'বৰ ধুনীয়া হৈছে! আপুনি এই কাৰ্য্য সফলতাৰে সমাপ্ত কৰিলে।', file: 'success.mp3' },
      retry: { text: 'ধৈৰ্য্য ধৰক। আহক আমি আৰু এবাৰ চেষ্টা কৰোঁ।', file: 'retry.mp3' },
      encouragement: { text: 'আপুনি বৰ ভাল কৰিছে। আগবাঢ়ি যাওক!', file: 'encouragement.mp3' },
      navigation: { text: 'পৰৱৰ্তী স্তৰলৈ যাবলৈ বুটামটো টিপক।', file: 'navigation.mp3' },
      status: { text: 'ইন্টাৰনেট সংযোগ নাই। সকলো তথ্য এই যন্ত্ৰটোতে সংৰক্ষিত আছে।', file: 'status.mp3' },
    },
  },
  bn: {
    language: 'bn',
    name: 'Bengali (বাংলা)',
    prompts: {
      welcome: { text: 'NER-Mind-এ স্বাগতম। আসুন সহজ অনুশীলনের মাধ্যমে শুরু করি।', file: 'welcome.mp3' },
      instructions: { text: 'পর্দায় মনোযোগ সহকারে দেখুন এবং সঠিক ছবিটি স্পর্শ করুন।', file: 'instructions.mp3' },
      success: { text: 'খুব চমৎকার! আপনি সফলভাবে কাজটি সম্পন্ন করেছেন।', file: 'success.mp3' },
      retry: { text: 'ধৈর্য ধরুন। আসুন আমরা আরেকবার চেষ্টা করি।', file: 'retry.mp3' },
      encouragement: { text: 'আপনি খুব ভালো করছেন। এগিয়ে চলুন!', file: 'encouragement.mp3' },
      navigation: { text: 'পরবর্তী ধাপে যেতে বোতামটি স্পর্শ করুন।', file: 'navigation.mp3' },
      status: { text: 'ইন্টারনেট সংযোগ নেই। সমস্ত তথ্য নিরাপদে ডিভাইসে সংরক্ষিত আছে।', file: 'status.mp3' },
    },
  },
  mni: {
    language: 'mni',
    name: 'Manipuri (Meitei)',
    prompts: {
      welcome: { text: 'NER-Mind da tarananbom oirasanu. Eikhoi chatharasi.', file: 'welcome.mp3' },
      instructions: { text: 'Thabak asibu munna yengbiyu amasung takpiriba adumai toubiyu.', file: 'instructions.mp3' },
      success: { text: 'Yamna fajei! Thabak asi maipakna loire.', file: 'success.mp3' },
      retry: { text: 'Amuk hanna hotnasi. Nungsit tana changsinbiyu.', file: 'retry.mp3' },
      encouragement: { text: 'Nangi thoudang yamna fajana chatli. Fana touri!', file: 'encouragement.mp3' },
      navigation: { text: 'Changsinnaba mathanggi button da nambiyu.', file: 'navigation.mp3' },
      status: { text: 'Internet leidare. Lairik sing khomjillaga pumnamak leijare.', file: 'status.mp3' },
    },
  },
  kha: {
    language: 'kha',
    name: 'Khasi',
    prompts: {
      welcome: { text: 'Khublei bad sngewbha sha NER-Mind. To ngin sdang.', file: 'welcome.mp3' },
      instructions: { text: 'Peit bha ia ka kam bad bud ia ki jingbthah.', file: 'instructions.mp3' },
      success: { text: 'Ka bha shibun! Phi la dep bha ia kane ka kam.', file: 'success.mp3' },
      retry: { text: 'To pyrshang biang. Phin sa lah kham bha.', file: 'retry.mp3' },
      encouragement: { text: 'Phi trei bha shibun. Nang iaid shaphrang!', file: 'encouragement.mp3' },
      navigation: { text: 'Shon ia u button ban iaid sha khmat.', file: 'navigation.mp3' },
      status: { text: 'Ym don internet. Ki jingtip ki sah beit hapoh phone.', file: 'status.mp3' },
    },
  },
  brx: {
    language: 'brx',
    name: 'Bodo',
    prompts: {
      welcome: { text: 'NER-Mind आव बरायबाय। फै जों जागायदिनि।', file: 'welcome.mp3' },
      instructions: { text: 'मावनायखौ मोजाङै नाय आरो बिथोनखौ मानिना चोल।', file: 'instructions.mp3' },
      success: { text: 'जोबोद मोजां जादों! नोंथाङा हासिबबाय।', file: 'success.mp3' },
      retry: { text: 'आर\' खनसे नाजाफিন। नोंथाङा हागोन।', file: 'retry.mp3' },
      encouragement: { text: 'मोजां मावफुंदों। साबसिन बाङाव फै।', file: 'encouragement.mp3' },
      navigation: { text: 'सिगां थांनो बाथोनआव थु।', file: 'navigation.mp3' },
      status: { text: 'इन्तारनेथ गैया। गासै फोरमानखौ साच\'ना दोनदों।', file: 'status.mp3' },
    },
  },
  hi: {
    language: 'hi',
    name: 'Hindi (हिन्दी)',
    prompts: {
      welcome: { text: 'NER-Mind में आपका स्वागत है। आइए आज की गतिविधियाँ शुरू करें।', file: 'welcome.mp3' },
      instructions: { text: 'स्क्रीन पर ध्यान से देखें और सही वस्तु को स्पर्श करें।', file: 'instructions.mp3' },
      success: { text: 'बहुत बढ़िया! आपने यह अभ्यास सफलतापूर्वक पूरा किया।', file: 'success.mp3' },
      retry: { text: 'आराम से करें। आइए एक बार फिर प्रयास करते हैं।', file: 'retry.mp3' },
      encouragement: { text: 'आप बहुत अच्छा कर रहे हैं। आगे बढ़ते रहें!', file: 'encouragement.mp3' },
      navigation: { text: 'अगले चरण पर जाने के लिए बटन दबाएँ।', file: 'navigation.mp3' },
      status: { text: 'ऑफ़लाइन मोड सक्रिय है। आपकी सभी जानकारी इस डिवाइस पर सुरक्षित है।', file: 'status.mp3' },
    },
  },
};

/**
 * Offline Earcon & Melodic Tone Synthesizer
 * Uses standard HTML5 Web Audio API (zero network, works in airplane mode).
 */
export class OfflineAudioSynthesizer {
  private static ctx: AudioContext | null = null;

  public static playCue(cue: PromptCue): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (cue === 'welcome') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (cue === 'success') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.5, now + 0.3); // C6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (cue === 'instructions') {
        osc.frequency.setValueAtTime(659.25, now); // E5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (cue === 'retry') {
        osc.frequency.setValueAtTime(440.0, now); // A4
        osc.frequency.setValueAtTime(392.0, now + 0.15); // G4
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        osc.frequency.setValueAtTime(587.33, now); // D5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // AudioContext unavailable in non-browser environment
    }
  }
}

export class RegionalAudioService {
  private static currentLanguage: RegionalLanguage = 'en';
  private static manifests: Map<RegionalLanguage, LanguageManifest> = new Map(
    Object.entries(BUNDLED_LANGUAGE_MANIFESTS) as [RegionalLanguage, LanguageManifest][]
  );
  private static currentAudio: HTMLAudioElement | null = null;

  // Language mapping for Web Speech synthesis fallback
  private static bcp47Map: Record<RegionalLanguage, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    bn: 'bn-IN',
    as: 'as-IN',
    mni: 'mni-IN',
    kha: 'en-IN',
    brx: 'hi-IN',
  };

  public static setLanguage(lang: RegionalLanguage): void {
    this.currentLanguage = lang;
  }

  public static getLanguage(): RegionalLanguage {
    return this.currentLanguage;
  }

  public static getBcp47Tag(lang?: RegionalLanguage): string {
    return this.bcp47Map[lang || this.currentLanguage] || 'en-IN';
  }

  /**
   * Returns manifest directly from in-memory bundle (Zero network requests).
   */
  public static async loadManifest(lang: RegionalLanguage): Promise<LanguageManifest | null> {
    return this.manifests.get(lang) || BUNDLED_LANGUAGE_MANIFESTS[lang] || null;
  }

  public static registerManifest(manifest: LanguageManifest): void {
    this.manifests.set(manifest.language, manifest);
  }

  /**
   * Plays localized cue 100% offline:
   * 1. Plays local Web Audio API tone chime (airplane mode compatible).
   * 2. Attempts speech synthesis if available locally.
   * 3. Dispatches visual subtitle event for elder accessibility.
   */
  public static async playPrompt(cue: PromptCue): Promise<boolean> {
    this.stop();

    const manifest = this.manifests.get(this.currentLanguage) || BUNDLED_LANGUAGE_MANIFESTS[this.currentLanguage];
    const entry = manifest?.prompts?.[cue];
    if (!entry) {
      console.warn(`[RegionalAudioService] Cue "${cue}" not found for language ${this.currentLanguage}`);
      return false;
    }

    // 1. Play local Web Audio API earcon / melodic chime (Zero network)
    OfflineAudioSynthesizer.playCue(cue);

    // 2. Play local speech synthesis fallback if available
    SpeechService.speak(entry.text, 0.85);

    // 3. Dispatch visual subtitle event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('ner_mind_audio_prompt', {
            detail: { cue, text: entry.text, language: this.currentLanguage },
          })
        );
      } catch {}
    }

    return true;
  }

  /**
   * Return prompt text for visual display / subtitles
   */
  public static getPromptText(cue: PromptCue): string {
    const manifest = this.manifests.get(this.currentLanguage) || BUNDLED_LANGUAGE_MANIFESTS[this.currentLanguage];
    return manifest?.prompts?.[cue]?.text ?? '';
  }

  public static stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
    SpeechService.stop();
  }
}
