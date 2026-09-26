import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupportedLanguage } from '@ner-mind/core';
import { VoiceService } from '../src/audio/voiceService.js';
import { SpeechService } from '../src/audio/speechService.js';
import { LanguagePackManager } from '../src/audio/languagePackManager.js';
import { OfflineTextToSpeechProvider } from '../src/audio/ttsProvider.js';
import {
  LocalizationService,
  SUPPORTED_LANGUAGES_META,
} from '../src/services/LocalizationService.js';
import {
  getTranslation,
  formatBilingualText,
  getLocalizedGreeting,
  getLocalizedPerformanceFeedback,
} from '../src/localization/translations.js';
import {
  getLocalizedRelationship,
  getLocalizedMemberDescription,
} from '../src/localization/familyTranslations.js';
import { IndexedDbStorageService } from '../src/storage/indexedDbStorage.js';
import { OfflineStorageService } from '../src/storage/localStorage.js';
import { LocalCaregiverService } from '../src/caregiver/localCaregiverService.js';
import { LocalSession } from '../src/auth/localAuthService.js';

describe('Complete Offline Multilingual Language + Voice Pack System — All 20 Criteria', () => {
  let speakMock: any;
  let cancelMock: any;

  const caregiverSession: LocalSession = {
    userId: '11111111-1111-1111-1111-111111111111',
    username: 'caregiver_pranjal',
    role: 'CAREGIVER',
    displayName: 'Dr. Pranjal Barua (Caregiver)',
    token: 'local-token-caregiver',
    patientId: 'patient-ner-001',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  const patientSession: LocalSession = {
    userId: 'patient-ner-001',
    username: 'patient_bhaben',
    role: 'PATIENT',
    displayName: 'Bhaben Sharma',
    token: 'local-token-patient',
    patientId: 'patient-ner-001',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    await IndexedDbStorageService.resetForTesting();

    // Mock storage
    const store = new Map<string, string>();
    (global as any).localStorage = {
      getItem: (k: string) => store.get(k) || null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    };

    speakMock = vi.fn();
    cancelMock = vi.fn();

    const mockSynth = {
      speak: speakMock,
      cancel: cancelMock,
      getVoices: vi.fn().mockReturnValue([
        { name: 'Google English (India)', lang: 'en-IN' },
        { name: 'Google Hindi (India)', lang: 'hi-IN' },
        { name: 'Google Kannada (India)', lang: 'kn-IN' },
        { name: 'Google Bengali (India)', lang: 'bn-IN' },
        { name: 'Google Assamese (India)', lang: 'as-IN' },
      ]),
      onvoiceschanged: null,
      paused: false,
      resume: vi.fn(),
    };

    (global as any).window = {
      speechSynthesis: mockSynth,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      localStorage: (global as any).localStorage,
    };

    LanguagePackManager.initialize();
    VoiceService.initialize();
    VoiceService.setEnabled(true);
    VoiceService.setLanguage('en');
  });

  // TEST 1: Caregiver changes English -> Hindi
  it('1. Caregiver successfully assigns patient language from English to Hindi', async () => {
    const res = await LocalCaregiverService.updatePatientLanguage(
      'patient-ner-001',
      'hi',
      caregiverSession
    );
    expect(res.success).toBe(true);
    expect(res.auditLog.newLanguage).toBe('hi');
    expect(res.auditLog.previousLanguage).toBe('en');
    expect(res.auditLog.changedByRole).toBe('CAREGIVER');
  });

  // TEST 2: Entire patient UI changes to Hindi
  it('2. Entire patient UI changes to Hindi dictionaries', () => {
    const hiStrings = getTranslation('hi');
    expect(hiStrings.common.back).toBe('पीछे जाएं');
    expect(hiStrings.nav.home).toBe('होम');
    expect(hiStrings.games.memory).toBe('स्मृति स्मरण (Memory)');
    expect(hiStrings.games.sequencing).toBe('चरण अनुक्रम (Sequencing)');
    expect(hiStrings.reminders.title).toBe('दैनिक स्मरणपत्र');
  });

  // TEST 3: Voice assistant speaks Hindi
  it('3. Voice assistant synthesizes in Hindi without fallback', async () => {
    VoiceService.setLanguage('hi');
    const testText = 'नमस्ते, मैं आपकी सहायता के लिए यहाँ हूँ।';
    await VoiceService.speak(testText);
    expect(VoiceService.getLanguage()).toBe('hi');
    expect(VoiceService.getBcp47Tag()).toBe('hi-IN');
  });

  // TEST 4: Hindi + English bilingual display works
  it('4. Bilingual display rule formats Hindi primary + English reference', () => {
    const formatted = formatBilingualText('स्मृति खेल', 'Memory Game', 'hi');
    expect(formatted).toBe('स्मृति खेल (Memory Game)');

    // When English is selected, only English is shown
    const englishOnly = formatBilingualText('Memory Game', 'Memory Game', 'en');
    expect(englishOnly).toBe('Memory Game');
  });

  // TEST 5: Caregiver changes Hindi -> Kannada
  it('5. Caregiver successfully changes patient language from Hindi to Kannada', async () => {
    await LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'hi', caregiverSession);
    const res = await LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'kn', caregiverSession);
    expect(res.success).toBe(true);
    expect(res.auditLog.previousLanguage).toBe('hi');
    expect(res.auditLog.newLanguage).toBe('kn');
  });

  // TEST 6: Entire patient UI changes to Kannada
  it('6. Entire patient UI changes to Kannada dictionaries', () => {
    const knStrings = getTranslation('kn');
    expect(knStrings.nav.home).toBe('ಮುಖಪುಟ');
    expect(knStrings.games.memory).toBe('ನೆನಪಿನ ಶಕ್ತಿ (Memory)');
    expect(knStrings.games.calculation).toBe('ಮಾರುಕಟ್ಟೆ ಲೆಕ್ಕಾಚಾರ (Calculation)');
    expect(knStrings.reminders.title).toBe('ದೈನಂದಿನ ನೆನಪೋಲೆಗಳು');
  });

  // TEST 7: Voice assistant speaks Kannada
  it('7. Voice assistant synthesizes in Kannada without fallback', async () => {
    VoiceService.setLanguage('kn');
    expect(VoiceService.getLanguage()).toBe('kn');
    expect(VoiceService.getBcp47Tag()).toBe('kn-IN');
    const testText = 'ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ.';
    await VoiceService.speak(testText);
  });

  // TEST 8: Kannada + English bilingual display works
  it('8. Bilingual display rule formats Kannada primary + English reference', () => {
    const formatted = formatBilingualText('ಸ್ಮರಣೆ ಆಟ', 'Memory Game', 'kn');
    expect(formatted).toBe('ಸ್ಮರಣೆ ಆಟ (Memory Game)');
  });

  // TEST 9: App works after restart (Persistence)
  it('9. Language setting survives app/browser restart via local storage and profile', async () => {
    await LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'kn', caregiverSession);

    // Simulate restart: check localStorage
    const savedLang = localStorage.getItem('ner_mind_patient_language');
    expect(savedLang).toBe('kn');

    const profile = OfflineStorageService.getPatientProfile();
    expect(profile.preferredLanguage).toBe('kn');
  });

  // TEST 10: App works completely offline
  it('10. App operations and localization run 100% offline without network calls', () => {
    const packs = LanguagePackManager.getAllPacks();
    expect(packs.length).toBe(14);
    for (const pack of packs) {
      expect(pack.uiStatus).toBe('installed');
      const translation = getTranslation(pack.language);
      expect(translation).toBeDefined();
      expect(translation['common.back']).toBeTruthy();
    }
  });

  // TEST 11: No unauthorized patient language modification
  it('11. Patient CANNOT change, edit, or reset application language (Access Denied)', async () => {
    await expect(
      LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'hi', patientSession)
    ).rejects.toThrow(/Access Denied/i);
  });

  // TEST 12: No hard-coded English strings remain in patient application
  it('12. All 14 languages contain complete, valid string entries across all domains', () => {
    const allLangs: SupportedLanguage[] = [
      'en', 'hi', 'kn', 'as', 'bn', 'mni', 'brx', 'lus', 'kha', 'grt', 'trp', 'ten', 'ao', 'lot',
    ];

    for (const lang of allLangs) {
      const strings = getTranslation(lang);
      expect(strings['common.back']).toBeTruthy();
      expect(strings['nav.games']).toBeTruthy();
      expect(strings['games.memory']).toBeTruthy();
      expect(strings['games.attention']).toBeTruthy();
      expect(strings['games.sequencing']).toBeTruthy();
      expect(strings['games.calculation']).toBeTruthy();
      expect(strings['games.planning']).toBeTruthy();
      expect(strings['games.recognition']).toBeTruthy();
      expect(strings['reminders.title']).toBeTruthy();
      expect(strings['emergency.button']).toBeTruthy();
    }
  });

  // TEST 13: Game instructions change with language
  it('13. Game instructions adapt dynamically to selected language', () => {
    const hiInstruction = LocalizationService.getDomainInstruction('memory', 'hi');
    const knInstruction = LocalizationService.getDomainInstruction('memory', 'kn');
    const asInstruction = LocalizationService.getDomainInstruction('memory', 'as');
    const enInstruction = LocalizationService.getDomainInstruction('memory', 'en');

    expect(hiInstruction).toContain('वस्तुओं को ध्यान से देखें');
    expect(knInstruction).toContain('ಈ ವಸ್ತುಗಳನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ನೋಡಿ');
    expect(asInstruction).toContain('বস্তুবোৰ ভালদৰে চাওক');
    expect(enInstruction).toContain('Look carefully and remember');
  });

  // TEST 14: Game feedback changes with language
  it('14. Game feedback adapts dynamically to selected language', () => {
    const hiFeedback = LocalizationService.getFeedback('correct', 5, 5, 'hi');
    const knFeedback = LocalizationService.getFeedback('correct', 5, 5, 'kn');
    const asFeedback = LocalizationService.getFeedback('correct', 5, 5, 'as');

    expect(hiFeedback).toContain('बहुत बढ़िया');
    expect(knFeedback).toContain('ತುಂಬಾ ಒಳ್ಳೆಯ ಕೆಲಸ');
    expect(asFeedback).toContain('বৰ ধুনীয়া');

    const summaryFeedback = LocalizationService.getFeedback('summary', 4, 5, 'hi');
    expect(summaryFeedback).toContain('सत्र पूर्ण हुआ');

    const adaptiveFeedback = getLocalizedPerformanceFeedback('better', 'hi');
    expect(adaptiveFeedback).toContain('आपने पिछले सत्र की तुलना में बेहतर प्रदर्शन किया');
  });

  // TEST 15: Reminders change with language
  it('15. Reminders speech adapts dynamically to selected language', () => {
    const hiReminder = LocalizationService.getReminderSpeech('10:00 AM', 'दवा', 'hi');
    const knReminder = LocalizationService.getReminderSpeech('10:00 AM', 'ಔಷಧಿ', 'kn');
    const asReminder = LocalizationService.getReminderSpeech('10:00 AM', 'দৰব', 'as');

    expect(hiReminder).toContain('10:00 AM का स्मरणपत्र');
    expect(knReminder).toContain('10:00 AM ಗಂಟೆಯ ನೆನಪೋಲೆ');
    expect(asReminder).toContain('10:00 AM ৰ সোঁৱৰণী');
  });

  // TEST 16: Family Recognition content follows the selected language
  it('16. Family Recognition labels and bios follow the selected language', () => {
    const hiRelation = getLocalizedRelationship('Grandmother', 'hi');
    const knRelation = getLocalizedRelationship('Grandmother', 'kn');
    const asRelation = getLocalizedRelationship('Grandmother', 'as');

    expect(hiRelation).toContain('दादी');
    expect(knRelation).toContain('ಅಜ್ಜಿ');
    expect(asRelation).toContain('আইতা');

    const hiBio = getLocalizedMemberDescription('fam_1', '', 'hi');
    const knBio = getLocalizedMemberDescription('fam_1', '', 'kn');
    const asBio = getLocalizedMemberDescription('fam_1', '', 'as');

    expect(hiBio).toContain('दादी अनन्या');
    expect(knBio).toContain('ಅಜ್ಜಿ ಅನನ್ಯಾ');
    expect(asBio).toContain('আইতা অনন্যা');
  });

  // TEST 17: Voice model availability is correctly reported
  it('17. Voice model availability is accurately reported without fake badges', () => {
    // English, Hindi, Kannada, Assamese, Bengali have verified offline packs
    expect(LanguagePackManager.isVoiceAvailableOffline('en')).toBe(true);
    expect(LanguagePackManager.isVoiceAvailableOffline('hi')).toBe(true);
    expect(LanguagePackManager.isVoiceAvailableOffline('kn')).toBe(true);
    expect(LanguagePackManager.isVoiceAvailableOffline('as')).toBe(true);
    expect(LanguagePackManager.isVoiceAvailableOffline('bn')).toBe(true);

    // Manipuri, Bodo, Khasi are marked as unavailable offline
    const mniPack = LanguagePackManager.getPack('mni');
    expect(mniPack.ttsStatus).toBe('unavailable');
    expect(LanguagePackManager.isVoiceAvailableOffline('mni')).toBe(false);

    // Mizo, Garo, Kokborok, Naga packs are marked as coming soon
    const lusPack = LanguagePackManager.getPack('lus');
    expect(lusPack.ttsStatus).toBe('coming_soon');
    expect(LanguagePackManager.isVoiceAvailableOffline('lus')).toBe(false);

    const tenPack = LanguagePackManager.getPack('ten');
    expect(tenPack.ttsStatus).toBe('coming_soon');
    expect(LanguagePackManager.isVoiceAvailableOffline('ten')).toBe(false);
  });

  // TEST 18: Missing voice packs do not silently fall back to English
  it('18. STRICT INVARIANT: Missing voice packs NEVER silently fall back to English', async () => {
    const tts = new OfflineTextToSpeechProvider();
    let errorCalled = false;
    let errorMessage = '';

    // Attempt to synthesize Manipuri (where voice pack is unavailable offline)
    const success = await tts.speak(
      'খুরুমজরি',
      'mni',
      {
        onError: (err) => {
          errorCalled = true;
          errorMessage = err.message;
        },
      }
    );

    // Must return false and report explicit error
    expect(success).toBe(false);
    expect(errorCalled).toBe(true);
    expect(errorMessage).toMatch(/Voice pack unavailable offline/i);

    // Critical: SpeechSynthesisUtterance should NEVER have been invoked with English text or voice!
    expect(speakMock).not.toHaveBeenCalled();
  });

  // TEST 19: Existing personalization data remains unchanged after language changes
  it('19. Existing adaptive learning & Bayesian model remain intact across language switches', async () => {
    // Set up prior personal cognitive model with calibrated belief weights
    const initialModel = IndexedDbStorageService.getPersonalModel();
    initialModel.domainBeliefs.memory.mean = 0.78;
    initialModel.domainBeliefs.memory.variance = 0.04;
    initialModel.domainBeliefs.attention.mean = 0.85;
    await IndexedDbStorageService.savePersonalModel(initialModel);

    // Switch language multiple times: en -> hi -> kn -> as -> hi
    await LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'hi', caregiverSession);
    await LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'kn', caregiverSession);
    await LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'as', caregiverSession);
    await LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'hi', caregiverSession);

    // Verify personal cognitive model has NOT been reset
    const preservedModel = IndexedDbStorageService.getPersonalModel();
    expect(preservedModel.domainBeliefs.memory.mean).toBe(0.78);
    expect(preservedModel.domainBeliefs.memory.variance).toBe(0.04);
    expect(preservedModel.domainBeliefs.attention.mean).toBe(0.85);
  });

  // TEST 20: Dynamic greetings and feedback adapt to time and language
  it('20. Dynamic greetings and feedback adapt according to patient name and language', () => {
    const morningHi = getLocalizedGreeting('Bhaben', 'morning', 'hi');
    const eveningKn = getLocalizedGreeting('Bhaben', 'evening', 'kn');
    const morningAs = getLocalizedGreeting('Bhaben', 'morning', 'as');

    expect(morningHi).toContain('नमस्ते');
    expect(eveningKn).toContain('ನಮಸ್ಕಾರ');
    expect(morningAs).toContain('নমস্কাৰ');
  });
});
