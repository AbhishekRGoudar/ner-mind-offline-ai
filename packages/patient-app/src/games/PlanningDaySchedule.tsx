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

export const PlanningDaySchedule: React.FC<Props> = ({ difficulty, masteryMode = false, onComplete, onExit, isSessionMode = false, sessionFingerprints = [] }) => {
  const { language } = useLocalization();
  const [task, setTask] = useState<GeneratedCognitiveTask | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const isSubmittedRef = React.useRef<boolean>(false);
  const timerRef = React.useRef<any>(null);
  const questionDisplayedAt = React.useRef<number>(performance.now());

  useEffect(() => {
    isSubmittedRef.current = false;
    const recent = OfflineStorageService.getRecentTaskFingerprints(undefined, 'planning');
    const combinedRecent = Array.from(new Set([...(sessionFingerprints || []), ...recent]));
    const boundedDiff = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const generated = TaskGenerator.generateTask({
      domain: 'planning',
      difficulty: boundedDiff,
      masteryMode,
      recentFingerprints: combinedRecent,
      language,
    });

    setTask(generated);
    setItems(generated.payload.shuffledActivities);
    setIsSubmitted(false);
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('planning');
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [difficulty, language, sessionFingerprints]);

  if (!task) {
    return <div style={{ padding: 24, color: '#fff' }}>Generating personalized daily schedule plan...</div>;
  }

  const { rules, activityCount } = task.payload;

  const moveUp = (idx: number) => {
    if (isSubmitted || isSubmittedRef.current || idx === 0) return;
    const next = [...items];
    const temp = next[idx - 1];
    next[idx - 1] = next[idx];
    next[idx] = temp;
    setItems(next);
  };

  const moveDown = (idx: number) => {
    if (isSubmitted || isSubmittedRef.current || idx === items.length - 1) return;
    const next = [...items];
    const temp = next[idx + 1];
    next[idx + 1] = next[idx];
    next[idx] = temp;
    setItems(next);
  };

  const handleFinish = () => {
    if (isSubmittedRef.current || isSubmitted) return;
    isSubmittedRef.current = true;
    setIsSubmitted(true);

    const elapsed = Math.max(0, Math.round(performance.now() - questionDisplayedAt.current));
    const orderedIds = items.map(i => i.id);
    const scoreResult = task.scoring(orderedIds);
    const profile = OfflineStorageService.getPatientProfile();

    // Record fingerprint in IndexedDB
    OfflineStorageService.recordTaskFingerprint(profile.patientId, 'planning', task.fingerprint);

    const observation: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: profile.patientId,
      domain: 'planning',
      taskId: 'day_schedule_planner',
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

  return (
    <div className={isSessionMode ? '' : 'card accessible-card'} style={isSessionMode ? { maxWidth: '100%', margin: '0' } : { maxWidth: 800, margin: '20px auto' }}>
      {!isSessionMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span className="badge badge-success">Domain: Planning</span>
            <span className="badge badge-info" style={{ marginLeft: 8 }}>Level {task.difficulty}</span>
            <span className="badge" style={{ marginLeft: 8, background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
              Complexity: {task.complexity.overallComplexity} / 10
            </span>
          </div>
          <button className="accessible-btn accessible-btn-secondary" onClick={onExit} style={{ minHeight: 44, padding: '4px 12px' }}>
            ✕ Exit
          </button>
        </div>
      )}

      <h2 style={{ fontSize: 26, margin: '0 0 8px 0', color: '#123B63', fontWeight: 800 }}>
        {task.title}
      </h2>
      <p style={{ fontSize: 18, color: '#475569', marginBottom: 16 }}>
        {task.instructions}
      </p>

      {/* Rules Notice */}
      {rules && rules.length > 0 && (
        <div style={{
          background: '#F0F9FF',
          borderLeft: '4px solid #0284C7',
          padding: '12px 18px',
          borderRadius: 10,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0369A1', marginBottom: 6, letterSpacing: '0.03em' }}>
            PLANNING CONSTRAINTS & RULES:
          </div>
          {rules.map((rule: string, idx: number) => (
            <div key={idx} style={{ fontSize: 16, color: '#0F172A', fontWeight: 600, margin: '3px 0' }}>• {rule}</div>
          ))}
        </div>
      )}

      {/* Reorderable Activities List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {items.map((item, idx) => {
          const correctIdx = task.payload.correctOrder?.findIndex((a: any) => a.id === item.id);
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
              key={item.id}
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
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: isSubmitted
                  ? (isCorrectPos ? '#10B981' : '#EF4444')
                  : '#EFF6FF',
                border: isSubmitted ? 'none' : '2px solid #3B82F6',
                color: isSubmitted ? '#FFFFFF' : '#1D4ED8',
                fontWeight: 800,
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {idx + 1}
              </div>

              <div style={{ fontSize: 36, flexShrink: 0 }}>{item.icon}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{item.name}</div>
                <div style={{ fontSize: 14, color: '#475569', marginTop: 2, fontWeight: 500 }}>
                  Target Slot: {item.timeSlot.replace(/_/g, ' ').toUpperCase()}
                </div>
                {isSubmitted && !isCorrectPos && (
                  <div style={{ fontSize: 13, color: '#B91C1C', fontWeight: 700, marginTop: 4 }}>
                    ✕ Misplaced: Should be in Slot #{correctIdx !== undefined ? correctIdx + 1 : 'different'}
                  </div>
                )}
                {isSubmitted && isCorrectPos && (
                  <div style={{ fontSize: 13, color: '#047857', fontWeight: 700, marginTop: 4 }}>
                    ✓ Correct Slot #{idx + 1}
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
                    aria-label={`Move activity ${idx + 1} up`}
                  >
                    ▲
                  </button>
                  <button
                    className="accessible-btn"
                    disabled={idx === items.length - 1}
                    onClick={() => moveDown(idx)}
                    style={{
                      minHeight: 48,
                      minWidth: 48,
                      fontSize: 22,
                      padding: 0,
                      background: idx === items.length - 1 ? '#E2E8F0' : '#FFFFFF',
                      border: '2px solid #CBD5E1',
                      color: idx === items.length - 1 ? '#94A3B8' : '#0F172A',
                      cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer',
                      borderRadius: 10,
                    }}
                    aria-label={`Move activity ${idx + 1} down`}
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
          backgroundColor: items.every((item, i) => task.payload.correctOrder?.[i]?.id === item.id) ? '#DCFCE7' : '#FEE2E2',
          border: `2px solid ${items.every((item, i) => task.payload.correctOrder?.[i]?.id === item.id) ? '#10B981' : '#EF4444'}`,
          color: items.every((item, i) => task.payload.correctOrder?.[i]?.id === item.id) ? '#166534' : '#991B1B',
          padding: '16px 20px',
          borderRadius: 14,
          marginBottom: 20,
          fontSize: 16,
          fontWeight: 700,
        }}>
          {items.every((item, i) => task.payload.correctOrder?.[i]?.id === item.id) ? (
            <div>✅ Outstanding! All activities scheduled in chronological order satisfying all constraints.</div>
          ) : (
            <div>
              <div style={{ marginBottom: 8, fontSize: 17 }}>❌ That schedule had misplaced activities. Optimal chronological plan:</div>
              <ol style={{ margin: 0, paddingLeft: 24, fontWeight: 600 }}>
                {task.payload.correctOrder?.map((act: any, i: number) => (
                  <li key={i} style={{ margin: '4px 0' }}>
                    <strong>{act.name}</strong> ({act.timeSlot.replace(/_/g, ' ')})
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <button
        className="accessible-btn accessible-btn-primary"
        onClick={handleFinish}
        disabled={isSubmitted || isSubmittedRef.current}
        style={{ width: '100%', fontSize: 22, minHeight: 64, opacity: (isSubmitted || isSubmittedRef.current) ? 0.7 : 1, cursor: (isSubmitted || isSubmittedRef.current) ? 'default' : 'pointer' }}
      >
        {(isSubmitted || isSubmittedRef.current) ? 'Verifying Results...' : `Save and Verify Daily Schedule (${activityCount} Activities) ✓`}
      </button>
    </div>
  );
};
