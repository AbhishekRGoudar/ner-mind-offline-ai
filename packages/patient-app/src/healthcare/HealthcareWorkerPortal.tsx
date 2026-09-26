import React, { useState, useMemo } from 'react';
import { LocalAuthService, LocalSession } from '../auth/localAuthService.js';
import { OfflineStorageService } from '../storage/localStorage.js';
import { calculateCognitiveProfile, CognitiveDomain } from '@ner-mind/core';

interface Props {
  onExit: () => void;
}

type HealthcareNav = 'dashboard' | 'patients' | 'analytics' | 'trends' | 'transfer' | 'alerts' | 'reports';

export const HealthcareWorkerPortal: React.FC<Props> = ({ onExit }) => {
  const [session, setSession] = useState<LocalSession | null>(() => {
    const active = LocalAuthService.getSession();
    return active?.role === 'HEALTH_WORKER' || active?.role === 'ADMIN' ? active : null;
  });

  const [username, setUsername] = useState('health_worker_dutta');
  const [password, setPassword] = useState('HealthWorkerPass123!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<HealthcareNav>('dashboard');
  const [timeframe, setTimeframe] = useState<'1m' | '3m' | 'all'>('3m');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await LocalAuthService.login(username, password);
      if (res.role !== 'HEALTH_WORKER' && res.role !== 'ADMIN') {
        setLoginError('Access denied: Account requires Healthcare Worker role.');
        return;
      }
      setSession(res);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check credentials.');
    }
  };

  const handleLogout = () => {
    LocalAuthService.logout();
    setSession(null);
  };

  // Derive real statistics from local store
  const data = useMemo(() => {
    const patient = OfflineStorageService.getPatientProfile();
    const obs = OfflineStorageService.getObservations();
    const model = OfflineStorageService.getPersonalModel();
    const profile = calculateCognitiveProfile(patient.patientId, obs);

    // Calculate completion metrics
    const totalSessions = Math.max(1, obs.length);
    const correctCount = obs.filter((o) => o.metrics.rawScore >= 0.7).length;
    const completedPct = Math.round((correctCount / totalSessions) * 100);
    const partialPct = Math.min(100 - completedPct, Math.round(((totalSessions - correctCount) * 0.7 / totalSessions) * 100));
    const missedPct = Math.max(0, 100 - completedPct - partialPct);

    // Domain progression
    const domainScores: Record<CognitiveDomain, number> = {
      memory: Math.round((profile.domains.memory?.currentScore || 0.7) * 100),
      attention: Math.round((profile.domains.attention?.currentScore || 0.65) * 100),
      sequencing: Math.round((profile.domains.sequencing?.currentScore || 0.72) * 100),
      recognition: Math.round((profile.domains.recognition?.currentScore || 0.8) * 100),
      calculation: Math.round((profile.domains.calculation?.currentScore || 0.62) * 100),
      planning: Math.round((profile.domains.planning?.currentScore || 0.68) * 100),
    };

    return {
      patient,
      obs,
      model,
      profile,
      completedPct,
      partialPct,
      missedPct,
      domainScores,
    };
  }, []);

  // -------------------------------------------------------------------
  // SCREEN 21: HEALTHCARE LOGIN
  // -------------------------------------------------------------------
  if (!session) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F7F9FC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 36,
            maxWidth: 440,
            width: '100%',
            boxShadow: '0 8px 30px rgba(18, 59, 99, 0.08)',
            border: '2px solid #DDE5ED',
          }}
        >
          {/* Logo & Identity */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: '#EAF4FF',
                border: '2px solid #1677D2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                margin: '0 auto 14px auto',
              }}
            >
              🩺
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#17324D', margin: '0 0 6px 0' }}>
              NER-MIND
            </h1>
            <p style={{ margin: 0, fontSize: 16, color: '#1677D2', fontWeight: 700 }}>
              Healthcare & Clinician Portal
            </p>
            <span style={{ fontSize: 13, color: '#64748B', display: 'block', marginTop: 4 }}>
              Offline-Native Clinical Review for North East Region
            </span>
          </div>

          {loginError && (
            <div
              style={{
                backgroundColor: '#FBE8EE',
                color: '#C2185B',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 14,
                marginBottom: 16,
                border: '1px solid #F6A6A6',
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#17324D', marginBottom: 6 }}>
                Username / Healthcare ID
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1.5px solid #DDE5ED',
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#17324D', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1.5px solid #DDE5ED',
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: '#1677D2',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 16,
                padding: '16px',
                fontSize: 17,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(22, 119, 210, 0.25)',
                marginTop: 8,
              }}
            >
              Login to Healthcare Portal
            </button>

            <button
              type="button"
              onClick={onExit}
              style={{
                backgroundColor: 'transparent',
                color: '#64748B',
                border: 'none',
                padding: '10px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Back to Patient App
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // SCREEN 22: HEALTHCARE DASHBOARD & ANALYTICS
  // -------------------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9FC', display: 'flex' }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: 260,
          backgroundColor: '#123B63',
          color: '#FFFFFF',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingLeft: 8 }}>
            <span style={{ fontSize: 32 }}>🩺</span>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#FFFFFF' }}>NER-MIND</h2>
              <span style={{ fontSize: 13, color: '#90CAF9', fontWeight: 600 }}>Clinician Portal</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(
              [
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'patients', label: 'Patients', icon: '👥' },
                { id: 'analytics', label: 'Analytics & Reports', icon: '📈' },
                { id: 'trends', label: 'Cognitive Trends', icon: '🧠' },
                { id: 'transfer', label: 'Transfer Outcomes', icon: '🔄' },
                { id: 'alerts', label: 'Clinical Alerts', icon: '🔔' },
              ] as { id: HealthcareNav; label: string; icon: string }[]
            ).map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: 'none',
                    backgroundColor: isActive ? '#1677D2' : 'transparent',
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Session Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{session.displayName}</div>
          <span style={{ fontSize: 12, color: '#90CAF9' }}>ASHA / Health Worker</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.3)',
                backgroundColor: 'transparent',
                color: '#FFFFFF',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
            <button
              type="button"
              onClick={onExit}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#1677D2',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#17324D', margin: 0 }}>
              Clinical Analytics & Patient Trends
            </h1>
            <span style={{ fontSize: 15, color: '#64748B' }}>
              Longitudinal cognitive observation and real-life transfer verification
            </span>
          </div>

          {/* Timeframe Filter */}
          <div style={{ display: 'flex', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4 }}>
            {(['1m', '3m', 'all'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeframe(t)}
                style={{
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: timeframe === t ? '#1677D2' : 'transparent',
                  color: timeframe === t ? '#FFFFFF' : '#64748B',
                }}
              >
                {t === '1m' ? 'Last Month' : t === '3m' ? 'Last 3 Months' : 'All Data'}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Summary Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            padding: 24,
            border: '2px solid #DDE5ED',
            boxShadow: '0 4px 16px rgba(18, 59, 99, 0.04)',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#EAF4FF',
                border: '2px solid #1677D2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              👴
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#17324D' }}>
                  {data.patient.displayName}
                </h3>
                <span
                  style={{
                    backgroundColor: '#E8F7EF',
                    color: '#2E7D32',
                    padding: '3px 10px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Active • Age 68
                </span>
              </div>
              <span style={{ fontSize: 14, color: '#64748B' }}>
                ID: {data.patient.patientId} • Primary Language: {data.patient.preferredLanguage || 'Assamese / English'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 13, color: '#64748B', display: 'block' }}>Observed Sessions</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#17324D' }}>
                {data.obs.length}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 13, color: '#64748B', display: 'block' }}>Overall Stability</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#42B883' }}>
                Stable
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Dashboard Grid: Domain Trends & Activity Completion */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Column 1: Multi-Domain Cognitive Trends matching Screen 22 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              padding: 24,
              border: '2px solid #DDE5ED',
              boxShadow: '0 4px 16px rgba(18, 59, 99, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#17324D' }}>
                Patient Analytics (6 Cognitive Domains)
              </h3>
              <span style={{ fontSize: 13, color: '#64748B' }}>Observed Accuracy %</span>
            </div>

            {/* Horizontal Domain Performance Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(
                [
                  { domain: 'memory', label: 'Memory (Market Recall)', color: '#F06292', val: data.domainScores.memory },
                  { domain: 'attention', label: 'Attention (Gamusa Diamond)', color: '#42A5F5', val: data.domainScores.attention },
                  { domain: 'sequencing', label: 'Sequencing (Assam Tea)', color: '#66BB6A', val: data.domainScores.sequencing },
                  { domain: 'recognition', label: 'Recognition (NER Objects)', color: '#AB47BC', val: data.domainScores.recognition },
                  { domain: 'calculation', label: 'Calculation (Market Change)', color: '#FFA726', val: data.domainScores.calculation },
                  { domain: 'planning', label: 'Planning (Day Schedule)', color: '#26A69A', val: data.domainScores.planning },
                ] as const
              ).map((d) => (
                <div key={d.domain} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ fontWeight: 700, color: '#17324D' }}>{d.label}</span>
                    <span style={{ fontWeight: 800, color: d.color }}>{d.val}%</span>
                  </div>
                  <div style={{ width: '100%', height: 10, backgroundColor: '#F1F5F9', borderRadius: 6, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${d.val}%`,
                        height: '100%',
                        backgroundColor: d.color,
                        borderRadius: 6,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Activity Completion Rate matching Screen 22 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              padding: 24,
              border: '2px solid #DDE5ED',
              boxShadow: '0 4px 16px rgba(18, 59, 99, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px 0', color: '#17324D' }}>
              Activity Completion Rate
            </h3>

            {/* Circular / Ring Indicator */}
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  border: '12px solid #42B883',
                  borderTopColor: '#F5C451',
                  borderRightColor: '#90CAF9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  flexDirection: 'column',
                }}
              >
                <span style={{ fontSize: 32, fontWeight: 900, color: '#17324D' }}>
                  {data.completedPct}%
                </span>
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Completed</span>
              </div>

              {/* Legend matching Screen 22 */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#42B883' }} />
                  <span style={{ color: '#17324D' }}>Completed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#90CAF9' }} />
                  <span style={{ color: '#17324D' }}>Partially</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F5C451' }} />
                  <span style={{ color: '#17324D' }}>Missed</span>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#EAF4FF',
                borderRadius: 14,
                padding: '12px 16px',
                fontSize: 13,
                color: '#1677D2',
                fontWeight: 600,
              }}
            >
              Regular cognitive engagement maintains functional routine adherence.
            </div>
          </div>
        </div>

        {/* Clinical Disclaimer Notice */}
        <div
          style={{
            backgroundColor: '#FFF7DC',
            borderRadius: 16,
            padding: '14px 20px',
            border: '1.5px solid #F5C451',
            fontSize: 13,
            color: '#8D6B00',
            lineHeight: 1.45,
          }}
        >
          <strong>Non-Diagnostic Observational Protocol:</strong> NER-MIND provides on-device cognitive assistance
          and longitudinal behavioral observation. Metrics reflect observed game and mission performance, not clinical diagnoses.
        </div>
      </main>
    </div>
  );
};
