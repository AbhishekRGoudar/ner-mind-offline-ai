import React, { useState, useEffect } from 'react';
import { CognitiveObservation, TaskGenerator, GeneratedCognitiveTask } from '@ner-mind/core';
import { SpeechService } from '../audio/speechService.js';
import { OfflineStorageService } from '../storage/localStorage.js';
import { useLocalization } from '../localization';

interface Props {
  difficulty: number;
  masteryMode?: boolean;
  onComplete: (observation: CognitiveObservation) => void;
  onExit: () => void;
  isSessionMode?: boolean;
  sessionFingerprints?: string[];
}

type SequencingPhase = 'preview' | 'arrange';

const getStepText = (item: any): string => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.text || '';
};

const getStepIcon = (item: any): string => {
  if (!item || typeof item !== 'object') return '';
  return item.icon || '';
};

export const SequencingTeaRoutine: React.FC<Props> = ({ difficulty, masteryMode = false, onComplete, onExit, isSessionMode = false, sessionFingerprints = [] }) => {
  const { language } = useLocalization();
  const [task, setTask] = useState<GeneratedCognitiveTask | null>(null);
  const [phase, setPhase] = useState<SequencingPhase>('preview');
  const [orderedSteps, setOrderedSteps] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const isSubmittedRef = React.useRef<boolean>(false);
  const timerRef = React.useRef<any>(null);
  const questionDisplayedAt = React.useRef<number>(performance.now());

  useEffect(() => {
    isSubmittedRef.current = false;
    const recent = OfflineStorageService.getRecentTaskFingerprints(undefined, 'sequencing');
    const combinedRecent = Array.from(new Set([...(sessionFingerprints || []), ...recent]));
    const boundedDiff = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const generated = TaskGenerator.generateTask({
      domain: 'sequencing',
      difficulty: boundedDiff,
      masteryMode,
      recentFingerprints: combinedRecent,
      language,
    });

    setTask(generated);
    setPhase('preview');
    setOrderedSteps(generated.payload.shuffledSteps || []);
    setIsSubmitted(false);
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('sequencing');
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [difficulty, language, sessionFingerprints]);

  if (!task) {
    return <div style={{ padding: 24, color: '#1E293B', fontSize: 18 }}>Generating personalized sequencing activity...</div>;
  }

  const handleStartArranging = () => {
    // Strictly ensure steps are shuffled and not equal to the correct chronological order
    const correct = task?.payload.correctOrder || [];
    let shuffled = [...(task?.payload.shuffledSteps || orderedSteps)];
    if (correct.length >= 2) {
      let isSame = correct.every((c: any, i: number) => getStepText(c) === getStepText(shuffled[i]));
      let attempts = 0;
      while (isSame && attempts < 20) {
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        isSame = correct.every((c: any, i: number) => getStepText(c) === getStepText(shuffled[i]));
        attempts++;
      }
      if (isSame && shuffled.length >= 2) {
        const tmp = shuffled[0];
        shuffled[0] = shuffled[1];
        shuffled[1] = tmp;
      }
    }
    setOrderedSteps(shuffled);
    setPhase('arrange');
    questionDisplayedAt.current = performance.now();
  };

  const moveUp = (index: number) => {
    if (isSubmitted || isSubmittedRef.current || index === 0) return;
    const next = [...orderedSteps];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setOrderedSteps(next);
  };

  const moveDown = (index: number) => {
    if (isSubmitted || isSubmittedRef.current || index === orderedSteps.length - 1) return;
    const next = [...orderedSteps];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setOrderedSteps(next);
  };

  const handleVerify = () => {
    if (isSubmittedRef.current || isSubmitted) return;
    isSubmittedRef.current = true;
    setIsSubmitted(true);

    const elapsed = Math.max(0, Math.round(performance.now() - questionDisplayedAt.current));
    const stepTexts = orderedSteps.map(s => getStepText(s));
    const scoreResult = task.scoring(stepTexts);
    const profile = OfflineStorageService.getPatientProfile();

    // Record fingerprint in IndexedDB
    OfflineStorageService.recordTaskFingerprint(profile.patientId, 'sequencing', task.fingerprint);

    const observation: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: profile.patientId,
      domain: 'sequencing',
      taskId: 'morning_tea_sequence',
      timestamp: new Date().toISOString(),
      difficulty,
      context: task.context,
      metrics: {
        rawScore: scoreResult.rawScore,
        itemsPresented: scoreResult.itemsPresented,
        itemsCorrect: scoreResult.itemsCorrect,
        completionTimeMs: elapsed,
        hesitationCount: 0,
        cueAssistanceCount: 0,
      },
      environmentalFactors: {
        timeOfDay: 'morning',
        inputMethod: 'touch',
      },
    };

    if (!isSessionMode) {
      SpeechService.speakFeedback(scoreResult.rawScore === 1.0 ? 'correct' : 'incorrect');
    }
    const delay = isSessionMode ? 1000 : 2200;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onComplete(observation);
    }, delay);
  };

  const isAllCorrect = orderedSteps.length > 0 && orderedSteps.every((s, i) => {
    const correct = task.payload.correctOrder?.[i];
    return getStepText(correct) === getStepText(s);
  });

  return (
    <div className={isSessionMode ? '' : 'card accessible-card'} style={isSessionMode ? { maxWidth: '100%', margin: '0' } : { maxWidth: 800, margin: '20px auto' }}>
      {!isSessionMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span className="badge badge-success">Domain: Sequencing</span>
            <span className="badge badge-info" style={{ marginLeft: 8 }}>Level {task.difficulty}</span>
            <span className="badge" style={{ marginLeft: 8, background: '#E2E8F0', color: '#475569' }}>
              Complexity: {task.complexity.overallComplexity} / 10
            </span>
          </div>
          <button className="accessible-btn accessible-btn-secondary" onClick={onExit} style={{ minHeight: 44, padding: '4px 12px' }}>
            ✕ Exit
          </button>
        </div>
      )}

      <h2 style={{ fontSize: 26, margin: '0 0 10px 0', color: '#123B63', fontWeight: 800 }}>
        {task.title}
      </h2>

      {/* PHASE 1: PREVIEW / OBSERVATION PHASE */}
      {phase === 'preview' && (
        <div>
          <div style={{
            background: '#F0F9FF',
            border: '2px solid #BAE6FD',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(3, 105, 161, 0.05)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0369A1', marginBottom: 4, letterSpacing: '0.03em' }}>
              STEP 1: OBSERVE THE SEQUENCE
            </div>
            <p style={{ fontSize: 18, color: '#0F172A', margin: 0, fontWeight: 600 }}>
              Look at the steps in their correct chronological order. Remember this sequence:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {task.payload.correctOrder?.map((item: any, idx: number) => {
              const stepText = getStepText(item);
              const stepIcon = getStepIcon(item);
              return (
                <div
                  key={`preview_${stepText}_${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    background: '#FFFFFF',
                    border: '2px solid #BAE6FD',
                    borderRadius: 14,
                    padding: '14px 18px',
                    boxShadow: '0 2px 8px rgba(3, 105, 161, 0.06)',
                  }}
                >
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: '#EFF6FF',
                    border: '2px solid #0284C7',
                    color: '#0369A1',
                    fontWeight: 800,
                    fontSize: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>

                  {stepIcon && <div style={{ fontSize: 36, flexShrink: 0 }}>{stepIcon}</div>}

                  <div style={{ flex: 1, minWidth: 0, fontSize: 19, fontWeight: 700, color: '#0F172A' }}>
                    {stepText}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="accessible-btn accessible-btn-primary"
            onClick={handleStartArranging}
            style={{
              width: '100%',
              fontSize: 22,
              minHeight: 64,
              background: '#1677D2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 16,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22, 119, 210, 0.3)',
            }}
          >
            I'm Ready to Arrange ➡️
          </button>
        </div>
      )}

      {/* PHASE 2: ARRANGE PHASE */}
      {phase === 'arrange' && (
        <div>
          <div style={{
            background: '#FFF7DC',
            border: '2px solid #F5C451',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(245, 196, 81, 0.08)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#8D6B00', marginBottom: 4, letterSpacing: '0.03em' }}>
              STEP 2: RECONSTRUCT THE SEQUENCE
            </div>
            <p style={{ fontSize: 18, color: '#17324D', margin: 0, fontWeight: 600 }}>
              Now arrange the steps into the sequence shown before from first to last.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {orderedSteps.map((step, idx) => {
              const stepText = getStepText(step);
              const stepIcon = getStepIcon(step);

              const correctIdx = task.payload.correctOrder?.findIndex((item: any) => getStepText(item) === stepText);
              const isCorrectPos = correctIdx === idx;

              let borderStyle = '2px solid #CBD5E1';
              let bgStyle = '#FFFFFF';
              let boxShadow = '0 2px 6px rgba(0,0,0,0.04)';

              if (isSubmitted) {
                if (isCorrectPos) {
                  borderStyle = '2.5px solid #10B981';
                  bgStyle = '#ECFDF5';
                  boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
                } else {
                  borderStyle = '2.5px solid #EF4444';
                  bgStyle = '#FEF2F2';
                  boxShadow = '0 4px 12px rgba(239, 68, 68, 0.15)';
                }
              }

              return (
                <div
                  key={`${stepText}_${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    background: bgStyle,
                    border: borderStyle,
                    borderRadius: 14,
                    padding: '14px 18px',
                    boxShadow,
                    position: 'relative',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: isSubmitted
                      ? (isCorrectPos ? '#10B981' : '#EF4444')
                      : '#EFF6FF',
                    border: isSubmitted ? 'none' : '2px solid #3B82F6',
                    color: isSubmitted ? '#FFFFFF' : '#1D4ED8',
                    fontWeight: 800,
                    fontSize: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>

                  {stepIcon && <div style={{ fontSize: 36, flexShrink: 0 }}>{stepIcon}</div>}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 19, fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                      {stepText}
                    </div>
                    {isSubmitted && !isCorrectPos && (
                      <div style={{ fontSize: 14, color: '#B91C1C', fontWeight: 700, marginTop: 4 }}>
                        ✕ Misplaced: This should be Step {correctIdx !== undefined && correctIdx >= 0 ? correctIdx + 1 : 'different'}
                      </div>
                    )}
                    {isSubmitted && isCorrectPos && (
                      <div style={{ fontSize: 14, color: '#047857', fontWeight: 700, marginTop: 4 }}>
                        ✓ Correct position
                      </div>
                    )}
                  </div>

                  {!isSubmitted && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        className="accessible-btn"
                        disabled={idx === 0}
                        onClick={() => moveUp(idx)}
                        style={{
                          minHeight: 48,
                          minWidth: 48,
                          fontSize: 22,
                          padding: 0,
                          background: idx === 0 ? '#E2E8F0' : '#FFFFFF',
                          border: '2px solid #CBD5E1',
                          color: idx === 0 ? '#94A3B8' : '#0F172A',
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          borderRadius: 10,
                        }}
                        aria-label={`Move step ${idx + 1} up`}
                      >
                        ▲
                      </button>
                      <button
                        className="accessible-btn"
                        disabled={idx === orderedSteps.length - 1}
                        onClick={() => moveDown(idx)}
                        style={{
                          minHeight: 48,
                          minWidth: 48,
                          fontSize: 22,
                          padding: 0,
                          background: idx === orderedSteps.length - 1 ? '#E2E8F0' : '#FFFFFF',
                          border: '2px solid #CBD5E1',
                          color: idx === orderedSteps.length - 1 ? '#94A3B8' : '#0F172A',
                          cursor: idx === orderedSteps.length - 1 ? 'not-allowed' : 'pointer',
                          borderRadius: 10,
                        }}
                        aria-label={`Move step ${idx + 1} down`}
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Answer Explanation Banner */}
          {isSubmitted && (
            <div style={{
              backgroundColor: isAllCorrect ? '#DCFCE7' : '#FEE2E2',
              border: `2px solid ${isAllCorrect ? '#10B981' : '#EF4444'}`,
              color: isAllCorrect ? '#166534' : '#991B1B',
              padding: '16px 20px',
              borderRadius: 14,
              marginBottom: 20,
              fontSize: 16,
              fontWeight: 700,
            }}>
              {isAllCorrect ? (
                <div style={{ fontSize: 17 }}>✅ Perfect! You placed all steps in the correct chronological order.</div>
              ) : (
                <div>
                  <div style={{ marginBottom: 8, fontSize: 17 }}>❌ That sequence had misplaced steps. Here is the correct order:</div>
                  <ol style={{ margin: 0, paddingLeft: 24, fontWeight: 600 }}>
                    {task.payload.correctOrder?.map((item: any, i: number) => {
                      const itemText = getStepText(item);
                      const itemIcon = getStepIcon(item);
                      return (
                        <li key={i} style={{ margin: '6px 0', fontSize: 16, color: '#991B1B' }}>
                          {itemIcon && <span style={{ marginRight: 8, fontSize: 20 }}>{itemIcon}</span>}
                          {itemText}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          )}

          <button
            className="accessible-btn accessible-btn-primary"
            onClick={handleVerify}
            disabled={isSubmitted || isSubmittedRef.current}
            style={{
              width: '100%',
              fontSize: 22,
              minHeight: 64,
              opacity: (isSubmitted || isSubmittedRef.current) ? 0.7 : 1,
              background: '#1677D2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 14,
              fontWeight: 800,
              cursor: (isSubmitted || isSubmittedRef.current) ? 'default' : 'pointer',
              boxShadow: '0 4px 14px rgba(22, 119, 210, 0.3)',
            }}
          >
            {(isSubmitted || isSubmittedRef.current) ? 'Verifying Results...' : 'Verify Sequence Order ✓'}
          </button>
        </div>
      )}
    </div>
  );
};
