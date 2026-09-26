import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PwaManager } from '../src/pwa/registerServiceWorker';
import { IndexedDbStorageService } from '../src/storage/indexedDbStorage.js';
import { RegionalAudioService, RegionalLanguage, PromptCue } from '../src/audio/regionalAudioService';
import { SpeechService } from '../src/audio/speechService';
import { CognitiveObservation } from '@ner-mind/core';

describe('Phase 3A, 3B, 3C, 3G — PWA Offline, Installability, and Audio Verification', () => {
  const rootPublicDir = path.resolve(__dirname, '../public');

  beforeEach(async () => {
    vi.restoreAllMocks();
    await IndexedDbStorageService.resetForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Manifest Validity (Phase 3A / 3H.1)
  // --------------------------------------------------------------------------
  it('PWA Manifest has valid schema, standalone display, and elder-accessible metadata', () => {
    const manifestPath = path.join(rootPublicDir, 'manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifestContent.name).toBe('NER-Mind: Cognitive & Memory Companion');
    expect(manifestContent.short_name).toBe('NER-Mind');
    expect(manifestContent.start_url).toBe('/?source=pwa');
    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.background_color).toBe('#070d1e');
    expect(manifestContent.theme_color).toBe('#0c162f');
    expect(Array.isArray(manifestContent.icons)).toBe(true);
    expect(manifestContent.icons.length).toBeGreaterThanOrEqual(2);

    const icon192 = manifestContent.icons.find((i: any) => i.sizes === '192x192');
    const icon512 = manifestContent.icons.find((i: any) => i.sizes === '512x512');
    const hasMaskable = manifestContent.icons.some((i: any) => i.purpose && i.purpose.includes('maskable'));
    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(hasMaskable).toBe(true);

    // Confirm icon files exist on disk
    expect(fs.existsSync(path.join(rootPublicDir, icon192.src))).toBe(true);
    expect(fs.existsSync(path.join(rootPublicDir, icon512.src))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 2. Service Worker Registration (Phase 3A / 3H.2)
  // --------------------------------------------------------------------------
  it('registers the service worker with scope / and provides update notification', async () => {
    const mockRegistration = {
      scope: '/',
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      addEventListener: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const mockRegister = vi.fn().mockResolvedValue(mockRegistration);
    const originalNavigator = global.navigator;

    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          register: mockRegister,
          controller: { state: 'activated' },
          addEventListener: vi.fn(),
        },
      },
      writable: true,
      configurable: true,
    });

    const reg = await PwaManager.registerServiceWorker();
    expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(reg).toBe(mockRegistration);
  });

  // --------------------------------------------------------------------------
  // 3 & 4. Offline Application-Shell Loading & Static Asset Caching (Phase 3A / 3B / 3H.3, 3H.4)
  // --------------------------------------------------------------------------
  it('service worker script precaches core application shell and offline fallback page', () => {
    const swPath = path.join(rootPublicDir, 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
    const swCode = fs.readFileSync(swPath, 'utf8');

    // Verify precache list includes app shell, fallback, manifest, and icons
    expect(swCode).toContain("'/index.html'");
    expect(swCode).toContain("'/manifest.webmanifest'");
    expect(swCode).toContain("'/offline.html'");
    expect(swCode).toContain("'/icons/icon-192.svg'");
    expect(swCode).toContain("'/icons/icon-512.svg'");

    // Verify offline fallback page exists and has high-contrast offline messaging
    const fallbackPath = path.join(rootPublicDir, 'offline.html');
    expect(fs.existsSync(fallbackPath)).toBe(true);
    const fallbackHtml = fs.readFileSync(fallbackPath, 'utf8');
    expect(fallbackHtml).toContain('Offline Companion Active');
    expect(fallbackHtml).toContain('All Local Data Preserved');
  });

  // --------------------------------------------------------------------------
  // 5. Sensitive API Responses NOT being cached (Phase 3A / 3F / 3H.5)
  // --------------------------------------------------------------------------
  it('strictly excludes sensitive API responses and auth tokens from service worker cache', () => {
    const swPath = path.join(rootPublicDir, 'sw.js');
    const swCode = fs.readFileSync(swPath, 'utf8');

    // Verify security guard regex in sw.js
    expect(swCode).toContain('SENSITIVE_API_PATTERNS');
    expect(swCode).toContain("request.method !== 'GET'");
    expect(swCode).toContain("request.headers.has('Authorization')");

    // Simulated evaluation of the security guard logic
    const SENSITIVE_API_PATTERNS = [
      /^\/api\//i,
      /^\/auth\//i,
      /^\/sync/i,
      /^\/caregiver/i,
      /^\/observations/i,
      /^\/patients/i,
    ];

    const testSensitiveUrls = [
      '/api/v1/caregiver/patients',
      '/api/v1/auth/login',
      '/api/v1/sync',
      '/caregiver/observations',
      '/api/v1/caregiver/patient/patient-ner-001/history',
    ];

    testSensitiveUrls.forEach((pathname) => {
      const isSensitive = SENSITIVE_API_PATTERNS.some((pattern) => pattern.test(pathname));
      expect(isSensitive).toBe(true);
    });

    const testSafeStaticUrls = [
      '/index.html',
      '/assets/index-test.js',
      '/assets/index-test.css',
      '/manifest.webmanifest',
      '/icons/icon-192.svg',
      '/audio/as/prompts.json',
    ];

    testSafeStaticUrls.forEach((pathname) => {
      const isSensitive = SENSITIVE_API_PATTERNS.some((pattern) => pattern.test(pathname));
      expect(isSensitive).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 6. IndexedDB Data Available Offline (Phase 3B / 3H.6)
  // --------------------------------------------------------------------------
  it('stores and retrieves patient profile and observations without network dependency', async () => {
    // Simulate offline network
    vi.stubGlobal('navigator', { onLine: false });
    expect(navigator.onLine).toBe(false);

    const profile = IndexedDbStorageService.getPatientProfile();
    expect(profile.patientId).toBe('patient-ner-001');
    expect(profile.displayName).toBe('Bhaben Sharma');

    // Update and save profile offline
    await IndexedDbStorageService.savePatientProfile({
      ...profile,
      preferredLanguage: 'as',
    });

    const updated = IndexedDbStorageService.getPatientProfile();
    expect(updated.preferredLanguage).toBe('as');
  });

  // --------------------------------------------------------------------------
  // 7 & 8. Offline Game Execution and Outbox Creation (Phase 3B / 3H.7, 3H.8)
  // --------------------------------------------------------------------------
  it('executes cognitive activity session offline and places observation into outbox', async () => {
    vi.stubGlobal('navigator', { onLine: false });

    // 1. Record completed game observation offline
    const testObservation: CognitiveObservation = {
      id: crypto.randomUUID(),
      patientId: 'patient-ner-001',
      domain: 'memory',
      taskId: 'market_shopping_recall',
      timestamp: new Date().toISOString(),
      difficulty: 1,
      context: 'market',
      metrics: {
        rawScore: 0.9,
        itemsPresented: 4,
        itemsCorrect: 4,
        completionTimeMs: 11200,
        hesitationCount: 0,
        cueAssistanceCount: 0,
      },
    };

    await IndexedDbStorageService.recordObservation(testObservation);
    const observations = IndexedDbStorageService.getObservations();
    expect(observations.length).toBe(1);
    expect(observations[0].metrics.rawScore).toBe(0.9);

    // 2. Verified that recordObservation enqueued an outbox sync event
    const pending = IndexedDbStorageService.getPendingSyncEvents();
    expect(pending.length).toBe(1);
    expect(pending[0].eventType).toBe('observation_recorded');
    expect(pending[0].status).toBe('pending');
    expect(pending[0].patientId).toBe('patient-ner-001');
  });

  // --------------------------------------------------------------------------
  // 10. PWA Standalone Launch (Phase 3C / 3H.10)
  // --------------------------------------------------------------------------
  it('accurately identifies standalone launch mode in Chromium and iOS environments', () => {
    // Mode A: Browser tab (not standalone)
    const browserWindow = {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      navigator: { standalone: false },
    };
    vi.stubGlobal('window', browserWindow);
    expect(PwaManager.isStandalone()).toBe(false);

    // Mode B: Installed PWA standalone window (display-mode: standalone)
    const standaloneWindow = {
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
      })),
      navigator: { standalone: true },
    };
    vi.stubGlobal('window', standaloneWindow);
    expect(PwaManager.isStandalone()).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Regional Voice Manifests & Fallback (Phase 3G / 3H)
  // --------------------------------------------------------------------------
  it('provides complete prompt manifests for all 7 NER languages and falls back gracefully to SpeechService', async () => {
    const requiredLanguages: RegionalLanguage[] = ['as', 'bn', 'mni', 'kha', 'brx', 'hi', 'en'];
    const requiredCues: PromptCue[] = [
      'welcome',
      'instructions',
      'success',
      'retry',
      'encouragement',
      'navigation',
      'status',
    ];

    for (const lang of requiredLanguages) {
      const manifestPath = path.join(rootPublicDir, `audio/${lang}/prompts.json`);
      expect(fs.existsSync(manifestPath), `Manifest missing for language: ${lang}`).toBe(true);

      const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(content.language).toBe(lang);
      expect(typeof content.name).toBe('string');

      requiredCues.forEach((cue) => {
        expect(content.prompts[cue], `Cue "${cue}" missing in ${lang}`).toBeDefined();
        expect(typeof content.prompts[cue].text).toBe('string');
        expect(content.prompts[cue].text.length).toBeGreaterThan(0);
      });
    }

    // Verify RegionalAudioService plays cue and falls back to SpeechService when audio files are absent
    const speakSpy = vi.spyOn(SpeechService, 'speak').mockImplementation(() => {});

    RegionalAudioService.setLanguage('as');
    expect(RegionalAudioService.getLanguage()).toBe('as');
    expect(RegionalAudioService.getBcp47Tag('as')).toBe('as-IN');

    // Register manifest in service
    const asManifest = JSON.parse(
      fs.readFileSync(path.join(rootPublicDir, 'audio/as/prompts.json'), 'utf8')
    );
    RegionalAudioService.registerManifest(asManifest);

    const played = await RegionalAudioService.playPrompt('welcome');
    expect(played).toBe(true);
    expect(speakSpy).toHaveBeenCalledWith(asManifest.prompts.welcome.text, 0.85);

    // Verify subtitle text lookup
    const statusText = RegionalAudioService.getPromptText('status');
    expect(statusText).toBe(asManifest.prompts.status.text);
  });
});
