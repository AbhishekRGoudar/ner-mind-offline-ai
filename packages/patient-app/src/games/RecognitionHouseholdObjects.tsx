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

export const RecognitionHouseholdObjects: React.FC<Props> = ({ difficulty, masteryMode = false, onComplete, onExit, isSessionMode = false }) => {
  const { language } = useLocalization();
  const [task, setTask] = useState<GeneratedCognitiveTask | null>(null);
  const questionDisplayedAt = React.useRef<number>(performance.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const recent = OfflineStorageService.getRecentTaskFingerprints(undefined, 'recognition');
    const boundedDiff = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const generated = TaskGenerator.generateTask({
      domain: 'recognition',
      difficulty: boundedDiff,
      masteryMode,
      recentFingerprints: recent,
      language,
    });

    setTask(generated);
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('recognition');
    }
  }, [difficulty, language]);

  if (!task) {
    return <div style={{ padding: 24, color: '#fff' }}>Generating personalized recognition activity...</div>;
  }

  const { targetObject, options } = task.payload;

  const handleSelect = (item: any) => {
    if (selectedId) return; // prevent duplicate clicks
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
    setTimeout(() => {
      onComplete(observation);
    }, 1500);
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

      <h2 style={{ fontSize: 26, margin: '0 0 8px 0', color: 'var(--accent-cyan)' }}>
        {task.title}
      </h2>

      {/* Description Prompt Banner */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '2px solid rgba(56, 189, 248, 0.4)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 16, color: 'var(--accent-cyan)', marginBottom: 8, fontWeight: 700 }}>
          FAMILIAR OBJECT DESCRIPTION:
        </div>
        <p style={{ fontSize: 20, margin: 0, color: '#fff', lineHeight: 1.5 }}>
          "{targetObject.description}"
        </p>
      </div>

      <h3 style={{ fontSize: 20, margin: '0 0 16px 0', color: 'var(--text-muted)' }}>
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
          let borderStyle = '2px solid rgba(255,255,255,0.15)';
          let bgStyle = 'rgba(255,255,255,0.06)';

          if (selectedId) {
            if (isTarget) {
              borderStyle = '3px solid #10b981';
              bgStyle = 'rgba(16, 185, 129, 0.25)';
            } else if (isSelected && !isTarget) {
              borderStyle = '3px solid #ef4444';
              bgStyle = 'rgba(239, 68, 68, 0.25)';
            }
          }

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              disabled={!!selectedId}
              style={{
                background: bgStyle,
                border: borderStyle,
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
                cursor: selectedId ? 'default' : 'pointer',
                minHeight: 130,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{item.name}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{item.localName}</div>

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
