import {
  IndexedDbStorageService,
} from '../storage/indexedDbStorage.js';
import { SyncBatchPayload } from '@ner-mind/core';

export type SyncState = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'OFFLINE' | 'ERROR' | 'AUTH_REQUIRED';

export interface SyncStatusInfo {
  state: SyncState;
  pendingCount: number;
  lastSyncedAt: string | null;
  errorMessage?: string;
  retryAttempt: number;
}

export type SyncStatusListener = (status: SyncStatusInfo) => void;

/**
 * Reliable SyncWorker fulfilling Phase 2.3B:
 * - Concurrent sync prevention (isSyncing lock)
 * - Exponential backoff with bounded retry interval (max 60s)
 * - Reconnection auto-trigger on 'online' event
 * - Batch size limiting (50 events max)
 * - Idempotent event submission
 * - No event loss on failure (persists in IndexedDB)
 * - Authentication management with token caching
 */
export class SyncWorker {
  private static instance: SyncWorker | null = null;

  private isSyncing = false;
  private retryAttempt = 0;
  private backoffTimeout: any = null;
  private readonly backoffScheduleMs = [2000, 4000, 8000, 16000, 32000, 60000];
  private readonly maxBatchSize = 50;

  private serverBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL !== undefined)
    ? import.meta.env.VITE_API_URL
    : (typeof window !== 'undefined' && window.location.port === '3000' ? '' : 'http://localhost:4000');
  private authToken: string | null = null;
  private lastSyncedAt: string | null = null;
  private currentState: SyncState = 'IDLE';
  private lastError: string | undefined = undefined;

  private listeners: Set<SyncStatusListener> = new Set();

  private constructor() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', () => this.handleNetworkOnline());
      window.addEventListener('offline', () => this.handleNetworkOffline());
    }
  }

  public static getInstance(): SyncWorker {
    if (!this.instance) {
      this.instance = new SyncWorker();
    }
    return this.instance;
  }

  public setServerBaseUrl(url: string): void {
    this.serverBaseUrl = url.replace(/\/$/, '');
  }

  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatusInfo());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const status = this.getStatusInfo();
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (e) {
        console.warn('[SyncWorker] Listener notification failed:', e);
      }
    }
  }

  public getStatusInfo(): SyncStatusInfo {
    return {
      state: this.currentState,
      pendingCount: IndexedDbStorageService.getPendingSyncCount(),
      lastSyncedAt: this.lastSyncedAt,
      errorMessage: this.lastError,
      retryAttempt: this.retryAttempt,
    };
  }

  private handleNetworkOnline(): void {
    console.log('[SyncWorker] Network online detected. Triggering outbox sync.');
    this.currentState = 'IDLE';
    this.retryAttempt = 0;
    this.notify();
    this.triggerSyncWithBackoff(0);
  }

  private handleNetworkOffline(): void {
    console.log('[SyncWorker] Network offline. Pausing synchronization.');
    this.currentState = 'OFFLINE';
    if (this.backoffTimeout) {
      clearTimeout(this.backoffTimeout);
      this.backoffTimeout = null;
    }
    this.notify();
  }

  /**
   * Acquire authentication session token for patient if none is set.
   * Uses patient credentials seeded in PostgreSQL and in-memory server.
   */
  private async ensureAuthenticated(): Promise<string | null> {
    if (this.authToken) {
      return this.authToken;
    }

    try {
      const res = await fetch(`${this.serverBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'patient_bhaben',
          password: 'PatientSecurePass123!',
        }),
      });

      if (!res.ok) {
        // If patient account not available, try default caregiver login
        const cgRes = await fetch(`${this.serverBaseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'caregiver_pranjal',
            password: 'CaregiverSecurePass123!',
          }),
        });

        if (cgRes.ok) {
          const data = await cgRes.json();
          this.authToken = data.token;
          return this.authToken;
        }

        this.currentState = 'AUTH_REQUIRED';
        this.lastError = 'Authentication failed. Please log in.';
        this.notify();
        return null;
      }

      const data = await res.json();
      this.authToken = data.token;
      return this.authToken;
    } catch (e: any) {
      this.lastError = 'Network error while authenticating.';
      return null;
    }
  }

  /**
   * Triggers an immediate sync pass.
   * Can be invoked by the "Sync Now" button or auto-scheduled timers.
   */
  public async syncNow(): Promise<boolean> {
    // 1. Prevent concurrent synchronization
    if (this.isSyncing) {
      console.log('[SyncWorker] Synchronization already in progress. Ignoring duplicate trigger.');
      return false;
    }

    // 2. Check offline status
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.currentState = 'OFFLINE';
      this.notify();
      return false;
    }

    // 3. Check if there are pending events
    const profile = IndexedDbStorageService.getPatientProfile();
    const pendingEvents = IndexedDbStorageService.getPendingSyncEvents();

    if (pendingEvents.length === 0) {
      this.currentState = 'IDLE';
      this.lastError = undefined;
      this.notify();
      return true;
    }

    this.isSyncing = true;
    this.currentState = 'SYNCING';
    this.notify();

    let batch: SyncBatchPayload | null = null;

    try {
      // 4. Ensure authentication
      const token = await this.ensureAuthenticated();
      if (!token) {
        this.isSyncing = false;
        this.currentState = 'AUTH_REQUIRED';
        this.notify();
        return false;
      }

      // 5. Create batch with size limit
      batch = await IndexedDbStorageService.createSyncBatch(profile.patientId, this.maxBatchSize);
      if (!batch || batch.events.length === 0) {
        this.isSyncing = false;
        this.currentState = 'IDLE';
        this.notify();
        return true;
      }

      // 6. Submit batch to server
      const response = await fetch(`${this.serverBaseUrl}/api/v1/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token expired or invalid -> clear token and flag auth required
          this.authToken = null;
          this.currentState = 'AUTH_REQUIRED';
          this.lastError = 'Session expired or unauthorized.';
          await IndexedDbStorageService.markSyncFailed(batch.events.map(e => e.eventId), 'Unauthorized');
          this.isSyncing = false;
          this.notify();
          return false;
        }

        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || `Server returned HTTP ${response.status}`);
      }

      const result = await response.json();

      // 7. Acknowledge synced events in IndexedDB
      if (Array.isArray(result.processedEventIds)) {
        await IndexedDbStorageService.acknowledgeSynced(result.processedEventIds);
      } else {
        await IndexedDbStorageService.acknowledgeSynced(batch.events.map(e => e.eventId));
      }

      this.lastSyncedAt = new Date().toISOString();
      this.retryAttempt = 0;
      this.currentState = 'SUCCESS';
      this.lastError = undefined;
      this.isSyncing = false;
      this.notify();

      // If more events remain, immediately trigger next batch
      if (IndexedDbStorageService.getPendingSyncCount() > 0) {
        setTimeout(() => this.syncNow(), 500);
      } else {
        setTimeout(() => {
          if (this.currentState === 'SUCCESS') {
            this.currentState = 'IDLE';
            this.notify();
          }
        }, 3000);
      }

      return true;
    } catch (error: any) {
      console.warn('[SyncWorker] Sync failure:', error?.message || error);
      if (batch) {
        await IndexedDbStorageService.markSyncFailed(
          batch.events.map(e => e.eventId),
          error?.message || 'Network failure'
        );
      }

      this.isSyncing = false;
      this.currentState = 'ERROR';
      this.lastError = error?.message || 'Sync failed. Will retry automatically.';
      this.notify();

      // Schedule exponential backoff retry
      this.scheduleRetry();
      return false;
    }
  }

  private scheduleRetry(): void {
    if (this.backoffTimeout) {
      clearTimeout(this.backoffTimeout);
    }

    const delay = this.backoffScheduleMs[
      Math.min(this.retryAttempt, this.backoffScheduleMs.length - 1)
    ];
    this.retryAttempt++;

    console.log(`[SyncWorker] Scheduling retry attempt #${this.retryAttempt} in ${delay}ms`);
    this.backoffTimeout = setTimeout(() => {
      this.syncNow();
    }, delay);
  }

  public triggerSyncWithBackoff(delayMs: number = 0): void {
    if (this.backoffTimeout) {
      clearTimeout(this.backoffTimeout);
    }
    if (delayMs === 0) {
      this.syncNow();
    } else {
      this.backoffTimeout = setTimeout(() => this.syncNow(), delayMs);
    }
  }

  public destroy(): void {
    if (this.backoffTimeout) {
      clearTimeout(this.backoffTimeout);
      this.backoffTimeout = null;
    }
    this.listeners.clear();
  }
}
