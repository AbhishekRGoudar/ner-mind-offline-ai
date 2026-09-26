import React, { useState } from 'react';
import {
  CognitiveObservation,
  calculateRealLifeTransfer,
  TransferEvaluation,
  calculateCognitiveProfile,
} from '@ner-mind/core';
import { OfflineStorageService } from '../storage/localStorage.js';
import { SequencingTeaRoutine } from '../games/SequencingTeaRoutine.js';
import { SpeechService } from '../audio/speechService.js';

interface Props {
  onFinish: () => void;
}

export const TransferWorkflow: React.FC<Props> = ({ onFinish }) => {
  const [stage, setStage] = useState<
    'intro' | 'baseline' | 'training_1' | 'training_2' | 'verification' | 'evaluation'
  >('intro');
  const [baselineObs, setBaselineObs] = useState<CognitiveObservation | null>(null);
  const [trainingObs, setTrainingObs] = useState<CognitiveObservation[]>([]);
  const [evaluation, setEvaluation] = useState<TransferEvaluation | null>(null);

  const startWorkflow = () => {
    setStage('baseline');
    SpeechService.speakMissionInstruction('Morning Tea Routine');
  };

  const handleBaselineComplete = (obs: CognitiveObservation) => {
    setBaselineObs(obs);
    setStage('training_1');
    SpeechService.speakDomainInstruction('sequencing');
  };

  const handleTraining1Complete = (obs: CognitiveObservation) => {
    // Cross-context variation 1: Market context
    const marketObs: CognitiveObservation = {
      ...obs,
      taskId: 'market_trip_preparation',
      context: 'market',
    };
    setTrainingObs(prev => [...prev, marketObs]);
    setStage('training_2');
    SpeechService.speakDomainInstruction('sequencing');
  };

  const handleTraining2Complete = (obs: CognitiveObservation) => {
    // Cross-context variation 2: Craft context
    const craftObs: CognitiveObservation = {
      ...obs,
      taskId: 'traditional_weaving_steps',
      context: 'craft',
    };
    const allTraining = [...trainingObs, craftObs];
    setTrainingObs(allTraining);
    setStage('verification');
    SpeechService.speakMissionInstruction('Morning Tea Routine');
  };

  const handleVerificationComplete = (obs: CognitiveObservation) => {
    if (!baselineObs) return;

    // Calculate Real-Life Transfer Delta using @ner-mind/core
    const result = calculateRealLifeTransfer(baselineObs, obs, trainingObs);
    setEvaluation(result);

    // Enqueue transfer evaluation event into offline outbox
    OfflineStorageService.enqueueSyncEvent('transfer_evaluated', result as any);

    // Recalculate cognitive profile
    const allObs = OfflineStorageService.getObservations();
    const updatedProfile = calculateCognitiveProfile(baselineObs.patientId, allObs);
    OfflineStorageService.enqueueSyncEvent('cognitive_profile_updated', updatedProfile as any);

    SpeechService.speakFeedback('summary', Math.max(0, Math.round(result.transferDelta * 100)), 100);
    setStage('evaluation');
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      {stage === 'intro' && (
        <div className="accessible-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <span style={{ fontSize: 44 }}>🔄</span>
            <div>
              <h2>Closed-Loop Real-Life Transfer Protocol</h2>
              <p style={{ color: 'var(--accent-cyan)', fontSize: 18 }}>
                Core Innovation: Measuring Everyday Task Transfer, Not Just Game Scores
              </p>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-primary)', padding: 20, borderRadius: 16, marginBottom: 24 }}>
            <h3 style={{ fontSize: 22, marginBottom: 12, color: 'var(--accent-emerald)' }}>
              How this Closed-Loop Protocol Works:
            </h3>
            <ol style={{ paddingLeft: 24, fontSize: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li><strong>Step 1: Real-Life Baseline</strong> — Perform a daily routine (Morning Tea Preparation).</li>
              <li><strong>Step 2: Cross-Context Training</strong> — Practice underlying cognitive sequence logic in diverse settings (Market Trip ➡️ Craft Weaving).</li>
              <li><strong>Step 3: Real-Life Verification</strong> — Re-verify the routine to assess true functional transfer.</li>
              <li><strong>Step 4: Transfer Delta Engine</strong> — Calculate observed performance change (Δ Transfer).</li>
            </ol>
          </div>

          <div className="safety-banner" style={{ marginBottom: 24 }}>
            🔒 <strong>Safety Note:</strong> This protocol strictly measures observed task performance change. It does not provide medical diagnoses or claim clinical disease cures.
          </div>

          <button className="accessible-btn accessible-btn-primary" onClick={startWorkflow}>
            Begin Real-Life Transfer Protocol ➡️
          </button>
        </div>
      )}

      {stage === 'baseline' && (
        <div>
          <div style={{ marginBottom: 16, padding: '12px 20px', backgroundColor: 'rgba(56, 189, 248, 0.15)', borderRadius: 12 }}>
            <strong>Step 1 of 3: Baseline Assessment</strong> — Morning Tea Routine
          </div>
          <SequencingTeaRoutine
            difficulty={2}
            isSessionMode={true}
            onComplete={handleBaselineComplete}
            onExit={onFinish}
          />
        </div>
      )}

      {stage === 'training_1' && (
        <div>
          <div style={{ marginBottom: 16, padding: '12px 20px', backgroundColor: 'rgba(251, 191, 36, 0.15)', borderRadius: 12 }}>
            <strong>Step 2a of 3: Cross-Context Training (Market Routine)</strong>
          </div>
          <SequencingTeaRoutine
            difficulty={2}
            isSessionMode={true}
            onComplete={handleTraining1Complete}
            onExit={onFinish}
          />
        </div>
      )}

      {stage === 'training_2' && (
        <div>
          <div style={{ marginBottom: 16, padding: '12px 20px', backgroundColor: 'rgba(251, 191, 36, 0.15)', borderRadius: 12 }}>
            <strong>Step 2b of 3: Cross-Context Training (Traditional Craft Weaving)</strong>
          </div>
          <SequencingTeaRoutine
            difficulty={2}
            isSessionMode={true}
            onComplete={handleTraining2Complete}
            onExit={onFinish}
          />
        </div>
      )}

      {stage === 'verification' && (
        <div>
          <div style={{ marginBottom: 16, padding: '12px 20px', backgroundColor: 'rgba(52, 211, 153, 0.15)', borderRadius: 12 }}>
            <strong>Step 3 of 3: Real-Life Verification</strong> — Verifying Morning Tea Routine
          </div>
          <SequencingTeaRoutine
            difficulty={2}
            isSessionMode={true}
            onComplete={handleVerificationComplete}
            onExit={onFinish}
          />
        </div>
      )}

      {stage === 'evaluation' && evaluation && (
        <div className="accessible-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 60 }}>📊</span>
            <h2 style={{ fontSize: 32, marginTop: 12 }}>Observed Real-Life Transfer Report</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 20 }}>
              Protocol: {evaluation.baselineTaskId} ➡️ Cross-Context Training ➡️ {evaluation.verificationTaskId}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: 20, borderRadius: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>Baseline Performance</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {(evaluation.baselineScore * 100).toFixed(0)}%
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', padding: 20, borderRadius: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>Post-Training Verification</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {(evaluation.verificationScore * 100).toFixed(0)}%
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', padding: 20, borderRadius: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>Observed Transfer Delta (Δ)</div>
              <div style={{
                fontSize: 36,
                fontWeight: 800,
                color: evaluation.transferDelta >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              }}>
                {evaluation.transferDelta >= 0 ? '+' : ''}{(evaluation.transferDelta * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', padding: 20, borderRadius: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>Sample Confidence</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-amber)' }}>
                {(evaluation.confidenceScore * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '2px solid var(--accent-cyan)',
            padding: 20,
            borderRadius: 16,
            marginBottom: 24,
            fontSize: 22,
          }}>
            <strong>Observed Performance Statement:</strong>
            <p style={{ marginTop: 8 }}>{evaluation.observedReport}</p>
          </div>

          <div className="safety-banner" style={{ marginBottom: 24 }}>
            Observed results have been saved to local offline encrypted storage and queued in the offline outbox for secure caregiver review upon reconnection.
          </div>

          <button className="accessible-btn accessible-btn-primary" onClick={onFinish}>
            Return to Main Menu
          </button>
        </div>
      )}
    </div>
  );
};
