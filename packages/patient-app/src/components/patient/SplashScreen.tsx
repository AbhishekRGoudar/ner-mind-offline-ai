import React from 'react';
import { SpeechService } from '../../audio/speechService.js';
import { useLocalization } from '../../localization/index.js';

interface Props {
  onGetStarted: () => void;
  currentLanguageLabel?: string;
  patientName?: string;
  onOpenLanguageSelect?: () => void;
}

export const SplashScreen: React.FC<Props> = ({
  onGetStarted,
  patientName = 'Bhaben Sharma',
  onOpenLanguageSelect: _onOpenLanguageSelect,
}) => {
  const { language, t } = useLocalization();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #F4F9FF 0%, #FFFFFF 100%)',
      padding: '32px 24px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 460, width: '100%', margin: '0 auto' }}>
        {/* Friendly Elderly Illustration */}
        <div style={{
          width: 140,
          height: 140,
          margin: '0 auto 20px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFF7DC 0%, #EAF4FF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '4px solid #FFFFFF',
          boxShadow: '0 8px 24px rgba(18, 59, 99, 0.1)',
          position: 'relative',
        }}>
          <span style={{ fontSize: 72 }}>👴</span>
          <div style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--primary-action)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            border: '2px solid #fff',
          }}>
            🧠
          </div>
        </div>

        {/* Brand Title & Subtitle */}
        <h1 style={{
          fontSize: 34,
          fontWeight: 900,
          color: 'var(--primary-navy)',
          letterSpacing: '-0.5px',
          margin: '0 0 6px 0',
        }}>
          {t('splash.title')}
        </h1>

        <div style={{
          fontSize: 18,
          color: 'var(--primary-action)',
          fontWeight: 700,
          marginBottom: 12,
        }}>
          {t('splash.companion')}
        </div>

        <p style={{
          fontSize: 17,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          marginBottom: 28,
          padding: '0 12px',
        }}>
          {t('splash.tagline')}
        </p>

        {/* Read-Only Language Configuration Pill (Caregiver Controlled - Requirement 1, 4, 10) */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 28,
          padding: '8px 18px',
          borderRadius: 20,
          backgroundColor: '#F1F5F9',
          border: '1.5px solid #CBD5E1',
          fontSize: 14,
          fontWeight: 700,
          color: '#334155',
        }} data-testid="splash-language-badge">
          <span>🔒</span>
          <span>{language === 'hi' ? 'हिन्दी (Hindi + English)' : language === 'kn' ? 'ಕನ್ನಡ (Kannada + English)' : 'English'}</span>
          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>• Caregiver Configured</span>
        </div>

        {/* Primary CTA Button */}
        <button
          className="accessible-btn accessible-btn-primary"
          onClick={() => {
            SpeechService.speakGreeting(patientName, 'morning');
            onGetStarted();
          }}
          style={{
            width: '100%',
            minHeight: 60,
            fontSize: 20,
            borderRadius: 20,
            marginBottom: 24,
          }}
        >
          {t('splash.getStarted')}
        </button>

        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
          {t('common.offlineNative')}
        </div>
      </div>
    </div>
  );
};
