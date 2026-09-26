/**
 * Local Offline Authentication Service
 * Implements device-local authentication for offline-native operation.
 * Eliminates dependencies on `/api/auth` or live network connection.
 * Validates role separation (PATIENT, CAREGIVER, HEALTH_WORKER, ADMIN).
 */

export type UserRole = 'PATIENT' | 'CAREGIVER' | 'HEALTH_WORKER' | 'ADMIN';

export interface LocalUser {
  id: string;
  username: string;
  passwordHashSha256: string;
  role: UserRole;
  patientId?: string; // For patient or assigned caregiver
  displayName: string;
}

export interface LocalSession {
  token: string;
  userId: string;
  username: string;
  role: UserRole;
  patientId?: string;
  displayName: string;
  createdAt: string;
  expiresAt: string;
}

// Pre-computed SHA-256 hashes for standard seed accounts:
// SHA256("CaregiverSecurePass123!") = "1965055eb66c64ff0cee3b63e2e745da87ea2977e55e811340fee3c2f7c467ed"
// SHA256("Caregiver2SecurePass123!") = "281648d911f29e44f5aa3bd7e440f333e5b4a26a81018e46a7b96d08488a744e"
// SHA256("HealthWorkerPass123!") = "828e89c302d295f0cb0ac5f0e6501d2636e2331bd0b053eec47808a66b0136fb"
// SHA256("AdminSecurePass123!") = "cd6bfbbe7b385a26041bd97e0e0bf0f585aeade563b00130cf6a7ba754fabfcc"
// SHA256("PatientSecurePass123!") = "c3ca33f6e71f33a809c09aff022635611b47734b0d88a7986ec43e8da1caa3cc"

const LOCAL_ACCOUNTS: LocalUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'caregiver_pranjal',
    passwordHashSha256: '1965055eb66c64ff0cee3b63e2e745da87ea2977e55e811340fee3c2f7c467ed',
    role: 'CAREGIVER',
    patientId: 'patient-ner-001',
    displayName: 'Pranjal Sharma (Caregiver)',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'caregiver_anita',
    passwordHashSha256: '281648d911f29e44f5aa3bd7e440f333e5b4a26a81018e46a7b96d08488a744e',
    role: 'CAREGIVER',
    patientId: 'patient-ner-002',
    displayName: 'Anita Barua (Caregiver)',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'health_worker_dutta',
    passwordHashSha256: '828e89c302d295f0cb0ac5f0e6501d2636e2331bd0b053eec47808a66b0136fb',
    role: 'HEALTH_WORKER',
    displayName: 'Dr. Dutta (ASHA / Health Worker)',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    username: 'admin_ner',
    passwordHashSha256: 'cd6bfbbe7b385a26041bd97e0e0bf0f585aeade563b00130cf6a7ba754fabfcc',
    role: 'ADMIN',
    displayName: 'System Admin',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    username: 'patient_bhaben',
    passwordHashSha256: 'c3ca33f6e71f33a809c09aff022635611b47734b0d88a7986ec43e8da1caa3cc',
    role: 'PATIENT',
    patientId: 'patient-ner-001',
    displayName: 'Bhaben Sharma',
  },
];

const SESSION_STORAGE_KEY = 'ner_mind_local_session';
const SESSION_TTL_MS = 14400000; // 4 hours

export class LocalAuthService {
  private static activeSession: LocalSession | null = null;

  /**
   * Computes SHA-256 hex digest using WebCrypto API (available offline in all modern browsers).
   */
  public static async computeSha256(text: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Simple deterministic fallback for headless environments lacking WebCrypto
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Authenticates user entirely offline against local securely hashed credentials.
   */
  public static async login(username: string, passwordPlain: string): Promise<LocalSession> {
    const user = LOCAL_ACCOUNTS.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) {
      throw new Error('Invalid credentials.');
    }

    const inputHash = await this.computeSha256(passwordPlain);
    if (inputHash !== user.passwordHashSha256) {
      throw new Error('Invalid credentials.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
    const token = `offline_token_${user.id}_${Date.now()}`;

    const session: LocalSession = {
      token,
      userId: user.id,
      username: user.username,
      role: user.role,
      patientId: user.patientId,
      displayName: user.displayName,
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.activeSession = session;
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch {}
    }

    return session;
  }

  /**
   * Retrieves active session from memory or local sessionStorage.
   */
  public static getSession(): LocalSession | null {
    if (this.activeSession) {
      if (new Date(this.activeSession.expiresAt).getTime() > Date.now()) {
        return this.activeSession;
      }
      this.logout();
      return null;
    }

    if (typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const session: LocalSession = JSON.parse(raw);
          if (new Date(session.expiresAt).getTime() > Date.now()) {
            this.activeSession = session;
            return session;
          }
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch {}
    }

    return null;
  }

  /**
   * Clears active offline session.
   */
  public static logout(): void {
    this.activeSession = null;
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {}
    }
  }

  /**
   * Authorizes patient access for a given caregiver session.
   * PATIENT: can only view own patientId.
   * CAREGIVER: can only view assigned patientId.
   * HEALTH_WORKER / ADMIN: authorized for regional oversight.
   */
  public static isAuthorizedForPatient(session: LocalSession | null, targetPatientId: string): boolean {
    if (!session) return false;
    if (session.role === 'ADMIN' || session.role === 'HEALTH_WORKER') return true;
    if (session.role === 'CAREGIVER') {
      return session.patientId === targetPatientId;
    }
    if (session.role === 'PATIENT') {
      return session.patientId === targetPatientId;
    }
    return false;
  }
}
