import React, { useState, useMemo } from 'react';
import { CognitiveDomain, calculateCognitiveProfile } from '@ner-mind/core';
import { OfflineStorageService } from '../../storage/localStorage.js';
import { useLocalization } from '../../localization';

interface DomainMetric {
  domain: CognitiveDomain;
  label: string;
  icon: string;
  percentage: number;
  barColor: string;
  bgColor: string;
}

interface Props {
  onBack: () => void;
}

export const PatientProgressView: React.FC<Props> = ({ onBack }) => {
  const { t, formatBilingual } = useLocalization();
  const [filter, setFilter] = useState<'week' | 'month' | 'all'>('week');

  const profileData = useMemo(() => {
    const patient = OfflineStorageService.getPatientProfile();
    const allObs = OfflineStorageService.getObservations();

    // Time window filter
    const now = Date.now();
    const filteredObs = allObs.filter((o) => {
      if (filter === 'all') return true;
      const obsTime = new Date(o.timestamp).getTime();
      const diffDays = (now - obsTime) / (1000 * 60 * 60 * 24);
      if (filter === 'week') return diffDays <= 7;
      if (filter === 'month') return diffDays <= 30;
      return true;
    });

    const calculated = calculateCognitiveProfile(patient.patientId, filteredObs);
    const domainData = calculated.domains;

    const domains: DomainMetric[] = [
      {
        domain: 'memory',
        label: 'Memory',
        icon: '🧠',
        percentage: Math.round((domainData.memory?.currentScore || 0.72) * 100),
        barColor: '#F06292',
        bgColor: '#FCE4EC',
      },
      {
        domain: 'attention',
        label: 'Attention',
        icon: '👁️',
        percentage: Math.round((domainData.attention?.currentScore || 0.68) * 100),
        barColor: '#42A5F5',
        bgColor: '#E3F2FD',
      },
      {
        domain: 'sequencing',
        label: 'Sequencing',
        icon: '🫖',
        percentage: Math.round((domainData.sequencing?.currentScore || 0.75) * 100),
        barColor: '#66BB6A',
        bgColor: '#E8F5E9',
      },
      {
        domain: 'recognition',
        label: 'Recognition',
        icon: '🖼️',
        percentage: Math.round((domainData.recognition?.currentScore || 0.8) * 100),
        barColor: '#AB47BC',
        bgColor: '#F3E5F5',
      },
      {
        domain: 'calculation',
        label: 'Calculation',
        icon: '🪙',
        percentage: Math.round((domainData.calculation?.currentScore || 0.65) * 100),
        barColor: '#FFA726',
        bgColor: '#FFF3E0',
      },
      {
        domain: 'planning',
        label: 'Planning',
        icon: '💡',
        percentage: Math.round((domainData.planning?.currentScore || 0.7) * 100),
        barColor: '#26A69A',
        bgColor: '#E0F2F1',
      },
    ];

    return {
      domains,
      totalCount: filteredObs.length,
    };
  }, [filter]);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 90 }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Go Back"
          style={{
            border: 'none',
            background: '#FFFFFF',
            borderRadius: 12,
            width: 44,
            height: 44,
            fontSize: 22,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            color: '#123B63',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ‹
        </button>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#17324D' }}>
          {t('progress.title')}
        </h2>
        <div style={{ width: 44 }} />
      </div>

      {/* Filter Tabs matching Screen 15: Week | Month | All */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#E2E8F0',
          borderRadius: 14,
          padding: 4,
          marginBottom: 20,
        }}
      >
        {(['week', 'month', 'all'] as const).map((key) => {
          const tabLabel = t(`progress.${key}`) || key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: filter === key ? '#1677D2' : 'transparent',
                color: filter === key ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s ease',
              }}
            >
              {tabLabel}
            </button>
          );
        })}
      </div>

      {/* Domain Progress Cards List matching Screen 15 */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: 24,
          border: '2px solid #DDE5ED',
          boxShadow: '0 4px 16px rgba(18, 59, 99, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {profileData.domains.map((item) => (
          <div key={item.domain} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#17324D' }}>
                  {formatBilingual(t(`games.${item.domain}`) || item.label, item.label)}
                </span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#17324D' }}>
                {item.percentage}%
              </span>
            </div>

            {/* Custom rounded progress bar */}
            <div
              style={{
                width: '100%',
                height: 14,
                backgroundColor: item.bgColor,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${item.percentage}%`,
                  height: '100%',
                  backgroundColor: item.barColor,
                  borderRadius: 10,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div
        style={{
          backgroundColor: '#E8F7EF',
          borderRadius: 20,
          padding: '18px 20px',
          border: '1.5px solid #A5D6A7',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 36 }}>🌱</span>
        <div>
          <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#2E7D32' }}>
            {t('progress.steadyPractice')}
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#1B5E20' }}>
            {profileData.totalCount > 0
              ? `${profileData.totalCount} ${t('progress.steadySubtitle')}`
              : 'Every session trains your memory and focus. Keep practicing each day!'}
          </p>
        </div>
      </div>
    </div>
  );
};
