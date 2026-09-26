import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { DatabasePool } from '../db/dbPool.js';
import { PasswordService } from './passwordService.js';
import { PatientRepository } from '../repository/patientRepository.js';

export type UserRole = 'PATIENT' | 'CAREGIVER' | 'HEALTH_WORKER' | 'ADMIN';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: UserRole;
  patientId?: string;
}

interface StoredSession {
  tokenHash: string;
  user: AuthenticatedUser;
  expiresAt: number;
  revokedAt?: number;
}

// In-memory fallback session store (used when PostgreSQL is not connected or in unit tests)
const IN_MEMORY_SESSIONS = new Map<string, StoredSession>();

export class AuthService {
  public static readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Creates a new session. Raw token is returned to client, but only sha256(token)
   * is persisted in PostgreSQL or memory.
   */
  public static async createSession(user: AuthenticatedUser): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = PasswordService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.SESSION_TTL_MS);

    if (DatabasePool.isAvailable()) {
      await DatabasePool.query(
        `INSERT INTO sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, $3)`,
        [tokenHash, user.userId, expiresAt.toISOString()]
      );
    }

    // Also store in fallback memory cache
    IN_MEMORY_SESSIONS.set(tokenHash, {
      tokenHash,
      user,
      expiresAt: expiresAt.getTime(),
    });

    return rawToken;
  }

  /**
   * Retrieves user for session token, verifying that session is neither expired nor revoked.
   */
  public static async getSessionUser(rawToken: string): Promise<AuthenticatedUser | null> {
    const tokenHash = PasswordService.hashToken(rawToken);
    const now = Date.now();

    if (DatabasePool.isAvailable()) {
      const res = await DatabasePool.query(
        `SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.username, u.role
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token_hash = $1`,
        [tokenHash]
      );

      if (res.rows.length === 0) return null;
      const r = res.rows[0];

      // Check if revoked
      if (r.revoked_at) return null;

      // Check expiration
      if (new Date(r.expires_at).getTime() < now) return null;

      return {
        userId: r.user_id,
        username: r.username,
        role: r.role,
      };
    }

    // In-memory fallback
    const session = IN_MEMORY_SESSIONS.get(tokenHash);
    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt < now) {
      IN_MEMORY_SESSIONS.delete(tokenHash);
      return null;
    }

    return session.user;
  }

  /**
   * Explicitly revokes a session (Logout).
   */
  public static async revokeSession(rawToken: string): Promise<void> {
    const tokenHash = PasswordService.hashToken(rawToken);

    if (DatabasePool.isAvailable()) {
      await DatabasePool.query(
        `UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1`,
        [tokenHash]
      );
    }

    const session = IN_MEMORY_SESSIONS.get(tokenHash);
    if (session) {
      session.revokedAt = Date.now();
    }
  }

  public static clearInMemoryForTesting(): void {
    IN_MEMORY_SESSIONS.clear();
  }
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Middleware enforcing authentication and RBAC least privilege.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header.',
      });
    }

    const token = authHeader.substring(7);
    const user = await AuthService.getSessionUser(token);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid, revoked, or expired session token.',
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${user.role}' lacks permission for this resource. Required: ${allowedRoles.join(', ')}`,
      });
    }

    req.user = user;
    next();
  };
}

/**
 * Server-side IDOR prevention middleware.
 * Verifies that the authenticated user has explicit rights to access or mutate the requested patient's data:
 * - ADMIN: unrestricted access
 * - HEALTH_WORKER: authorized regional oversight
 * - CAREGIVER: only assigned patients (patient.caregiverId === user.userId)
 * - PATIENT: only self (user.patientId === requestedId)
 */
export function requirePatientAccess(getPatientIdFromReq: (req: Request) => string | undefined) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const targetPatientId = getPatientIdFromReq(req);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    if (!targetPatientId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Missing target patient ID in request.' });
    }

    // Admins and Health Workers have authorized administrative/clinical oversight
    if (user.role === 'ADMIN' || user.role === 'HEALTH_WORKER') {
      return next();
    }

    // Caregiver: verify caregiver is explicitly assigned to this patient
    if (user.role === 'CAREGIVER') {
      const patient = await PatientRepository.getPatient(targetPatientId);
      if (!patient) {
        return res.status(404).json({ error: 'Not Found', message: `Patient '${targetPatientId}' not found.` });
      }

      if (patient.caregiverId !== user.userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You are not the assigned caregiver for this patient.',
        });
      }

      return next();
    }

    // Patient: verify patient identity matches requested ID
    if (user.role === 'PATIENT') {
      if (user.patientId !== targetPatientId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You can only access your own patient profile.',
        });
      }
      return next();
    }

    return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
  };
}
