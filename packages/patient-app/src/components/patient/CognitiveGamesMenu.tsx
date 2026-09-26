import React from 'react';
import { CognitiveDomain, PersonalCognitiveModel } from '@ner-mind/core';
import { OfflineStorageService } from '../../storage/localStorage.js';
import { SpeechService } from '../../audio/speechService.js';
import { useLocalization } from '../../localization';

interface GameDomainCard {
  domain: CognitiveDomain;
  titleKey: string;
  defaultTitle: string;
  subtitleKey: string;
  defaultSubtitle: string;
  icon: string;
  bgColor: string;
  accentColor: string;
  borderColor: string;
}

const DOMAINS: GameDomainCard[] = [
  {
    domain: 'memory',
    titleKey: 'games.memory',
    defaultTitle: 'Memory',
    subtitleKey: 'games.memorySubtitle',
    defaultSubtitle: 'Market Shopping Recall',
    icon: '🧠',
    bgColor: '#FBE8EE',
    accentColor: '#D81B60',
    borderColor: '#F6A6A6',
  },
  {
    domain: 'attention',
    titleKey: 'games.attention',
    defaultTitle: 'Attention',
    subtitleKey: 'games.attentionSubtitle',
    defaultSubtitle: 'Gamusa Diamond Pattern Search',
    icon: '👁️',
    bgColor: '#EAF4FF',
    accentColor: '#1677D2',
    borderColor: '#90CAF9',
  },
  {
    domain: 'sequencing',
    titleKey: 'games.sequencing',
    defaultTitle: 'Sequencing',
    subtitleKey: 'games.sequencingSubtitle',
    defaultSubtitle: 'Assam Tea Routine Preparation',
    icon: '🫖',
    bgColor: '#E8F7EF',
    accentColor: '#2E7D32',
    borderColor: '#A5D6A7',
  },
  {
    domain: 'recognition',
    titleKey: 'games.recognition',
    defaultTitle: 'Recognition',
    subtitleKey: 'games.recognitionSubtitle',
    defaultSubtitle: 'Familiar NER Cultural Objects',
    icon: '🖼️',
    bgColor: '#F0ECFF',
    accentColor: '#6A1B9A',
    borderColor: '#CE93D8',
  },
  {
    domain: 'calculation',
    titleKey: 'games.calculation',
    defaultTitle: 'Calculation',
    subtitleKey: 'games.calculationSubtitle',
    defaultSubtitle: 'Market Grocery & Change',
    icon: '🪙',
    bgColor: '#FFF7DC',
    accentColor: '#F57F17',
    borderColor: '#FFE082',
  },
  {
    domain: 'planning',
    titleKey: 'games.planning',
    defaultTitle: 'Planning',
    subtitleKey: 'games.planningSubtitle',
    defaultSubtitle: 'Daily Schedule Time Planning',
    icon: '💡',
    bgColor: '#FFF0E6',
    accentColor: '#D84315',
    borderColor: '#FFCCBC',
  },
];

interface Props {
  onBack: () => void;
  onSelectDomain: (domain: CognitiveDomain) => void;
}

export const CognitiveGamesMenu: React.FC<Props> = ({ onBack, onSelectDomain }) => {
  const { t, formatBilingual } = useLocalization();
  const model: PersonalCognitiveModel | null = OfflineStorageService.getPersonalModel();
  const observations = OfflineStorageService.getObservations();

  const handleStart = (domain: CognitiveDomain, _title?: string) => {
    SpeechService.speakDomainInstruction(domain);
    onSelectDomain(domain);
  };

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', paddingBottom: 90 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Go Back to Home"
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
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#17324D' }}>
            {t('games.title')}
          </h2>
          <span style={{ fontSize: 15, color: '#64748B' }}>
            {t('games.subtitle')}
          </span>
        </div>
        <div style={{ width: 44 }} />
      </div>

      {/* Grid of 6 Domain Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {DOMAINS.map((item) => {
          const belief = model?.domainBeliefs?.[item.domain];
          const domainObs = observations.filter((o) => o.domain === item.domain);
          const domainAcc =
            domainObs.length > 0
              ? Math.round(
                  (domainObs.filter((o) => o.metrics.rawScore >= 0.7).length / domainObs.length) * 100
                )
              : Math.round(((belief?.alpha || 2) / ((belief?.alpha || 2) + (belief?.beta || 1))) * 100);

          const currentLevel = belief?.activeDifficulty || 1;
          const isMastery = belief?.adaptationMode === 'mastery';

          const localizedTitle = formatBilingual(t(item.titleKey), item.defaultTitle);
          const localizedSubtitle = t(item.subtitleKey) || item.defaultSubtitle;

          return (
            <div
              key={item.domain}
              onClick={() => handleStart(item.domain, item.defaultTitle)}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 22,
                padding: '20px',
                border: `2px solid ${item.borderColor}`,
                boxShadow: '0 3px 12px rgba(18, 59, 99, 0.05)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 180,
                transition: 'all 0.2s ease',
              }}
            >
              <div>
                {/* Top Badge & Icon */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 18,
                      backgroundColor: item.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                    }}
                  >
                    {item.icon}
                  </div>

                  <span
                    style={{
                      backgroundColor: isMastery ? '#FFF7DC' : item.bgColor,
                      color: isMastery ? '#B7791F' : item.accentColor,
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 700,
                      border: isMastery ? '1px solid #F5C451' : 'none',
                    }}
                  >
                    {isMastery ? `${t('games.level')} 5 • Mastery` : `${t('games.level')} ${currentLevel}`}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    margin: '0 0 4px 0',
                    color: '#17324D',
                  }}
                >
                  {localizedTitle}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: '#64748B',
                    margin: '0 0 16px 0',
                    lineHeight: 1.35,
                  }}
                >
                  {localizedSubtitle}
                </p>
              </div>

              {/* Bottom Accuracy & Start Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid #F1F5F9',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                    {t('games.performance')}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: item.accentColor }}>
                    {domainAcc}% {t('games.accuracy')}
                  </span>
                </div>

                <button
                  type="button"
                  style={{
                    border: 'none',
                    backgroundColor: item.bgColor,
                    color: item.accentColor,
                    fontWeight: 700,
                    fontSize: 14,
                    padding: '8px 16px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{t('games.play')}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
