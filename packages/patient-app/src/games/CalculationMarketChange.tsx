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

export const CalculationMarketChange: React.FC<Props> = ({ difficulty, masteryMode = false, onComplete, onExit, isSessionMode = false }) => {
  const { language } = useLocalization();
  const [task, setTask] = useState<GeneratedCognitiveTask | null>(null);
  const questionDisplayedAt = React.useRef<number>(performance.now());
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    const recent = OfflineStorageService.getRecentTaskFingerprints(undefined, 'calculation');
    const boundedDiff = Math.max(1, Math.min(5, difficulty)) as 1 | 2 | 3 | 4 | 5;
    const generated = TaskGenerator.generateTask({
      domain: 'calculation',
      difficulty: boundedDiff,
      masteryMode,
      recentFingerprints: recent,
      language,
    });

    setTask(generated);
    questionDisplayedAt.current = performance.now();
    if (!isSessionMode) {
      SpeechService.speakDomainInstruction('calculation');
    }
  }, [difficulty, language]);

  if (!task) {
    return <div style={{ padding: 24, color: '#fff' }}>Generating personalized market calculation...</div>;
  }

  const { itemsPurchased, totalBill, paidAmount, correctChange, options } = task.payload;

  const handleSelect = (val: number) => {
    if (selectedOption !== null) return;
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
    setTimeout(() => {
      onComplete(observation);
    }, 1500);
  };

  return (
    <div className={isSessionMode ? '' : 'card accessible-card'} style={isSessionMode ? { maxWidth: '100%', margin: '0' } : { maxWidth: 800, margin: '20px auto' }}>
      {!isSessionMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span className="badge badge-success">Domain: Calculation</span>
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

      {/* Transaction Summary Card */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '2px solid rgba(56, 189, 248, 0.4)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 16, color: 'var(--accent-cyan)', marginBottom: 8, fontWeight: 700 }}>
          MARKET PURCHASE BREAKDOWN:
        </div>
        <div style={{ marginBottom: 12 }}>
          {itemsPurchased.map((item: any, idx: number) => (
            <div key={idx} style={{ fontSize: 18, color: '#fff', margin: '4px 0' }}>
              • {item.quantity}x {item.name} = <strong>₹{item.totalPrice}</strong>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>Total Bill:</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>₹{totalBill}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>Currency Paid:</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>₹{paidAmount}</span>
        </div>
      </div>

      <h3 style={{ fontSize: 22, textAlign: 'center', marginBottom: 20, color: 'var(--text-main)' }}>
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
          let borderStyle = '2px solid rgba(255,255,255,0.2)';
          let bgStyle = 'rgba(255,255,255,0.08)';

          if (selectedOption !== null) {
            if (isCorrect) {
              borderStyle = '3px solid #10b981';
              bgStyle = 'rgba(16, 185, 129, 0.25)';
            } else if (isSelected && !isCorrect) {
              borderStyle = '3px solid #ef4444';
              bgStyle = 'rgba(239, 68, 68, 0.25)';
            }
          }

          return (
            <button
              key={val}
              onClick={() => handleSelect(val)}
              disabled={selectedOption !== null}
              style={{
                background: bgStyle,
                border: borderStyle,
                borderRadius: 12,
                padding: '24px 16px',
                fontSize: 32,
                fontWeight: 700,
                color: '#fff',
                cursor: selectedOption !== null ? 'default' : 'pointer',
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
                  padding: '1px 6px',
                  fontSize: 11,
                  fontWeight: 800,
                }}>
                  ✕ Wrong
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
                  padding: '1px 6px',
                  fontSize: 11,
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
          padding: '14px 18px',
          borderRadius: 14,
          marginTop: 20,
          textAlign: 'center',
          fontSize: 17,
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
          padding: '14px 18px',
          borderRadius: 14,
          marginTop: 20,
          textAlign: 'center',
          fontSize: 17,
          fontWeight: 700,
        }}>
          ✅ That's correct! ₹{paidAmount} - ₹{totalBill} = <strong>₹{correctChange}</strong> returned.
        </div>
      )}
    </div>
  );
};
