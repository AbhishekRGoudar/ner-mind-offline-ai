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

export const RecognitionHouseholdObjects: React.FC<Props> = ({ difficulty, masteryMode = false, onComplete, onExit, isSessionMode = false, sessionFingerprints = [] }) => {
  const { language } = useLocalization();
  const [task, setTask] = useState<GeneratedCognitiveTask | null>(null);
  const questionDisplayedAt = React.useRef<number>(performance.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hasSelectedRef = React.useRef<boolean>(false);
  const timerRef = React.useRef<any>(null);

  useEffect(() => {
    hasSelectedRef.current = false;
    const recent = OfflineStorageService.getRecentTaskFingerprints(undefined, 'recognition');
    const combinedRecent = Array.from(new Set([...(sessionFingerprints || []), ...recent]));
    const boundedDiff = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const generated = TaskGenerator.generateTask({
      domain: 'recognition',
      difficulty: boundedDiff,
      masteryMode,
      recentFingerprints: combinedRecent,
      language,
    });

    setTask(generated);
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('recognition');
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [difficulty, language, sessionFingerprints]);

  if (!task) {
    return <div style={{ padding: 24, color: '#fff' }}>Generating personalized recognition activity...</div>;
  }

  const { targetObject, options } = task.payload;

  const handleSelect = (item: any) => {
    if (hasSelectedRef.current || selectedId) return; // prevent duplicate clicks
    hasSelectedRef.current = true;
    setSelectedId(item.id);
    const elapsed = Math.max(0, Math.round(performance.now() - questionDisplayedAt.current));
    const scoreResult = task.scoring(item.id);
    const profile = OfflineStorageService.getPatientProfile();

    // Record fingerprint in IndexedDB
    OfflineStorageService.recordTaskFingerprint(profile.patientId, 'recognition', task.fingerprint);

    const observation: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: profile.patientId,
      domain: 'recognition',
      taskId: 'household_object_identification',
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
    const delay = isSessionMode ? 700 : 1500;
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
            <span className="badge badge-success">Domain: Recognition</span>
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

      <h2 style={{ fontSize: 26, margin: '0 0 12px 0', color: '#123B63', fontWeight: 800 }}>
        {task.title}
      </h2>

      {/* Description Prompt Banner */}
      <div style={{
        background: '#F0F9FF',
        border: '2px solid #BAE6FD',
        borderRadius: 14,
        padding: 20,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(3, 105, 161, 0.05)',
      }}>
        <div style={{ fontSize: 15, color: '#0369A1', marginBottom: 8, fontWeight: 800, letterSpacing: '0.04em' }}>
          FAMILIAR OBJECT DESCRIPTION:
        </div>
        <p style={{ fontSize: 20, margin: 0, color: '#0F172A', lineHeight: 1.5, fontWeight: 600 }}>
          "{targetObject.description}"
        </p>
      </div>

      <h3 style={{ fontSize: 20, margin: '0 0 16px 0', color: '#334155', fontWeight: 700 }}>
        Touch the matching name ({options.length} options):
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
      }}>
        {options.map((item: any) => {
          const isSelected = selectedId === item.id;
          const isTarget = item.id === targetObject.id;
          let borderStyle = '2px solid #CBD5E1';
          let bgStyle = '#FFFFFF';
          let textColor = '#0F172A';
          let boxShadow = '0 2px 6px rgba(0,0,0,0.04)';

          if (selectedId) {
            if (isTarget) {
              borderStyle = '3px solid #10b981';
              bgStyle = '#ECFDF5';
              textColor = '#065F46';
              boxShadow = '0 4px 14px rgba(16, 185, 129, 0.2)';
            } else if (isSelected && !isTarget) {
              borderStyle = '3px solid #ef4444';
              bgStyle = '#FEF2F2';
              textColor = '#991B1B';
              boxShadow = '0 4px 14px rgba(239, 68, 68, 0.2)';
            }
          }

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              disabled={!!selectedId || hasSelectedRef.current}
              style={{
                background: bgStyle,
                border: borderStyle,
                borderRadius: 14,
                padding: 18,
                textAlign: 'center',
                cursor: (selectedId || hasSelectedRef.current) ? 'default' : 'pointer',
                minHeight: 130,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                boxShadow,
                position: 'relative',
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: textColor }}>{item.name}</div>
              <div style={{ fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: 500 }}>{item.localName}</div>

              {selectedId && isSelected && !isTarget && (
                <div style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: '#EF4444',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  ✕ Incorrect
                </div>
              )}
              {selectedId && isTarget && (
                <div style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: '#10B981',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  ✓ Correct
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Explicit Answer Explanation Banner */}
      {selectedId && selectedId !== targetObject.id && (
        <div style={{
          backgroundColor: '#FEE2E2',
          border: '2px solid #EF4444',
          color: '#991B1B',
          padding: '14px 18px',
          borderRadius: 14,
          marginTop: 20,
          textAlign: 'center',
          fontSize: 17,
          fontWeight: 700,
        }}>
          ❌ That was incorrect. You selected <strong>{options.find((o: any) => o.id === selectedId)?.name}</strong>. The correct object is <strong>{targetObject.name}</strong>.
        </div>
      )}
      {selectedId && selectedId === targetObject.id && (
        <div style={{
          backgroundColor: '#DCFCE7',
          border: '2px solid #10B981',
          color: '#166534',
          padding: '14px 18px',
          borderRadius: 14,
          marginTop: 20,
          textAlign: 'center',
          fontSize: 17,
          fontWeight: 700,
        }}>
          ✅ That's correct! Identified <strong>{targetObject.name}</strong>.
        </div>
      )}
    </div>
  );
};
