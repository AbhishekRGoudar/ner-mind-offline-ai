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

export const CalculationMarketChange: React.FC<Props> = ({ difficulty, masteryMode = false, onComplete, onExit, isSessionMode = false, sessionFingerprints = [] }) => {
  const { language } = useLocalization();
  const [task, setTask] = useState<GeneratedCognitiveTask | null>(null);
  const questionDisplayedAt = React.useRef<number>(performance.now());
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const hasSelectedRef = React.useRef<boolean>(false);
  const timerRef = React.useRef<any>(null);

  useEffect(() => {
    hasSelectedRef.current = false;
    const recent = OfflineStorageService.getRecentTaskFingerprints(undefined, 'calculation');
    const combinedRecent = Array.from(new Set([...(sessionFingerprints || []), ...recent]));
    const boundedDiff = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const generated = TaskGenerator.generateTask({
      domain: 'calculation',
      difficulty: boundedDiff,
      masteryMode,
      recentFingerprints: combinedRecent,
      language,
    });

    setTask(generated);
    setSelectedOption(null);
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('calculation');
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [difficulty, language, sessionFingerprints]);

  if (!task) {
    return <div style={{ padding: 24, color: '#1E293B', fontSize: 18 }}>Generating personalized market calculation...</div>;
  }

  const { itemsPurchased, totalBill, paidAmount, correctChange, options } = task.payload;

  const handleSelect = (val: number) => {
    if (hasSelectedRef.current || selectedOption !== null) return;
    hasSelectedRef.current = true;
    setSelectedOption(val);
    const elapsed = Math.max(0, Math.round(performance.now() - questionDisplayedAt.current));
    const scoreResult = task.scoring(val);
    const profile = OfflineStorageService.getPatientProfile();

    // Record fingerprint in IndexedDB
    OfflineStorageService.recordTaskFingerprint(profile.patientId, 'calculation', task.fingerprint);

    const observation: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: profile.patientId,
      domain: 'calculation',
      taskId: 'market_change_calculation',
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
    const delay = isSessionMode ? 700 : 1600;
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
            <span className="badge badge-success">Domain: Calculation</span>
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

      <h2 style={{ fontSize: 26, margin: '0 0 12px 0', color: '#123B63', fontWeight: 800 }}>
        {task.title}
      </h2>

      {/* Transaction Summary Card */}
      <div style={{
        background: '#F0F9FF',
        border: '2px solid #BAE6FD',
        borderRadius: 16,
        padding: 22,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(3, 105, 161, 0.06)',
      }}>
        <div style={{ fontSize: 16, color: '#0369A1', marginBottom: 12, fontWeight: 800, letterSpacing: '0.04em' }}>
          MARKET PURCHASE BREAKDOWN:
        </div>
        <div style={{ marginBottom: 14 }}>
          {itemsPurchased.map((item: any, idx: number) => (
            <div key={idx} style={{ fontSize: 18, color: '#1E293B', margin: '6px 0', fontWeight: 600 }}>
              • {item.quantity}x {item.name} = <strong style={{ color: '#0F172A', fontWeight: 800 }}>₹{item.totalPrice}</strong>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '2px solid #E0F2FE', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 20, color: '#334155', fontWeight: 700 }}>Total Bill:</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>₹{totalBill}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 20, color: '#334155', fontWeight: 700 }}>Currency Paid:</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>₹{paidAmount}</span>
        </div>
      </div>

      <h3 style={{ fontSize: 22, textAlign: 'center', marginBottom: 20, color: '#0F172A', fontWeight: 800 }}>
        What change should you receive back?
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 16,
      }}>
        {options.map((val: number) => {
          const isSelected = selectedOption === val;
          const isCorrect = val === correctChange;
          let borderStyle = '2.5px solid #CBD5E1';
          let bgStyle = '#FFFFFF';
          let textColor = '#0F172A';
          let boxShadow = '0 2px 8px rgba(0,0,0,0.06)';

          if (selectedOption !== null) {
            if (isCorrect) {
              borderStyle = '3px solid #10B981';
              bgStyle = '#ECFDF5';
              textColor = '#065F46';
              boxShadow = '0 4px 16px rgba(16, 185, 129, 0.25)';
            } else if (isSelected && !isCorrect) {
              borderStyle = '3px solid #EF4444';
              bgStyle = '#FEF2F2';
              textColor = '#991B1B';
              boxShadow = '0 4px 16px rgba(239, 68, 68, 0.25)';
            } else {
              borderStyle = '1.5px solid #E2E8F0';
              bgStyle = '#F8FAFC';
              textColor = '#94A3B8';
            }
          }

          return (
            <button
              key={val}
              onClick={() => handleSelect(val)}
              disabled={selectedOption !== null || hasSelectedRef.current}
              style={{
                background: bgStyle,
                border: borderStyle,
                borderRadius: 14,
                padding: '24px 16px',
                fontSize: 32,
                fontWeight: 800,
                color: textColor,
                boxShadow,
                cursor: (selectedOption !== null || hasSelectedRef.current) ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              ₹{val}
              {selectedOption !== null && isSelected && !isCorrect && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  background: '#EF4444',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  ✕ Incorrect
                </div>
              )}
              {selectedOption !== null && isCorrect && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  background: '#10B981',
                  color: '#FFFFFF',
                  borderRadius: 6,
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

      {/* Answer Explanation Banner */}
      {selectedOption !== null && selectedOption !== correctChange && (
        <div style={{
          backgroundColor: '#FEE2E2',
          border: '2px solid #EF4444',
          color: '#991B1B',
          padding: '16px 20px',
          borderRadius: 14,
          marginTop: 22,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 700,
        }}>
          ❌ That was incorrect. You selected <strong>₹{selectedOption}</strong>. The correct change is <strong>₹{paidAmount} - ₹{totalBill} = ₹{correctChange}</strong>.
        </div>
      )}
      {selectedOption !== null && selectedOption === correctChange && (
        <div style={{
          backgroundColor: '#DCFCE7',
          border: '2px solid #10B981',
          color: '#166534',
          padding: '16px 20px',
          borderRadius: 14,
          marginTop: 22,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 700,
        }}>
          ✅ That's correct! ₹{paidAmount} - ₹{totalBill} = <strong>₹{correctChange}</strong> returned.
        </div>
      )}
    </div>
  );
};
