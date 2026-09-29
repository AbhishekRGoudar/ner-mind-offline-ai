import React, { useState, useEffect } from 'react';
import {
  CognitiveDomain,
  CognitiveProfile,
  calculateCognitiveProfile,
  recommendNextTrainingSession,
  TrainingRecommendation,
  PersonalCognitiveModel,
  PersonalizationEngine,
  PersonalizedTaskSelection,
} from '@ner-mind/core';
import { OfflineStorageService } from './storage/localStorage.js';
import { SyncWorker, SyncStatusInfo } from './sync/syncWorker.js';
import { SpeechService } from './audio/speechService.js';
import {
  CognitiveSessionSubFrame,
  ActiveSessionState,
  STORAGE_KEY_ACTIVE_SESSION,
} from './components/CognitiveSessionSubFrame.js';
import { TransferWorkflow } from './transfer/TransferWorkflow.js';
import { CaregiverPortal } from './caregiver/CaregiverPortal.js';
import { HealthcareWorkerPortal } from './healthcare/HealthcareWorkerPortal.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

// Pastel Patient Redesign Components matching Reference Flow
import { BottomNav, PatientTab } from './components/patient/BottomNav.js';
import { PatientHomeDashboard } from './components/patient/PatientHomeDashboard.js';
import { TodaysPlanView } from './components/patient/TodaysPlanView.js';
import { CognitiveGamesMenu } from './components/patient/CognitiveGamesMenu.js';
import { RealLifeMissionsView } from './components/patient/RealLifeMissionsView.js';
import { RemindersView } from './components/patient/RemindersView.js';
import { FamilyMemoriesView } from './components/patient/FamilyMemoriesView.js';
import { PatientProgressView } from './components/patient/PatientProgressView.js';
import { SplashScreen } from './components/patient/SplashScreen.js';
import { VoiceSetupModal } from './components/patient/VoiceSetupModal.js';
import {
  SUPPORTED_LANGUAGES_META,
  SupportedAppLanguage,
} from './services/LocalizationService.js';
import { LocalizationProvider, useLocalization } from './localization/index.js';

type ViewMode = 'patient' | 'caregiver' | 'healthcare';

const PatientAppInner: React.FC = () => {
  const { language } = useLocalization();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/caregiver')) return 'caregiver';
      if (window.location.pathname.startsWith('/healthcare')) return 'healthcare';
    }
    return 'patient';
  });

  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    // Check if first-time launch
    return typeof localStorage !== 'undefined' ? !localStorage.getItem('ner_mind_splash_seen') : false;
  });
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);

  // Primary Patient App Tabs
  const [patientTab, setPatientTab] = useState<PatientTab>('home');
  const [showFullTransferProtocol, setShowFullTransferProtocol] = useState<boolean>(false);

  // Active Cognitive Session State
  const [activeSessionDomain, setActiveSessionDomain] = useState<CognitiveDomain | null>(null);
  const [activeSessionRestored, setActiveSessionRestored] = useState<ActiveSessionState | null>(null);
  const [savedSession, setSavedSession] = useState<ActiveSessionState | null>(null);

  // Local Storage & Core State
  const [, setProfile] = useState<CognitiveProfile | null>(null);
  const [recommendation, setRecommendation] = useState<TrainingRecommendation | null>(null);
  const [personalModel, setPersonalModel] = useState<PersonalCognitiveModel | null>(null);
  const [personalizedTask, setPersonalizedTask] = useState<PersonalizedTaskSelection | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo | null>(null);

  // Bootstrap Local IndexedDB and App State
  useEffect(() => {
    let unsubscribeSync: (() => void) | null = null;

    const bootstrap = async () => {
      try {
        await OfflineStorageService.init();

        const obs = OfflineStorageService.getObservations();
        const patientProfile = OfflineStorageService.getPatientProfile();
        const cogProfile = calculateCognitiveProfile(patientProfile.patientId, obs);
        setProfile(cogProfile);

        // Enforce Caregiver/Doctor Configured Language & Voice Assistant Pipeline
        SpeechService.setLanguage(patientProfile.preferredLanguage || 'en');
        if (patientProfile.accessibility) {
          SpeechService.setEnabled(patientProfile.accessibility.audioPromptsEnabled !== false);
        }

        const rec = recommendNextTrainingSession(cogProfile, obs);
        setRecommendation(rec);

        const pModel = OfflineStorageService.getPersonalModel();
        setPersonalModel(pModel);
        const pTask = PersonalizationEngine.selectNextPersonalizedTask(pModel);
        setPersonalizedTask(pTask);

        setPendingSyncCount(OfflineStorageService.getPendingSyncCount());

        const worker = SyncWorker.getInstance();
        unsubscribeSync = worker.subscribe((status) => {
          setSyncStatus(status);
          setPendingSyncCount(status.pendingCount);
        });

        // Check for active saved session for resume support
        const rawSession = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION) : null;
        if (rawSession) {
          try {
            const parsed = JSON.parse(rawSession);
            if (parsed && parsed.domain && parsed.currentQuestionIndex < parsed.totalQuestions) {
              setSavedSession(parsed);
            }
          } catch {
            localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
          }
        }

        if (navigator.onLine) {
          worker.triggerSyncWithBackoff(1000);
        }
      } catch (err) {
        console.error('[Bootstrap Error]', err);
      } finally {
        setIsInitializing(false);
      }
    };

    bootstrap();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleStorageChange = () => {
      refreshProfile();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorageChange);
      if (unsubscribeSync) unsubscribeSync();
    };
  }, []);

  const refreshProfile = () => {
    const obs = OfflineStorageService.getObservations();
    const patientProfile = OfflineStorageService.getPatientProfile();
    const cogProfile = calculateCognitiveProfile(patientProfile.patientId, obs);
    setProfile(cogProfile);

    // Sync speech pipeline immediately upon caregiver updates
    SpeechService.setLanguage(patientProfile.preferredLanguage || 'en');
    if (patientProfile.accessibility) {
      SpeechService.setEnabled(patientProfile.accessibility.audioPromptsEnabled !== false);
    }

    const rec = recommendNextTrainingSession(cogProfile, obs);
    setRecommendation(rec);

    const pModel = OfflineStorageService.getPersonalModel();
    setPersonalModel(pModel);
    const pTask = PersonalizationEngine.selectNextPersonalizedTask(pModel);
    setPersonalizedTask(pTask);

    setPendingSyncCount(OfflineStorageService.getPendingSyncCount());

    const rawSession = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION) : null;
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession);
        if (parsed && parsed.domain && parsed.currentQuestionIndex < parsed.totalQuestions) {
          setSavedSession(parsed);
        } else {
          setSavedSession(null);
        }
      } catch {
        setSavedSession(null);
      }
    } else {
      setSavedSession(null);
    }

    SyncWorker.getInstance().triggerSyncWithBackoff(500);
  };

  const handleStartSession = (domain: CognitiveDomain, restored?: ActiveSessionState) => {
    setActiveSessionRestored(restored || null);
    setActiveSessionDomain(domain);
  };

  const handleManualSync = async () => {
    const worker = SyncWorker.getInstance();
    await worker.syncNow();
  };

  const handleDismissSplash = () => {
    localStorage.setItem('ner_mind_splash_seen', 'true');
    setShowSplash(false);
  };

  // Loading Screen
  if (isInitializing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F7F9FC',
          color: '#17324D',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>🧠</div>
        <h2 style={{ fontSize: 32, margin: '0 0 8px 0', color: '#1677D2', fontWeight: 900 }}>
          NER-MIND
        </h2>
        <p style={{ fontSize: 18, color: '#64748B', maxWidth: 460, margin: '0 0 24px 0' }}>
          Loading offline cognitive companion and personal memory profile...
        </p>
        <div
          style={{
            width: 44,
            height: 44,
            border: '4px solid #EAF4FF',
            borderTopColor: '#1677D2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // SCREEN 1: SPLASH SCREEN (when enabled or first-time launch)
  if (showSplash) {
    const currentPatient = OfflineStorageService.getPatientProfile();
    const currentMeta =
      SUPPORTED_LANGUAGES_META[currentPatient.preferredLanguage as SupportedAppLanguage] ||
      SUPPORTED_LANGUAGES_META.en;
    return (
      <SplashScreen
        onGetStarted={handleDismissSplash}
        currentLanguageLabel={`${currentMeta.flag} ${currentMeta.englishName} (${currentMeta.nativeName})`}
        patientName={currentPatient.displayName}
      />
    );
  }

  // CAREGIVER PORTAL (SCREENS 16–20)
  if (viewMode === 'caregiver') {
    return <CaregiverPortal onBackToPatientApp={() => setViewMode('patient')} />;
  }

  // HEALTHCARE WORKER PORTAL (SCREENS 21–22)
  if (viewMode === 'healthcare') {
    return <HealthcareWorkerPortal onExit={() => setViewMode('patient')} />;
  }

  const patient = OfflineStorageService.getPatientProfile();

  // PATIENT COMPANION EXPERIENCE (SCREENS 1–15)
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9FC', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '2px solid #DDE5ED',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 900,
        }}
      >
        {/* Brand & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            onClick={() => setShowSplash(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: '#EAF4FF',
              border: '2px solid #1677D2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              cursor: 'pointer',
            }}
            title="Open Splash Screen"
          >
            🧠
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#17324D' }}>NER-MIND</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: '#E8F7EF',
                  color: '#2E7D32',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                100% OFFLINE
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
              Offline Cognitive Companion
            </span>
          </div>
        </div>

        {/* Header Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Offline/Online Status Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: isOnline ? '#E8F7EF' : '#FFF7DC',
              color: isOnline ? '#2E7D32' : '#8D6B00',
              border: `1.5px solid ${isOnline ? '#A5D6A7' : '#F5C451'}`,
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span>{isOnline ? '🟢 Online' : '🟡 Offline Mode'}</span>
            {pendingSyncCount > 0 && <span>• {pendingSyncCount} in Outbox</span>}
          </div>

          {/* Global Patient Language Switcher */}
          {/* Read-Only Language Indicator (Caregiver Managed - Requirement 1, 4, 10) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 14,
              padding: '6px 12px',
              gap: 6,
              border: '1.5px solid #DDE5ED',
              fontSize: 12,
              fontWeight: 700,
              color: '#334155',
            }}
            title="Language is configured exclusively by Caregiver / Doctor"
            data-testid="header-language-indicator"
          >
            <span style={{ fontSize: 13 }}>🔒</span>
            <span>
              {language === 'hi' ? 'हिन्दी (Hindi + English)' : language === 'kn' ? 'ಕನ್ನಡ (Kannada + English)' : 'English'}
            </span>
          </div>

          {/* Sync Now button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncStatus?.state === 'SYNCING'}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #DDE5ED',
              borderRadius: 12,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 700,
              color: '#1677D2',
              cursor: 'pointer',
            }}
            title="Sync Outbox"
          >
            {syncStatus?.state === 'SYNCING' ? '⏳ Syncing...' : '🔄 Sync'}
          </button>

          {/* Switch to Caregiver Portal */}
          <button
            type="button"
            onClick={() => setViewMode('caregiver')}
            style={{
              backgroundColor: '#EAF4FF',
              border: '1.5px solid #90CAF9',
              borderRadius: 12,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 700,
              color: '#1677D2',
              cursor: 'pointer',
            }}
            title="Open Caregiver Portal"
          >
            🛡️ Caregiver
          </button>

          {/* Switch to Healthcare Worker Portal */}
          <button
            type="button"
            onClick={() => setViewMode('healthcare')}
            style={{
              backgroundColor: '#F0ECFF',
              border: '1.5px solid #B8A7E8',
              borderRadius: 12,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 700,
              color: '#5B3EB0',
              cursor: 'pointer',
            }}
            title="Open Healthcare Worker Portal"
          >
            🩺 Healthcare
          </button>
        </div>
      </header>

      {/* Main Patient Content Area */}
      <main style={{ flex: 1, padding: '24px 20px', maxWidth: 760, margin: '0 auto', width: '100%' }}>
        {/* ACTIVE COGNITIVE SESSION (SCREENS 7–10, 12, 14) */}
        {activeSessionDomain ? (
          <CognitiveSessionSubFrame
            domain={activeSessionDomain}
            initialDifficulty={
              activeSessionRestored?.currentDifficulty || 1
            }
            totalQuestions={10}
            restoredSession={activeSessionRestored}
            onExit={() => {
              setActiveSessionDomain(null);
              setActiveSessionRestored(null);
              refreshProfile();
            }}
            onSessionComplete={() => {
              refreshProfile();
            }}
          />
        ) : showFullTransferProtocol ? (
          /* Full 3-Step Real-Life Transfer Protocol */
          <div>
            <button
              type="button"
              onClick={() => setShowFullTransferProtocol(false)}
              style={{
                marginBottom: 16,
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #DDE5ED',
                borderRadius: 12,
                padding: '8px 16px',
                fontSize: 15,
                fontWeight: 700,
                color: '#1677D2',
                cursor: 'pointer',
              }}
            >
              ← Back to Missions
            </button>
            <TransferWorkflow
              onFinish={() => {
                setShowFullTransferProtocol(false);
                refreshProfile();
              }}
            />
          </div>
        ) : (
          <>
            {/* Resume Incomplete Session Card */}
            {savedSession && (
              <div
                style={{
                  backgroundColor: '#FFF7DC',
                  borderRadius: 20,
                  padding: 20,
                  border: '2px solid #F5C451',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 800, color: '#8D6B00' }}>
                    Resume Previous Session?
                  </h4>
                  <span style={{ fontSize: 14, color: '#A07800' }}>
                    {savedSession.domain.toUpperCase()} • Question {savedSession.currentQuestionIndex + 1} of {savedSession.totalQuestions}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleStartSession(savedSession.domain, savedSession);
                      setSavedSession(null);
                    }}
                    style={{
                      backgroundColor: '#1677D2',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 12,
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Resume ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
                      setSavedSession(null);
                    }}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DDE5ED',
                      borderRadius: 12,
                      padding: '8px 12px',
                      fontSize: 14,
                      color: '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    Discard ✕
                  </button>
                </div>
              </div>
            )}

            {/* TAB ROUTING */}
            {patientTab === 'home' && (
              <PatientHomeDashboard
                patientName={patient.displayName}
                onNavigateTab={(t) => setPatientTab(t)}
                onStartGame={(d) => handleStartSession(d)}
                recommendation={recommendation}
                personalizedTask={personalizedTask}
                onOpenVoiceSetup={() => setShowVoiceModal(true)}
                currentLanguage={(patient.preferredLanguage as any) || 'en'}
              />
            )}

            {patientTab === 'games' && (
              <CognitiveGamesMenu
                onBack={() => setPatientTab('home')}
                onSelectDomain={(d) => handleStartSession(d)}
              />
            )}

            {patientTab === 'plan' && (
              <TodaysPlanView
                onBack={() => setPatientTab('home')}
                onStartGame={(d) => handleStartSession(d)}
                onStartMission={() => setPatientTab('transfer')}
                onStartFamily={() => setPatientTab('family')}
              />
            )}

            {patientTab === 'reminders' && (
              <RemindersView onBack={() => setPatientTab('home')} />
            )}

            {patientTab === 'progress' && (
              <PatientProgressView onBack={() => setPatientTab('home')} />
            )}

            {patientTab === 'family' && (
              <FamilyMemoriesView onBack={() => setPatientTab('home')} />
            )}

            {patientTab === 'transfer' && (
              <RealLifeMissionsView
                onBack={() => setPatientTab('home')}
                onOpenTransferProtocol={() => setShowFullTransferProtocol(true)}
              />
            )}
          </>
        )}


      </main>

      {/* Primary Bottom Navigation Bar (Screens 1–15) */}
      {!activeSessionDomain && !showFullTransferProtocol && (
        <BottomNav activeTab={patientTab} onTabChange={(t) => setPatientTab(t)} />
      )}

      {/* Voice Assistance Setup Modal (Screen 3) */}
      {showVoiceModal && (
        <VoiceSetupModal
          isOpen={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onContinue={() => {
            setShowVoiceModal(false);
          }}
          currentLanguage={(patient.preferredLanguage as any) || 'en'}
          patientName={patient.displayName}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <LocalizationProvider>
        <PatientAppInner />
      </LocalizationProvider>
    </ErrorBoundary>
  );
};
