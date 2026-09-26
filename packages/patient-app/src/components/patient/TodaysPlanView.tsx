import React, { useState, useEffect } from 'react';
import { CognitiveDomain } from '@ner-mind/core';
import { SpeechService } from '../../audio/speechService.js';
import { useLocalization } from '../../localization';

export interface PlanItem {
  id: string;
  time: string;
  titleKey: string;
  defaultTitle: string;
  subtitleKey?: string;
  defaultSubtitle: string;
  icon: string;
  colorBg: string;
  colorBorder: string;
  actionType: 'game' | 'mission' | 'family' | 'habit';
  domain?: CognitiveDomain;
  isCompleted: boolean;
}

const DEFAULT_PLAN: PlanItem[] = [
  {
    id: 'plan_1',
    time: '08:00 AM',
    titleKey: 'plan.morningRoutine',
    defaultTitle: 'Morning Routine',
    defaultSubtitle: 'Assam Tea Preparation & Hydration',
    icon: '🫖',
    colorBg: '#E8F7EF',
    colorBorder: '#42B883',
    actionType: 'game',
    domain: 'sequencing',
    isCompleted: true,
  },
  {
    id: 'plan_2',
    time: '09:00 AM',
    titleKey: 'plan.memoryGame',
    defaultTitle: 'Memory Game',
    defaultSubtitle: 'Market Shopping Recall Training',
    icon: '🧠',
    colorBg: '#FBE8EE',
    colorBorder: '#F6A6A6',
    actionType: 'game',
    domain: 'memory',
    isCompleted: false,
  },
  {
    id: 'plan_3',
    time: '10:00 AM',
    titleKey: 'plan.shoppingMission',
    defaultTitle: 'Shopping Mission',
    defaultSubtitle: 'Real-Life Memory & Functional Recall',
    icon: '🛒',
    colorBg: '#FFF7DC',
    colorBorder: '#F5C451',
    actionType: 'mission',
    isCompleted: false,
  },
  {
    id: 'plan_4',
    time: '12:00 PM',
    titleKey: 'plan.hydration',
    defaultTitle: 'Drink Water & Lunch',
    defaultSubtitle: 'Hydration and Mindful Pause',
    icon: '💧',
    colorBg: '#EAF4FF',
    colorBorder: '#1677D2',
    actionType: 'habit',
    isCompleted: true,
  },
  {
    id: 'plan_5',
    time: '05:00 PM',
    titleKey: 'plan.familyPhoto',
    defaultTitle: 'Family Photo Game',
    defaultSubtitle: 'Reconnect with Loved Ones & Memories',
    icon: '👨‍👩‍👦',
    colorBg: '#F0ECFF',
    colorBorder: '#B8A7E8',
    actionType: 'family',
    isCompleted: false,
  },
];

const STORAGE_KEY = 'ner_mind_todays_plan_v2';

interface Props {
  onBack: () => void;
  onStartGame: (domain: CognitiveDomain) => void;
  onStartMission: () => void;
  onStartFamily: () => void;
}

export const TodaysPlanView: React.FC<Props> = ({
  onBack,
  onStartGame,
  onStartMission,
  onStartFamily,
}) => {
  const { t, formatBilingual } = useLocalization();
  const [items, setItems] = useState<PlanItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return DEFAULT_PLAN;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const toggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const handleAction = (item: PlanItem) => {
    if (item.actionType === 'game' && item.domain) {
      SpeechService.speakDomainInstruction(item.domain);
      onStartGame(item.domain);
    } else if (item.actionType === 'mission') {
      SpeechService.speakMissionInstruction('Daily Routine');
      onStartMission();
    } else if (item.actionType === 'family') {
      SpeechService.speakDomainInstruction('recognition');
      onStartFamily();
    } else {
      SpeechService.speakFeedback('correct');
      // Habit: toggle complete
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isCompleted: !i.isCompleted } : i))
      );
    }
  };

  const completedCount = items.filter((i) => i.isCompleted).length;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 90 }}>
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
            {t('plan.title')}
          </h2>
          <span style={{ fontSize: 15, color: '#64748B' }}>
            {completedCount} / {items.length} {t('plan.activitiesCompleted')}
          </span>
        </div>
        <div
          style={{
            backgroundColor: '#F1F5F9',
            color: '#475569',
            padding: '6px 12px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          title="Daily activities are scheduled by your caregiver"
        >
          <span>🔒 {t('plan.caregiverScheduled')}</span>
        </div>
      </div>

      {/* Progress Bar Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: '16px 20px',
          border: '1px solid #DDE5ED',
          marginBottom: 20,
          boxShadow: '0 2px 10px rgba(18, 59, 99, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#17324D' }}>
            {t('plan.dailyProgress')}
          </span>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1677D2' }}>
            {Math.round((completedCount / items.length) * 100)}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 12,
            backgroundColor: '#EAF4FF',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${(completedCount / items.length) * 100}%`,
              height: '100%',
              backgroundColor: '#42B883',
              borderRadius: 10,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Timeline List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => handleAction(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: '16px 18px',
              border: `2px solid ${item.isCompleted ? '#E8F7EF' : '#DDE5ED'}`,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(18, 59, 99, 0.04)',
              transition: 'transform 0.15s ease',
            }}
          >
            {/* Left: Icon & Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: item.colorBg,
                  border: `1.5px solid ${item.colorBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>

              <div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#1677D2',
                    display: 'block',
                    marginBottom: 2,
                  }}
                >
                  {item.time}
                </span>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    margin: 0,
                    color: item.isCompleted ? '#64748B' : '#17324D',
                    textDecoration: item.isCompleted ? 'line-through' : 'none',
                  }}
                >
                  {formatBilingual(t(item.titleKey) || item.defaultTitle, item.defaultTitle)}
                </h3>
                <span style={{ fontSize: 14, color: '#64748B' }}>{item.defaultSubtitle}</span>
              </div>
            </div>

            {/* Right: Status / Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {item.isCompleted ? (
                <button
                  type="button"
                  onClick={(e) => toggleComplete(item.id, e)}
                  style={{
                    border: 'none',
                    backgroundColor: '#E8F7EF',
                    color: '#42B883',
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    fontSize: 20,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                  }}
                  title="Mark incomplete"
                >
                  ✓
                </button>
              ) : (
                <button
                  type="button"
                  style={{
                    border: 'none',
                    backgroundColor: '#EAF4FF',
                    color: '#1677D2',
                    padding: '8px 18px',
                    borderRadius: 20,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{t('plan.start')}</span>
                  <span>▶</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
