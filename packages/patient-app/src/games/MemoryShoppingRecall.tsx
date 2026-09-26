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

export const MemoryShoppingRecall: React.FC<Props> = ({ difficulty, masteryMode = false, onComplete, onExit, isSessionMode = false }) => {
  const { language } = useLocalization();
  const [task, setTask] = useState<GeneratedCognitiveTask | null>(null);
  const [phase, setPhase] = useState<'study' | 'recall' | 'result'>('study');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const questionDisplayedAt = React.useRef<number>(performance.now());
  const [cuesUsed, setCuesUsed] = useState<number>(0);

  useEffect(() => {
    const recent = OfflineStorageService.getRecentTaskFingerprints(undefined, 'memory');
    const boundedDiff = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const generated = TaskGenerator.generateTask({
      domain: 'memory',
      difficulty: boundedDiff,
      masteryMode,
      recentFingerprints: recent,
      language,
    });

    setTask(generated);
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('memory');
    }
  }, [difficulty, language]);

  if (!task) {
    return <div style={{ padding: 24, color: '#fff' }}>Generating personalized memory activity...</div>;
  }

  const { targetItems, recallCandidates } = task.payload;

  const handleStartRecall = () => {
    setPhase('recall');
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('memory');
    }
  };

  const handleToggleSelect = (item: any) => {
    const next = new Set(selectedIds);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      next.add(item.id);
      SpeechService.speak(item.name);
    }
    setSelectedIds(next);
  };

  const handleGiveCue = () => {
    setCuesUsed(prev => prev + 1);
    const missing = targetItems.find((t: any) => !selectedIds.has(t.id));
    if (missing) {
      SpeechService.speak(`Remember, one item was ${missing.name}.`);
    }
  };

  const handleSubmit = () => {
    const elapsed = Math.max(0, Math.round(performance.now() - questionDisplayedAt.current));
    const scoreResult = task.scoring(Array.from(selectedIds));
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

    setPhase('result');
    setTimeout(() => {
      onComplete(observation);
    }, 2200);
  };

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

      <h2 style={{ fontSize: 26, margin: '0 0 8px 0', color: 'var(--accent-cyan)' }}>
        {task.title}
      </h2>
      <p style={{ fontSize: 18, color: 'var(--text-muted)', marginBottom: 20 }}>
        {task.instructions}
      </p>

      {/* PHASE 1: STUDY ITEMS */}
      {phase === 'study' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}>
            {targetItems.map((item: any) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '2px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{item.name}</div>
                <div style={{ fontSize: 14, color: 'var(--accent-cyan)' }}>{item.localName}</div>
              </div>
            ))}
          </div>

          <button
            className="accessible-btn accessible-btn-primary"
            onClick={handleStartRecall}
            style={{ width: '100%', fontSize: 22, minHeight: 64 }}
          >
            I Have Remembered These Items ➡️
          </button>
        </div>
      )}

      {/* PHASE 2: RECALL & RESULT REVIEW */}
      {(phase === 'recall' || phase === 'result') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>
              Selected: <strong>{selectedIds.size}</strong> of {targetItems.length}
            </span>
            {phase === 'recall' && task.complexity.cueLevel > 0 && cuesUsed < task.complexity.cueLevel && (
              <button
                className="accessible-btn accessible-btn-secondary"
                onClick={handleGiveCue}
                style={{ minHeight: 48, padding: '6px 14px', fontSize: 16 }}
              >
                💡 Hint ({task.complexity.cueLevel - cuesUsed} left)
              </button>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}>
            {recallCandidates.map((item: any) => {
              const isSelected = selectedIds.has(item.id);
              const isTarget = targetItems.some((t: any) => t.id === item.id);
              let borderStyle = isSelected ? '3px solid var(--accent-cyan)' : '2px solid rgba(255,255,255,0.1)';
              let bgStyle = isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.06)';
              let opacityStyle = 1.0;

              if (phase === 'result') {
                if (isSelected && isTarget) {
                  borderStyle = '3px solid #10B981';
                  bgStyle = 'rgba(16, 185, 129, 0.25)';
                } else if (isSelected && !isTarget) {
                  borderStyle = '3px solid #EF4444';
                  bgStyle = 'rgba(239, 68, 68, 0.25)';
                } else if (!isSelected && isTarget) {
                  borderStyle = '3px dashed #F59E0B';
                  bgStyle = 'rgba(245, 158, 11, 0.2)';
                } else {
                  opacityStyle = 0.35;
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
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    cursor: phase === 'recall' ? 'pointer' : 'default',
                    transform: isSelected && phase === 'recall' ? 'scale(1.03)' : 'none',
                    transition: 'all 0.15s ease',
                    opacity: opacityStyle,
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{item.name}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{item.localName}</div>

                  {phase === 'recall' && isSelected && (
                    <div style={{ fontSize: 14, color: 'var(--accent-cyan)', marginTop: 4 }}>✓ Selected</div>
                  )}

                  {phase === 'result' && isSelected && isTarget && (
                    <div style={{
                      marginTop: 6,
                      background: '#10B981',
                      color: '#FFFFFF',
                      borderRadius: 6,
                      padding: '2px 6px',
                      fontSize: 12,
                      fontWeight: 800,
                    }}>
                      ✓ Correct Choice
                    </div>
                  )}

                  {phase === 'result' && isSelected && !isTarget && (
                    <div style={{
                      marginTop: 6,
                      background: '#EF4444',
                      color: '#FFFFFF',
                      borderRadius: 6,
                      padding: '2px 6px',
                      fontSize: 12,
                      fontWeight: 800,
                    }}>
                      ✕ Wrong Item
                    </div>
                  )}

                  {phase === 'result' && !isSelected && isTarget && (
                    <div style={{
                      marginTop: 6,
                      background: '#D97706',
                      color: '#FFFFFF',
                      borderRadius: 6,
                      padding: '2px 6px',
                      fontSize: 12,
                      fontWeight: 800,
                    }}>
                      ⚠️ Missed Target
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Answer Breakdown Banner */}
          {phase === 'result' && (
            <div style={{
              backgroundColor: targetItems.every((t: any) => selectedIds.has(t.id)) && selectedIds.size === targetItems.length
                ? '#DCFCE7' : '#FEE2E2',
              border: `2px solid ${
                targetItems.every((t: any) => selectedIds.has(t.id)) && selectedIds.size === targetItems.length
                  ? '#10B981' : '#EF4444'
              }`,
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
                color: targetItems.every((t: any) => selectedIds.has(t.id)) && selectedIds.size === targetItems.length ? '#166534' : '#991B1B'
              }}>
                {targetItems.every((t: any) => selectedIds.has(t.id)) && selectedIds.size === targetItems.length
                  ? '✅ All targets accurately recalled!'
                  : '❌ Answer Review:'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#166534' }}>
                • Correctly Recalled: {targetItems.filter((t: any) => selectedIds.has(t.id)).map((t: any) => t.name).join(', ') || 'None'}
              </div>
              {targetItems.some((t: any) => !selectedIds.has(t.id)) && (
                <div style={{ fontSize: 15, fontWeight: 600, color: '#B45309', marginTop: 4 }}>
                  • Missed Targets: {targetItems.filter((t: any) => !selectedIds.has(t.id)).map((t: any) => t.name).join(', ')}
                </div>
              )}
              {recallCandidates.some((c: any) => !targetItems.some((t: any) => t.id === c.id) && selectedIds.has(c.id)) && (
                <div style={{ fontSize: 15, fontWeight: 600, color: '#DC2626', marginTop: 4 }}>
                  • Wrong Selections: {recallCandidates.filter((c: any) => !targetItems.some((t: any) => t.id === c.id) && selectedIds.has(c.id)).map((c: any) => c.name).join(', ')}
                </div>
              )}
            </div>
          )}

          <button
            className="accessible-btn accessible-btn-primary"
            onClick={handleSubmit}
            disabled={phase === 'result'}
            style={{ width: '100%', fontSize: 22, minHeight: 64, opacity: phase === 'result' ? 0.7 : 1 }}
          >
            {phase === 'result' ? 'Verifying Results...' : `Submit Memory Recall (${selectedIds.size} Chosen) ✓`}
          </button>
        </div>
      )}
    </div>
  );
};
