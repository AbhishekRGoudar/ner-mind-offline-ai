import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedLanguage } from '@ner-mind/core';
import { TRANSLATIONS } from './translations.js';
import {
  getLocalizedRelationship,
  getLocalizedMemberDescription,
  getLocalizedMemberName,
} from './familyTranslations.js';
import { SpeechService } from '../audio/speechService.js';
import { OfflineStorageService } from '../storage/localStorage.js';

export const STORAGE_KEY_PATIENT_LANGUAGE = 'ner_mind_patient_language';

export interface LocalizationContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatBilingual: (primary: string, secondary?: string) => string;
  getRelationshipLabel: (relationshipKey: string) => string;
  getMemberBio: (memberId: string, fallbackText: string) => string;
  getMemberDisplayName: (memberId: string, actualName: string) => { primary: string; secondary?: string };
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_PATIENT_LANGUAGE);
      if (saved === 'en' || saved === 'hi' || saved === 'kn') {
        return saved;
      }
    }
    try {
      const profile = OfflineStorageService.getPatientProfile();
      if (profile && (profile.preferredLanguage === 'hi' || profile.preferredLanguage === 'kn' || profile.preferredLanguage === 'en')) {
        return profile.preferredLanguage as SupportedLanguage;
      }
    } catch {}
    return 'en';
  });

  const setLanguage = (newLang: SupportedLanguage) => {
    if (newLang !== 'en' && newLang !== 'hi' && newLang !== 'kn') return;
    setLanguageState(newLang);

    // Persist to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PATIENT_LANGUAGE, newLang);
    }

    // Sync to patient profile in local storage/IndexedDB
    try {
      const profile = OfflineStorageService.getPatientProfile();
      if (profile) {
        OfflineStorageService.savePatientProfile({
          ...profile,
          preferredLanguage: newLang,
        });
      }
    } catch {}

    // Synchronize voice assistant speech model
    SpeechService.setLanguage(newLang);
  };

  // Synchronize with external changes (e.g. Caregiver Portal changes language)
  useEffect(() => {
    const handleLanguageUpdate = () => {
      let currentLang: SupportedLanguage = 'en';
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY_PATIENT_LANGUAGE);
        if (saved === 'en' || saved === 'hi' || saved === 'kn') {
          currentLang = saved;
        }
      }
      try {
        const profile = OfflineStorageService.getPatientProfile();
        if (profile && (profile.preferredLanguage === 'hi' || profile.preferredLanguage === 'kn' || profile.preferredLanguage === 'en')) {
          currentLang = profile.preferredLanguage as SupportedLanguage;
        }
      } catch {}

      setLanguageState(currentLang);
      SpeechService.setLanguage(currentLang);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleLanguageUpdate);
      window.addEventListener('ner_mind_language_changed', handleLanguageUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleLanguageUpdate);
        window.removeEventListener('ner_mind_language_changed', handleLanguageUpdate);
      }
    };
  }, []);

  // Sync speech service on mount & whenever language changes
  useEffect(() => {
    SpeechService.setLanguage(language);
  }, [language]);

  /**
   * Translate a key with optional dynamic parameter replacements
   */
  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    let str = dict[key] || TRANSLATIONS.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }
    return str;
  };

  /**
   * Bilingual formatting rule:
   * en -> secondary || primary (normal English)
   * hi -> primary + (secondary ? ' (' + secondary + ')' : '')
   * kn -> primary + (secondary ? ' (' + secondary + ')' : '')
   */
  const formatBilingual = (primary: string, secondary?: string): string => {
    if (language === 'en') {
      return secondary || primary;
    }
    if (!secondary || secondary === primary) {
      return primary;
    }
    return `${primary} (${secondary})`;
  };

  const getRelationshipLabel = (relationshipKey: string): string => {
    return getLocalizedRelationship(relationshipKey, language);
  };

  const getMemberBio = (memberId: string, fallbackText: string): string => {
    return getLocalizedMemberDescription(memberId, fallbackText, language);
  };

  const getMemberDisplayName = (memberId: string, actualName: string) => {
    return getLocalizedMemberName(memberId, actualName, language);
  };

  return (
    <LocalizationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatBilingual,
        getRelationshipLabel,
        getMemberBio,
        getMemberDisplayName,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextValue => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

/**
 * Reusable Bilingual / Localized Text component
 */
export interface LocalizedTextProps {
  primary: string;
  secondary?: string;
  block?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const LocalizedText: React.FC<LocalizedTextProps> = ({
  primary,
  secondary,
  block = false,
  className,
  style,
}) => {
  const { language } = useLocalization();

  if (language === 'en') {
    return (
      <span className={className} style={style}>
        {secondary || primary}
      </span>
    );
  }

  if (block && secondary && secondary !== primary) {
    return (
      <span
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          lineHeight: 1.3,
          ...style,
        }}
      >
        <span style={{ fontWeight: 'inherit', fontSize: 'inherit' }}>{primary}</span>
        <span style={{ fontSize: '0.85em', opacity: 0.75, fontWeight: 500 }}>
          {secondary}
        </span>
      </span>
    );
  }

  // Inline bilingual
  const displayText = secondary && secondary !== primary ? `${primary} (${secondary})` : primary;
  return (
    <span className={className} style={style}>
      {displayText}
    </span>
  );
};
