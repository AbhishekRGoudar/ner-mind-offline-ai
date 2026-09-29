import React, { useState, useEffect } from 'react';
import { SpeechService } from '../../audio/speechService.js';
import { OfflineStorageService } from '../../storage/localStorage.js';
import { CognitiveObservation } from '@ner-mind/core';
import { useLocalization } from '../../localization/index.js';
import { LocalizationService } from '../../services/LocalizationService.js';

export interface FamilyMemberRecord {
  id: string;
  name: string;
  relationship: string;
  relationshipRegional?: string;
  photoUrl?: string;
  avatarEmoji: string;
  contextMemory: string;
  pronunciationHint?: string;
  photoConsent: boolean;
  voiceConsent: boolean;
  createdAt: string;
  recognitionAttempts: number;
  recognitionSuccesses: number;
  lastTestedAt?: string;
}

export const DEFAULT_FAMILY_MEMBERS: FamilyMemberRecord[] = [
  {
    id: 'fam_1',
    name: 'Ananya Sharma',
    relationship: 'Grandmother',
    avatarEmoji: '👵',
    contextMemory: 'Grandmother Ananya lives in Jorhat and loves making traditional pitha during Bihu celebrations.',
    photoConsent: true,
    voiceConsent: true,
    createdAt: '2026-09-01T10:00:00Z',
    recognitionAttempts: 12,
    recognitionSuccesses: 11,
    lastTestedAt: '2026-09-23T14:30:00Z',
  },
  {
    id: 'fam_2',
    name: 'Deepak Borah',
    relationship: 'Cousin',
    avatarEmoji: '👨',
    contextMemory: 'Deepak is your nephew who visits every Sunday to help with garden plants and tea.',
    photoConsent: true,
    voiceConsent: true,
    createdAt: '2026-09-01T10:00:00Z',
    recognitionAttempts: 10,
    recognitionSuccesses: 9,
    lastTestedAt: '2026-09-22T11:15:00Z',
  },
  {
    id: 'fam_3',
    name: 'Minoti Devi',
    relationship: 'Aunt',
    avatarEmoji: '🧕',
    contextMemory: 'Aunt Minoti enjoys listening to Borgeet and weaving Gamusa patterns on her handloom.',
    photoConsent: true,
    voiceConsent: true,
    createdAt: '2026-09-01T10:00:00Z',
    recognitionAttempts: 8,
    recognitionSuccesses: 7,
    lastTestedAt: '2026-09-21T16:00:00Z',
  },
  {
    id: 'fam_4',
    name: 'Priya Sharma',
    relationship: 'Daughter',
    avatarEmoji: '👩',
    contextMemory: 'Priya is your daughter who calls every evening at 7:00 PM and brings fresh Assam tea.',
    photoConsent: true,
    voiceConsent: true,
    createdAt: '2026-09-01T10:00:00Z',
    recognitionAttempts: 15,
    recognitionSuccesses: 15,
    lastTestedAt: '2026-09-24T09:00:00Z',
  },
];

export const STORAGE_KEY_FAMILY = 'ner_mind_family_members_v2';

interface Props {
  onBack: () => void;
  onRefreshParent?: () => void;
}

type TabMode = 'directory' | 'activities' | 'privacy';
type ActivityType = 'who_is_this' | 'match_face_name' | 'match_relationship' | 'memory_recall';

export const FamilyMemoriesView: React.FC<Props> = ({ onBack, onRefreshParent }) => {
  const { language, t, getRelationshipLabel, getMemberBio, getMemberDisplayName } = useLocalization();
  const [tabMode, setTabMode] = useState<TabMode>('directory');
  const [members, setMembers] = useState<FamilyMemberRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FAMILY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_FAMILY_MEMBERS;
  });

  // Activity Session State
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [activityScore, setActivityScore] = useState({ correct: 0, total: 0 });
  const [showActivitySummary, setShowActivitySummary] = useState(false);
  const [activityStartTime, setActivityStartTime] = useState<number>(0);

  // Sync with localStorage periodically if caregiver updates in another tab
  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_FAMILY);
        if (stored) setMembers(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const speakMember = (m: FamilyMemberRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const rel = getRelationshipLabel(m.relationship);
    const bio = getMemberBio(m.id, m.contextMemory);
    const nameDisplay = getMemberDisplayName(m.id, m.name);
    const textToSpeak = LocalizationService.getFamilySpeech(nameDisplay.primary, rel, bio, language);
    SpeechService.speak(textToSpeak, 0.85, language as any);
  };

  // ----------------------------------------------------
  // ACTIVITY ENGINE (Patient Practice & Observation)
  // ----------------------------------------------------
  const handleStartActivity = (type: ActivityType) => {
    setSelectedActivity(type);
    setActiveQuestionIdx(0);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setActivityScore({ correct: 0, total: 0 });
    setShowActivitySummary(false);
    setActivityStartTime(Date.now());

    // Prompt user in caregiver-configured language
    SpeechService.speakDomainInstruction('recognition');
  };

  const currentActivityMember = members[activeQuestionIdx % members.length] || members[0];

  // Options generator for multiple choice
  const getChoicesForQuestion = (member: FamilyMemberRecord, type: ActivityType): { choices: string[]; correctAnswer: string } => {
    if (type === 'match_relationship') {
      const correct = member.relationship;
      const others = Array.from(new Set(members.map((m) => m.relationship).filter((r) => r !== correct))).slice(0, 2);
      const choices = [correct, ...others, 'Friend'].slice(0, 4);
      // Deterministic sort based on length so it's consistent
      return {
        choices: choices.sort(() => (member.name.length % 2 === 0 ? 1 : -1)),
        correctAnswer: correct,
      };
    }

    // Default: Identify person name
    const correct = member.name;
    const distractors = members.filter((m) => m.id !== member.id).map((m) => m.name).slice(0, 2);
    const choices = [correct, ...distractors, 'Not Sure'];
    return {
      choices: choices.sort(() => (member.id.length % 2 === 0 ? 1 : -1)),
      correctAnswer: correct,
    };
  };

  const { choices, correctAnswer } = currentActivityMember
    ? getChoicesForQuestion(currentActivityMember, selectedActivity || 'who_is_this')
    : { choices: [], correctAnswer: '' };

  const handleSelectAnswer = (choice: string, correct: string) => {
    if (hasAnswered) return;
    setSelectedAnswer(choice);
    setHasAnswered(true);

    const isCorrect = choice === correct;
    setActivityScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    SpeechService.speakFeedback(isCorrect ? 'correct' : 'incorrect');

    // Update member recognition tracking
    const updatedMembers = members.map((m) => {
      if (m.id === currentActivityMember.id) {
        return {
          ...m,
          recognitionAttempts: m.recognitionAttempts + 1,
          recognitionSuccesses: m.recognitionSuccesses + (isCorrect ? 1 : 0),
          lastTestedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    setMembers(updatedMembers);
    try {
      localStorage.setItem(STORAGE_KEY_FAMILY, JSON.stringify(updatedMembers));
    } catch {}

    // Record Observation in Core Personalization Model (Domain: Recognition)
    try {
      const observation: CognitiveObservation = {
        id: crypto.randomUUID(),
        patientId: 'patient-ner-001',
        domain: 'recognition',
        taskId: 'family_recognition',
        difficulty: 1,
        metrics: {
          rawScore: isCorrect ? 1.0 : 0.0,
          itemsPresented: 1,
          itemsCorrect: isCorrect ? 1 : 0,
          completionTimeMs: Math.max(1000, Date.now() - activityStartTime),
          hesitationCount: isCorrect ? 0 : 1,
          cueAssistanceCount: 0,
        },
        timestamp: new Date().toISOString(),
        context: 'routine',
      };

      OfflineStorageService.recordObservation(observation);
      if (onRefreshParent) onRefreshParent();
    } catch (e) {
      console.warn('Failed recording family recognition observation:', e);
    }
  };

  const isAdvancingRef = React.useRef<boolean>(false);

  const handleNextQuestion = () => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setTimeout(() => {
      isAdvancingRef.current = false;
    }, 350);

    if (activeQuestionIdx + 1 >= Math.min(4, members.length)) {
      setShowActivitySummary(true);
    } else {
      setActiveQuestionIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
    }
  };

  // ----------------------------------------------------
  // RENDER: ACTIVE ACTIVITY SESSION
  // ----------------------------------------------------
  if (selectedActivity) {
    if (showActivitySummary) {
      const pct = Math.round((activityScore.correct / Math.max(1, activityScore.total)) * 100);
      return (
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', paddingBottom: 80 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 32,
              border: '2px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(18, 59, 99, 0.06)',
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 12 }}>🌸</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#17324D', margin: '0 0 8px 0' }}>
              Great Family Practice!
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', margin: '0 0 24px 0' }}>
              You recognized {activityScore.correct} out of {activityScore.total} family details.
            </p>

            <div
              style={{
                backgroundColor: '#FBE8EE',
                border: '2px solid #F6A6A6',
                borderRadius: 18,
                padding: '16px 20px',
                marginBottom: 24,
                display: 'inline-block',
                minWidth: 200,
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 900, color: '#9C2754' }}>{pct}%</div>
              <div style={{ fontSize: 13, color: '#B83267', fontWeight: 700 }}>
                Recognition Accuracy
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                style={{
                  backgroundColor: '#1677D2',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 14,
                  padding: '14px 28px',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(22, 119, 210, 0.25)',
                }}
              >
                Return to Family Cards ✓
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 80 }}>
        {/* Top Header of Activity */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setSelectedActivity(null)}
            style={{
              border: 'none',
              background: '#FFFFFF',
              borderRadius: 12,
              width: 44,
              height: 44,
              fontSize: 22,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              color: '#123B63',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ‹
          </button>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#17324D' }}>
              {selectedActivity === 'who_is_this' && (
                language === 'hi' ? 'यह कौन हैं? (Who is this?)' : language === 'kn' ? 'ಇವರು ಯಾರು? (Who is this?)' : 'Who is this?'
              )}
              {selectedActivity === 'match_face_name' && (
                language === 'hi' ? 'चेहरा और नाम मिलान (Match Face ➔ Name)' : language === 'kn' ? 'ಮುಖ ಮತ್ತು ಹೆಸರು ಹೊಂದಾಣಿಕೆ (Match Face ➔ Name)' : 'Match Face ➔ Name'
              )}
              {selectedActivity === 'match_relationship' && (
                language === 'hi' ? 'पारिवारिक संबंध पहचान (Match Relationship)' : language === 'kn' ? 'ಕುಟುಂಬದ ಸಂಬಂಧ ಗುರುತಿಸುವಿಕೆ (Match Relationship)' : 'Match Relationship'
              )}
              {selectedActivity === 'memory_recall' && (
                language === 'hi' ? 'पारिवारिक स्मृति स्मरण (Family Memory Recall)' : language === 'kn' ? 'ಕುಟುಂಬದ ನೆನಪಿನ ಶಕ್ತಿ (Family Memory Recall)' : 'Family Memory Recall'
              )}
            </h2>
            <span style={{ fontSize: 13, color: '#64748B' }}>
              {language === 'hi'
                ? `कार्ड ${activeQuestionIdx + 1} / ${Math.min(4, members.length)}`
                : language === 'kn'
                ? `ಕಾರ್ಡ್ ${activeQuestionIdx + 1} / ${Math.min(4, members.length)}`
                : `Card ${activeQuestionIdx + 1} of ${Math.min(4, members.length)}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => speakMember(currentActivityMember)}
            style={{
              border: 'none',
              background: '#EAF4FF',
              color: '#1677D2',
              borderRadius: 12,
              width: 44,
              height: 44,
              fontSize: 20,
              cursor: 'pointer',
            }}
            title="Read question aloud"
          >
            🔊
          </button>
        </div>

        {/* Question Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 24,
            border: '2px solid #DDE5ED',
            boxShadow: '0 4px 16px rgba(18, 59, 99, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          {currentActivityMember.photoUrl ? (
            <img
              src={currentActivityMember.photoUrl}
              alt={currentActivityMember.name}
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                objectFit: 'cover',
                border: '4px solid #1677D2',
                marginBottom: 16,
              }}
            />
          ) : (
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: '#FBE8EE',
                border: '4px solid #F6A6A6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 72,
                marginBottom: 16,
              }}
            >
              {currentActivityMember.avatarEmoji}
            </div>
          )}

          {selectedActivity === 'memory_recall' && (
            <p
              style={{
                margin: '0 0 12px 0',
                fontSize: 17,
                color: '#17324D',
                textAlign: 'center',
                lineHeight: 1.45,
                fontWeight: 600,
                backgroundColor: '#F7F9FC',
                padding: '12px 16px',
                borderRadius: 14,
              }}
            >
              "{getMemberBio(currentActivityMember.id, currentActivityMember.contextMemory)}"
            </p>
          )}

          <span style={{ fontSize: 15, color: '#64748B', fontWeight: 600 }}>
            {selectedActivity === 'match_relationship'
              ? (language === 'hi'
                  ? `व्यक्ति: ${getMemberDisplayName(currentActivityMember.id, currentActivityMember.name).primary}`
                  : language === 'kn'
                  ? `ವ್ಯಕ್ತಿ: ${getMemberDisplayName(currentActivityMember.id, currentActivityMember.name).primary}`
                  : `Person: ${currentActivityMember.name}`)
              : (language === 'hi'
                  ? 'नीचे सही विकल्प चुनें'
                  : language === 'kn'
                  ? 'ಕೆಳಗಿನ ಸರಿಯಾದ ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ'
                  : 'Choose the correct answer below')}
          </span>
        </div>

        {/* Multiple Choice Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {choices.map((opt) => {
            let btnBg = '#FFFFFF';
            let btnBorder = '#DDE5ED';
            let textColor = '#17324D';

            if (hasAnswered) {
              if (opt === correctAnswer) {
                btnBg = '#E8F7EF';
                btnBorder = '#42B883';
                textColor = '#2E7D32';
              } else if (opt === selectedAnswer) {
                btnBg = '#FFF7DC';
                btnBorder = '#F5C451';
                textColor = '#B7791F';
              }
            }

            const displayLabel = selectedActivity === 'match_relationship'
              ? getRelationshipLabel(opt)
              : opt;

            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectAnswer(opt, correctAnswer)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: btnBg,
                  border: `2px solid ${btnBorder}`,
                  borderRadius: 18,
                  padding: '16px 22px',
                  fontSize: 18,
                  fontWeight: 700,
                  color: textColor,
                  cursor: hasAnswered ? 'default' : 'pointer',
                  boxShadow: '0 2px 6px rgba(18, 59, 99, 0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{displayLabel}</span>
                {hasAnswered && opt === correctAnswer && (
                  <span style={{ color: '#42B883', fontSize: 20 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Next Question Button */}
        {hasAnswered && (
          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={isAdvancingRef.current}
              style={{
                width: '100%',
                backgroundColor: '#1677D2',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 16,
                padding: '16px',
                fontSize: 17,
                fontWeight: 800,
                cursor: isAdvancingRef.current ? 'default' : 'pointer',
                opacity: isAdvancingRef.current ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(22, 119, 210, 0.25)',
              }}
            >
              Continue to Next Card ➔
            </button>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: DIRECTORY & HUB VIEW (READ-ONLY PATIENT MODE)
  // ----------------------------------------------------
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 90 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Go Back"
          style={{
            border: 'none',
            background: '#FFFFFF',
            borderRadius: 12,
            width: 44,
            height: 44,
            fontSize: 22,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            color: '#123B63',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#17324D' }}>
            {t('family.title')}
          </h2>
          <span style={{ fontSize: 14, color: '#64748B' }}>
            {t('family.subtitle')}
          </span>
        </div>
        <div
          style={{
            backgroundColor: '#F1F5F9',
            color: '#475569',
            padding: '6px 12px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          title="Family cards are managed by your caregiver or doctor"
        >
          <span>🔒 Caregiver Managed</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#E2E8F0',
          borderRadius: 14,
          padding: 4,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={() => setTabMode('directory')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: tabMode === 'directory' ? '#1677D2' : 'transparent',
            color: tabMode === 'directory' ? '#FFFFFF' : '#64748B',
            transition: 'all 0.15s ease',
          }}
        >
          👨‍👩‍👧 {t('family.directory')} ({members.length})
        </button>
        <button
          type="button"
          onClick={() => setTabMode('activities')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: tabMode === 'activities' ? '#1677D2' : 'transparent',
            color: tabMode === 'activities' ? '#FFFFFF' : '#64748B',
            transition: 'all 0.15s ease',
          }}
        >
          🎮 {t('family.activities')}
        </button>
        <button
          type="button"
          onClick={() => setTabMode('privacy')}
          style={{
            flex: 0.8,
            padding: '10px 0',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: tabMode === 'privacy' ? '#1677D2' : 'transparent',
            color: tabMode === 'privacy' ? '#FFFFFF' : '#64748B',
            transition: 'all 0.15s ease',
          }}
        >
          🔒 {t('family.privacy')}
        </button>
      </div>

      {/* TAB 1: FAMILY DIRECTORY (READ-ONLY) */}
      {tabMode === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Read-Only Informational Banner */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #DDE5ED',
              borderRadius: 16,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#475569',
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <strong>Managed by Caregiver:</strong> Family members and photos are configured through the Caregiver Dashboard. Tap any card or the speaker button to hear their story.
            </div>
          </div>

          {members.map((m) => {
            const accuracy =
              m.recognitionAttempts > 0
                ? Math.round((m.recognitionSuccesses / m.recognitionAttempts) * 100)
                : null;
            const nameDisplay = getMemberDisplayName(m.id, m.name);
            const localizedRel = getRelationshipLabel(m.relationship);
            const localizedBio = getMemberBio(m.id, m.contextMemory);

            return (
              <div
                key={m.id}
                onClick={() => speakMember(m)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 22,
                  padding: '18px 20px',
                  border: '2px solid #DDE5ED',
                  boxShadow: '0 2px 10px rgba(18, 59, 99, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
              >
                {/* Left: Avatar & Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {m.photoUrl ? (
                    <img
                      src={m.photoUrl}
                      alt={m.name}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        objectFit: 'cover',
                        border: '2.5px solid #1677D2',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 22,
                        backgroundColor: '#FBE8EE',
                        border: '2px solid #F6A6A6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 34,
                      }}
                    >
                      {m.avatarEmoji}
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: '#17324D' }}>
                          {nameDisplay.primary}
                        </h3>
                        {nameDisplay.secondary && (
                          <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                            {nameDisplay.secondary}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          backgroundColor: '#EAF4FF',
                          color: '#1677D2',
                          padding: '2px 8px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {localizedRel}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748B', maxWidth: 380, lineHeight: 1.35 }}>
                      {localizedBio}
                    </p>
                    {accuracy !== null && (
                      <span style={{ fontSize: 12, color: accuracy >= 70 ? '#2E7D32' : '#C2185B', fontWeight: 700, display: 'block', marginTop: 4 }}>
                        {t('family.recognitionRate')}: {accuracy}% ({m.recognitionSuccesses}/{m.recognitionAttempts})
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Read-Only Actions (Speaker only, NO edit/delete buttons) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={(e) => speakMember(m, e)}
                    style={{
                      border: 'none',
                      backgroundColor: '#EAF4FF',
                      color: '#1677D2',
                      width: 46,
                      height: 46,
                      borderRadius: 16,
                      fontSize: 20,
                      cursor: 'pointer',
                    }}
                    title="Speak Name & Story"
                  >
                    🔊
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: RECOGNITION COGNITIVE ACTIVITIES */}
      {tabMode === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              padding: 20,
              border: '2px solid #DDE5ED',
              boxShadow: '0 2px 10px rgba(18, 59, 99, 0.04)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0', color: '#17324D' }}>
              Personalized Family Recognition Training
            </h3>
            <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
              These 4 activities adapt automatically based on your responses, training face recognition and memory recall.
            </p>
          </div>

          {/* Activity 1: Who is this? */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              padding: 20,
              border: '2px solid #F6A6A6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: '#FBE8EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                }}
              >
                🖼️
              </div>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: 17, fontWeight: 800, color: '#17324D' }}>
                  Activity 1: Who is this?
                </h4>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Identify the family member from their photo
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleStartActivity('who_is_this')}
              style={{
                backgroundColor: '#FBE8EE',
                color: '#9C2754',
                border: '1.5px solid #F6A6A6',
                borderRadius: 14,
                padding: '10px 18px',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Play ▶
            </button>
          </div>

          {/* Activity 2: Match Face -> Name */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              padding: 20,
              border: '2px solid #90CAF9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: '#EAF4FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                }}
              >
                👤
              </div>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: 17, fontWeight: 800, color: '#17324D' }}>
                  Activity 2: Match Face ➔ Name
                </h4>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Match photos with familiar names
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleStartActivity('match_face_name')}
              style={{
                backgroundColor: '#EAF4FF',
                color: '#1677D2',
                border: '1.5px solid #90CAF9',
                borderRadius: 14,
                padding: '10px 18px',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Play ▶
            </button>
          </div>

          {/* Activity 3: Match Relationship */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              padding: 20,
              border: '2px solid #A5D6A7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: '#E8F7EF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                }}
              >
                🤝
              </div>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: 17, fontWeight: 800, color: '#17324D' }}>
                  Activity 3: Match Relationship
                </h4>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Who is this person to you? (Daughter, Cousin, etc.)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleStartActivity('match_relationship')}
              style={{
                backgroundColor: '#E8F7EF',
                color: '#2E7D32',
                border: '1.5px solid #A5D6A7',
                borderRadius: 14,
                padding: '10px 18px',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Play ▶
            </button>
          </div>

          {/* Activity 4: Family Memory Recall */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              padding: 20,
              border: '2px solid #FFE082',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: '#FFF7DC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                }}
              >
                📖
              </div>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: 17, fontWeight: 800, color: '#17324D' }}>
                  Activity 4: Family Memory Recall
                </h4>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Recall who visits on Sundays or shares stories
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleStartActivity('memory_recall')}
              style={{
                backgroundColor: '#FFF7DC',
                color: '#B7791F',
                border: '1.5px solid #FFE082',
                borderRadius: 14,
                padding: '10px 18px',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Play ▶
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: PRIVACY & CONSENT */}
      {tabMode === 'privacy' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 24,
            border: '2px solid #DDE5ED',
            boxShadow: '0 4px 16px rgba(18, 59, 99, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>🛡️</span>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#17324D' }}>
                Privacy & Data Protection Notice
              </h3>
              <span style={{ fontSize: 13, color: '#64748B' }}>
                Family photos remain 100% on this local device
              </span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#E8F7EF',
              border: '1.5px solid #A5D6A7',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 16,
              fontSize: 14,
              color: '#1B5E20',
              lineHeight: 1.5,
            }}
          >
            🔒 <strong>Strict Offline Guarantee:</strong> All family photographs, names, and memory stories are stored exclusively in encrypted on-device storage. They are never transmitted over the internet or used for public AI training.
          </div>

          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
            • Only authorized family caregivers and clinicians can configure or remove family profiles.<br />
            • Photo and voice consent can be managed anytime by your caregiver.<br />
            • All recognition activities are designed to support familiar memory, not clinical diagnosis.
          </p>
        </div>
      )}
    </div>
  );
};
