/**
 * PWA Service Worker Registration & Install Prompt Manager
 */

export interface PwaStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isStandalone: boolean;
  canInstall: boolean;
}

export class PwaManager {
  private static deferredInstallPrompt: any = null;
  private static listeners: Set<(canInstall: boolean) => void> = new Set();
  private static registered = false;

  public static init(): void {
    if (typeof window === 'undefined') return;

    // Listen for install prompt availability
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.notifyListeners(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      this.notifyListeners(false);
      console.log('[PWA] NER-Mind application was successfully installed.');
    });

    // Register service worker on window load
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        this.registerServiceWorker('/sw.js');
      });
    }
  }

  public static async registerServiceWorker(swPath: string = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.register(swPath, { scope: '/' });
      this.registered = true;
      console.log('[PWA] ServiceWorker registered with scope:', reg.scope);

      // Listen for service worker updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available. Refresh to update.');
            }
          });
        }
      });

      return reg;
    } catch (err) {
      console.warn('[PWA] ServiceWorker registration failed:', err);
      return null;
    }
  }

  public static canInstall(): boolean {
    return this.deferredInstallPrompt !== null;
  }

  public static isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as any)?.standalone === true ||
      (typeof document !== 'undefined' && document.referrer.includes('android-app://'))
    );
  }

  public static async promptInstall(): Promise<boolean> {
    if (!this.deferredInstallPrompt) {
      return false;
    }

    this.deferredInstallPrompt.prompt();
    const { outcome } = await this.deferredInstallPrompt.userChoice;
    this.deferredInstallPrompt = null;
    this.notifyListeners(false);
    return outcome === 'accepted';
  }

  public static onCanInstallChange(listener: (canInstall: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.canInstall());
    return () => this.listeners.delete(listener);
  }

  private static notifyListeners(canInstall: boolean): void {
    for (const listener of this.listeners) {
      try {
        listener(canInstall);
      } catch (err) {
        console.warn('[PWA] Listener notification error:', err);
      }
    }
  }

  public static getStatus(): PwaStatus {
    return {
      isSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
      isRegistered: this.registered,
      isStandalone: this.isStandalone(),
      canInstall: this.canInstall(),
    };
  }
}
