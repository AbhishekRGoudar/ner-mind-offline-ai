import React, { useState } from 'react';
import { PersonalMemoryProfile, SupportedLanguage } from '@ner-mind/core';
import { OfflineStorageService } from '../storage/localStorage.js';
import { SpeechService } from '../audio/speechService.js';

interface Props {
  onBack: () => void;
}

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
];

export const PersonalMemoryView: React.FC<Props> = ({ onBack }) => {
  const [profile, setProfile] = useState<PersonalMemoryProfile>(
    OfflineStorageService.getPatientProfile()
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    const updated: PersonalMemoryProfile = {
      ...profile,
      preferredLanguage: lang,
    };
    setProfile(updated);
    OfflineStorageService.savePatientProfile(updated);
    SpeechService.speak(`Language set to ${LANGUAGES.find(l => l.code === lang)?.label}`);
    showSaved();
  };

  const handleToggleAudio = () => {
    const nextVal = !profile.accessibility.audioPromptsEnabled;
    const updated: PersonalMemoryProfile = {
      ...profile,
      accessibility: {
        ...profile.accessibility,
        audioPromptsEnabled: nextVal,
      },
    };
    setProfile(updated);
    OfflineStorageService.savePatientProfile(updated);
    SpeechService.speak(nextVal ? 'Audio voice guidance enabled' : 'Audio guidance disabled');
    showSaved();
  };

  const showSaved = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="accessible-card" style={{ maxWidth: 840, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>👤 Personal Memory & Accessibility Profile</h2>
        <button className="accessible-btn accessible-btn-secondary" onClick={onBack}>
          Back
        </button>
      </div>

      {savedNotice && (
        <div style={{
          backgroundColor: 'rgba(52, 211, 153, 0.2)',
          border: '1px solid var(--accent-emerald)',
          color: 'var(--accent-emerald)',
          padding: '12px 20px',
          borderRadius: 12,
          marginBottom: 20,
          fontWeight: 600,
        }}>
          ✓ Preferences saved securely to local offline profile.
        </div>
      )}

      {/* Language Selection */}
      <div style={{ marginBottom: 28, backgroundColor: 'var(--bg-primary)', padding: 20, borderRadius: 16 }}>
        <h3 style={{ fontSize: 24, marginBottom: 12, color: 'var(--accent-cyan)' }}>
          Preferred Language
        </h3>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', marginBottom: 16 }}>
          Select the regional language you feel most comfortable reading and hearing:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="accessible-btn"
              style={{
                minHeight: 56,
                fontSize: 18,
                backgroundColor: profile.preferredLanguage === lang.code ? 'var(--accent-cyan)' : 'var(--bg-card)',
                color: profile.preferredLanguage === lang.code ? '#0b1329' : 'var(--text-main)',
                border: '2px solid var(--border-subtle)',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accessibility & Voice Settings */}
      <div style={{ marginBottom: 28, backgroundColor: 'var(--bg-primary)', padding: 20, borderRadius: 16 }}>
        <h3 style={{ fontSize: 24, marginBottom: 12, color: 'var(--accent-emerald)' }}>
          Accessibility & Audio Settings
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>Audio Voice Guidance</div>
              <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>Read instructions out loud at comfortable elderly pace</div>
            </div>
            <button
              onClick={handleToggleAudio}
              className={`accessible-btn ${profile.accessibility.audioPromptsEnabled ? 'accessible-btn-primary' : 'accessible-btn-secondary'}`}
              style={{ minHeight: 48 }}
            >
              {profile.accessibility.audioPromptsEnabled ? '🔊 Enabled' : '🔇 Muted'}
            </button>
          </div>
        </div>
      </div>

      {/* Familiar Cultural & Regional Items */}
      <div style={{ marginBottom: 28, backgroundColor: 'var(--bg-primary)', padding: 20, borderRadius: 16 }}>
        <h3 style={{ fontSize: 24, marginBottom: 12, color: 'var(--accent-amber)' }}>
          Familiar Cultural & Household Objects ({profile.familiarObjects.length})
        </h3>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', marginBottom: 16 }}>
          These familiar North Eastern items are used to personalize your memory and recognition games:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {profile.familiarObjects.map(obj => (
            <div
              key={obj.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '14px 20px',
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{obj.name}</strong> {obj.localLanguageName ? `(${obj.localLanguageName})` : ''}
                <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>{obj.significanceHint}</div>
              </div>
              <span className="voice-pill" style={{ fontSize: 14 }}>{obj.category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Caregiver & Family Contacts with Privacy Consent */}
      <div style={{ backgroundColor: 'var(--bg-primary)', padding: 20, borderRadius: 16 }}>
        <h3 style={{ fontSize: 24, marginBottom: 12 }}>
          Approved Family & Caregiver Contacts
        </h3>
        {profile.familyContacts.map(cnt => (
          <div
            key={cnt.id}
            style={{
              backgroundColor: 'var(--bg-card)',
              padding: 16,
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong>{cnt.fullName}</strong> — {cnt.relationship}
              <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>{cnt.phoneNumber}</div>
            </div>
            <span style={{ color: 'var(--accent-emerald)', fontSize: 16 }}>✓ Consent Granted</span>
          </div>
        ))}
      </div>
    </div>
  );
};
