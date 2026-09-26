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
}

export const SequencingTeaRoutine: React.FC<Props> = ({ difficulty, masteryMode = false, onComplete, onExit, isSessionMode = false }) => {
  const { language } = useLocalization();
  const [task, setTask] = useState<GeneratedCognitiveTask | null>(null);
  const [orderedSteps, setOrderedSteps] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const questionDisplayedAt = React.useRef<number>(performance.now());

  useEffect(() => {
    const recent = OfflineStorageService.getRecentTaskFingerprints(undefined, 'sequencing');
    const boundedDiff = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const generated = TaskGenerator.generateTask({
      domain: 'sequencing',
      difficulty: boundedDiff,
      masteryMode,
      recentFingerprints: recent,
      language,
    });

    setTask(generated);
    setOrderedSteps(generated.payload.shuffledSteps);
    setIsSubmitted(false);
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('sequencing');
    }
  }, [difficulty, language]);

  if (!task) {
    return <div style={{ padding: 24, color: '#fff' }}>Generating personalized sequencing activity...</div>;
  }

  const moveUp = (index: number) => {
    if (isSubmitted || index === 0) return;
    const next = [...orderedSteps];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setOrderedSteps(next);
  };

  const moveDown = (index: number) => {
    if (isSubmitted || index === orderedSteps.length - 1) return;
    const next = [...orderedSteps];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setOrderedSteps(next);
  };

  const handleVerify = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);

    const elapsed = Math.max(0, Math.round(performance.now() - questionDisplayedAt.current));
    const stepTexts = orderedSteps.map(s => s.text);
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
    // Give user 2.2s to review which steps were wrong before advancing
    setTimeout(() => {
      onComplete(observation);
    }, 2200);
  };

  return (
    <div className={isSessionMode ? '' : 'card accessible-card'} style={isSessionMode ? { maxWidth: '100%', margin: '0' } : { maxWidth: 800, margin: '20px auto' }}>
      {!isSessionMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span className="badge badge-success">Domain: Sequencing</span>
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

      <h2 style={{ fontSize: 26, margin: '0 0 8px 0', color: 'var(--accent-cyan)' }}>
        {task.title}
      </h2>
      <p style={{ fontSize: 18, color: 'var(--text-muted)', marginBottom: 20 }}>
        {task.instructions}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {orderedSteps.map((step, idx) => {
          const correctIdx = task.payload.correctOrder?.indexOf(step.text);
          const isCorrectPos = correctIdx === idx;
          let borderStyle = '2px solid rgba(255,255,255,0.15)';
          let bgStyle = 'rgba(255,255,255,0.06)';

          if (isSubmitted) {
            if (isCorrectPos) {
              borderStyle = '3px solid #10B981';
              bgStyle = 'rgba(16, 185, 129, 0.2)';
            } else {
              borderStyle = '3px solid #EF4444';
              bgStyle = 'rgba(239, 68, 68, 0.2)';
            }
          }

          return (
            <div
              key={`${step.text}_${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: bgStyle,
                border: borderStyle,
                borderRadius: 12,
                padding: '12px 16px',
                position: 'relative',
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: isSubmitted ? (isCorrectPos ? '#10B981' : '#EF4444') : 'var(--accent-cyan)',
                color: isSubmitted ? '#fff' : '#000',
                fontWeight: 700,
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {idx + 1}
              </div>

              <div style={{ fontSize: 32, flexShrink: 0 }}>{step.icon}</div>

              <div style={{ flex: 1, fontSize: 18, color: '#fff' }}>
                <div>{step.text}</div>
                {isSubmitted && !isCorrectPos && (
                  <div style={{ fontSize: 13, color: '#FCA5A5', fontWeight: 700, marginTop: 4 }}>
                    ✕ Misplaced: This should be Step {correctIdx !== undefined ? correctIdx + 1 : 'different'}
                  </div>
                )}
                {isSubmitted && isCorrectPos && (
                  <div style={{ fontSize: 13, color: '#6EE7B7', fontWeight: 700, marginTop: 4 }}>
                    ✓ Correct position
                  </div>
                )}
              </div>

              {!isSubmitted && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    className="accessible-btn accessible-btn-secondary"
                    disabled={idx === 0}
                    onClick={() => moveUp(idx)}
                    style={{ minHeight: 48, minWidth: 48, fontSize: 20, padding: 0 }}
                    aria-label={`Move step ${idx + 1} up`}
                  >
                    ▲
                  </button>
                  <button
                    className="accessible-btn accessible-btn-secondary"
                    disabled={idx === orderedSteps.length - 1}
                    onClick={() => moveDown(idx)}
                    style={{ minHeight: 48, minWidth: 48, fontSize: 20, padding: 0 }}
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
          backgroundColor: orderedSteps.every((s, i) => task.payload.correctOrder?.[i] === s.text) ? '#DCFCE7' : '#FEE2E2',
          border: `2px solid ${orderedSteps.every((s, i) => task.payload.correctOrder?.[i] === s.text) ? '#10B981' : '#EF4444'}`,
          color: orderedSteps.every((s, i) => task.payload.correctOrder?.[i] === s.text) ? '#166534' : '#991B1B',
          padding: '16px 20px',
          borderRadius: 14,
          marginBottom: 20,
          fontSize: 16,
          fontWeight: 700,
        }}>
          {orderedSteps.every((s, i) => task.payload.correctOrder?.[i] === s.text) ? (
            <div>✅ Perfect! You placed all steps in the correct chronological order.</div>
          ) : (
            <div>
              <div style={{ marginBottom: 8, fontSize: 17 }}>❌ That sequence had misplaced steps. Here is the correct order:</div>
              <ol style={{ margin: 0, paddingLeft: 24, fontWeight: 600 }}>
                {task.payload.correctOrder?.map((txt: string, i: number) => (
                  <li key={i} style={{ margin: '4px 0' }}>{txt}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <button
        className="accessible-btn accessible-btn-primary"
        onClick={handleVerify}
        disabled={isSubmitted}
        style={{ width: '100%', fontSize: 22, minHeight: 64, opacity: isSubmitted ? 0.7 : 1 }}
      >
        {isSubmitted ? 'Verifying Results...' : 'Verify Sequence Order ✓'}
      </button>
    </div>
  );
};
