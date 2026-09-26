import React, { useState } from 'react';
import { seedDemoScenario, DEMO_NOTICE } from './demoSeeder';
import { IndexedDbStorageService } from '../storage/indexedDbStorage';

interface SihDemoControllerProps {
  onDataSeeded?: () => void;
  onNavigateTab?: (tab: 'activities' | 'transfer' | 'profile' | 'caregiver') => void;
}

export const SihDemoController: React.FC<SihDemoControllerProps> = ({
  onDataSeeded,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [seedingStatus, setSeedingStatus] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    { num: 1, title: 'Real-Life Baseline', tab: 'transfer', desc: 'Assess baseline execution of daily Morning Tea routine' },
    { num: 2, title: 'Cognitive Profile', tab: 'profile', desc: 'Multi-domain baseline across 6 cognitive areas' },
    { num: 3, title: 'Personalized Game', tab: 'activities', desc: 'Assam tea/bamboo drills personalized to memory profile' },
    { num: 4, title: 'Adaptive Difficulty', tab: 'activities', desc: 'Dynamic level progression (Level 1 ➔ Level 2)' },
    { num: 5, title: 'Cross-Context Training', tab: 'activities', desc: 'Kitchen sequencing ➔ Market shopping recall' },
    { num: 6, title: 'Real-Life Verification', tab: 'transfer', desc: 'Post-training re-test of Morning Tea routine' },
    { num: 7, title: 'Transfer Analysis', tab: 'transfer', desc: '+0.23 Δ Transfer calculation with statistical confidence' },
    { num: 8, title: 'Caregiver Dashboard', tab: 'caregiver', desc: 'Caregiver portal view with 6-domain observed trends' },
    { num: 9, title: 'Alert Review & Ack', tab: 'caregiver', desc: 'Neutral non-diagnostic observation alert review' },
  ];

  const handleSeed = async () => {
    setSeedingStatus('Seeding realistic 7-day demo data...');
    try {
      const res = await seedDemoScenario();
      setSeedingStatus(`✅ Seeded: ${res.observationsCount} drills, ${res.transferEvaluationsCount} transfer test (+${res.transferDelta.toFixed(2)} Δ).`);
      if (onDataSeeded) onDataSeeded();
    } catch (e: any) {
      setSeedingStatus(`Error seeding: ${e?.message || e}`);
    }
  };

  const handleReset = async () => {
    await IndexedDbStorageService.resetForTesting();
    setSeedingStatus('Reset to default clean state.');
    if (onDataSeeded) onDataSeeded();
  };

  const handleStepClick = (step: typeof steps[0]) => {
    setActiveStep(step.num);
    if (onNavigateTab) {
      onNavigateTab(step.tab as any);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: isOpen ? 0 : 16,
      right: 16,
      zIndex: 9999,
      maxWidth: isOpen ? '680px' : 'auto',
      width: isOpen ? 'calc(100% - 32px)' : 'auto',
      backgroundColor: '#0a1630',
      border: '2px solid #38bdf8',
      borderRadius: '16px',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transition: 'all 0.25s ease',
    }}>
      {/* Header Bar */}
      <div
        style={{
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: 'linear-gradient(90deg, #0c1c3d, #142852)',
          borderTopLeftRadius: '14px',
          borderTopRightRadius: '14px',
          borderBottom: isOpen ? '1px solid #1e3a6d' : 'none',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🏛️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#38bdf8' }}>
              SIH 2026 Presentation Navigator
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Closed-Loop Real-Life Transfer Controller (Demo Mode)
            </div>
          </div>
        </div>
        <button
          style={{
            background: 'transparent',
            border: '1px solid #38bdf8',
            color: '#38bdf8',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          {isOpen ? 'Minimize ▼' : 'Open Demo Guide ▲'}
        </button>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div style={{ padding: '16px 20px', maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{
            fontSize: '12px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '14px',
            color: '#7dd3fc',
          }}>
            <strong>Notice:</strong> {DEMO_NOTICE}
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={handleSeed}
              style={{
                backgroundColor: '#38bdf8',
                color: '#070d1e',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ⚡ Seed 7-Day Patient Trajectory
            </button>
            <button
              onClick={handleReset}
              style={{
                backgroundColor: '#334155',
                color: '#e2e8f0',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              🔄 Reset to Clean State
            </button>
          </div>

          {seedingStatus && (
            <div style={{ fontSize: '12px', color: '#4ade80', marginBottom: '12px' }}>
              {seedingStatus}
            </div>
          )}

          {/* 9-Step USP Sequence */}
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
            9-STAGE CLOSED-LOOP EVALUATION WALKTHROUGH:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
            {steps.map((step) => {
              const isActive = activeStep === step.num;
              return (
                <div
                  key={step.num}
                  onClick={() => handleStepClick(step)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'rgba(56, 189, 248, 0.15)' : '#0d1d3d',
                    border: isActive ? '1px solid #38bdf8' : '1px solid #1e293b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{
                      fontWeight: 700,
                      color: isActive ? '#38bdf8' : '#e2e8f0',
                      marginRight: '8px',
                    }}>
                      {step.num}. {step.title}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      — {step.desc}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    backgroundColor: '#1e293b',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    color: '#cbd5e1',
                  }}>
                    View ➡️
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
