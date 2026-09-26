import React, { useState } from 'react';
import { CognitiveDomain, TrainingRecommendation, PersonalizedTaskSelection, SupportedLanguage } from '@ner-mind/core';
import { PatientTab } from './BottomNav.js';
import { SpeechService, SupportedAppLanguage } from '../../audio/speechService.js';
import { SUPPORTED_LANGUAGES_META } from '../../services/LocalizationService.js';
import { useLocalization } from '../../localization/index.js';
import { getLocalizedGreeting } from '../../localization/translations.js';

interface Props {
  patientName: string;
  onNavigateTab: (tab: PatientTab) => void;
  onStartGame: (domain: CognitiveDomain) => void;
  recommendation: TrainingRecommendation | null;
  personalizedTask: PersonalizedTaskSelection | null;
  onOpenVoiceSetup: () => void;
  currentLanguage?: SupportedLanguage;
}

export const PatientHomeDashboard: React.FC<Props> = ({
  patientName,
  onNavigateTab,
  onStartGame,
  recommendation,
  personalizedTask,
  onOpenVoiceSetup,
}) => {
  const { language, t, formatBilingual } = useLocalization();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Dynamic greeting based on language and time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    return getLocalizedGreeting(patientName, timeOfDay, language);
  };

  const appLang = (language as SupportedAppLanguage) || 'en';
  const langMeta = SUPPORTED_LANGUAGES_META[appLang] || SUPPORTED_LANGUAGES_META.en;

  const formattedDate = new Date().toLocaleDateString(
    langMeta.bcp47 || 'en-IN',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );

  const handleReadGreeting = () => {
    SpeechService.speakGreeting(patientName, getGreeting(), appLang);
  };

  const handleTestVoice = () => {
    SpeechService.testVoice(appLang);
  };

  const handleEmergencyTrigger = () => {
    setShowEmergencyModal(true);
    let alertMsg = 'Emergency alert sent to your caregiver. Please stay calm and seated.';
    if (language === 'hi') {
      alertMsg = 'आपातकालीन सहायता सतर्कता। देखभालकर्ता को सूचना दे दी गई है। कृपया शांत रहें।';
    } else if (language === 'kn') {
      alertMsg = 'ತುರ್ತು ಸಹಾಯ ಎಚ್ಚರಿಕೆ. ಆರೈಕೆದಾರರಿಗೆ ಮಾಹಿತಿ ರವಾನಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಶಾಂತರಾಗಿರಿ.';
    }
    SpeechService.speak(alertMsg, 0.85, appLang);
  };

  const recDomain = recommendation?.priorityDomain || personalizedTask?.candidate?.domain || 'memory';
  const recReason = personalizedTask?.rationale || 'Personalized cognitive practice for today';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 90 }}>
      {/* Top Greeting Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 22,
          padding: '16px 20px',
          boxShadow: '0 2px 10px rgba(18, 59, 99, 0.04)',
          border: '1px solid #DDE5ED',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Elderly Avatar */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#EAF4FF',
              border: '2.5px solid #1677D2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              boxShadow: '0 2px 8px rgba(22, 119, 210, 0.2)',
            }}
          >
            👴
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#17324D' }}>
                {getGreeting()}
              </h2>
              <button
                type="button"
                onClick={handleReadGreeting}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 18,
                  padding: 2,
                }}
                title="Read Greeting aloud"
                aria-label="Read Greeting"
              >
                🔊
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
                {formattedDate}
              </span>
              <span
                style={{
                  fontSize: 11,
                  backgroundColor: '#E8F7EF',
                  color: '#2E7D32',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                🔒 {t('common.offlineReady')}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Voice Setup Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={onOpenVoiceSetup}
            style={{
              border: 'none',
              backgroundColor: '#F1F5F9',
              color: '#123B63',
              borderRadius: 12,
              padding: '8px 12px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Voice Assistance Microphone Check"
          >
            <span>🎙️</span>
            <span style={{ fontSize: 13 }}>{t('dashboard.testVoice')}</span>
          </button>
        </div>
      </div>

      {/* LANGUAGE SELECTION & VOICE STATUS CARD */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 22,
          padding: '18px 20px',
          border: '2px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(18, 59, 99, 0.04)',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🗣️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#17324D' }}>
                {formatBilingual(
                  language === 'hi'
                    ? 'भाषा एवं आवाज़ सहायता'
                    : language === 'kn'
                    ? 'ಭಾಷೆ ಮತ್ತು ಧ್ವನಿ ಸಹಾಯ'
                    : 'Language & Voice Assistance',
                  'Language & Voice Assistance'
                )}
              </h3>
              <span style={{ fontSize: 13, color: '#64748B' }}>
                {t('dashboard.voiceActive')} ({langMeta.englishName})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestVoice}
            style={{
              backgroundColor: '#1677D2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            🔊 {t('dashboard.testVoice')}
          </button>
        </div>

        {/* Read-Only Language & Voice Status (Caregiver Controlled - Requirement 1, 4, 10) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
            borderRadius: 14,
            padding: '12px 18px',
            border: '1.5px solid #E2E8F0',
          }}
          data-testid="patient-home-language-status"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{language === 'en' ? '🇬🇧' : '🇮🇳'}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1E293B' }}>
                {language === 'hi'
                  ? 'हिन्दी (Hindi + English)'
                  : language === 'kn'
                  ? 'ಕನ್ನಡ (Kannada + English)'
                  : 'English'}
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Configured by Caregiver / Doctor • Voice assistant synchronized
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              backgroundColor: '#E0F2FE',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
              padding: '4px 10px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>🔒</span> Managed
          </span>
        </div>
      </div>

      {/* 4 Large Pastel Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {/* Card 1: Today's Activities */}
        <div
          onClick={() => onNavigateTab('plan')}
          style={{
            backgroundColor: '#FFF7DC',
            borderRadius: 22,
            padding: 20,
            border: '2px solid #F5C451',
            cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(245, 196, 81, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 140,
            transition: 'transform 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              ☀️
            </div>
            <span style={{ fontSize: 11, color: '#8D6B00', fontWeight: 700 }}>🔒 Routine</span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '8px 0 2px 0', color: '#8D6B00' }}>
              {formatBilingual(t('nav.plan'), "Today's Plan")}
            </h3>
            <span style={{ fontSize: 13, color: '#B7791F', fontWeight: 600 }}>
              {t('plan.subtitle')}
            </span>
          </div>
        </div>

        {/* Card 2: Play Cognitive Games */}
        <div
          onClick={() => onNavigateTab('games')}
          style={{
            backgroundColor: '#F0ECFF',
            borderRadius: 22,
            padding: 20,
            border: '2px solid #B8A7E8',
            cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(184, 167, 232, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 140,
            transition: 'transform 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              🎮
            </div>
            <span style={{ fontSize: 11, color: '#5B3EB0', fontWeight: 700 }}>6 Domains</span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '8px 0 2px 0', color: '#5B3EB0' }}>
              {formatBilingual(t('dashboard.quickGames'), 'Play Games')}
            </h3>
            <span style={{ fontSize: 13, color: '#7E57C2', fontWeight: 600 }}>
              {formatBilingual(
                language === 'hi'
                  ? 'स्मृति, एकाग्रता और अन्य'
                  : language === 'kn'
                  ? 'ನೆನಪು, ಏಕಾಗ್ರತೆ ಮತ್ತು ಇತರ'
                  : 'Memory, Attention & more',
                'Memory, Attention & more'
              )}
            </span>
          </div>
        </div>

        {/* Card 3: Reminders */}
        <div
          onClick={() => onNavigateTab('reminders')}
          style={{
            backgroundColor: '#EAF4FF',
            borderRadius: 22,
            padding: 20,
            border: '2px solid #90CAF9',
            cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(144, 202, 249, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 140,
            transition: 'transform 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              ⏰
            </div>
            <span style={{ fontSize: 11, color: '#1677D2', fontWeight: 700 }}>🔒 Scheduled</span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '8px 0 2px 0', color: '#123B63' }}>
              {formatBilingual(t('nav.reminders'), 'Reminders')}
            </h3>
            <span style={{ fontSize: 13, color: '#1677D2', fontWeight: 600 }}>
              {t('reminders.subtitle')}
            </span>
          </div>
        </div>

        {/* Card 4: Family Memories */}
        <div
          onClick={() => onNavigateTab('family')}
          style={{
            backgroundColor: '#FBE8EE',
            borderRadius: 22,
            padding: 20,
            border: '2px solid #F6A6A6',
            cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(246, 166, 166, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 140,
            transition: 'transform 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              👨‍👩‍👧
            </div>
            <span style={{ fontSize: 11, color: '#9C2754', fontWeight: 700 }}>🔒 Caregiver Set</span>
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '8px 0 2px 0', color: '#9C2754' }}>
              {formatBilingual(t('dashboard.quickFamily'), 'Family Memories')}
            </h3>
            <span style={{ fontSize: 13, color: '#B83267', fontWeight: 600 }}>
              {formatBilingual(
                language === 'hi'
                  ? 'तस्वीरें और यादें'
                  : language === 'kn'
                  ? 'ಭಾವಚಿತ್ರಗಳು ಮತ್ತು ನೆನಪುಗಳು'
                  : 'Photos & Stories',
                'Photos & Stories'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Recommended Training Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: 22,
          border: '2px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(18, 59, 99, 0.05)',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span
            style={{
              backgroundColor: '#E8F7EF',
              color: '#2E7D32',
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {formatBilingual(
              language === 'hi' ? 'आपके लिए अनुशंसित' : language === 'kn' ? 'ನಿಮಗಾಗಿ ಶಿಫಾರಸು' : 'RECOMMENDED FOR YOU',
              'RECOMMENDED FOR YOU'
            )}
          </span>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
            🔒 Adaptive Engine
          </span>
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px 0', color: '#17324D' }}>
          {formatBilingual(t('games.' + recDomain), `${recDomain.toUpperCase()} Training`)}
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: 15, color: '#64748B', lineHeight: 1.4 }}>
          {recReason}
        </p>

        <button
          type="button"
          onClick={() => onStartGame(recDomain)}
          style={{
            width: '100%',
            backgroundColor: '#1677D2',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 18,
            padding: '16px',
            fontSize: 17,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(22, 119, 210, 0.25)',
          }}
        >
          <span>{t('dashboard.startSession')}</span>
          <span>▶</span>
        </button>
      </div>

      {/* Real-Life Mission Direct Banner */}
      <div
        onClick={() => onNavigateTab('transfer')}
        style={{
          backgroundColor: '#E8F7EF',
          borderRadius: 20,
          padding: '18px 20px',
          border: '1.5px solid #42B883',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 32 }}>🛒</span>
          <div>
            <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1B5E20' }}>
              {formatBilingual(t('missions.title'), 'Real-Life Shopping Mission')}
            </h4>
            <span style={{ fontSize: 14, color: '#2E7D32' }}>
              {t('missions.subtitle')}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 20, color: '#1B5E20', fontWeight: 800 }}>→</span>
      </div>

      {/* DEDICATED EMERGENCY / PANIC CARD */}
      <div
        style={{
          backgroundColor: '#FFF1F2',
          borderRadius: 20,
          padding: '16px 20px',
          border: '2px solid #F43F5E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 30 }}>🚨</span>
          <div>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#9F1239' }}>
              {t('emergency.title')}
            </h4>
            <span style={{ fontSize: 13, color: '#BE123C' }}>
              {t('emergency.subtitle')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEmergencyTrigger}
          style={{
            backgroundColor: '#E11D48',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 14,
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
          }}
        >
          {t('emergency.button')}
        </button>
      </div>

      {/* Emergency Modal Dialog */}
      {showEmergencyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 9999,
          }}
          onClick={() => setShowEmergencyModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 30,
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
              border: '3px solid #E11D48',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 60, marginBottom: 12 }}>🚨</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#9F1239', margin: '0 0 8px 0' }}>
              {t('emergency.title')}
            </h2>
            <p style={{ fontSize: 16, color: '#334155', lineHeight: 1.5, marginBottom: 24 }}>
              {t('emergency.helpOnWay')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setShowEmergencyModal(false);
                }}
                style={{
                  backgroundColor: '#1677D2',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 14,
                  padding: '14px',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {t('emergency.quickDismiss')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
