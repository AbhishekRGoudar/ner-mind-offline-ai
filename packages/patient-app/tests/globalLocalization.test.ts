import { describe, it, expect, beforeEach } from 'vitest';
import {
  TaskGenerator,
  CognitiveDomain,
  SupportedLanguage,
} from '@ner-mind/core';
import {
  TRANSLATIONS,
  getTranslation,
  formatBilingualText,
  formatMemberBio,
  getFamilyRelationshipLabel,
  getFamilyMemberTransliteration,
  STORAGE_KEY_PATIENT_LANGUAGE,
} from '../src/localization/index.js';
import { SpeechService } from '../src/audio/speechService.js';
import { OfflineStorageService } from '../src/storage/localStorage.js';

// Regex ranges for script verification
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const KANNADA_REGEX = /[\u0C80-\u0CFF]/;
const BENGALI_ASSAMESE_REGEX = /[\u0980-\u09FF]/;

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] || null,
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = createLocalStorageMock();
}

describe('Global Language Display & Localization Fix', () => {
  beforeEach(async () => {
    localStorage.clear();
    await OfflineStorageService.init();
  });

  describe('1. Global Language State & Offline Resources', () => {
    it('bundles all required translations locally for en, hi, and kn', () => {
      expect(TRANSLATIONS.en).toBeDefined();
      expect(TRANSLATIONS.hi).toBeDefined();
      expect(TRANSLATIONS.kn).toBeDefined();

      // Check key sections exist
      expect(TRANSLATIONS.en['family.grandmother']).toBe('Grandmother');
      expect(TRANSLATIONS.hi['family.grandmother']).toBe('दादी');
      expect(TRANSLATIONS.kn['family.grandmother']).toBe('ಅಜ್ಜಿ');

      expect(TRANSLATIONS.en['nav.home']).toBe('Home');
      expect(TRANSLATIONS.hi['nav.home']).toBe('होम');
      expect(TRANSLATIONS.kn['nav.home']).toBe('ಮುಖಪುಟ');
    });

    it('persists selected language in localStorage and OfflineStorageService', () => {
      localStorage.setItem(STORAGE_KEY_PATIENT_LANGUAGE, 'hi');
      expect(localStorage.getItem(STORAGE_KEY_PATIENT_LANGUAGE)).toBe('hi');

      const profile = OfflineStorageService.getPatientProfile();
      OfflineStorageService.savePatientProfile({
        ...profile,
        preferredLanguage: 'kn',
      });

      const updated = OfflineStorageService.getPatientProfile();
      expect(updated.preferredLanguage).toBe('kn');
    });
  });

  describe('2. Negative Script Constraints (No script crossover)', () => {
    it('Hindi mode displays Hindi + English, with STRICTLY NO Kannada or Assamese script', () => {
      const grandmotherHi = formatBilingualText(getTranslation('hi', 'family.grandmother'), 'Grandmother', 'hi');
      expect(grandmotherHi).toBe('दादी (Grandmother)');
      expect(DEVANAGARI_REGEX.test(grandmotherHi)).toBe(true);
      expect(KANNADA_REGEX.test(grandmotherHi)).toBe(false);
      expect(BENGALI_ASSAMESE_REGEX.test(grandmotherHi)).toBe(false);

      const navGamesHi = getTranslation('hi', 'nav.games');
      expect(DEVANAGARI_REGEX.test(navGamesHi)).toBe(true);
      expect(KANNADA_REGEX.test(navGamesHi)).toBe(false);

      const emergencyHi = getTranslation('hi', 'emergency.title');
      expect(DEVANAGARI_REGEX.test(emergencyHi)).toBe(true);
      expect(KANNADA_REGEX.test(emergencyHi)).toBe(false);
    });

    it('Kannada mode displays Kannada + English, with STRICTLY NO Devanagari or Assamese script', () => {
      const grandmotherKn = formatBilingualText(getTranslation('kn', 'family.grandmother'), 'Grandmother', 'kn');
      expect(grandmotherKn).toBe('ಅಜ್ಜಿ (Grandmother)');
      expect(KANNADA_REGEX.test(grandmotherKn)).toBe(true);
      expect(DEVANAGARI_REGEX.test(grandmotherKn)).toBe(false);
      expect(BENGALI_ASSAMESE_REGEX.test(grandmotherKn)).toBe(false);

      const navGamesKn = getTranslation('kn', 'nav.games');
      expect(KANNADA_REGEX.test(navGamesKn)).toBe(true);
      expect(DEVANAGARI_REGEX.test(navGamesKn)).toBe(false);

      const emergencyKn = getTranslation('kn', 'emergency.title');
      expect(KANNADA_REGEX.test(emergencyKn)).toBe(true);
      expect(DEVANAGARI_REGEX.test(emergencyKn)).toBe(false);
    });

    it('English mode displays English text without foreign scripts', () => {
      const grandmotherEn = formatBilingualText(getTranslation('en', 'family.grandmother'), 'Grandmother', 'en');
      expect(grandmotherEn).toBe('Grandmother');
      expect(DEVANAGARI_REGEX.test(grandmotherEn)).toBe(false);
      expect(KANNADA_REGEX.test(grandmotherEn)).toBe(false);
      expect(BENGALI_ASSAMESE_REGEX.test(grandmotherEn)).toBe(false);
    });
  });

  describe('3. Family Recognition & Relationships', () => {
    it('properly maps family relationship labels in Hindi and Kannada', () => {
      // Grandmother
      expect(getFamilyRelationshipLabel('Grandmother', 'hi')).toBe('दादी (Grandmother)');
      expect(getFamilyRelationshipLabel('Grandmother', 'kn')).toBe('ಅಜ್ಜಿ (Grandmother)');
      expect(getFamilyRelationshipLabel('Grandmother', 'en')).toBe('Grandmother');

      // Cousin
      expect(getFamilyRelationshipLabel('Cousin', 'hi')).toBe('चचेरा/ममेरा भाई/बहन (Cousin)');
      expect(getFamilyRelationshipLabel('Cousin', 'kn')).toBe('ಸೋದರ ಸಂಬಂಧಿ (Cousin)');

      // Aunt
      expect(getFamilyRelationshipLabel('Aunt', 'hi')).toBe('चाची/मौसी (Aunt)');
      expect(getFamilyRelationshipLabel('Aunt', 'kn')).toBe('ಅತ್ತೆ/ಚಿಕ್ಕಮ್ಮ (Aunt)');

      // Daughter
      expect(getFamilyRelationshipLabel('Daughter', 'hi')).toBe('बेटी (Daughter)');
      expect(getFamilyRelationshipLabel('Daughter', 'kn')).toBe('ಮಗಳು (Daughter)');
    });

    it('preserves displayName as person actual name and provides transliteration', () => {
      const member = {
        id: 'fam_1',
        name: 'Ananya Sharma',
        relationship: 'Grandmother',
      };

      // Name is unaltered
      expect(member.name).toBe('Ananya Sharma');

      // Transliteration lookup
      const transHi = getFamilyMemberTransliteration(member.name, 'hi');
      expect(transHi).toBe('अनन्या शर्मा');
      expect(DEVANAGARI_REGEX.test(transHi!)).toBe(true);
      expect(KANNADA_REGEX.test(transHi!)).toBe(false);

      const transKn = getFamilyMemberTransliteration(member.name, 'kn');
      expect(transKn).toBe('ಅನನ್ಯಾ ಶರ್ಮಾ');
      expect(KANNADA_REGEX.test(transKn!)).toBe(true);
      expect(DEVANAGARI_REGEX.test(transKn!)).toBe(false);
    });

    it('renders localized user-generated family member descriptions', () => {
      const bioHi = formatMemberBio('fam_1', 'hi');
      expect(bioHi).toContain('दादी अनन्या');
      expect(DEVANAGARI_REGEX.test(bioHi)).toBe(true);
      expect(KANNADA_REGEX.test(bioHi)).toBe(false);
      expect(BENGALI_ASSAMESE_REGEX.test(bioHi)).toBe(false);

      const bioKn = formatMemberBio('fam_1', 'kn');
      expect(bioKn).toContain('ಅಜ್ಜಿ ಅನನ್ಯಾ');
      expect(KANNADA_REGEX.test(bioKn)).toBe(true);
      expect(DEVANAGARI_REGEX.test(bioKn)).toBe(false);
      expect(BENGALI_ASSAMESE_REGEX.test(bioKn)).toBe(false);
    });
  });

  describe('4. Dynamic Game Tasks Generation Localization', () => {
    const domains: CognitiveDomain[] = [
      'memory',
      'attention',
      'sequencing',
      'recognition',
      'calculation',
      'planning',
    ];

    it.each(domains)('generates valid %s task in Hindi with Devanagari content', (domain) => {
      const task = TaskGenerator.generateTask({
        domain,
        difficulty: 1,
        language: 'hi',
      });

      expect(task).toBeDefined();
      expect(task.domain).toBe(domain);
      const combinedText = JSON.stringify(task);
      expect(DEVANAGARI_REGEX.test(combinedText)).toBe(true);
      // Strictly NO Kannada script in Hindi task
      expect(KANNADA_REGEX.test(combinedText)).toBe(false);
      // Strictly NO Assamese script
      expect(BENGALI_ASSAMESE_REGEX.test(combinedText)).toBe(false);
    });

    it.each(domains)('generates valid %s task in Kannada with Kannada content', (domain) => {
      const task = TaskGenerator.generateTask({
        domain,
        difficulty: 1,
        language: 'kn',
      });

      expect(task).toBeDefined();
      expect(task.domain).toBe(domain);
      const combinedText = JSON.stringify(task);
      expect(KANNADA_REGEX.test(combinedText)).toBe(true);
      // Strictly NO Devanagari script in Kannada task
      expect(DEVANAGARI_REGEX.test(combinedText)).toBe(false);
      // Strictly NO Assamese script
      expect(BENGALI_ASSAMESE_REGEX.test(combinedText)).toBe(false);
    });

    it('generates English cognitive task with English-only text', () => {
      const task = TaskGenerator.generateTask({
        domain: 'memory',
        difficulty: 1,
        language: 'en',
      });

      const combinedText = JSON.stringify(task);
      expect(DEVANAGARI_REGEX.test(combinedText)).toBe(false);
      expect(KANNADA_REGEX.test(combinedText)).toBe(false);
      expect(BENGALI_ASSAMESE_REGEX.test(combinedText)).toBe(false);
    });
  });

  describe('5. Voice Assistant Language Synchronization', () => {
    it('sets voice language in SpeechService when patient language changes', () => {
      SpeechService.setLanguage('hi');
      expect(SpeechService.getLanguage()).toBe('hi');

      SpeechService.setLanguage('kn');
      expect(SpeechService.getLanguage()).toBe('kn');

      SpeechService.setLanguage('en');
      expect(SpeechService.getLanguage()).toBe('en');
    });
  });
});
