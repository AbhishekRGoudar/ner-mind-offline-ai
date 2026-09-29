import React, { useState, useEffect } from 'react';
import {
  CognitiveObservation,
  CognitiveDomain,
  PersonalizationEngine,
  recommendNextTrainingSession,
  calculateCognitiveProfile,
} from '@ner-mind/core';
import { OfflineStorageService } from '../storage/localStorage.js';
import { SpeechService } from '../audio/speechService.js';
import { MemoryShoppingRecall } from '../games/MemoryShoppingRecall.js';
import { SequencingTeaRoutine } from '../games/SequencingTeaRoutine.js';
import { AttentionCraftPattern } from '../games/AttentionCraftPattern.js';
import { RecognitionHouseholdObjects } from '../games/RecognitionHouseholdObjects.js';
import { CalculationMarketChange } from '../games/CalculationMarketChange.js';
import { PlanningDaySchedule } from '../games/PlanningDaySchedule.js';
import { useLocalization } from '../localization';
import { ErrorBoundary } from './ErrorBoundary.js';

export interface ActiveSessionState {
  sessionId: string;
  domain: CognitiveDomain;
  taskId: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  startDifficulty: number;
  currentDifficulty: number;
  observations: CognitiveObservation[];
  streak: number;
  correctCount: number;
  totalResponseTimeMs: number;
  sessionFingerprints: string[];
  createdAt: string;
  updatedAt: string;
}

export const STORAGE_KEY_ACTIVE_SESSION = 'ner_mind_active_session';

export const DOMAIN_METADATA: Record<CognitiveDomain, {
  icon: string;
  title: string;
  subtitle: string;
  context: string;
  taskId: string;
}> = {
  memory: {
    icon: '🧺',
    title: 'Memory Training',
    subtitle: 'Market & Household Recall',
    context: 'Context: Market',
    taskId: 'market_shopping_recall',
  },
  sequencing: {
    icon: '🫖',
    title: 'Sequencing Training',
    subtitle: 'Daily Routine: Traditional Assam Tea Preparation',
    context: 'Context: Kitchen',
    taskId: 'morning_tea_sequence',
  },
  attention: {
    icon: '🧶',
    title: 'Attention Training',
    subtitle: 'Traditional Gamusa Weaving Diamond Pattern Search',
    context: 'Context: Craft',
    taskId: 'craft_pattern_cancellation',
  },
  recognition: {
    icon: '🏡',
    title: 'Recognition Training',
    subtitle: 'Familiar NER Objects (Jaapi, bell metal bowl, Gamusa)',
    context: 'Context: Home',
    taskId: 'household_object_identification',
  },
  calculation: {
    icon: '🪙',
    title: 'Calculation Training',
    subtitle: 'Local Market Grocery Total and Change Calculation',
    context: 'Context: Market',
    taskId: 'market_change_calculation',
  },
  planning: {
    icon: '📅',
    title: 'Planning Training',
    subtitle: 'Daily Schedule Planner with Time Constraints',
    context: 'Context: Daily Living',
    taskId: 'day_schedule_planner',
  },
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Easy / Medium',
  3: 'Medium',
  4: 'Medium / Difficult',
  5: 'Difficult',
};

interface Props {
  domain: CognitiveDomain;
  initialDifficulty?: number;
  totalQuestions?: number;
  restoredSession?: ActiveSessionState | null;
  onExit: () => void;
  onSessionComplete?: (observations: CognitiveObservation[]) => void;
}

export const CognitiveSessionSubFrame: React.FC<Props> = ({
  domain,
  initialDifficulty = 1,
  totalQuestions = 10,
  restoredSession = null,
  onExit,
  onSessionComplete,
}) => {
  const { t, formatBilingual } = useLocalization();
  const meta = DOMAIN_METADATA[domain];

  // Initialize session state
  const [sessionId, setSessionId] = useState<string>(() => restoredSession?.sessionId || crypto.randomUUID());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() => restoredSession?.currentQuestionIndex || 0);
  const [startDifficulty, setStartDifficulty] = useState<number>(() => restoredSession?.startDifficulty || initialDifficulty);
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(() => restoredSession?.currentDifficulty || initialDifficulty);
  const [observations, setObservations] = useState<CognitiveObservation[]>(() => restoredSession?.observations || []);
  const [streak, setStreak] = useState<number>(() => restoredSession?.streak || 0);
  const [correctCount, setCorrectCount] = useState<number>(() => restoredSession?.correctCount || 0);
  const [totalResponseTimeMs, setTotalResponseTimeMs] = useState<number>(() => restoredSession?.totalResponseTimeMs || 0);
  const [sessionFingerprints, setSessionFingerprints] = useState<string[]>(() => restoredSession?.sessionFingerprints || []);

  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isCorrect: boolean } | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [levelUpEvent, setLevelUpEvent] = useState<{ from: number; to: number } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [nextRecommendationDomain, setNextRecommendationDomain] = useState<string | null>(null);

  // Synchronize active session state to localStorage on state changes
  useEffect(() => {
    if (isCompleted) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
      return;
    }

    const state: ActiveSessionState = {
      sessionId,
      domain,
      taskId: meta.taskId,
      totalQuestions,
      currentQuestionIndex,
      startDifficulty,
      currentDifficulty,
      observations,
      streak,
      correctCount,
      totalResponseTimeMs,
      sessionFingerprints,
      createdAt: restoredSession?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, JSON.stringify(state));
  }, [
    sessionId,
    domain,
    meta.taskId,
    totalQuestions,
    currentQuestionIndex,
    startDifficulty,
    currentDifficulty,
    observations,
    streak,
    correctCount,
    totalResponseTimeMs,
    sessionFingerprints,
    isCompleted,
    restoredSession,
  ]);

  // Derived real-time performance metrics
  const completedCount = observations.length;
  const accuracy = completedCount > 0 ? Math.round((correctCount / completedCount) * 100) : 100;
  const avgResponseTimeSec = completedCount > 0 ? (totalResponseTimeMs / completedCount / 1000).toFixed(1) : '0.0';
  const independentCount = observations.filter((o: CognitiveObservation) => (o.metrics.cueAssistanceCount || 0) === 0).length;

  const currentModel = OfflineStorageService.getPersonalModel();
  const domainBelief = currentModel?.domainBeliefs?.[domain];
  const isMasteryMode = currentDifficulty === 5 && (domainBelief?.adaptationMode === 'mastery' || (domainBelief?.consecutiveHighSessionsAtL5 || 0) >= 3);

  // Elderly-friendly non-diagnostic adaptive guidance text
  const getAdaptiveGuidance = () => {
    if (isMasteryMode) {
      return {
        title: 'Maintaining Your Progress',
        body: "You're continuing with advanced activities while we check how consistently you perform across different situations.",
      };
    }
    if (completedCount < 3) {
      return {
        title: 'Getting to know your performance',
        body: 'More observations are needed before making a larger difficulty adjustment.',
      };
    }
    if (accuracy >= 80 && streak >= 2) {
      return {
        title: 'Good progress',
        body: 'Your recent performance is strong. The next task may be slightly more challenging.',
      };
    }
    if (accuracy <= 50) {
      return {
        title: "Let's take it easier",
        body: 'Recent responses indicate that the current difficulty may be challenging.',
      };
    }
    return {
      title: 'Steady performance',
      body: 'You are maintaining a consistent pace. Keep going at your comfortable speed.',
    };
  };

  const guidance = getAdaptiveGuidance();

  // Ref locks to prevent duplicate question completions or race-conditioned skipping
  const isAdvancingRef = React.useRef<boolean>(false);
  const advanceTimerRef = React.useRef<any>(null);

  // Reset advancing lock whenever question index transitions
  useEffect(() => {
    isAdvancingRef.current = false;
  }, [currentQuestionIndex]);

  // Clean up any pending advance timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  // Announce domain instruction once on session start
  useEffect(() => {
    if (currentQuestionIndex === 0 && !restoredSession) {
      SpeechService.speakDomainInstruction(domain);
    }
  }, []);

  // Handle completion of a single question
  const handleQuestionComplete = async (obs: CognitiveObservation) => {
    // Atomic lock to guarantee no question can be completed twice or skipped
    if (isAdvancingRef.current) {
      return;
    }
    isAdvancingRef.current = true;

    const isCorrect = obs.metrics.rawScore >= 0.8;
    const newStreak = isCorrect ? streak + 1 : 0;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    const newTotalTime = totalResponseTimeMs + (obs.metrics.completionTimeMs || 0);
    const updatedObsList = [...observations, obs];

    setStreak(newStreak);
    setCorrectCount(newCorrectCount);
    setTotalResponseTimeMs(newTotalTime);
    setObservations(updatedObsList);

    // 1. Persist observation to IndexedDB
    await OfflineStorageService.recordObservation(obs);

    // 2. Update Bayesian Personal Model locally
    const currentModel = OfflineStorageService.getPersonalModel();
    const updatedModel = PersonalizationEngine.updatePersonalModel(currentModel, obs);
    await OfflineStorageService.savePersonalModel(updatedModel);

    // 3. Keep difficulty locked for all 10 questions of the active session!
    // Level progression occurs only after completing the full session.

    const recentFingerprints = OfflineStorageService.getRecentTaskFingerprints(undefined, domain);
    setSessionFingerprints(prev => Array.from(new Set([...prev, ...recentFingerprints, obs.taskId, `ctx:${obs.context}`])));

    // 4. Show calm feedback & speak localized encouragement
    setFeedbackMessage({
      text: isCorrect ? 'Correct ✓' : "Let's try the next one.",
      isCorrect,
    });
    SpeechService.stop();
    SpeechService.speakFeedback(isCorrect ? 'correct' : 'incorrect');

    // 5. Auto-advance after calm interval or transition to summary
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
    }
    advanceTimerRef.current = setTimeout(async () => {
      setFeedbackMessage(null);
      if (updatedObsList.length >= totalQuestions) {
        // Session Complete
        localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);

        // Evaluate session-level mastery and level progression (Level 1 -> 2, etc.)
        const finalSessionAccuracy = totalQuestions > 0 ? (newCorrectCount / totalQuestions) : 0;
        let nextDiff = startDifficulty;
        let leveledUp = false;

        const latestModel = OfflineStorageService.getPersonalModel();
        if (latestModel && latestModel.domainBeliefs && latestModel.domainBeliefs[domain]) {
          const belief = latestModel.domainBeliefs[domain];
          if (finalSessionAccuracy >= 0.70) {
            // High performance (70%+ or 7+/10) unlocks level progression to next level
            if (startDifficulty < 5) {
              nextDiff = Math.min(5, startDifficulty + 1);
              belief.activeDifficulty = nextDiff;
              belief.cooldownRemainingSessions = 0;
              belief.lastUpdated = new Date().toISOString();
              leveledUp = true;

              if (!latestModel.adaptationHistory) {
                latestModel.adaptationHistory = [];
              }
              latestModel.adaptationHistory.unshift({
                timestamp: new Date().toISOString(),
                domain,
                previousDifficulty: startDifficulty,
                newDifficulty: nextDiff,
                decision: 'increase',
                mode: nextDiff === 5 ? 'maintenance' : 'progression',
                rationale: `Completed 10-question session with ${(finalSessionAccuracy * 100).toFixed(0)}% accuracy (${newCorrectCount}/${totalQuestions}). Level up from Level ${startDifficulty} to Level ${nextDiff}!`,
              });
            } else {
              nextDiff = 5;
              belief.activeDifficulty = 5;
            }
          } else if (finalSessionAccuracy < 0.40 && startDifficulty > 1) {
            nextDiff = Math.max(1, startDifficulty - 1);
            belief.activeDifficulty = nextDiff;
            belief.lastUpdated = new Date().toISOString();
          }
          await OfflineStorageService.savePersonalModel(latestModel);
        }

        setCurrentDifficulty(nextDiff);
        if (leveledUp) {
          setLevelUpEvent({ from: startDifficulty, to: nextDiff });
        }

        setIsCompleted(true);
        isAdvancingRef.current = false;
        SpeechService.stop();
        SpeechService.speakFeedback('summary', newCorrectCount, totalQuestions);

        // Compute next recommended activity
        const allObs = OfflineStorageService.getObservations();
        const patientProfile = OfflineStorageService.getPatientProfile();
        const cogProfile = calculateCognitiveProfile(patientProfile.patientId, allObs);
        const rec = recommendNextTrainingSession(cogProfile, allObs);
        setNextRecommendationDomain(rec.priorityDomain);

        if (onSessionComplete) {
          onSessionComplete(updatedObsList);
        }
      } else {
        setCurrentQuestionIndex((prev: number) => prev + 1);
        // Ensure atomic lock releases for next question
        setTimeout(() => {
          isAdvancingRef.current = false;
        }, 80);
      }
    }, 1200);
  };

  const handleStartNextLevel = (nextDifficulty: number) => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
    }
    isAdvancingRef.current = false;
    localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    setCurrentQuestionIndex(0);
    setStartDifficulty(nextDifficulty);
    setCurrentDifficulty(nextDifficulty);
    setObservations([]);
    setStreak(0);
    setCorrectCount(0);
    setTotalResponseTimeMs(0);
    setSessionFingerprints([]);
    setFeedbackMessage(null);
    setLevelUpEvent(null);
    setIsCompleted(false);
    SpeechService.stop();
    SpeechService.speakDomainInstruction(domain);
  };

  const handleConfirmExit = () => {
    SpeechService.stop();
    localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
    onExit();
  };

  // ----------------------------------------------------
  // RENDER: SESSION COMPLETE SUMMARY VIEW
  // ----------------------------------------------------
  if (isCompleted) {
    return (
      <div className="accessible-card" style={{
        maxWidth: 720,
        margin: '0 auto',
        border: '3px solid #42B883',
        background: '#FFFFFF',
        padding: '36px 32px',
        borderRadius: 24,
        boxShadow: '0 8px 30px rgba(66, 184, 131, 0.12)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FFF7DC',
              border: '3px solid #F5C451',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
              margin: '0 auto 16px auto',
            }}
          >
            😊
          </div>
          <h2 style={{ fontSize: 32, color: '#17324D', margin: '0 0 8px 0', fontWeight: 900 }}>
            Great Job!
          </h2>
          <p style={{ fontSize: 18, color: '#42B883', fontWeight: 700, margin: '0 0 4px 0' }}>
            You completed today's {meta.title.toLowerCase()}!
          </p>
          <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>
            {meta.subtitle}
          </p>
        </div>

        {/* Celebration / Level Up Card */}
        {levelUpEvent && (
          <div style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '2.5px solid #10B981',
            borderRadius: 20,
            padding: '20px 24px',
            marginBottom: 24,
            textAlign: 'center',
            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.15)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>🎉 ⬆️ 🌟</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: '#065F46', margin: '0 0 6px 0' }}>
              Level Up Achieved!
            </h3>
            <p style={{ fontSize: 18, color: '#047857', fontWeight: 700, margin: '0 0 8px 0' }}>
              You advanced from Level {levelUpEvent.from} to Level {levelUpEvent.to} ({DIFFICULTY_LABELS[levelUpEvent.to]})!
            </p>
            <div style={{ fontSize: 15, color: '#064E3B' }}>
              Your strong performance ({correctCount} of {totalQuestions} correct) unlocked more engaging challenges for your next session.
            </div>
          </div>
        )}

        {/* Summary Metric Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}>
          <div style={{ background: '#F7F9FC', borderRadius: 16, padding: 18, border: '1.5px solid #DDE5ED' }}>
            <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>Questions completed</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#17324D', marginTop: 4 }}>
              {totalQuestions} / {totalQuestions}
            </div>
          </div>

          <div style={{ background: '#F7F9FC', borderRadius: 16, padding: 18, border: '1.5px solid #DDE5ED' }}>
            <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>Accuracy</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1677D2', marginTop: 4 }}>
              {accuracy}%
            </div>
          </div>

          <div style={{ background: '#F7F9FC', borderRadius: 16, padding: 18, border: '1.5px solid #DDE5ED' }}>
            <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>Average response time</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#17324D', marginTop: 4 }}>
              {avgResponseTimeSec} sec
            </div>
          </div>

          {isMasteryMode || currentDifficulty === 5 ? (
            <>
              <div style={{ background: '#FFF7DC', borderRadius: 16, padding: 18, border: '1.5px solid #F5C451' }}>
                <div style={{ fontSize: 14, color: '#8D6B00', fontWeight: 700 }}>Difficulty & Mode</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#8D6B00', marginTop: 6 }}>
                  Level 5 • Mastery Mode
                </div>
                <div style={{ fontSize: 13, color: '#A07800', marginTop: 2 }}>
                  Maintaining Your Progress
                </div>
              </div>

              <div style={{ background: '#F7F9FC', borderRadius: 16, padding: 18, border: '1.5px solid #DDE5ED' }}>
                <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>Contexts Tested</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#17324D', marginTop: 6 }}>
                  {Array.from(new Set(observations.map(o => o.context).filter(Boolean))).map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' · ') || 'Market · Kitchen · Home'}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Cross-context consistency
                </div>
              </div>

              <div style={{ background: '#E8F7EF', borderRadius: 16, padding: 18, border: '1.5px solid #A5D6A7' }}>
                <div style={{ fontSize: 14, color: '#2E7D32', fontWeight: 700 }}>Personalization Model</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2E7D32', marginTop: 6 }}>
                  Updated Locally ✓
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: '#F7F9FC', borderRadius: 16, padding: 18, border: '1.5px solid #DDE5ED' }}>
                <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>Difficulty Progression</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#17324D', marginTop: 6 }}>
                  Level {startDifficulty} ➔ Level {currentDifficulty}
                </div>
                <div style={{ fontSize: 13, color: '#1677D2', fontWeight: 700 }}>
                  {DIFFICULTY_LABELS[currentDifficulty]}
                </div>
              </div>

              <div style={{ background: '#F7F9FC', borderRadius: 16, padding: 18, border: '1.5px solid #DDE5ED' }}>
                <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>Independent completion</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#17324D', marginTop: 4 }}>
                  {independentCount} / {totalQuestions}
                </div>
              </div>

              <div style={{ background: '#E8F7EF', borderRadius: 16, padding: 18, border: '1.5px solid #A5D6A7' }}>
                <div style={{ fontSize: 14, color: '#2E7D32', fontWeight: 700 }}>Personalization Model</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2E7D32', marginTop: 6 }}>
                  Updated Locally ✓
                </div>
              </div>
            </>
          )}
        </div>

        {/* Next Recommendation / Real-Life Transfer */}
        <div style={{
          background: (isMasteryMode || currentDifficulty === 5) ? '#FFF7DC' : '#EAF4FF',
          border: `2px solid ${(isMasteryMode || currentDifficulty === 5) ? '#F5C451' : '#90CAF9'}`,
          borderRadius: 16,
          padding: 18,
          marginBottom: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>
            {(isMasteryMode || currentDifficulty === 5) ? 'Next Suggested Step:' : 'Next Recommended Activity:'}
          </div>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            color: (isMasteryMode || currentDifficulty === 5) ? '#8D6B00' : '#1677D2',
            textTransform: 'capitalize',
          }}>
            {(isMasteryMode || currentDifficulty === 5)
              ? 'Real-Life Shopping Mission 🛒'
              : (DOMAIN_METADATA[nextRecommendationDomain as CognitiveDomain]?.title || nextRecommendationDomain || 'Memory Training')}
          </div>
          {(isMasteryMode || currentDifficulty === 5) && (
            <div style={{ fontSize: 13, color: '#A07800', marginTop: 4 }}>
              Verifying whether Level 5 consistency transfers to everyday independence.
            </div>
          )}
        </div>

        {/* PROMINENT NEXT LEVEL QUESTION & SELECTION CARD */}
        <div style={{
          background: (accuracy >= 70 && startDifficulty < 5)
            ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
            : (startDifficulty === 5 ? '#FFF7DC' : '#F8FAFC'),
          border: `2.5px solid ${(accuracy >= 70 && startDifficulty < 5) ? '#10B981' : (startDifficulty === 5 ? '#F5C451' : '#CBD5E1')}`,
          borderRadius: 20,
          padding: '24px 22px',
          marginBottom: 16,
          textAlign: 'center',
          boxShadow: (accuracy >= 70 && startDifficulty < 5)
            ? '0 6px 20px rgba(16, 185, 129, 0.18)'
            : '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}>
          {accuracy >= 70 && startDifficulty < 5 ? (
            <>
              <div style={{ fontSize: 44, marginBottom: 8 }}>🎉 ⬆️ 🌟</div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: '#065F46', margin: '0 0 8px 0' }}>
                Level {startDifficulty} Completed!
              </h3>
              <p style={{ fontSize: 18, color: '#047857', fontWeight: 700, margin: '0 0 20px 0', lineHeight: 1.4 }}>
                You scored {correctCount} of {totalQuestions} correct ({accuracy}%).
                <br />
                Do you want to continue to <strong>Level {startDifficulty + 1} ({DIFFICULTY_LABELS[startDifficulty + 1]})</strong>?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  className="accessible-btn accessible-btn-primary"
                  onClick={() => handleStartNextLevel(startDifficulty + 1)}
                  style={{
                    width: '100%',
                    fontSize: 20,
                    minHeight: 60,
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 16,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  Start Level {startDifficulty + 1} (10 Questions) ➡️
                </button>
                <button
                  className="accessible-btn accessible-btn-secondary"
                  onClick={onExit}
                  style={{
                    width: '100%',
                    fontSize: 17,
                    minHeight: 50,
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #CBD5E1',
                    color: '#334155',
                    borderRadius: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Return to Games Menu 🏠
                </button>
              </div>
            </>
          ) : startDifficulty === 5 ? (
            <>
              <div style={{ fontSize: 44, marginBottom: 8 }}>👑 🌟 🏆</div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: '#8D6B00', margin: '0 0 8px 0' }}>
                Level 5 Mastery Completed!
              </h3>
              <p style={{ fontSize: 18, color: '#8D6B00', fontWeight: 700, margin: '0 0 20px 0', lineHeight: 1.4 }}>
                Outstanding work! You scored {correctCount} of {totalQuestions} ({accuracy}%).
                <br />
                Do you want to continue with another Level 5 Mastery session?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  className="accessible-btn accessible-btn-primary"
                  onClick={() => handleStartNextLevel(5)}
                  style={{
                    width: '100%',
                    fontSize: 20,
                    minHeight: 60,
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 16,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)',
                  }}
                >
                  Continue Level 5 Practice ➡️
                </button>
                <button
                  className="accessible-btn accessible-btn-secondary"
                  onClick={onExit}
                  style={{
                    width: '100%',
                    fontSize: 17,
                    minHeight: 50,
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #CBD5E1',
                    color: '#334155',
                    borderRadius: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Return to Games Menu 🏠
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 44, marginBottom: 8 }}>💪 🔁 🌱</div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: '#1E293B', margin: '0 0 8px 0' }}>
                Level {startDifficulty} Session Finished
              </h3>
              <p style={{ fontSize: 18, color: '#475569', fontWeight: 600, margin: '0 0 20px 0', lineHeight: 1.4 }}>
                You scored {correctCount} of {totalQuestions} ({accuracy}%).
                <br />
                Would you like to practice Level {startDifficulty} again to master these questions?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  className="accessible-btn accessible-btn-primary"
                  onClick={() => handleStartNextLevel(startDifficulty)}
                  style={{
                    width: '100%',
                    fontSize: 20,
                    minHeight: 60,
                    backgroundColor: '#1677D2',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 16,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 119, 210, 0.3)',
                  }}
                >
                  Practice Level {startDifficulty} Again (10 Questions) ↺
                </button>
                <button
                  className="accessible-btn accessible-btn-secondary"
                  onClick={onExit}
                  style={{
                    width: '100%',
                    fontSize: 17,
                    minHeight: 50,
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #CBD5E1',
                    color: '#334155',
                    borderRadius: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Return to Games Menu 🏠
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: CONTINUOUS COGNITIVE SUB-FRAME (QUESTIONS 1–10)
  // ----------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Back Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="accessible-btn accessible-btn-secondary"
          onClick={() => setShowExitConfirm(true)}
          style={{ minHeight: 48, padding: '8px 18px', fontSize: 17 }}
        >
          ← {t('common.back')}
        </button>
        <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>
          Session ID: {sessionId.slice(0, 8)}...
        </span>
      </div>

      {/* Main Sub-Frame Container */}
      <div className="accessible-card" style={{
        padding: 0,
        overflow: 'hidden',
        border: '2px solid #DDE5ED',
        background: '#FFFFFF',
        borderRadius: 24,
        boxShadow: '0 4px 20px rgba(18, 59, 99, 0.05)',
      }}>
        {/* SUB-FRAME HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          background: '#F7F9FC',
          borderBottom: '2px solid #DDE5ED',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          {/* Left: Domain icon & names */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 44 }}>{meta.icon}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#17324D' }}>
                  {formatBilingual(t(`games.${domain}`) || meta.title, meta.title)}
                </h2>
                <span style={{
                  background: '#EAF4FF',
                  color: '#1677D2',
                  padding: '3px 10px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                }}>
                  {meta.context}
                </span>
                <span style={{
                  background: isMasteryMode ? '#FFF7DC' : '#E8F7EF',
                  color: isMasteryMode ? '#8D6B00' : '#2E7D32',
                  padding: '3px 10px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  border: isMasteryMode ? '1px solid #F5C451' : 'none',
                }}>
                  {isMasteryMode ? 'Level 5 • Mastery Mode' : `Level ${currentDifficulty} • ${DIFFICULTY_LABELS[currentDifficulty]}`}
                </span>
                {isMasteryMode && (
                  <span style={{
                    background: '#EAF4FF',
                    color: '#1677D2',
                    padding: '3px 10px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}>
                    Maintaining Your Progress
                  </span>
                )}
              </div>
              <div style={{ fontSize: 16, color: '#64748B', marginTop: 4 }}>
                {meta.subtitle}
              </div>
            </div>
          </div>

          {/* Right: Exit Session Button */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="accessible-btn accessible-btn-secondary"
              onClick={() => SpeechService.speakDomainInstruction(domain)}
              style={{ minHeight: 46, padding: '6px 14px', fontSize: 16 }}
              aria-label="Read localized instruction"
            >
              🔊 Read Aloud
            </button>
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              style={{
                minHeight: 46,
                padding: '6px 18px',
                fontSize: 16,
                background: '#FBE8EE',
                border: '1.5px solid #F6A6A6',
                color: '#C2185B',
                borderRadius: 14,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Exit Session
            </button>
          </div>
        </div>

        {/* PROGRESS BAR STRIP */}
        <div style={{
          padding: '14px 24px',
          background: '#FFFFFF',
          borderBottom: '1px solid #DDE5ED',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1677D2' }}>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span style={{ fontSize: 15, color: '#64748B', fontWeight: 600 }}>
              {Math.round(((currentQuestionIndex) / totalQuestions) * 100)}% Completed
            </span>
          </div>
          <div style={{
            width: '100%',
            height: 12,
            background: '#EAF4FF',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${((currentQuestionIndex) / totalQuestions) * 100}%`,
              height: '100%',
              background: '#42B883',
              borderRadius: 6,
              transition: 'width 0.4s ease-out',
            }} />
          </div>
        </div>

        {/* FEEDBACK BANNER (IF ACTIVE) */}
        {feedbackMessage && (
          <div style={{
            padding: '16px 24px',
            background: feedbackMessage.isCorrect ? '#E8F7EF' : '#EAF4FF',
            borderBottom: `2px solid ${feedbackMessage.isCorrect ? '#42B883' : '#1677D2'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontSize: 20,
            fontWeight: 800,
            color: feedbackMessage.isCorrect ? '#2E7D32' : '#1677D2',
            animation: 'fadeIn 0.2s ease-in',
          }}>
            <span>{feedbackMessage.isCorrect ? '🎉' : '💙'}</span>
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* MAIN QUESTION & PERFORMANCE PANEL GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 280px',
          gap: 24,
          padding: 24,
        }}>
          {/* CENTER: CURRENT QUESTION AREA */}
          <div style={{ minWidth: 0 }}>
            <ErrorBoundary fallbackTitle="Cognitive Question">
              {domain === 'memory' && (
                <MemoryShoppingRecall
                  key={`${sessionId}-${currentQuestionIndex}`}
                  difficulty={currentDifficulty}
                  masteryMode={isMasteryMode}
                  sessionFingerprints={sessionFingerprints}
                  onComplete={handleQuestionComplete}
                  onExit={() => setShowExitConfirm(true)}
                  isSessionMode={true}
                />
              )}
              {domain === 'sequencing' && (
                <SequencingTeaRoutine
                  key={`${sessionId}-${currentQuestionIndex}`}
                  difficulty={currentDifficulty}
                  masteryMode={isMasteryMode}
                  sessionFingerprints={sessionFingerprints}
                  onComplete={handleQuestionComplete}
                  onExit={() => setShowExitConfirm(true)}
                  isSessionMode={true}
                />
              )}
              {domain === 'attention' && (
                <AttentionCraftPattern
                  key={`${sessionId}-${currentQuestionIndex}`}
                  difficulty={currentDifficulty}
                  masteryMode={isMasteryMode}
                  sessionFingerprints={sessionFingerprints}
                  onComplete={handleQuestionComplete}
                  onExit={() => setShowExitConfirm(true)}
                  isSessionMode={true}
                />
              )}
              {domain === 'recognition' && (
                <RecognitionHouseholdObjects
                  key={`${sessionId}-${currentQuestionIndex}`}
                  difficulty={currentDifficulty}
                  masteryMode={isMasteryMode}
                  sessionFingerprints={sessionFingerprints}
                  onComplete={handleQuestionComplete}
                  onExit={() => setShowExitConfirm(true)}
                  isSessionMode={true}
                />
              )}
              {domain === 'calculation' && (
                <CalculationMarketChange
                  key={`${sessionId}-${currentQuestionIndex}`}
                  difficulty={currentDifficulty}
                  masteryMode={isMasteryMode}
                  sessionFingerprints={sessionFingerprints}
                  onComplete={handleQuestionComplete}
                  onExit={() => setShowExitConfirm(true)}
                  isSessionMode={true}
                />
              )}
              {domain === 'planning' && (
                <PlanningDaySchedule
                  key={`${sessionId}-${currentQuestionIndex}`}
                  difficulty={currentDifficulty}
                  masteryMode={isMasteryMode}
                  sessionFingerprints={sessionFingerprints}
                  onComplete={handleQuestionComplete}
                  onExit={() => setShowExitConfirm(true)}
                  isSessionMode={true}
                />
              )}
            </ErrorBoundary>
          </div>

          {/* RIGHT SIDE: REAL-TIME PERFORMANCE & ADAPTIVE GUIDANCE PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Real-Time Performance Card */}
            <div style={{
              background: '#F7F9FC',
              border: '1.5px solid #DDE5ED',
              borderRadius: 18,
              padding: 18,
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px 0', color: '#17324D' }}>
                Current Performance
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Accuracy</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#1677D2' }}>
                    {accuracy}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Avg. Response Time</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#17324D' }}>
                    {avgResponseTimeSec} sec
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Current Streak</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#42B883' }}>
                    {streak} correct
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Current Level</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#17324D' }}>
                    Level {currentDifficulty}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>
                    {DIFFICULTY_LABELS[currentDifficulty]}
                  </div>
                </div>
              </div>
            </div>

            {/* Adaptive Guidance Card */}
            <div style={{
              background: '#EAF4FF',
              border: '1.5px solid #90CAF9',
              borderRadius: 18,
              padding: 18,
            }}>
              <div style={{ fontSize: 12, color: '#1677D2', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                Adaptive Guidance
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#123B63', marginBottom: 6 }}>
                {guidance.title}
              </div>
              <div style={{ fontSize: 14, color: '#17324D', lineHeight: 1.4 }}>
                {guidance.body}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EXIT CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(18, 59, 99, 0.4)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            background: '#FFFFFF',
            border: '2px solid #DDE5ED',
            borderRadius: 24,
            padding: 32,
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 16px 40px rgba(18, 59, 99, 0.15)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⏸️</div>
            <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 10px 0', color: '#17324D' }}>
              Do you want to end this session?
            </h3>
            <p style={{ fontSize: 16, color: '#64748B', marginBottom: 24 }}>
              Your completed activities will be saved locally.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                style={{
                  flex: 1,
                  minHeight: 50,
                  fontSize: 16,
                  fontWeight: 800,
                  backgroundColor: '#1677D2',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 14,
                  cursor: 'pointer',
                }}
              >
                Continue Session
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                style={{
                  flex: 1,
                  minHeight: 50,
                  fontSize: 16,
                  fontWeight: 700,
                  background: '#FBE8EE',
                  border: '1.5px solid #F6A6A6',
                  color: '#C2185B',
                  borderRadius: 14,
                  cursor: 'pointer',
                }}
              >
                Exit Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
