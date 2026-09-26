import React from 'react';
import { useLocalization } from '../../localization';

export type PatientTab = 'home' | 'games' | 'plan' | 'reminders' | 'progress' | 'family' | 'transfer';

interface Props {
  activeTab: PatientTab;
  onTabChange: (tab: PatientTab) => void;
}

export const BottomNav: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const { t } = useLocalization();

  const navItems: { id: PatientTab; label: string; icon: string }[] = [
    { id: 'home', label: t('nav.home'), icon: '🏠' },
    { id: 'games', label: t('nav.games'), icon: '🎮' },
    { id: 'plan', label: t('nav.plan'), icon: '📋' },
    { id: 'reminders', label: t('nav.reminders'), icon: '⏰' },
    { id: 'progress', label: t('nav.progress'), icon: '📊' },
  ];

  return (
    <nav
      className="bottom-nav"
      aria-label="Patient Primary Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        backgroundColor: '#FFFFFF',
        borderTop: '2px solid #DDE5ED',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 12px',
        zIndex: 1000,
        boxShadow: '0 -4px 16px rgba(18, 59, 99, 0.06)',
      }}
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              border: 'none',
              background: isActive ? '#EAF4FF' : 'transparent',
              borderRadius: 16,
              padding: '6px 18px',
              minWidth: 64,
              minHeight: 56,
              cursor: 'pointer',
              color: isActive ? '#1677D2' : '#64748B',
              fontWeight: isActive ? 700 : 600,
              fontSize: 14,
              transition: 'all 0.18s ease-in-out',
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
