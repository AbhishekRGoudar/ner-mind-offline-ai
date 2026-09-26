import React, { useState, useEffect } from 'react';
import { SpeechService } from '../../audio/speechService.js';
import { useLocalization } from '../../localization';

export interface ReminderItem {
  id: string;
  time: string;
  titleKey: string;
  defaultTitle: string;
  icon: string;
  category: 'medicine' | 'water' | 'meal' | 'activity';
  colorBg: string;
  colorBorder: string;
  isCompleted: boolean;
}

export const DEFAULT_REMINDERS: ReminderItem[] = [
  {
    id: 'rem_1',
    time: '08:00 AM',
    titleKey: 'reminders.medicine',
    defaultTitle: 'Take Morning Blood Pressure Medicine',
    icon: '💊',
    category: 'medicine',
    colorBg: '#FBE8EE',
    colorBorder: '#F6A6A6',
    isCompleted: true,
  },
  {
    id: 'rem_2',
    time: '10:00 AM',
    titleKey: 'reminders.water',
    defaultTitle: 'Drink 1 Glass of Warm Water',
    icon: '💧',
    category: 'water',
    colorBg: '#EAF4FF',
    colorBorder: '#90CAF9',
    isCompleted: true,
  },
  {
    id: 'rem_3',
    time: '01:00 PM',
    titleKey: 'reminders.lunch',
    defaultTitle: 'Nutritious Lunch & Relax',
    icon: '🍲',
    category: 'meal',
    colorBg: '#FFF7DC',
    colorBorder: '#FFE082',
    isCompleted: false,
  },
  {
    id: 'rem_4',
    time: '05:00 PM',
    titleKey: 'reminders.walk',
    defaultTitle: 'Evening Garden Walk & Rest',
    icon: '🚶',
    category: 'activity',
    colorBg: '#E8F7EF',
    colorBorder: '#A5D6A7',
    isCompleted: false,
  },
];

export const STORAGE_KEY_REMINDERS = 'ner_mind_reminders_v2';

interface Props {
  onBack: () => void;
}

export const RemindersView: React.FC<Props> = ({ onBack }) => {
  const { t, formatBilingual } = useLocalization();
  const [tab, setTab] = useState<'today' | 'all'>('today');
  const [reminders, setReminders] = useState<ReminderItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REMINDERS);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return DEFAULT_REMINDERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(reminders));
    } catch {
      // ignore
    }
  }, [reminders]);

  // Sync if caregiver modifies reminders in another window
  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_REMINDERS);
        if (stored) setReminders(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleComplete = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextCompleted = !r.isCompleted;
          if (nextCompleted) {
            SpeechService.speakFeedback('correct');
          }
          return { ...r, isCompleted: nextCompleted };
        }
        return r;
      })
    );
  };

  const speakReminder = (r: ReminderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const spokenTitle = t(r.titleKey) || r.defaultTitle;
    SpeechService.speakReminder(r.time, spokenTitle);
  };

  const displayedReminders = tab === 'today' ? reminders : reminders;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 90 }}>
      {/* Header with Read-Only Lock Indicator */}
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
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#17324D' }}>
            {t('reminders.title')}
          </h2>
          <span style={{ fontSize: 13, color: '#64748B' }}>
            {t('reminders.subtitle')}
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
          title="Reminders are scheduled and updated by your family caregiver or doctor"
        >
          <span>🔒 {t('reminders.scheduledByCaregiver')}</span>
        </div>
      </div>

      {/* Tabs matching Screen 13: Today | All */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#E2E8F0',
          borderRadius: 14,
          padding: 4,
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={() => setTab('today')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: tab === 'today' ? '#1677D2' : 'transparent',
            color: tab === 'today' ? '#FFFFFF' : '#64748B',
            transition: 'all 0.15s ease',
          }}
        >
          {t('reminders.today')}
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: tab === 'all' ? '#1677D2' : 'transparent',
            color: tab === 'all' ? '#FFFFFF' : '#64748B',
            transition: 'all 0.15s ease',
          }}
        >
          {t('reminders.all')} ({reminders.length})
        </button>
      </div>

      {/* Reminders List (View & Check Off Only) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {displayedReminders.map((r) => {
          const localizedTitle = formatBilingual(t(r.titleKey) || r.defaultTitle, r.defaultTitle);
          return (
            <div
              key={r.id}
              onClick={() => toggleComplete(r.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: r.colorBg,
                border: `2px solid ${r.colorBorder}`,
                borderRadius: 20,
                padding: '16px 20px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                opacity: r.isCompleted ? 0.75 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {/* Left: Icon & Text */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  }}
                >
                  {r.icon}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#64748B',
                      letterSpacing: '0.5px',
                      display: 'block',
                      marginBottom: 2,
                    }}
                  >
                    {r.time}
                  </span>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      margin: 0,
                      color: '#17324D',
                      textDecoration: r.isCompleted ? 'line-through' : 'none',
                    }}
                  >
                    {localizedTitle}
                  </h3>
                </div>
              </div>

              {/* Right: Audio Speak & Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={(e) => speakReminder(r, e)}
                  style={{
                    border: 'none',
                    background: '#FFFFFF',
                    borderRadius: 12,
                    width: 42,
                    height: 42,
                    fontSize: 18,
                    cursor: 'pointer',
                    color: '#1677D2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                  title="Speak reminder aloud"
                  aria-label={`Listen to reminder: ${r.defaultTitle}`}
                >
                  🔊
                </button>

                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: r.isCompleted ? '2px solid #2E7D32' : '2px solid #94A3B8',
                    backgroundColor: r.isCompleted ? '#2E7D32' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: 18,
                    fontWeight: 900,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {r.isCompleted && '✓'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
