import React, { useState } from 'react';
import { SupportedLanguage } from '@ner-mind/core';
import { SpeechService, SupportedAppLanguage } from '../../audio/speechService.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
}

export interface ActiveLanguageOption {
  code: SupportedAppLanguage;
  nativeName: string;
  englishName: string;
  icon: string;
  sampleGreeting: string;
}

export const ACTIVE_SUPPORTED_LANGUAGES: ActiveLanguageOption[] = [
  {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    icon: '🇮🇳',
    sampleGreeting: 'Welcome to NER-MIND. Voice assistance is ready in English.',
  },
  {
    code: 'hi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    icon: '🇮🇳',
    sampleGreeting: 'एनईआर-माइंड में आपका स्वागत है। हिंदी में आवाज़ सहायता तैयार है।',
  },
  {
    code: 'kn',
    nativeName: 'ಕನ್ನಡ',
    englishName: 'Kannada',
    icon: '🇮🇳',
    sampleGreeting: 'ಎನ್ಇಆರ್-ಮೈಂಡ್‌ಗೆ ಸುಸ್ವಾಗತ. ಕನ್ನಡದಲ್ಲಿ ಧ್ವನಿ ಸಹಾಯ ಸಿದ್ಧವಾಗಿದೆ.',
  },
];

export const UPCOMING_LANGUAGES = [
  { nativeName: 'অসমীয়া', englishName: 'Assamese', icon: '🌾' },
  { nativeName: 'বাংলা', englishName: 'Bengali', icon: '🪷' },
  { nativeName: 'മലയാളം', englishName: 'Malayalam', icon: '🌴' },
  { nativeName: 'தமிழ்', englishName: 'Tamil', icon: '🛕' },
  { nativeName: 'తెలుగు', englishName: 'Telugu', icon: '☀️' },
  { nativeName: 'मराठी', englishName: 'Marathi', icon: '🚩' },
  { nativeName: 'মৈতৈলোন্', englishName: 'Manipuri', icon: '⛰️' },
  { nativeName: 'Khasi', englishName: 'Khasi', icon: '🌲' },
  { nativeName: 'बर’', englishName: 'Bodo', icon: '🪶' },
];

export const LanguageSelectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectLanguage,
}) => {
  const [showUpcoming, setShowUpcoming] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (lang: ActiveLanguageOption) => {
    SpeechService.setLanguage(lang.code);
    onSelectLanguage(lang.code as SupportedLanguage);
    SpeechService.testVoice(lang.code);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            borderBottom: '1.5px solid var(--border-color)',
            paddingBottom: 14,
          }}
        >
          <div>
            <h2 style={{ fontSize: 24, color: 'var(--primary-navy)', margin: 0, fontWeight: 800 }}>
              Choose Your Language
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Select the language for voice assistance, spoken instructions, and reminders.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 6,
            }}
            aria-label="Close language modal"
          >
            ✕
          </button>
        </div>

        {/* 3 Active Supported Languages: English, Hindi, Kannada */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ACTIVE_SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.code;
            return (
              <div
                key={lang.code}
                onClick={() => handleSelect(lang)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 18,
                  border: isSelected ? '2.5px solid #1677D2' : '2px solid #DDE5ED',
                  background: isSelected ? '#EAF4FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 14px rgba(22, 119, 210, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 32 }}>{lang.icon}</span>
                  <div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: isSelected ? '#1677D2' : '#17324D',
                      }}
                    >
                      {lang.nativeName}
                    </div>
                    {lang.englishName !== lang.nativeName && (
                      <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>
                        {lang.englishName}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      SpeechService.speak(lang.sampleGreeting, 0.85, lang.code);
                    }}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: 12,
                      width: 40,
                      height: 40,
                      fontSize: 18,
                      cursor: 'pointer',
                      color: '#1677D2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={`Hear sample voice in ${lang.englishName}`}
                  >
                    🔊
                  </button>
                  {isSelected && (
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: '#1677D2',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        fontWeight: 800,
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Extensible Future Regional Languages Section */}
        <div style={{ marginTop: 22, borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
          <button
            type="button"
            onClick={() => setShowUpcoming(!showUpcoming)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#1677D2',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '6px 0',
            }}
          >
            <span>🌐 More Languages Coming Soon ({UPCOMING_LANGUAGES.length})</span>
            <span>{showUpcoming ? '▲' : '▼'}</span>
          </button>

          {showUpcoming && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
                marginTop: 12,
                maxHeight: 180,
                overflowY: 'auto',
                padding: 4,
              }}
            >
              {UPCOMING_LANGUAGES.map((item) => (
                <div
                  key={item.englishName}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: 0.75,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{item.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                      {item.nativeName} ({item.englishName})
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      backgroundColor: '#E2E8F0',
                      color: '#475569',
                      padding: '2px 6px',
                      borderRadius: 6,
                      fontWeight: 600,
                    }}
                  >
                    Soon
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Done / Confirm Button */}
        <button
          className="accessible-btn accessible-btn-primary"
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 20,
            fontSize: 18,
            backgroundColor: '#1677D2',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 16,
            padding: '14px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Confirm Language ✓
        </button>
      </div>
    </div>
  );
};
