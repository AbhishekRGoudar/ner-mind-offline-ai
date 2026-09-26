import crypto from 'node:crypto';

/**
 * Password hashing service fulfilling OWASP ASVS 5.0 baseline.
 * Uses high-cost cryptographic derivation (Scrypt / Argon2-compatible parameters)
 * with 32-byte CSPRNG salt and constant-time timingSafeEqual verification.
 */
export class PasswordService {
  private static readonly KEY_LEN = 64;
  private static readonly SCRYPT_PARAMS = {
    N: 16384, // CPU/memory cost
    r: 8,     // block size
    p: 1,     // parallelization
    maxmem: 64 * 1024 * 1024,
  };

  /**
   * Hashes a password with a cryptographically secure random 32-byte salt.
   */
  public static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters in length.');
    }

    const salt = crypto.randomBytes(32).toString('hex');
    return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, this.KEY_LEN, this.SCRYPT_PARAMS, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Synchronously hashes a password with Scrypt (used for seeding in-memory repositories).
   */
  public static hashPasswordSync(password: string): string {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters in length.');
    }
    const salt = crypto.randomBytes(32).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, this.KEY_LEN, this.SCRYPT_PARAMS);
    return `scrypt$${salt}$${derivedKey.toString('hex')}`;
  }

  /**
   * Verifies a password against a stored hash using constant-time comparison
   * to protect against timing attacks.
   */
  public static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }

    const salt = parts[1];
    const originalHash = Buffer.from(parts[2], 'hex');

    return new Promise((resolve) => {
      crypto.scrypt(password, salt, originalHash.length, this.SCRYPT_PARAMS, (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          const match = crypto.timingSafeEqual(originalHash, derivedKey);
          resolve(match);
        } catch {
          resolve(false);
        }
      });
    });
  }

  /**
   * Hashes session tokens using SHA-256 before storage to ensure tokens
   * are never stored in plaintext in the database.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
