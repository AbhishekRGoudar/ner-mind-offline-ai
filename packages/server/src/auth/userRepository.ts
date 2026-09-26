import { DatabasePool } from '../db/dbPool.js';
import { UserRole } from './rbacMiddleware.js';
import { PasswordService } from './passwordService.js';

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  patientId?: string;
  failedLoginAttempts: number;
  lockedUntil: number | null; // epoch ms
}

export class UserRepository {
  private static inMemoryUsers = new Map<string, StoredUser>();

  static {
    this.seedInMemory();
  }

  public static seedInMemory() {
    this.inMemoryUsers.clear();
    const cgHash = PasswordService.hashPasswordSync('CaregiverSecurePass123!');
    const hwHash = PasswordService.hashPasswordSync('HealthWorkerPass123!');
    const adminHash = PasswordService.hashPasswordSync('AdminSecurePass123!');
    const patHash = PasswordService.hashPasswordSync('PatientSecurePass123!');

    this.inMemoryUsers.set('caregiver_pranjal', {
      id: 'caregiver-001',
      username: 'caregiver_pranjal',
      passwordHash: cgHash,
      role: 'CAREGIVER',
      patientId: 'patient-ner-001',
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    this.inMemoryUsers.set('caregiver_anita', {
      id: 'caregiver-002',
      username: 'caregiver_anita',
      passwordHash: cgHash,
      role: 'CAREGIVER',
      patientId: 'patient-ner-002',
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    this.inMemoryUsers.set('health_worker_dutta', {
      id: 'hw-001',
      username: 'health_worker_dutta',
      passwordHash: hwHash,
      role: 'HEALTH_WORKER',
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    this.inMemoryUsers.set('patient_bhaben', {
      id: 'user-pat-001',
      username: 'patient_bhaben',
      passwordHash: cgHash,
      role: 'PATIENT',
      patientId: 'patient-ner-001',
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  public static async findByUsername(username: string): Promise<StoredUser | null> {
    if (DatabasePool.isAvailable()) {
      const res = await DatabasePool.query(
        `SELECT id, username, password_hash, role, failed_login_attempts, locked_until
         FROM users WHERE username = $1`,
        [username]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        username: r.username,
        passwordHash: r.password_hash,
        role: r.role,
        failedLoginAttempts: r.failed_login_attempts || 0,
        lockedUntil: r.locked_until ? new Date(r.locked_until).getTime() : null,
      };
    }

    return this.inMemoryUsers.get(username) || null;
  }

  public static async recordFailedLogin(username: string): Promise<{ locked: boolean; lockedUntil?: number }> {
    const user = await this.findByUsername(username);
    if (!user) return { locked: false };

    const attempts = user.failedLoginAttempts + 1;
    let lockedUntil: number | null = null;
    let isLocked = false;

    if (attempts >= 5) {
      isLocked = true;
      lockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
    }

    if (DatabasePool.isAvailable()) {
      await DatabasePool.query(
        `UPDATE users
         SET failed_login_attempts = $1,
             locked_until = $2,
             updated_at = NOW()
         WHERE username = $3`,
        [attempts, lockedUntil ? new Date(lockedUntil).toISOString() : null, username]
      );
    } else {
      user.failedLoginAttempts = attempts;
      user.lockedUntil = lockedUntil;
    }

    return { locked: isLocked, lockedUntil: lockedUntil || undefined };
  }

  public static async resetFailedLogin(username: string): Promise<void> {
    if (DatabasePool.isAvailable()) {
      await DatabasePool.query(
        `UPDATE users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             updated_at = NOW()
         WHERE username = $1`,
        [username]
      );
    } else {
      const user = this.inMemoryUsers.get(username);
      if (user) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
      }
    }
  }

  public static async setUserPasswordHash(username: string, hash: string): Promise<void> {
    const user = this.inMemoryUsers.get(username);
    if (user) {
      user.passwordHash = hash;
    }
    if (DatabasePool.isAvailable()) {
      await DatabasePool.query(
        `UPDATE users SET password_hash = $1 WHERE username = $2`,
        [hash, username]
      );
    }
  }
}
