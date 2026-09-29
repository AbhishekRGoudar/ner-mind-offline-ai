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

export const MemoryShoppingRecall: React.FC<Props> = ({ difficulty, masteryMode = false, onComplete, onExit, isSessionMode = false, sessionFingerprints = [] }) => {
  const { language } = useLocalization();
  const [task, setTask] = useState<GeneratedCognitiveTask | null>(null);
  const [displayCandidates, setDisplayCandidates] = useState<any[]>([]);
  const [phase, setPhase] = useState<'study' | 'recall' | 'result'>('study');
  const [selectedSequence, setSelectedSequence] = useState<string[]>([]);
  const questionDisplayedAt = React.useRef<number>(performance.now());
  const [cuesUsed, setCuesUsed] = useState<number>(0);
  const isSubmittedRef = React.useRef<boolean>(false);
  const timerRef = React.useRef<any>(null);

  useEffect(() => {
    isSubmittedRef.current = false;
    const recent = OfflineStorageService.getRecentTaskFingerprints(undefined, 'memory');
    const combinedRecent = Array.from(new Set([...(sessionFingerprints || []), ...recent]));
    const boundedDiff = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const generated = TaskGenerator.generateTask({
      domain: 'memory',
      difficulty: boundedDiff,
      masteryMode,
      recentFingerprints: combinedRecent,
      language,
    });

    setTask(generated);
    setDisplayCandidates(generated.payload.recallCandidates || []);
    setSelectedSequence([]);
    setPhase('study');
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('memory');
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [difficulty, language, sessionFingerprints]);

  if (!task) {
    return <div style={{ padding: 24, color: '#fff' }}>Generating personalized memory activity...</div>;
  }

  const { targetItems, recallCandidates } = task.payload;

  const handleStartRecall = () => {
    // Thoroughly shuffle candidate items (targets + distractors) so image positions change completely
    const pool = [...(task.payload.recallCandidates || displayCandidates)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setDisplayCandidates(pool);
    setSelectedSequence([]);
    setPhase('recall');
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('memory');
    }
  };

  const handleToggleSelect = (item: any) => {
    if (phase !== 'recall' || isSubmittedRef.current) return;
    const existsIdx = selectedSequence.indexOf(item.id);
    if (existsIdx !== -1) {
      // Remove item from sequence
      setSelectedSequence(prev => prev.filter(id => id !== item.id));
    } else {
      if (selectedSequence.length >= targetItems.length) {
        return; // Full sequence already selected
      }
      setSelectedSequence(prev => [...prev, item.id]);
      SpeechService.speak(item.name);
    }
  };

  const handleGiveCue = () => {
    if (phase !== 'recall' || isSubmittedRef.current) return;
    setCuesUsed(prev => prev + 1);
    const nextTargetIdx = selectedSequence.length;
    const nextExpected = targetItems[nextTargetIdx];
    if (nextExpected) {
      SpeechService.speak(`Remember, item number ${nextTargetIdx + 1} was ${nextExpected.name}.`);
    } else {
      const missing = targetItems.find((t: any) => !selectedSequence.includes(t.id));
      if (missing) {
        SpeechService.speak(`Remember, one item was ${missing.name}.`);
      }
    }
  };

  const handleSubmit = () => {
    if (isSubmittedRef.current || phase === 'result') return;
    isSubmittedRef.current = true;
    setPhase('result');

    const elapsed = Math.max(0, Math.round(performance.now() - questionDisplayedAt.current));
    const scoreResult = task.scoring(selectedSequence);
    const profile = OfflineStorageService.getPatientProfile();

    // Record anti-repetition fingerprint in IndexedDB
    OfflineStorageService.recordTaskFingerprint(profile.patientId, 'memory', task.fingerprint);

    const observation: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: profile.patientId,
      domain: 'memory',
      taskId: 'market_shopping_recall',
      timestamp: new Date().toISOString(),
      difficulty,
      context: task.context,
      metrics: {
        rawScore: scoreResult.rawScore,
        itemsPresented: scoreResult.itemsPresented,
        itemsCorrect: scoreResult.itemsCorrect,
        completionTimeMs: elapsed,
        hesitationCount: 0,
        cueAssistanceCount: cuesUsed,
      },
      environmentalFactors: {
        timeOfDay: 'morning',
        inputMethod: 'touch',
      },
    };

    if (!isSessionMode) {
      SpeechService.speakFeedback(scoreResult.rawScore >= 0.8 ? 'correct' : 'incorrect');
    }

    const delay = isSessionMode ? 1000 : 2200;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onComplete(observation);
    }, delay);
  };

  const isAllExactMatch = targetItems.length > 0 &&
    selectedSequence.length === targetItems.length &&
    targetItems.every((t: any, idx: number) => selectedSequence[idx] === t.id);

  return (
    <div className={isSessionMode ? '' : 'card accessible-card'} style={isSessionMode ? { maxWidth: '100%', margin: '0' } : { maxWidth: 800, margin: '20px auto' }}>
      {!isSessionMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span className="badge badge-success">Domain: Memory</span>
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
      <p style={{ fontSize: 18, color: '#475569', marginBottom: 20 }}>
        {task.instructions}
      </p>

      {/* PHASE 1: STUDY ITEMS WITH SEQUENCE ORDER */}
      {phase === 'study' && (
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
              STEP 1: OBSERVE & MEMORIZE THE SEQUENCE
            </div>
            <p style={{ fontSize: 18, color: '#0F172A', margin: 0, fontWeight: 600 }}>
              Look at the {targetItems.length} items and remember the sequence they are shown in (from 1st to last):
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}>
            {targetItems.map((item: any, idx: number) => (
              <div
                key={item.id}
                style={{
                  background: '#FFFFFF',
                  border: '2.5px solid #0284C7',
                  borderRadius: 16,
                  padding: '20px 14px',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
                  position: 'relative',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: 48, marginBottom: 8, marginTop: 6 }}>{item.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{item.name}</div>
                <div style={{ fontSize: 14, color: '#0284C7', fontWeight: 700, marginTop: 2 }}>{item.localName}</div>
                <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginTop: 4 }}>Order: #{idx + 1}</div>
              </div>
            ))}
          </div>

          <button
            className="accessible-btn accessible-btn-primary"
            onClick={handleStartRecall}
            style={{ width: '100%', fontSize: 22, minHeight: 64 }}
          >
            I Have Remembered The Sequence ➡️
          </button>
        </div>
      )}

      {/* PHASE 2: RECALL IN SEQUENCE & RESULT REVIEW */}
      {(phase === 'recall' || phase === 'result') && (
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
              STEP 2: TOUCH IN ORIGINAL SEQUENCE
            </div>
            <p style={{ fontSize: 18, color: '#17324D', margin: 0, fontWeight: 600 }}>
              Now touch the items in the same sequence order (1st, 2nd, 3rd) shown before.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 19, color: '#334155', fontWeight: 600 }}>
              Selected in Sequence: <strong style={{ color: '#0F172A', fontWeight: 800 }}>{selectedSequence.length}</strong> of {targetItems.length}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              {phase === 'recall' && selectedSequence.length > 0 && (
                <button
                  type="button"
                  className="accessible-btn accessible-btn-secondary"
                  onClick={() => setSelectedSequence([])}
                  style={{ minHeight: 44, padding: '4px 14px', fontSize: 15 }}
                >
                  ↺ Reset Order
                </button>
              )}
              {phase === 'recall' && task.complexity.cueLevel > 0 && cuesUsed < task.complexity.cueLevel && (
                <button
                  type="button"
                  className="accessible-btn accessible-btn-secondary"
                  onClick={handleGiveCue}
                  style={{ minHeight: 44, padding: '4px 14px', fontSize: 15 }}
                >
                  💡 Hint ({task.complexity.cueLevel - cuesUsed} left)
                </button>
              )}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}>
            {displayCandidates.map((item: any) => {
              const userOrderIdx = selectedSequence.indexOf(item.id);
              const isSelected = userOrderIdx !== -1;
              const targetOrderIdx = targetItems.findIndex((t: any) => t.id === item.id);
              const isTarget = targetOrderIdx !== -1;
              const isExactSequence = isSelected && isTarget && userOrderIdx === targetOrderIdx;

              let borderStyle = isSelected ? '3px solid #0284C7' : '2px solid #CBD5E1';
              let bgStyle = isSelected ? '#EFF6FF' : '#FFFFFF';
              let opacityStyle = 1.0;

              if (phase === 'result') {
                if (isExactSequence) {
                  borderStyle = '3px solid #10B981';
                  bgStyle = '#ECFDF5';
                } else if (isSelected && isTarget) {
                  borderStyle = '3px solid #F59E0B';
                  bgStyle = '#FFFBEB';
                } else if (isSelected && !isTarget) {
                  borderStyle = '3px solid #EF4444';
                  bgStyle = '#FEF2F2';
                } else if (!isSelected && isTarget) {
                  borderStyle = '3px dashed #F59E0B';
                  bgStyle = '#FFFBEB';
                } else {
                  opacityStyle = 0.45;
                  bgStyle = '#F8FAFC';
                  borderStyle = '1.5px solid #E2E8F0';
                }
              }

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (phase === 'recall') handleToggleSelect(item);
                  }}
                  style={{
                    background: bgStyle,
                    border: borderStyle,
                    borderRadius: 16,
                    padding: 16,
                    textAlign: 'center',
                    cursor: phase === 'recall' ? 'pointer' : 'default',
                    transform: isSelected && phase === 'recall' ? 'scale(1.03)' : 'none',
                    transition: 'all 0.15s ease',
                    opacity: opacityStyle,
                    position: 'relative',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Sequence Position Badge */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: phase === 'result' ? (isExactSequence ? '#10B981' : '#EF4444') : '#0284C7',
                      color: '#FFFFFF',
                      fontWeight: 900,
                      fontSize: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}>
                      {userOrderIdx + 1}
                    </div>
                  )}

                  <div style={{ fontSize: 48, marginBottom: 8, marginTop: isSelected ? 6 : 0 }}>{item.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{item.name}</div>
                  <div style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>{item.localName}</div>

                  {phase === 'recall' && isSelected && (
                    <div style={{ fontSize: 14, color: '#0284C7', fontWeight: 800, marginTop: 6 }}>
                      Selected #{userOrderIdx + 1}
                    </div>
                  )}

                  {phase === 'result' && isExactSequence && (
                    <div style={{
                      marginTop: 6,
                      background: '#10B981',
                      color: '#FFFFFF',
                      borderRadius: 6,
                      padding: '3px 6px',
                      fontSize: 12,
                      fontWeight: 800,
                    }}>
                      ✓ Correct Order #{userOrderIdx + 1}
                    </div>
                  )}

                  {phase === 'result' && isSelected && isTarget && !isExactSequence && (
                    <div style={{
                      marginTop: 6,
                      background: '#D97706',
                      color: '#FFFFFF',
                      borderRadius: 6,
                      padding: '3px 6px',
                      fontSize: 12,
                      fontWeight: 800,
                    }}>
                      ⚠️ Selected #{userOrderIdx + 1} (Was #{targetOrderIdx + 1})
                    </div>
                  )}

                  {phase === 'result' && isSelected && !isTarget && (
                    <div style={{
                      marginTop: 6,
                      background: '#EF4444',
                      color: '#FFFFFF',
                      borderRadius: 6,
                      padding: '3px 6px',
                      fontSize: 12,
                      fontWeight: 800,
                    }}>
                      ✕ Not in Sequence
                    </div>
                  )}

                  {phase === 'result' && !isSelected && isTarget && (
                    <div style={{
                      marginTop: 6,
                      background: '#D97706',
                      color: '#FFFFFF',
                      borderRadius: 6,
                      padding: '3px 6px',
                      fontSize: 12,
                      fontWeight: 800,
                    }}>
                      ⚠️ Missed #{targetOrderIdx + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Answer Breakdown Banner */}
          {phase === 'result' && (
            <div style={{
              backgroundColor: isAllExactMatch ? '#DCFCE7' : '#FEE2E2',
              border: `2px solid ${isAllExactMatch ? '#10B981' : '#EF4444'}`,
              color: '#17324D',
              padding: '16px 20px',
              borderRadius: 14,
              marginBottom: 20,
              fontSize: 16,
              fontWeight: 700,
            }}>
              <div style={{
                marginBottom: 8,
                fontSize: 18,
                color: isAllExactMatch ? '#166534' : '#991B1B'
              }}>
                {isAllExactMatch
                  ? '✅ All items recalled in perfect sequence order!'
                  : '❌ Sequence Review:'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#166534' }}>
                • Presentation Sequence: {targetItems.map((t: any, idx: number) => `#${idx + 1} ${t.name}`).join(' ➔ ')}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: isAllExactMatch ? '#166534' : '#DC2626', marginTop: 4 }}>
                • Your Recalled Order: {selectedSequence.map((id: string, idx: number) => {
                  const it = displayCandidates.find((c: any) => c.id === id);
                  return `#${idx + 1} ${it?.name || id}`;
                }).join(' ➔ ') || 'None selected'}
              </div>
            </div>
          )}

          <button
            className="accessible-btn accessible-btn-primary"
            onClick={handleSubmit}
            disabled={phase === 'result' || isSubmittedRef.current || selectedSequence.length === 0}
            style={{
              width: '100%',
              fontSize: 22,
              minHeight: 64,
              opacity: (phase === 'result' || isSubmittedRef.current || selectedSequence.length === 0) ? 0.7 : 1,
              cursor: (phase === 'result' || isSubmittedRef.current || selectedSequence.length === 0) ? 'default' : 'pointer',
            }}
          >
            {(phase === 'result' || isSubmittedRef.current)
              ? 'Verifying Sequence...'
              : `Submit Recalled Sequence (${selectedSequence.length}/${targetItems.length}) ✓`}
          </button>
        </div>
      )}
    </div>
  );
};
