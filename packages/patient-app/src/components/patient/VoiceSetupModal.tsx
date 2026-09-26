import React, { useState, useEffect } from 'react';
import { SpeechService, SupportedAppLanguage, SUPPORTED_LANGUAGES_META } from '../../audio/speechService.js';
import { LocalizationService } from '../../services/LocalizationService.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  currentLanguage?: SupportedAppLanguage;
  patientName?: string;
}

export const VoiceSetupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onContinue,
  currentLanguage = 'en',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string | null>(null);
  const [micStatusMessage, setMicStatusMessage] = useState<string>('');
  const [micError, setMicError] = useState<string | null>(null);

  const activeLang = currentLanguage as SupportedAppLanguage;
  const langMeta = SUPPORTED_LANGUAGES_META[activeLang] || SUPPORTED_LANGUAGES_META.en;
  const testPhrases = LocalizationService.getMicTestPhrases(activeLang);

  // Clean up mic and speech when modal is closed
  useEffect(() => {
    if (!isOpen) {
      handleStopAll();
    }
    return () => {
      handleStopAll();
    };
  }, [isOpen]);

  const handleStopAll = () => {
    SpeechService.stop();
    setIsListening(false);
    setAudioLevel(0);
    setIsSpeaking(false);
  };

  if (!isOpen) return null;

  const handleTestVoice = () => {
    setIsSpeaking(true);
    let timer: any = setTimeout(() => setIsSpeaking(false), 4000);
    SpeechService.testVoice(
      activeLang,
      () => setIsSpeaking(true),
      () => {
        clearTimeout(timer);
        setIsSpeaking(false);
      }
    );
  };

  const handleToggleMic = async () => {
    if (isListening) {
      handleStopAll();
      setMicStatusMessage('Microphone test ended.');
      return;
    }

    setMicError(null);
    setSpokenTranscript(null);
    setMicStatusMessage('Requesting microphone access...');

    // 1. Start hardware audio volume monitor (Web Audio API - offline native)
    const monitorStarted = await SpeechService.startMicLevelMonitor(
      (level) => {
        setAudioLevel(level);
        if (level > 18) {
          setMicStatusMessage(`🎙️ Voice detected! Input volume: ${level}%`);
        }
      },
      (err) => {
        console.warn('Mic level monitor error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicError('Microphone permission blocked. Please allow mic access in your browser address bar.');
        } else {
          setMicError(`Mic hardware error: ${err.message || 'Could not access audio device.'}`);
        }
      }
    );

    if (!monitorStarted) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setMicStatusMessage('Listening... Speak into your microphone now.');

    // 2. Start speech recognition in the caregiver-configured language
    SpeechService.startListening(
      (text: string) => {
        setSpokenTranscript(text);
        setMicStatusMessage(`Heard: "${text}"`);
        setIsSpeaking(true);
        let timer: any = setTimeout(() => setIsSpeaking(false), 4000);
        SpeechService.speakHeardConfirmation(
          text,
          activeLang,
          () => setIsSpeaking(true),
          () => {
            clearTimeout(timer);
            setIsSpeaking(false);
          }
        );
      },
      (err: any) => {
        console.warn('Speech recognition notice:', err);
        if (err.error === 'network' || err.message?.includes('network')) {
          setMicStatusMessage('Hardware mic active (offline mode). Voice level meter is responsive.');
        } else if (err.error === 'no-speech') {
          setMicStatusMessage('No speech detected yet. Speak clearly close to your microphone.');
        }
      },
      activeLang,
      () => {
        // Recognition completed single-shot
      }
    );
  };

  const handleSelectSamplePhrase = (phraseText: string) => {
    setSpokenTranscript(phraseText);
    setMicStatusMessage(`Simulating voice input: "${phraseText}"`);
    setIsSpeaking(true);
    let timer: any = setTimeout(() => setIsSpeaking(false), 4000);
    SpeechService.speakHeardConfirmation(
      phraseText,
      activeLang,
      () => setIsSpeaking(true),
      () => {
        clearTimeout(timer);
        setIsSpeaking(false);
      }
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          textAlign: 'center',
          maxWidth: 540,
          padding: '28px 24px',
          borderRadius: 28,
        }}
      >
        {/* Friendly Avatar & Audio Waves */}
        <div
          style={{
            width: 100,
            height: 100,
            margin: '0 auto 12px',
            borderRadius: '50%',
            background: isSpeaking
              ? 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)'
              : 'linear-gradient(135deg, #EAF4FF 0%, #F0ECFF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isSpeaking ? '4px solid #38BDF8' : '4px solid #FFFFFF',
            boxShadow: '0 6px 20px rgba(18, 59, 99, 0.08)',
            position: 'relative',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ fontSize: 52 }}>{isSpeaking ? '🗣️' : '👴'}</span>
          {isSpeaking && (
            <div
              style={{
                position: 'absolute',
                bottom: -6,
                padding: '2px 10px',
                background: '#0284C7',
                color: '#FFFFFF',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.5,
              }}
            >
              SPEAKING
            </div>
          )}
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-navy)', margin: '0 0 4px 0' }}>
          Voice Assistant & Mic Test
        </h2>

        {/* Active Language Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '6px 0 16px', padding: '6px 14px', borderRadius: 20, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: 16 }}>{langMeta.flag}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>
            {langMeta.nativeName} ({langMeta.englishName})
          </span>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>• 🔒 Caregiver Configured</span>
        </div>

        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 18px' }}>
          Test your microphone and sound output to ensure NER-MIND speaks clearly in your preferred language.
        </p>

        {/* Microphone Test Section */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: 20,
            padding: '18px 16px',
            border: '2px solid #E2E8F0',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {/* Round Mic Button */}
            <button
              type="button"
              onClick={handleToggleMic}
              style={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                background: isListening
                  ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                  : 'linear-gradient(135deg, #1677D2 0%, #123B63 100%)',
                color: '#FFFFFF',
                border: isListening ? '5px solid #FCA5A5' : '4px solid #EAF4FF',
                fontSize: 36,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isListening
                  ? '0 0 24px rgba(239, 68, 68, 0.45)'
                  : '0 8px 20px rgba(22, 119, 210, 0.28)',
                transition: 'all 0.2s ease',
              }}
              title={isListening ? 'Stop listening' : 'Start microphone test'}
              aria-label="Toggle Microphone"
            >
              🎤
            </button>

            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: isListening ? '#DC2626' : 'var(--primary-navy)',
                }}
              >
                {isListening ? '🎙️ Mic Active — Speak Now' : 'Tap Mic to Start Test'}
              </div>

              {/* Status or Guidance */}
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, minHeight: 18 }}>
                {micStatusMessage || 'Tap to test your voice capture offline'}
              </div>
            </div>

            {/* Live Audio Visualizer VU Meter (Shows volume level when speaking) */}
            {isListening && (
              <div style={{ width: '100%', maxWidth: 320, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  <span>Hardware Input Volume</span>
                  <span>{audioLevel}%</span>
                </div>
                <div
                  style={{
                    height: 14,
                    width: '100%',
                    backgroundColor: '#E2E8F0',
                    borderRadius: 8,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(6, audioLevel)}%`,
                      backgroundColor: audioLevel > 25 ? '#10B981' : audioLevel > 5 ? '#3B82F6' : '#94A3B8',
                      borderRadius: 8,
                      transition: 'width 0.08s ease-out, background-color 0.2s ease',
                    }}
                  />
                </div>
                {audioLevel > 18 && (
                  <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, marginTop: 4 }}>
                    ✓ Sound signal detected! Your microphone is working properly.
                  </div>
                )}
              </div>
            )}

            {/* Error Banner if mic permission was rejected */}
            {micError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: '#991B1B',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                {micError}
              </div>
            )}

            {/* Spoken Transcript Result Banner */}
            {spokenTranscript && (
              <div
                style={{
                  backgroundColor: '#ECFDF5',
                  border: '2px solid #A7F3D0',
                  borderRadius: 14,
                  padding: '12px 16px',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Assistant Recognized & Responded
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#065F46', marginTop: 2 }}>
                  "{spokenTranscript}"
                </div>
              </div>
            )}
          </div>

          {/* Quick Tap Phrases in the configured language */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #E2E8F0', textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💬</span>
              <span>Tap a sample phrase in {langMeta.englishName} to test voice response:</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {testPhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSamplePhrase(phrase.text)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: 12,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#1E293B',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563EB')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                >
                  <span style={{ color: '#0F172A', fontWeight: 800 }}>{phrase.text}</span>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{phrase.meaning}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Test Voice Audio Button */}
        <button
          type="button"
          className="accessible-btn accessible-btn-secondary"
          onClick={handleTestVoice}
          style={{
            width: '100%',
            marginBottom: 16,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: isSpeaking ? '#E0F2FE' : '#FFFFFF',
            borderColor: isSpeaking ? '#0284C7' : '#CBD5E1',
          }}
        >
          <span>🔊</span>
          <span>{isSpeaking ? `Speaking in ${langMeta.nativeName}...` : `Test Voice Output (${langMeta.nativeName})`}</span>
        </button>

        {/* Action Footer */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="accessible-btn accessible-btn-secondary"
            onClick={onClose}
            style={{ flex: 1, fontSize: 16 }}
          >
            Close
          </button>
          <button
            className="accessible-btn accessible-btn-primary"
            onClick={onContinue}
            style={{ flex: 1, fontSize: 16 }}
          >
            Done ✓
          </button>
        </div>
      </div>
    </div>
  );
};
