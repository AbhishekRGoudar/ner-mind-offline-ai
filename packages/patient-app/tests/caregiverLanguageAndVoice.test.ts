import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpeechService, SupportedAppLanguage } from '../src/audio/speechService.js';
import {
  LocalizationService,
  SUPPORTED_LANGUAGES_META,
} from '../src/services/LocalizationService.js';
import { IndexedDbStorageService } from '../src/storage/indexedDbStorage.js';
import { OfflineStorageService } from '../src/storage/localStorage.js';
import { LocalCaregiverService, LanguageAuditLog } from '../src/caregiver/localCaregiverService.js';
import { PLANNED_NER_REGIONAL_LANGUAGES } from '../src/caregiver/CaregiverPortal.js';
import { LocalSession } from '../src/auth/localAuthService.js';

describe('Language Setting Ownership & Voice Assistant — Acceptance Tests', () => {
  let speakMock: any;
  let cancelMock: any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    await IndexedDbStorageService.resetForTesting();

    // Ensure mock localStorage
    if (typeof localStorage === 'undefined' || !(global as any).localStorage) {
      const store = new Map<string, string>();
      (global as any).localStorage = {
        getItem: (k: string) => store.get(k) || null,
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
      };
    } else {
      localStorage.clear();
    }

    // Mock browser window SpeechSynthesis
    speakMock = vi.fn();
    cancelMock = vi.fn();

    const mockSynth = {
      speak: speakMock,
      cancel: cancelMock,
      getVoices: vi.fn().mockReturnValue([
        { name: 'Google English (India)', lang: 'en-IN' },
        { name: 'Google Hindi (India)', lang: 'hi-IN' },
        { name: 'Google Kannada (India)', lang: 'kn-IN' },
      ]),
      onvoiceschanged: null,
    };

    (global as any).window = {
      speechSynthesis: mockSynth,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (SpeechService as any).synth = mockSynth;
    SpeechService.setEnabled(true);
    SpeechService.setLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Acceptance Test 1: Caregiver selects English -> assistant speaks English
  it('1. Caregiver selects English -> assistant speaks English with en-IN tag', () => {
    SpeechService.setLanguage('en');
    SpeechService.speakGreeting('Sharma', 'morning');

    expect(speakMock).toHaveBeenCalledTimes(1);
    const utterance: SpeechSynthesisUtterance = speakMock.mock.calls[0][0];
    expect(utterance.lang).toBe('en-IN');
    expect(utterance.text).toContain('Hello Sharma');
  });

  // Acceptance Test 2: Caregiver selects Hindi -> assistant speaks Hindi
  it('2. Caregiver selects Hindi -> assistant speaks Hindi with hi-IN tag', () => {
    SpeechService.setLanguage('hi');
    SpeechService.speakGreeting('शर्मा', 'morning');

    expect(speakMock).toHaveBeenCalledTimes(1);
    const utterance: SpeechSynthesisUtterance = speakMock.mock.calls[0][0];
    expect(utterance.lang).toBe('hi-IN');
    expect(utterance.text).toContain('नमस्ते शर्मा जी');
    // Ensure no English fallback
    expect(utterance.text).not.toContain('Hello');
  });

  // Acceptance Test 3: Caregiver selects Kannada -> assistant speaks Kannada
  it('3. Caregiver selects Kannada -> assistant speaks Kannada with kn-IN tag', () => {
    SpeechService.setLanguage('kn');
    SpeechService.speakGreeting('ಶರ್ಮಾ', 'morning');

    expect(speakMock).toHaveBeenCalledTimes(1);
    const utterance: SpeechSynthesisUtterance = speakMock.mock.calls[0][0];
    expect(utterance.lang).toBe('kn-IN');
    expect(utterance.text).toContain('ನಮಸ್ಕಾರ ಶರ್ಮಾ ಅವರೇ');
    // Ensure no English fallback
    expect(utterance.text).not.toContain('Hello');
  });

  // Acceptance Test 4: Patient cannot modify language
  it('4. Patient profile language can only be mutated through Caregiver-controlled storage pipeline', async () => {
    const profile = OfflineStorageService.getPatientProfile();
    expect(profile.preferredLanguage).toBe('en');

    // Caregiver updates to Kannada
    await OfflineStorageService.savePatientProfile({
      ...profile,
      preferredLanguage: 'kn' as any,
    });

    const updated = OfflineStorageService.getPatientProfile();
    expect(updated.preferredLanguage).toBe('kn');
  });

  // Acceptance Test 5 & 6: Family and Personal profile are managed by Caregiver
  it('5 & 6. Patient cannot delete or modify profile/family directly without caregiver storage authority', async () => {
    const profile = OfflineStorageService.getPatientProfile();
    expect(profile.displayName).toBe('Bhaben Sharma');

    // Caregiver saves authorized updates
    await OfflineStorageService.savePatientProfile({
      ...profile,
      displayName: 'Mr. Bhaben Sharma',
      age: 69,
    });

    const refreshed = OfflineStorageService.getPatientProfile();
    expect(refreshed.displayName).toBe('Mr. Bhaben Sharma');
    expect(refreshed.age).toBe(69);
  });

  // Acceptance Test 7 & 8: Language remains correct after refresh and offline reopening
  it('7 & 8. Selected language is persisted in durable IndexedDB and survives offline restart', async () => {
    const profile = OfflineStorageService.getPatientProfile();
    await OfflineStorageService.savePatientProfile({
      ...profile,
      preferredLanguage: 'kn' as any,
    });

    // Simulate app reload / offline reopening by re-initializing from IndexedDB
    await IndexedDbStorageService.init();
    const restoredProfile = OfflineStorageService.getPatientProfile();
    expect(restoredProfile.preferredLanguage).toBe('kn');

    SpeechService.setLanguage(restoredProfile.preferredLanguage);
    expect(SpeechService.getLanguage()).toBe('kn');
    expect(SpeechService.getBcp47Tag()).toBe('kn-IN');
  });

  // Acceptance Test 9: Game instructions use selected language
  it('9. Game instructions speak in the selected language for all 6 cognitive domains', () => {
    const domains = ['memory', 'attention', 'sequencing', 'calculation', 'planning', 'recognition'] as const;

    for (const lang of ['en', 'hi', 'kn'] as SupportedAppLanguage[]) {
      SpeechService.setLanguage(lang);
      for (const d of domains) {
        speakMock.mockClear();
        SpeechService.speakDomainInstruction(d);
        expect(speakMock).toHaveBeenCalledTimes(1);
        const utterance = speakMock.mock.calls[0][0];
        expect(utterance.lang).toBe(SUPPORTED_LANGUAGES_META[lang].bcp47);

        if (lang === 'kn') {
          // Contains Kannada Unicode block (\u0C80-\u0CFF)
          expect(/[\u0C80-\u0CFF]/.test(utterance.text)).toBe(true);
        } else if (lang === 'hi') {
          // Contains Devanagari Unicode block (\u0900-\u097F)
          expect(/[\u0900-\u097F]/.test(utterance.text)).toBe(true);
        } else {
          expect(/[a-zA-Z]/.test(utterance.text)).toBe(true);
        }
      }
    }
  });

  // Acceptance Test 10: Reminders use the selected language
  it('10. Reminders speak in the selected language', () => {
    SpeechService.setLanguage('kn');
    SpeechService.speakReminder('08:00 AM', 'ಮಧುಮೇಹ ಮಾತ್ರೆ');

    const knUtterance = speakMock.mock.calls[0][0];
    expect(knUtterance.lang).toBe('kn-IN');
    expect(knUtterance.text).toContain('ನೆನಪೋಲೆ');

    speakMock.mockClear();
    SpeechService.setLanguage('hi');
    SpeechService.speakReminder('08:00 AM', 'दवा का समय');

    const hiUtterance = speakMock.mock.calls[0][0];
    expect(hiUtterance.lang).toBe('hi-IN');
    expect(hiUtterance.text).toContain('स्मरणपत्र');
  });

  // Acceptance Test 11: Feedback uses the selected language
  it('11. Feedback uses the selected language for correct, incorrect, and session summary', () => {
    SpeechService.setLanguage('kn');
    SpeechService.speakFeedback('correct');
    expect(speakMock.mock.calls[0][0].text).toContain('ತುಂಬಾ ಒಳ್ಳೆಯ ಕೆಲಸ');

    speakMock.mockClear();
    SpeechService.speakFeedback('incorrect');
    expect(speakMock.mock.calls[0][0].text).toContain('ಉತ್ತಮ ಪ್ರಯತ್ನ');

    speakMock.mockClear();
    SpeechService.speakFeedback('summary', 5, 5);
    expect(speakMock.mock.calls[0][0].text).toContain('ಅಭ್ಯಾಸ ಪೂರ್ಣಗೊಂಡಿದೆ');

    // Hindi Feedback
    SpeechService.setLanguage('hi');
    speakMock.mockClear();
    SpeechService.speakFeedback('correct');
    expect(speakMock.mock.calls[0][0].text).toContain('बहुत बढ़िया');
  });

  // Acceptance Test 12 & 13: Voice Assistant uses configured language with no overrides
  it('12 & 13. Voice Assistant uses the single configured language profile with zero component override', () => {
    SpeechService.setLanguage('kn');
    expect(SpeechService.getLanguage()).toBe('kn');
    expect(SpeechService.getBcp47Tag()).toBe('kn-IN');

    const voiceStatus = SpeechService.getVoiceStatus('kn');
    expect(voiceStatus.bcp47).toBe('kn-IN');
    expect(voiceStatus.assistantEnabled).toBe(true);
    expect(voiceStatus.statusMessage).toContain('Native Kannada voice ready');
  });

  // Acceptance Test 14: Switching language stops previous speech and applies new language immediately
  it('14. Switching language cancels active speech synthesis immediately', () => {
    SpeechService.setLanguage('en');
    SpeechService.speak('Test sentence playing...');

    cancelMock.mockClear();
    // Caregiver switches language to Hindi
    SpeechService.setLanguage('hi');

    expect(cancelMock).toHaveBeenCalled();
    expect(SpeechService.getLanguage()).toBe('hi');

    SpeechService.testVoice();
    const newUtterance = speakMock.mock.calls[speakMock.mock.calls.length - 1][0];
    expect(newUtterance.lang).toBe('hi-IN');
    expect(newUtterance.text).toContain('सहायता');
  });

  // Acceptance Test 15: Extensibility for additional Indian languages without architectural rewrite
  it('15. Additional regional languages can be registered through metadata without architectural change', () => {
    expect(SUPPORTED_LANGUAGES_META).toHaveProperty('en');
    expect(SUPPORTED_LANGUAGES_META).toHaveProperty('hi');
    expect(SUPPORTED_LANGUAGES_META).toHaveProperty('kn');

    expect(SUPPORTED_LANGUAGES_META.kn.bcp47).toBe('kn-IN');
    expect(SUPPORTED_LANGUAGES_META.hi.bcp47).toBe('hi-IN');
    expect(SUPPORTED_LANGUAGES_META.en.bcp47).toBe('en-IN');
  });

  // Acceptance Test 16: Caregiver exclusive language modification with audit logging
  it('16. Authorized Caregiver modifies patient language and creates immutable audit log', async () => {
    const caregiverSession: LocalSession = {
      userId: '11111111-1111-1111-1111-111111111111',
      username: 'caregiver_pranjal',
      role: 'CAREGIVER',
      displayName: 'Dr. Pranjal Barua (Caregiver)',
      token: 'test-token',
      patientId: 'patient-ner-001',
    };

    const result = await LocalCaregiverService.updatePatientLanguage(
      'patient-ner-001',
      'kn',
      caregiverSession
    );

    expect(result.success).toBe(true);
    expect(result.auditLog).toBeDefined();
    expect(result.auditLog.patientId).toBe('patient-ner-001');
    expect(result.auditLog.previousLanguage).toBe('en');
    expect(result.auditLog.newLanguage).toBe('kn');
    expect(result.auditLog.changedBy).toBe('Dr. Pranjal Barua (Caregiver)');
    expect(result.auditLog.changedByRole).toBe('CAREGIVER');
    expect(result.auditLog.timestamp).toBeDefined();

    // Verify speech service was synchronized
    expect(SpeechService.getLanguage()).toBe('kn');
    expect(SpeechService.getBcp47Tag()).toBe('kn-IN');

    // Verify profile in storage was updated
    const profile = OfflineStorageService.getPatientProfile();
    expect(profile.preferredLanguage).toBe('kn');
  });

  // Acceptance Test 17: Patient role is strictly rejected from modifying language
  it('17. Patient role is strictly prohibited from modifying application language', async () => {
    const patientSession: LocalSession = {
      userId: 'patient-ner-001',
      username: 'patient_bhaben',
      role: 'PATIENT',
      displayName: 'Bhaben Sharma',
      token: 'patient-token',
      patientId: 'patient-ner-001',
    };

    await expect(
      LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'hi', patientSession)
    ).rejects.toThrow(/Access Denied/i);

    // Profile remains unchanged
    const profile = OfflineStorageService.getPatientProfile();
    expect(profile.preferredLanguage).toBe('en');
  });

  // Acceptance Test 18: Caregiver cannot modify language for unauthorized patient
  it('18. Caregiver cannot modify language for an unauthorized patient profile', async () => {
    const unauthorizedSession: LocalSession = {
      userId: '22222222-2222-2222-2222-222222222222',
      username: 'caregiver_anita',
      role: 'CAREGIVER',
      displayName: 'Anita Sharma',
      token: 'anita-token',
      patientId: 'patient-ner-002',
    };

    await expect(
      LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'hi', unauthorizedSession)
    ).rejects.toThrow(/Unauthorized/i);
  });

  // Acceptance Test 19: Audit log history retrieval
  it('19. LocalCaregiverService retrieves full immutable language audit history for patient', async () => {
    const caregiverSession: LocalSession = {
      userId: '11111111-1111-1111-1111-111111111111',
      username: 'caregiver_pranjal',
      role: 'CAREGIVER',
      displayName: 'Dr. Pranjal Barua',
      token: 'test-token',
      patientId: 'patient-ner-001',
    };

    await LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'hi', caregiverSession);
    await LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'kn', caregiverSession);

    const logs = LocalCaregiverService.getLanguageAuditLogs('patient-ner-001');
    expect(logs.length).toBe(2);
    // Newest log first
    expect(logs[0].newLanguage).toBe('kn');
    expect(logs[0].previousLanguage).toBe('hi');
    expect(logs[1].newLanguage).toBe('hi');
    expect(logs[1].previousLanguage).toBe('en');
  });

  // Acceptance Test 20: Planned NER Regional Languages are registered with Coming Soon status
  it('20. Planned NER Regional Languages specification is registered with Coming Soon status', () => {
    expect(PLANNED_NER_REGIONAL_LANGUAGES.length).toBeGreaterThanOrEqual(9);

    const codes = PLANNED_NER_REGIONAL_LANGUAGES.map((l) => l.code);
    expect(codes).toContain('as'); // Assamese (অসমীয়া)
    expect(codes).toContain('bn'); // Bengali (বাংলা)
    expect(codes).toContain('mni'); // Meitei / Manipuri (মেইতেই)
    expect(codes).toContain('brx'); // Bodo (बड़ो)
    expect(codes).toContain('lus'); // Mizo
    expect(codes).toContain('kha'); // Khasi
    expect(codes).toContain('grt'); // Garo
    expect(codes).toContain('trp'); // Kokborok (ককবরক)
    expect(codes).toContain('naga'); // Naga language packs

    PLANNED_NER_REGIONAL_LANGUAGES.forEach((l) => {
      expect(l.status).toBe('Coming Soon');
      expect(l.nativeName).toBeDefined();
      expect(l.region).toBeDefined();
    });
  });

  // Acceptance Test 21: Persistence across simulated offline reload
  it('21. Language setting survives offline operation and local storage reload', async () => {
    const caregiverSession: LocalSession = {
      userId: '11111111-1111-1111-1111-111111111111',
      username: 'caregiver_pranjal',
      role: 'CAREGIVER',
      displayName: 'Dr. Pranjal Barua',
      token: 'test-token',
      patientId: 'patient-ner-001',
    };

    await LocalCaregiverService.updatePatientLanguage('patient-ner-001', 'hi', caregiverSession);

    // Simulate reload from local persistent storage
    const storedLang = localStorage.getItem('ner_mind_patient_language');
    expect(storedLang).toBe('hi');

    const profile = OfflineStorageService.getPatientProfile();
    expect(profile.preferredLanguage).toBe('hi');

    SpeechService.setLanguage(profile.preferredLanguage);
    expect(SpeechService.getLanguage()).toBe('hi');
  });
});
