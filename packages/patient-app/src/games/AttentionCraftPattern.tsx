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

export const AttentionCraftPattern: React.FC<Props> = ({ difficulty, masteryMode = false, onComplete, onExit, isSessionMode = false, sessionFingerprints = [] }) => {
  const { language } = useLocalization();
  const [task, setTask] = useState<GeneratedCognitiveTask | null>(null);
  const [tiles, setTiles] = useState<{ id: string; icon: string; name: string; isTarget: boolean; tapped: boolean }[]>([]);
  const questionDisplayedAt = React.useRef<number>(performance.now());
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const isSubmittedRef = React.useRef<boolean>(false);
  const timerRef = React.useRef<any>(null);

  useEffect(() => {
    isSubmittedRef.current = false;
    const recent = OfflineStorageService.getRecentTaskFingerprints(undefined, 'attention');
    const combinedRecent = Array.from(new Set([...(sessionFingerprints || []), ...recent]));
    const boundedDiff = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const generated = TaskGenerator.generateTask({
      domain: 'attention',
      difficulty: boundedDiff,
      masteryMode,
      recentFingerprints: combinedRecent,
      language,
    });

    setTask(generated);
    setTiles(generated.payload.tiles.map((t: any) => ({ ...t, tapped: false })));
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('attention');
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [difficulty, language, sessionFingerprints]);

  if (!task) {
    return <div style={{ padding: 24, color: '#fff' }}>Generating personalized attention task...</div>;
  }

  const { targetMotif } = task.payload;

  const submitAnswers = (currentTiles: typeof tiles) => {
    if (isSubmittedRef.current || isSubmitted) return;
    isSubmittedRef.current = true;
    setIsSubmitted(true);
    const elapsed = Math.max(0, Math.round(performance.now() - questionDisplayedAt.current));
    const tappedIds = currentTiles.filter(t => t.tapped).map(t => t.id);
    const scoreResult = task.scoring(tappedIds);
    const profile = OfflineStorageService.getPatientProfile();

    // Record fingerprint in IndexedDB
    OfflineStorageService.recordTaskFingerprint(profile.patientId, 'attention', task.fingerprint);

    const observation: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: profile.patientId,
      domain: 'attention',
      taskId: 'craft_pattern_cancellation',
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

    SpeechService.speakFeedback(scoreResult.rawScore >= 0.8 ? 'correct' : 'incorrect');
    const delay = isSessionMode ? 800 : 2000;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onComplete(observation);
    }, delay);
  };

  const handleTileTap = (index: number) => {
    if (isSubmitted || isSubmittedRef.current) return;
    const tile = tiles[index]!;
    if (tile.tapped) return;

    const next = [...tiles];
    next[index] = { ...tile, tapped: true };
    setTiles(next);

    // Check if all targets found
    const remainingTargets = next.filter(t => t.isTarget && !t.tapped).length;
    if (remainingTargets === 0) {
      submitAnswers(next);
    }
  };

  const remaining = tiles.filter(t => t.isTarget && !t.tapped).length;

  return (
    <div className={isSessionMode ? '' : 'card accessible-card'} style={isSessionMode ? { maxWidth: '100%', margin: '0' } : { maxWidth: 800, margin: '20px auto' }}>
      {!isSessionMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span className="badge badge-success">Domain: Attention</span>
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

      {/* Target Motif Banner */}
      <div style={{
        background: '#F0F9FF',
        border: '2px solid #BAE6FD',
        borderRadius: 14,
        padding: '14px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(3, 105, 161, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 40 }}>{targetMotif.icon}</span>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#0F172A' }}>Target: {targetMotif.name}</div>
            <div style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>Touch every matching motif below</div>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0369A1' }}>
          {remaining} Remaining
        </div>
      </div>

      {/* Grid of Motifs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(75px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        {tiles.map((tile, idx) => {
          let borderStyle = '2px solid #CBD5E1';
          let bgStyle = '#FFFFFF';
          let opacityStyle = 1.0;

          if (isSubmitted) {
            if (tile.isTarget && tile.tapped) {
              borderStyle = '3px solid #10b981';
              bgStyle = '#ECFDF5';
            } else if (!tile.isTarget && tile.tapped) {
              borderStyle = '3px solid #ef4444';
              bgStyle = '#FEF2F2';
            } else if (tile.isTarget && !tile.tapped) {
              borderStyle = '3px dashed #f59e0b';
              bgStyle = '#FFFBEB';
            } else {
              opacityStyle = 0.35;
              bgStyle = '#F8FAFC';
            }
          } else if (tile.tapped) {
            borderStyle = tile.isTarget ? '3px solid #10b981' : '2px dashed #ef4444';
            bgStyle = tile.isTarget ? '#ECFDF5' : '#FEF2F2';
            opacityStyle = tile.isTarget ? 1.0 : 0.6;
          }

          return (
            <button
              key={tile.id}
              onClick={() => handleTileTap(idx)}
              disabled={tile.tapped || isSubmitted}
              aria-label={`${tile.name} ${tile.tapped ? (tile.isTarget ? 'found' : 'tapped') : ''}`}
              style={{
                height: 75,
                fontSize: 34,
                borderRadius: 12,
                border: borderStyle,
                background: bgStyle,
                cursor: tile.tapped || isSubmitted ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                opacity: opacityStyle,
                position: 'relative',
              }}
            >
              {tile.icon}
              {isSubmitted && tile.isTarget && tile.tapped && (
                <div style={{ position: 'absolute', top: 2, right: 4, fontSize: 13, color: '#10b981', fontWeight: 900 }}>✓</div>
              )}
              {isSubmitted && !tile.isTarget && tile.tapped && (
                <div style={{ position: 'absolute', top: 2, right: 4, fontSize: 13, color: '#ef4444', fontWeight: 900 }}>✕</div>
              )}
              {isSubmitted && tile.isTarget && !tile.tapped && (
                <div style={{ position: 'absolute', top: 2, right: 4, fontSize: 13, color: '#f59e0b', fontWeight: 900 }}>!</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Answer Explanation Banner */}
      {isSubmitted && (
        <div style={{
          backgroundColor: tiles.every(t => (t.isTarget ? t.tapped : !t.tapped)) ? '#DCFCE7' : '#FEE2E2',
          border: `2px solid ${tiles.every(t => (t.isTarget ? t.tapped : !t.tapped)) ? '#10B981' : '#EF4444'}`,
          color: '#17324D',
          padding: '16px 20px',
          borderRadius: 14,
          marginBottom: 16,
          fontSize: 16,
          fontWeight: 700,
        }}>
          <div style={{ marginBottom: 6, fontSize: 17, color: tiles.every(t => (t.isTarget ? t.tapped : !t.tapped)) ? '#166534' : '#991B1B' }}>
            {tiles.every(t => (t.isTarget ? t.tapped : !t.tapped))
              ? `✅ Perfect attention! Found all ${tiles.filter(t => t.isTarget).length} target motifs.`
              : '❌ Attention Pattern Review:'}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#166534' }}>
            • Found: {tiles.filter(t => t.isTarget && t.tapped).length} of {tiles.filter(t => t.isTarget).length} targets
          </div>
          {tiles.some(t => t.isTarget && !t.tapped) && (
            <div style={{ fontSize: 15, fontWeight: 600, color: '#B45309', marginTop: 4 }}>
              • Missed: {tiles.filter(t => t.isTarget && !t.tapped).length} target motifs (highlighted in amber with '!')
            </div>
          )}
          {tiles.some(t => !t.isTarget && t.tapped) && (
            <div style={{ fontSize: 15, fontWeight: 600, color: '#DC2626', marginTop: 4 }}>
              • Incorrect: {tiles.filter(t => !t.isTarget && t.tapped).length} non-target motifs tapped (marked with '✕')
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="accessible-btn accessible-btn-primary"
        onClick={() => submitAnswers(tiles)}
        disabled={isSubmitted || isSubmittedRef.current}
        style={{ width: '100%', minHeight: 56, fontSize: 18, marginTop: 8, opacity: (isSubmitted || isSubmittedRef.current) ? 0.7 : 1, cursor: (isSubmitted || isSubmittedRef.current) ? 'default' : 'pointer' }}
      >
        {(isSubmitted || isSubmittedRef.current) ? 'Verifying Results...' : 'I\'m Done / Submit Patterns ✓'}
      </button>
    </div>
  );
};
